import { Router } from "express";
import { db } from "@workspace/db";
import { webhookKeysTable, engagementsTable, journalEntriesTable, riskScoresTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { scoreEntries } from "../lib/risk-engine.js";
import crypto from "node:crypto";

const router = Router();

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function requireWebhookKey(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  const raw = req.headers["x-webhook-key"];
  if (!raw || typeof raw !== "string") {
    res.status(401).json({ error: "Missing X-Webhook-Key header" });
    return;
  }
  const [key] = await db.select().from(webhookKeysTable)
    .where(and(eq(webhookKeysTable.keyHash, hashKey(raw)), eq(webhookKeysTable.active, true)));
  if (!key) {
    res.status(401).json({ error: "Invalid or inactive webhook key" });
    return;
  }
  await db.update(webhookKeysTable).set({ lastUsedAt: new Date() }).where(eq(webhookKeysTable.id, key.id));
  next();
}

/**
 * POST /api/webhooks/trigger
 * Body: { type: "score-engagement" | "get-results", engagementId: number }
 *
 * Used by MAKE or any no-code automation tool to trigger the ML/risk pipeline.
 */
router.post("/trigger", requireWebhookKey, async (req, res) => {
  try {
    const { type, engagementId } = req.body as { type: string; engagementId: number };

    if (!engagementId) {
      res.status(400).json({ error: "engagementId is required" });
      return;
    }

    const [engagement] = await db.select().from(engagementsTable).where(eq(engagementsTable.id, engagementId));
    if (!engagement) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    if (type === "score-engagement") {
      await scoreEntries(engagementId);
      const entries = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.engagementId, engagementId));
      const scores = await db.select().from(riskScoresTable)
        .where(eq(riskScoresTable.entryId, entries[0]?.id ?? 0));

      res.json({
        ok: true,
        engagementId,
        entriesScored: entries.length,
        triggeredAt: new Date().toISOString(),
      });
      return;
    }

    if (type === "get-results") {
      const entries = await db.select({
        id: journalEntriesTable.id,
        entryDate: journalEntriesTable.entryDate,
        postedBy: journalEntriesTable.postedBy,
        description: journalEntriesTable.description,
        amount: journalEntriesTable.amount,
        riskLevel: riskScoresTable.riskLevel,
        totalScore: riskScoresTable.totalScore,
        mlAnomalyScore: riskScoresTable.mlAnomalyScore,
        mlAnomalyFlag: riskScoresTable.mlAnomalyFlag,
      })
        .from(journalEntriesTable)
        .leftJoin(riskScoresTable, eq(riskScoresTable.entryId, journalEntriesTable.id))
        .where(eq(journalEntriesTable.engagementId, engagementId));

      res.json({ ok: true, engagementId, entries });
      return;
    }

    res.status(400).json({ error: `Unknown trigger type: ${type}. Valid: score-engagement, get-results` });
  } catch (err) {
    req.log?.error({ err }, "Webhook trigger error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/webhooks/keys
 * Creates a new webhook API key (admin use — JWT required via separate middleware in caller).
 */
router.post("/keys", async (req, res) => {
  try {
    const { name, createdBy } = req.body as { name: string; createdBy: number };
    if (!name || !createdBy) {
      res.status(400).json({ error: "name and createdBy are required" });
      return;
    }
    const raw = `wk_${crypto.randomBytes(24).toString("hex")}`;
    const prefix = raw.slice(0, 10);
    await db.insert(webhookKeysTable).values({
      name,
      keyHash: hashKey(raw),
      keyPrefix: prefix,
      createdBy,
    });
    res.status(201).json({ key: raw, prefix, name, message: "Store this key securely — it will not be shown again." });
  } catch (err) {
    req.log?.error({ err }, "Create webhook key error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/webhooks/keys
 * Lists webhook keys (shows prefix only, not full hash).
 */
router.get("/keys", async (req, res) => {
  try {
    const keys = await db.select({
      id: webhookKeysTable.id,
      name: webhookKeysTable.name,
      keyPrefix: webhookKeysTable.keyPrefix,
      active: webhookKeysTable.active,
      lastUsedAt: webhookKeysTable.lastUsedAt,
      createdAt: webhookKeysTable.createdAt,
    }).from(webhookKeysTable);
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/webhooks/keys/:id
 */
router.delete("/keys/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await db.update(webhookKeysTable).set({ active: false }).where(eq(webhookKeysTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
