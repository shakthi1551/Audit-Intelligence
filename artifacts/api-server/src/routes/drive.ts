/**
 * Google Drive integration routes
 *
 * The frontend obtains a Drive access token via the Replit Google Drive
 * integration and passes it as "X-Drive-Token". These routes proxy
 * calls to the Drive API so credentials never touch the browser directly.
 *
 * Endpoints:
 *   GET  /api/drive/files                  — list CSV/XLSX files from Drive
 *   POST /api/engagements/:id/import-drive — download Drive file → upload as journal entries
 */
import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

function getDriveToken(req: AuthenticatedRequest): string | null {
  const t = req.headers["x-drive-token"];
  return typeof t === "string" && t.length > 0 ? t : null;
}

/**
 * GET /api/drive/files
 * Lists CSV and XLSX files from the connected Google Drive.
 * Requires X-Drive-Token header with a valid OAuth access token.
 */
router.get("/files", async (req: AuthenticatedRequest, res) => {
  try {
    const token = getDriveToken(req);
    if (!token) {
      res.status(400).json({ error: "X-Drive-Token header is required. Connect Google Drive from Settings." });
      return;
    }

    const query = encodeURIComponent(
      "(mimeType='text/csv' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') and trashed=false",
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime,mimeType)&pageSize=50&orderBy=modifiedTime+desc`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      req.log.error({ status: response.status }, "Drive API error listing files");
      res.status(502).json({ error: "Failed to list Drive files. Check that Google Drive is connected." });
      return;
    }

    const data = (await response.json()) as {
      files: Array<{ id: string; name: string; size: string; modifiedTime: string; mimeType: string }>;
    };
    res.json({ files: data.files ?? [] });
  } catch (err) {
    req.log.error({ err }, "Drive files error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/engagements/:id/import-drive
 * Body: { fileId: string, fileName: string }
 * Requires X-Drive-Token header.
 *
 * Downloads the file from Google Drive and runs it through the
 * same journal-entry upload pipeline as a manual CSV upload.
 */
router.post("/:id/import-drive", async (req: AuthenticatedRequest, res) => {
  try {
    const engagementId = parseInt(req.params.id as string, 10);
    const { fileId, fileName } = req.body as { fileId: string; fileName: string };

    if (!fileId || !fileName) {
      res.status(400).json({ error: "fileId and fileName are required" });
      return;
    }

    const token = getDriveToken(req);
    if (!token) {
      res.status(400).json({ error: "X-Drive-Token header is required." });
      return;
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    const fileResponse = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fileResponse.ok) {
      req.log.error({ status: fileResponse.status, fileId }, "Drive download error");
      res.status(502).json({ error: "Failed to download file from Google Drive." });
      return;
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    // Forward bytes to the existing journal-entry upload handler
    const port = process.env.PORT ?? "8080";
    const uploadRes = await fetch(`http://localhost:${port}/api/engagements/${engagementId}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": fileName,
        Authorization: req.headers.authorization ?? "",
      },
      body: buffer,
    });

    const result = (await uploadRes.json()) as Record<string, unknown>;
    res.status(uploadRes.status).json({ ...result, source: "google-drive", fileId, fileName });
  } catch (err) {
    req.log.error({ err }, "Drive import error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
