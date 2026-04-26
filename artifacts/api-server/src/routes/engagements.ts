import { Router } from "express";
import { db } from "@workspace/db";
import { engagementsTable, journalEntriesTable, riskScoresTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const engagements = await db.select().from(engagementsTable)
      .where(eq(engagementsTable.userId, req.userId!));

    const result = await Promise.all(engagements.map(async (eng) => {
      const counts = await db.select({
        total: sql<number>`count(*)`,
        high: sql<number>`sum(case when ${riskScoresTable.riskLevel} = 'HIGH' then 1 else 0 end)`,
        medium: sql<number>`sum(case when ${riskScoresTable.riskLevel} = 'MEDIUM' then 1 else 0 end)`,
        low: sql<number>`sum(case when ${riskScoresTable.riskLevel} = 'LOW' then 1 else 0 end)`,
      }).from(journalEntriesTable)
        .leftJoin(riskScoresTable, eq(riskScoresTable.entryId, journalEntriesTable.id))
        .where(eq(journalEntriesTable.engagementId, eng.id));

      const c = counts[0];
      return {
        ...eng,
        totalEntries: Number(c?.total ?? 0),
        highRiskCount: Number(c?.high ?? 0),
        mediumRiskCount: Number(c?.medium ?? 0),
        lowRiskCount: Number(c?.low ?? 0),
      };
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "List engagements error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, clientName, period, description } = req.body;
    if (!name || !clientName || !period) {
      res.status(400).json({ error: "name, clientName, and period are required" });
      return;
    }

    const [engagement] = await db.insert(engagementsTable).values({
      userId: req.userId!,
      name,
      clientName,
      period,
      description: description ?? null,
    }).returning();

    res.status(201).json({ ...engagement, totalEntries: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Create engagement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [eng] = await db.select().from(engagementsTable)
      .where(and(eq(engagementsTable.id, id), eq(engagementsTable.userId, req.userId!)));
    if (!eng) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    const counts = await db.select({
      total: sql<number>`count(*)`,
      high: sql<number>`sum(case when ${riskScoresTable.riskLevel} = 'HIGH' then 1 else 0 end)`,
      medium: sql<number>`sum(case when ${riskScoresTable.riskLevel} = 'MEDIUM' then 1 else 0 end)`,
      low: sql<number>`sum(case when ${riskScoresTable.riskLevel} = 'LOW' then 1 else 0 end)`,
    }).from(journalEntriesTable)
      .leftJoin(riskScoresTable, eq(riskScoresTable.entryId, journalEntriesTable.id))
      .where(eq(journalEntriesTable.engagementId, id));

    const c = counts[0];
    res.json({
      ...eng,
      totalEntries: Number(c?.total ?? 0),
      highRiskCount: Number(c?.high ?? 0),
      mediumRiskCount: Number(c?.medium ?? 0),
      lowRiskCount: Number(c?.low ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Get engagement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [eng] = await db.select().from(engagementsTable)
      .where(and(eq(engagementsTable.id, id), eq(engagementsTable.userId, req.userId!)));
    if (!eng) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }
    await db.delete(engagementsTable).where(eq(engagementsTable.id, id));
    res.json({ message: "Engagement deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete engagement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
