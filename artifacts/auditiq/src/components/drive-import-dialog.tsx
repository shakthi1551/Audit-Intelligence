/**
 * Google Drive Import Dialog
 *
 * Lets the user browse CSV/XLSX files from their connected Google Drive
 * and import one directly into an engagement — no manual download required.
 *
 * The user's Drive OAuth token is obtained via the Replit Google Drive
 * integration and stored in localStorage key `auditiq_drive_token`.
 */
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Cloud, FileSpreadsheet, Search, Loader2, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
  mimeType: string;
}

const TOKEN_KEY = "auditiq_drive_token";
const AUTH_TOKEN_KEY = "auditiq_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeader(): string {
  const t = localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
  return `Bearer ${t}`;
}

async function listDriveFiles(driveToken: string): Promise<DriveFile[]> {
  const res = await fetch("/api/drive/files", {
    headers: {
      Authorization: getAuthHeader(),
      "X-Drive-Token": driveToken,
    },
  });
  if (!res.ok) throw new Error((await res.json() as { error: string }).error ?? "Failed to list files");
  const data = await res.json() as { files: DriveFile[] };
  return data.files;
}

async function importDriveFile(
  engagementId: number,
  fileId: string,
  fileName: string,
  driveToken: string,
): Promise<{ message: string }> {
  const res = await fetch(`/api/engagements/${engagementId}/import-drive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      "X-Drive-Token": driveToken,
    },
    body: JSON.stringify({ fileId, fileName }),
  });
  if (!res.ok) {
    const err = await res.json() as { error: string };
    throw new Error(err.error ?? "Import failed");
  }
  return res.json() as Promise<{ message: string }>;
}

interface Props {
  engagementId: number;
  onImported?: () => void;
}

export function DriveImportDialog({ engagementId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filtered, setFiltered] = useState<DriveFile[]>([]);
  const [search, setSearch] = useState("");
  const [driveToken, setDriveToken] = useState(() => getToken() ?? "");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = (q: string) => {
    setSearch(q);
    setFiltered(q ? files.filter(f => f.name.toLowerCase().includes(q.toLowerCase())) : files);
  };

  const loadFiles = useCallback(async () => {
    if (!driveToken) {
      setError("Paste your Google Drive access token below to connect.");
      return;
    }
    localStorage.setItem(TOKEN_KEY, driveToken);
    setError(null);
    setLoadingFiles(true);
    try {
      const list = await listDriveFiles(driveToken);
      setFiles(list);
      setFiltered(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoadingFiles(false);
    }
  }, [driveToken]);

  const handleImport = async () => {
    const file = files.find(f => f.id === selected);
    if (!file) return;
    setImporting(true);
    try {
      await importDriveFile(engagementId, file.id, file.name, driveToken);
      toast({ title: "Import started", description: `${file.name} is being processed.` });
      setOpen(false);
      onImported?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Cloud className="h-4 w-4 mr-2 text-blue-500" />
          Import from Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Import from Google Drive
          </DialogTitle>
          <DialogDescription>
            Browse your Drive and import a CSV or XLSX file directly into this engagement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Token input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Google Drive OAuth Token
              <a
                href="https://developers.google.com/oauthplayground"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary underline underline-offset-2"
              >
                Get token ↗
              </a>
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="ya29.a0..."
                value={driveToken}
                onChange={e => setDriveToken(e.target.value)}
                className="font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={loadFiles} disabled={loadingFiles}>
                {loadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded p-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {files.length > 0 && (
            <>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Filter files..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>

              <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No files match "{search}"</p>
                ) : (
                  filtered.map(file => (
                    <button
                      key={file.id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors text-sm ${selected === file.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                      onClick={() => setSelected(file.id)}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        {file.modifiedTime && (
                          <p className="text-[10px] text-muted-foreground">
                            Modified {format(new Date(file.modifiedTime), "dd MMM yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 h-4">
                          {file.mimeType.includes("csv") ? "CSV" : "XLSX"}
                        </Badge>
                        {selected === file.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {files.length === 0 && !loadingFiles && !error && (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              <Cloud className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Enter your Drive token and click Connect to browse files.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!selected || importing}
          >
            {importing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
            ) : (
              <><Cloud className="h-4 w-4 mr-2" /> Import Selected</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
