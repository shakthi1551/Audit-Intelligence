import { Router } from "express";
import { db } from "@workspace/db";
import { engagementsTable, journalEntriesTable, riskScoresTable } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { scoreEntries } from "../lib/risk-engine.js";
import {
  GetFraudEvaluationSummaryParams,
  GetFraudEvaluationSummaryQueryParams,
  GetFraudEvaluationSummaryResponse,
} from "@workspace/api-zod";

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
    const id = parseInt(req.params.id as string, 10);
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

router.patch("/:id/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const overallMateriality = Number(req.body?.overallMateriality);
    const performanceMateriality = Number(req.body?.performanceMateriality);
    if (!Number.isFinite(overallMateriality) || !Number.isFinite(performanceMateriality) ||
        overallMateriality < 0 || performanceMateriality < 0 ||
        performanceMateriality > overallMateriality) {
      res.status(400).json({ error: "Materiality values must be non-negative and performance materiality cannot exceed overall materiality" });
      return;
    }
    const [current] = await db.select({
      overallMateriality: engagementsTable.overallMateriality,
      performanceMateriality: engagementsTable.performanceMateriality,
    }).from(engagementsTable)
      .where(and(eq(engagementsTable.id, id), eq(engagementsTable.userId, req.userId!)));
    const [updated] = await db.update(engagementsTable)
      .set({ overallMateriality: overallMateriality.toFixed(2), performanceMateriality: performanceMateriality.toFixed(2), updatedAt: new Date() })
      .where(and(eq(engagementsTable.id, id), eq(engagementsTable.userId, req.userId!)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }
    await scoreEntries(id);
    await db.insert(auditLogsTable).values({
      engagementId: id, userId: req.userId!, action: "ENGAGEMENT_SETTINGS_UPDATED",
      entityType: "engagement", entityId: id,
      details: `Materiality updated from ${current?.overallMateriality ?? "0"}/${current?.performanceMateriality ?? "0"} to ${overallMateriality}/${performanceMateriality}`,
      ipAddress: req.ip,
    });
    res.json({ ...updated, overallMateriality: Number(updated.overallMateriality), performanceMateriality: Number(updated.performanceMateriality) });
  } catch (err) {
    req.log.error({ err }, "Update engagement settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/fraud-evaluation", async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const params = GetFraudEvaluationSummaryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const query = GetFraudEvaluationSummaryQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const engagementId = params.data.id;
    const [engagement] = await db.select({ id: engagementsTable.id }).from(engagementsTable)
      .where(and(
        eq(engagementsTable.id, engagementId),
        eq(engagementsTable.userId, req.userId!),
      ));
    if (!engagement) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    const entries = await db.select({
      id: journalEntriesTable.id,
      outcome: journalEntriesTable.evaluationOutcome,
    }).from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engagementId));
    const scores = entries.length > 0
      ? await db.select({
          entryId: riskScoresTable.entryId,
          totalScore: riskScoresTable.totalScore,
        }).from(riskScoresTable)
          .where(inArray(riskScoresTable.entryId, entries.map((entry) => entry.id)))
      : [];
    const scoreByEntry = new Map<number, string>();
    for (const score of scores) {
      if (!scoreByEntry.has(score.entryId)) {
        scoreByEntry.set(score.entryId, score.totalScore);
      }
    }

    let truePositive = 0;
    let falsePositive = 0;
    let trueNegative = 0;
    let falseNegative = 0;
    let confirmedFraudEntries = 0;
    let legitimateEntries = 0;
    let inconclusiveEntries = 0;
    let unreviewedEntries = 0;
    let unscoredEntries = 0;
    let evaluatedEntries = 0;

    const positiveThreshold = query.data.threshold === "HIGH" ? 70 : 40;
    for (const entry of entries) {
      if (entry.outcome === null) {
        unreviewedEntries += 1;
        continue;
      }
      if (entry.outcome === "INCONCLUSIVE") {
        inconclusiveEntries += 1;
        continue;
      }

      const actualFraud = entry.outcome === "CONFIRMED_FRAUD";
      if (actualFraud) confirmedFraudEntries += 1;
      else legitimateEntries += 1;

      const score = scoreByEntry.get(entry.id);
      if (score === undefined) {
        unscoredEntries += 1;
        continue;
      }

      evaluatedEntries += 1;
      const predictedFraud = Number(score) >= positiveThreshold;
      if (actualFraud && predictedFraud) truePositive += 1;
      else if (!actualFraud && predictedFraud) falsePositive += 1;
      else if (!actualFraud) trueNegative += 1;
      else falseNegative += 1;
    }

    const precision = truePositive + falsePositive > 0
      ? truePositive / (truePositive + falsePositive)
      : null;
    const recall = truePositive + falseNegative > 0
      ? truePositive / (truePositive + falseNegative)
      : null;
    const f1Denominator = 2 * truePositive + falsePositive + falseNegative;
    const f1 = f1Denominator > 0 ? (2 * truePositive) / f1Denominator : null;
    const rounded = (value: number | null) => value === null ? null : Number(value.toFixed(4));

    res.json(GetFraudEvaluationSummaryResponse.parse({
      threshold: query.data.threshold,
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative,
      precision: rounded(precision),
      recall: rounded(recall),
      f1: rounded(f1),
      evaluatedEntries,
      confirmedFraudEntries,
      legitimateEntries,
      inconclusiveEntries,
      unreviewedEntries,
      unscoredEntries,
    }));
  } catch (err) {
    req.log.error({ err }, "Fraud evaluation summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/calibration", async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [engagement] = await db.select({ id: engagementsTable.id }).from(engagementsTable)
      .where(and(eq(engagementsTable.id, id), eq(engagementsTable.userId, req.userId!)));
    if (!engagement) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }
    const overrides = await db.select().from(auditLogsTable)
      .where(and(eq(auditLogsTable.engagementId, id), eq(auditLogsTable.action, "RISK_OVERRIDE")))
      .orderBy(desc(auditLogsTable.createdAt));
    const highConfidence = overrides.filter((item) => {
      const metadata = item.metadata as Record<string, unknown> | null;
      return metadata?.confidenceLevel === "HIGH";
    }).length;
    const agreementRate = overrides.length ? Math.round((highConfidence / overrides.length) * 100) : 0;
    const recommendation = overrides.length === 0
      ? "Collect a few high-confidence review decisions to start calibrating the heuristic."
      : agreementRate >= 70
        ? "Signals are stable. Increase reviewer confidence and keep current weighting."
        : "The heuristic is uncertain. Review posting-time and amount exceptions before changing weights.";
    res.json({
      labeledOverrides: overrides.length,
      highConfidenceOverrides: highConfidence,
      agreementRate,
      recommendation,
      weights: { postingTime: 25, amount: 20, userConcentration: 20, keywords: 20, frequency: 10, mlAnomaly: 5 },
    });
  } catch (err) {
    req.log.error({ err }, "Calibration summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
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
