import { Router } from "express";
import { db } from "@workspace/db";
import { journalEntriesTable, riskScoresTable, aiExplanationsTable, engagementsTable, auditLogsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { classifyRisk } from "../lib/risk-engine.js";

const router = Router();
router.use(requireAuth);

// Get single entry with full details
router.get("/:entryId", async (req: AuthenticatedRequest, res) => {
  try {
    const entryId = parseInt(req.params.entryId as string, 10);
    const [entry] = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.id, entryId));
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    const [score] = await db.select().from(riskScoresTable).where(eq(riskScoresTable.entryId, entryId));
    const [explanation] = await db.select().from(aiExplanationsTable).where(eq(aiExplanationsTable.entryId, entryId));

    res.json({
      ...entry,
      amount: parseFloat(entry.amount),
      riskScore: score ? {
        ...score,
        totalScore: parseFloat(score.totalScore),
        postingTimeScore: parseFloat(score.postingTimeScore),
        amountScore: parseFloat(score.amountScore),
        userConcentrationScore: parseFloat(score.userConcentrationScore),
        keywordScore: parseFloat(score.keywordScore),
        frequencyScore: parseFloat(score.frequencyScore),
        confidenceScore: parseFloat(score.confidenceScore),
      } : null,
      aiExplanation: explanation ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Get entry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Auditor override (HITL)
router.post("/:entryId/override", async (req: AuthenticatedRequest, res) => {
  try {
    const entryId = parseInt(req.params.entryId as string, 10);
    const {
      riskLevel,
      reason,
      feedbackCategory,
      confidenceLevel,
    } = req.body as {
      riskLevel: "HIGH" | "MEDIUM" | "LOW";
      reason: string;
      feedbackCategory?: "CLERICAL_ERROR" | "POLICY_EXCEPTION" | "BUSINESS_JUSTIFICATION" | "SYSTEM_ERROR" | "OTHER";
      confidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
    };

    if (!riskLevel || !reason) {
      res.status(400).json({ error: "riskLevel and reason are required" });
      return;
    }

    const [entry] = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.id, entryId));
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

    // Capture previous risk level for audit trail
    const [existing] = await db.select().from(riskScoresTable).where(eq(riskScoresTable.entryId, entryId));
    const previousRiskLevel = existing?.riskLevel ?? null;

    const [updated] = await db.update(riskScoresTable)
      .set({
        riskLevel,
        overridden: true,
        overrideReason: reason,
        overriddenBy: user?.name ?? req.userEmail ?? "Unknown",
        overriddenAt: new Date(),
      })
      .where(eq(riskScoresTable.entryId, entryId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Risk score not found" });
      return;
    }

    // Rich audit log with HITL metadata
    await db.insert(auditLogsTable).values({
      engagementId: entry.engagementId,
      userId: req.userId!,
      action: "RISK_OVERRIDE",
      entityType: "journal_entry",
      entityId: entryId,
      details: `Risk level changed from ${previousRiskLevel ?? "UNKNOWN"} to ${riskLevel}: ${reason}`,
      previousValue: previousRiskLevel ?? undefined,
      ipAddress: req.ip,
      metadata: {
        feedbackCategory: feedbackCategory ?? "OTHER",
        confidenceLevel: confidenceLevel ?? "MEDIUM",
        newRiskLevel: riskLevel,
        previousRiskLevel,
        auditorName: user?.name ?? req.userEmail ?? "Unknown",
        reason,
      },
    });

    res.json({
      ...updated,
      totalScore: parseFloat(updated.totalScore),
      postingTimeScore: parseFloat(updated.postingTimeScore),
      amountScore: parseFloat(updated.amountScore),
      userConcentrationScore: parseFloat(updated.userConcentrationScore),
      keywordScore: parseFloat(updated.keywordScore),
      frequencyScore: parseFloat(updated.frequencyScore),
      confidenceScore: parseFloat(updated.confidenceScore),
    });
  } catch (err) {
    req.log.error({ err }, "Override error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get AI explanation
router.get("/:entryId/explanation", async (req: AuthenticatedRequest, res) => {
  try {
    const entryId = parseInt(req.params.entryId as string, 10);
    const [explanation] = await db.select().from(aiExplanationsTable).where(eq(aiExplanationsTable.entryId, entryId));
    if (!explanation) {
      res.status(404).json({ error: "No AI explanation available" });
      return;
    }
    res.json(explanation);
  } catch (err) {
    req.log.error({ err }, "Get explanation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate AI explanation
router.post("/:entryId/explanation", async (req: AuthenticatedRequest, res) => {
  try {
    const entryId = parseInt(req.params.entryId as string, 10);
    const [entry] = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.id, entryId));
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    const [score] = await db.select().from(riskScoresTable).where(eq(riskScoresTable.entryId, entryId));

    // Only generate for MEDIUM and HIGH risk
    if (score && score.riskLevel === "LOW") {
      res.status(400).json({ error: "AI explanations are only generated for MEDIUM and HIGH risk entries" });
      return;
    }

    const scoreDetails = score ? `
- Total Risk Score: ${parseFloat(score.totalScore)}/100
- Risk Level: ${score.riskLevel}
- Posting Time Score: ${parseFloat(score.postingTimeScore)}/25
- Amount Score: ${parseFloat(score.amountScore)}/25
- User Concentration Score: ${parseFloat(score.userConcentrationScore)}/20
- Keyword Score: ${parseFloat(score.keywordScore)}/20
- Frequency Score: ${parseFloat(score.frequencyScore)}/10` : "";

    const prompt = `You are a forensic audit expert analyzing a journal entry for risk under ISA 240. Return JSON only with exactly these keys: forensicRiskHypothesis, isa240Mapping, recommendedSubstantiveAction, triggers. Keep each of the first three values under 80 words. The ISA mapping must name a specific ISA 240 paragraph or clearly state the paragraph reference is a professional judgement point to validate against the firm's licensed standard. The substantive action must be an exact next procedure for a junior auditor.

Journal Entry:
- Date: ${entry.entryDate}
- Posted By: ${entry.postedBy}
- Description: ${entry.description}
- Amount: ${entry.amount}
- Posting Time: ${entry.postingTime ?? "Unknown"}
- Debit Account: ${entry.debitAccount ?? "Unknown"}
- Credit Account: ${entry.creditAccount ?? "Unknown"}
${scoreDetails}

Respond with JSON: {"forensicRiskHypothesis":"...", "isa240Mapping":"ISA 240 paragraph ...", "recommendedSubstantiveAction":"...", "triggers":["..."]}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";

    let parsed: { forensicRiskHypothesis: string; isa240Mapping: string; recommendedSubstantiveAction: string; triggers: string[] } = {
      forensicRiskHypothesis: text.slice(0, 400),
      isa240Mapping: "ISA 240 — validate the applicable paragraph against the firm's licensed standard.",
      recommendedSubstantiveAction: "Inspect the supporting document and make a documented management inquiry.",
      triggers: [],
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use raw text
    }

    // Upsert explanation
    const existing = await db.select().from(aiExplanationsTable).where(eq(aiExplanationsTable.entryId, entryId));
    let explanation;
    if (existing.length > 0) {
      [explanation] = await db.update(aiExplanationsTable)
        .set({
          explanation: parsed.forensicRiskHypothesis,
          forensicRiskHypothesis: parsed.forensicRiskHypothesis,
          isa240Mapping: parsed.isa240Mapping,
          recommendedSubstantiveAction: parsed.recommendedSubstantiveAction,
          triggers: parsed.triggers,
          isaReference: parsed.isa240Mapping,
          generatedAt: new Date(),
        })
        .where(eq(aiExplanationsTable.entryId, entryId))
        .returning();
    } else {
      [explanation] = await db.insert(aiExplanationsTable).values({
        entryId,
        explanation: parsed.forensicRiskHypothesis,
        forensicRiskHypothesis: parsed.forensicRiskHypothesis,
        isa240Mapping: parsed.isa240Mapping,
        recommendedSubstantiveAction: parsed.recommendedSubstantiveAction,
        triggers: parsed.triggers,
        isaReference: parsed.isa240Mapping,
      }).returning();
    }

    res.json(explanation);
  } catch (err) {
    req.log.error({ err }, "Generate explanation error");
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

export default router;
