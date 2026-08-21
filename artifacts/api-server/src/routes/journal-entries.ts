import { Router } from "express";
import { computeBeneishTags } from "../lib/beneish-engine.js";
import { db } from "@workspace/db";
import { engagementsTable, journalEntriesTable, riskScoresTable, aiExplanationsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { parseCsv } from "../lib/file-parser.js";
import { scoreEntries } from "../lib/risk-engine.js";
import { auditLogsTable } from "@workspace/db";

const router = Router();

router.use(requireAuth);

// Upload CSV/XLSX
router.post("/:id/upload", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id as string, 10);

    // Verify engagement ownership
    const [eng] = await db.select().from(engagementsTable)
      .where(and(eq(engagementsTable.id, engId), eq(engagementsTable.userId, req.userId!)));
    if (!eng) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    // Read raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const content = buffer.toString("utf-8");

    const { entries, errors } = parseCsv(content);
    const referenceCounts = new Map<string, number>();
    let sourceDebitTotal = 0;
    let sourceCreditTotal = 0;
    let debitObserved = false;
    let creditObserved = false;
    for (const entry of entries) {
      if (entry.referenceNumber) referenceCounts.set(entry.referenceNumber, (referenceCounts.get(entry.referenceNumber) ?? 0) + 1);
      const raw = entry.rawData as Record<string, unknown>;
      const debitKey = Object.keys(raw).find((key) => /^(debit|dr)([_ ]?amount)?$/i.test(key));
      const creditKey = Object.keys(raw).find((key) => /^(credit|cr)([_ ]?amount)?$/i.test(key));
      if (debitKey && raw[debitKey] !== "") { sourceDebitTotal += Number(String(raw[debitKey]).replace(/[,$\s]/g, "")) || 0; debitObserved = true; }
      if (creditKey && raw[creditKey] !== "") { sourceCreditTotal += Number(String(raw[creditKey]).replace(/[,$\s]/g, "")) || 0; creditObserved = true; }
    }
    const duplicateReferenceCount = [...referenceCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
    const missingReferenceCount = entries.filter((entry) => !entry.referenceNumber).length;
    const imbalance = Math.abs(sourceDebitTotal - sourceCreditTotal);
    const reconciliationWarnings = [
      ...(debitObserved && creditObserved && imbalance > 0.01 ? [`Ledger is out of balance by ${imbalance.toFixed(2)}`] : []),
      ...(duplicateReferenceCount > 0 ? [`${duplicateReferenceCount} duplicate reference number(s) detected`] : []),
      ...(missingReferenceCount > 0 ? [`${missingReferenceCount} row(s) have no reference number`] : []),
    ];

    if (entries.length === 0) {
      res.status(400).json({
        message: "No valid entries found",
        engagementId: engId,
        totalRows: 0,
        processedRows: 0,
        errors,
      });
      return;
    }

    // Batch insert entries
    const inserted = await db.insert(journalEntriesTable).values(
      entries.map(e => ({
        engagementId: engId,
        entryDate: e.entryDate,
        postedBy: e.postedBy,
        description: e.description,
        amount: e.amount.toFixed(2),
        debitAccount: e.debitAccount ?? null,
        creditAccount: e.creditAccount ?? null,
        postingTime: e.postingTime ?? null,
        referenceNumber: e.referenceNumber ?? null,
        rawData: e.rawData,
      }))
    ).returning();

    // Score all entries for this engagement
    await scoreEntries(engId);

    // Log action
    await db.insert(auditLogsTable).values({
      engagementId: engId,
      userId: req.userId!,
      action: "FILE_UPLOADED",
      entityType: "engagement",
      entityId: engId,
      details: `Uploaded ${inserted.length} journal entries`,
      ipAddress: req.ip,
    });

    res.status(202).json({
      message: `Successfully processed ${inserted.length} entries`,
      engagementId: engId,
      totalRows: entries.length,
      processedRows: inserted.length,
      errors,
      reconciliation: {
        sourceDebitTotal, sourceCreditTotal, imbalance,
        isBalanced: debitObserved && creditObserved ? imbalance <= 0.01 : true,
        duplicateReferenceCount, missingReferenceCount,
        warningCount: reconciliationWarnings.length, warnings: reconciliationWarnings,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Upload error");
    res.status(500).json({ error: "Upload failed", details: err instanceof Error ? err.message : "Unknown error" });
  }
});

// List entries with filters
router.get("/:id/entries", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id as string, 10);
    const page = parseInt(req.query.page as string ?? "1", 10);
    const pageSize = parseInt(req.query.pageSize as string ?? "50", 10);
    const riskLevel = req.query.riskLevel as string | undefined;

    // Verify ownership
    const [eng] = await db.select().from(engagementsTable)
      .where(and(eq(engagementsTable.id, engId), eq(engagementsTable.userId, req.userId!)));
    if (!eng) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId))
      .orderBy(desc(journalEntriesTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [totalRow] = await db.select({ count: sql<number>`count(*)` })
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    // Get risk scores for entries
    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(${sql.raw(`ARRAY[${entryIds.join(",")}]`)})`)
      : [];

    const scoreMap = new Map(scores.map(s => [s.entryId, s]));

    // Pre-compute Beneish tags using all entries in the engagement for percentile baselines
    const allEngEntries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));
    const allMapped = allEngEntries.map(e => ({
      id: e.id,
      debitAccount: e.debitAccount ?? "",
      creditAccount: e.creditAccount ?? null,
      description: e.description,
      amount: parseFloat(e.amount),
    }));

    // Filter by risk level if requested
    let enrichedEntries = entries.map(e => ({
      ...e,
      amount: parseFloat(e.amount),
      riskScore: scoreMap.get(e.id) ? {
        ...scoreMap.get(e.id)!,
        totalScore: parseFloat(scoreMap.get(e.id)!.totalScore),
        postingTimeScore: parseFloat(scoreMap.get(e.id)!.postingTimeScore),
        amountScore: parseFloat(scoreMap.get(e.id)!.amountScore),
        userConcentrationScore: parseFloat(scoreMap.get(e.id)!.userConcentrationScore),
        keywordScore: parseFloat(scoreMap.get(e.id)!.keywordScore),
        frequencyScore: parseFloat(scoreMap.get(e.id)!.frequencyScore),
        confidenceScore: parseFloat(scoreMap.get(e.id)!.confidenceScore),
      } : null,
      beneishTags: computeBeneishTags(
        { id: e.id, debitAccount: e.debitAccount ?? "", creditAccount: e.creditAccount ?? null, description: e.description, amount: parseFloat(e.amount) },
        allMapped,
      ),
    }));

    if (riskLevel) {
      enrichedEntries = enrichedEntries.filter(e => e.riskScore?.riskLevel === riskLevel);
    }

    const total = Number(totalRow?.count ?? 0);
    res.json({
      entries: enrichedEntries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    req.log.error({ err }, "List entries error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
