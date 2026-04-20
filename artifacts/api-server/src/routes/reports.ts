import { Router } from "express";
import { db } from "@workspace/db";
import { engagementsTable, journalEntriesTable, riskScoresTable, aiExplanationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

// PDF Report (simplified as HTML that can be printed)
router.get("/engagements/:id/report/pdf", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const [eng] = await db.select().from(engagementsTable)
      .where(and(eq(engagementsTable.id, engId), eq(engagementsTable.userId, req.userId!)));
    if (!eng) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];
    const scoreMap = new Map(scores.map(s => [s.entryId, s]));

    const explanations = entryIds.length > 0
      ? await db.select().from(aiExplanationsTable)
          .where(sql`${aiExplanationsTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];
    const explMap = new Map(explanations.map(e => [e.entryId, e]));

    const high = scores.filter(s => s.riskLevel === "HIGH").length;
    const medium = scores.filter(s => s.riskLevel === "MEDIUM").length;
    const low = scores.filter(s => s.riskLevel === "LOW").length;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>AuditIQ Risk Report — ${eng.name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 20mm; }
  h1 { font-size: 20px; color: #1e293b; }
  h2 { font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .meta { color: #64748b; margin-bottom: 20px; }
  .disclaimer { background: #fef9c3; border: 1px solid #fbbf24; padding: 8px; margin: 16px 0; font-style: italic; font-size: 11px; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .stat { text-align: center; }
  .stat .value { font-size: 24px; font-weight: bold; }
  .stat .label { font-size: 11px; color: #64748b; }
  .high { color: #dc2626; }
  .medium { color: #d97706; }
  .low { color: #16a34a; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 6px; border: 1px solid #e2e8f0; }
  td { padding: 5px 6px; border: 1px solid #e2e8f0; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px; }
  .badge-HIGH { background: #fee2e2; color: #dc2626; }
  .badge-MEDIUM { background: #fef3c7; color: #d97706; }
  .badge-LOW { background: #dcfce7; color: #16a34a; }
  .expl { color: #475569; font-style: italic; margin-top: 4px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<h1>AuditIQ Risk Assessment Report</h1>
<div class="meta">
  <strong>Engagement:</strong> ${eng.name} | <strong>Client:</strong> ${eng.clientName} | <strong>Period:</strong> ${eng.period}<br>
  <strong>Report Generated:</strong> ${new Date().toLocaleString()} | <strong>Status:</strong> ${eng.status}
</div>
<div class="disclaimer">
  DISCLAIMER: This is a risk indicator, not an audit conclusion. The risk scores are generated algorithmically based on ISA 240 risk factors and should be reviewed by a qualified auditor. AuditIQ does not replace professional judgment.
</div>
<h2>Risk Summary</h2>
<table>
<tr>
  <th>Total Entries</th>
  <th class="high">High Risk</th>
  <th class="medium">Medium Risk</th>
  <th class="low">Low Risk</th>
</tr>
<tr>
  <td>${entries.length}</td>
  <td class="high">${high}</td>
  <td class="medium">${medium}</td>
  <td class="low">${low}</td>
</tr>
</table>

<h2>Journal Entries — Detailed Risk Assessment</h2>
<table>
<tr>
  <th>Date</th>
  <th>Posted By</th>
  <th>Description</th>
  <th>Amount</th>
  <th>Risk Level</th>
  <th>Score</th>
  <th>AI Explanation</th>
</tr>
${entries.map(e => {
  const s = scoreMap.get(e.id);
  const expl = explMap.get(e.id);
  return `<tr>
    <td>${e.entryDate}</td>
    <td>${e.postedBy}</td>
    <td>${e.description}</td>
    <td>${parseFloat(e.amount).toLocaleString()}</td>
    <td><span class="badge badge-${s?.riskLevel ?? 'LOW'}">${s?.riskLevel ?? 'N/A'}</span></td>
    <td>${s ? parseFloat(s.totalScore).toFixed(1) : 'N/A'}</td>
    <td>${expl ? `<div class="expl">${expl.explanation}</div>` : ''}</td>
  </tr>`;
}).join('')}
</table>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `attachment; filename="auditiq-report-${engId}.html"`);
    res.send(html);
  } catch (err) {
    req.log.error({ err }, "PDF report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Excel Report (CSV format)
router.get("/engagements/:id/report/excel", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const [eng] = await db.select().from(engagementsTable)
      .where(and(eq(engagementsTable.id, engId), eq(engagementsTable.userId, req.userId!)));
    if (!eng) {
      res.status(404).json({ error: "Engagement not found" });
      return;
    }

    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];
    const scoreMap = new Map(scores.map(s => [s.entryId, s]));

    const headers = [
      "Entry Date", "Posted By", "Description", "Debit Account", "Credit Account",
      "Amount", "Posting Time", "Reference", "Risk Level", "Risk Score",
      "Posting Time Score", "Amount Score", "User Concentration Score", "Keyword Score",
      "Frequency Score", "Confidence Score", "Overridden", "Override Reason"
    ];

    const rows = entries.map(e => {
      const s = scoreMap.get(e.id);
      return [
        e.entryDate, e.postedBy, `"${e.description.replace(/"/g, '""')}"`,
        e.debitAccount ?? "", e.creditAccount ?? "",
        parseFloat(e.amount).toFixed(2), e.postingTime ?? "", e.referenceNumber ?? "",
        s?.riskLevel ?? "", s ? parseFloat(s.totalScore).toFixed(2) : "",
        s ? parseFloat(s.postingTimeScore).toFixed(2) : "",
        s ? parseFloat(s.amountScore).toFixed(2) : "",
        s ? parseFloat(s.userConcentrationScore).toFixed(2) : "",
        s ? parseFloat(s.keywordScore).toFixed(2) : "",
        s ? parseFloat(s.frequencyScore).toFixed(2) : "",
        s ? parseFloat(s.confidenceScore).toFixed(2) : "",
        s?.overridden ? "Yes" : "No",
        s?.overrideReason ?? "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="auditiq-export-${engId}.csv"`);
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Excel report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
