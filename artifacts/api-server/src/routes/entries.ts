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
    const entryId = parseInt(req.params.entryId, 10);
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

// Auditor override
router.post("/:entryId/override", async (req: AuthenticatedRequest, res) => {
  try {
    const entryId = parseInt(req.params.entryId, 10);
    const { riskLevel, reason } = req.body;

    if (!riskLevel || !reason) {
      res.status(400).json({ error: "riskLevel and reason are required" });
      return;
    }

    const [entry] = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.id, entryId));
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    // Get user name
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

    const [updated] = await db.update(riskScoresTable)
      .set({
        riskLevel: riskLevel as "HIGH" | "MEDIUM" | "LOW",
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

    // Log action
    await db.insert(auditLogsTable).values({
      engagementId: entry.engagementId,
      userId: req.userId!,
      action: "RISK_OVERRIDE",
      entityType: "journal_entry",
      entityId: entryId,
      details: `Risk level changed to ${riskLevel}: ${reason}`,
      ipAddress: req.ip,
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
    const entryId = parseInt(req.params.entryId, 10);
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
    const entryId = parseInt(req.params.entryId, 10);
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

    const prompt = `You are a forensic audit expert analyzing a journal entry for risk. Explain why this entry is risky based on ISA 240 (The Auditor's Responsibilities Relating to Fraud). Keep under 80 words. Mention specific risk triggers.

Journal Entry:
- Date: ${entry.entryDate}
- Posted By: ${entry.postedBy}
- Description: ${entry.description}
- Amount: ${entry.amount}
- Posting Time: ${entry.postingTime ?? "Unknown"}
- Debit Account: ${entry.debitAccount ?? "Unknown"}
- Credit Account: ${entry.creditAccount ?? "Unknown"}
${scoreDetails}

Respond with JSON: {"explanation": "...", "triggers": ["trigger1", "trigger2"], "isaReference": "ISA 240 paragraph X"}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";

    let parsed: { explanation: string; triggers: string[]; isaReference: string } = {
      explanation: text.slice(0, 400),
      triggers: [],
      isaReference: "ISA 240",
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
          explanation: parsed.explanation,
          triggers: parsed.triggers,
          isaReference: parsed.isaReference,
          generatedAt: new Date(),
        })
        .where(eq(aiExplanationsTable.entryId, entryId))
        .returning();
    } else {
      [explanation] = await db.insert(aiExplanationsTable).values({
        entryId,
        explanation: parsed.explanation,
        triggers: parsed.triggers,
        isaReference: parsed.isaReference,
      }).returning();
    }

    res.json(explanation);
  } catch (err) {
    req.log.error({ err }, "Generate explanation error");
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

export default router;
