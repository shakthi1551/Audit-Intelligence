import { Router } from "express";
import { db } from "@workspace/db";
import { engagementsTable, journalEntriesTable, riskScoresTable, aiExplanationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { computeBenford } from "../lib/risk-engine.js";

const router = Router();
router.use(requireAuth);

// Overall dashboard - /api/dashboard/overview
router.get("/overview", async (req: AuthenticatedRequest, res) => {
  try {
    const engagements = await db.select().from(engagementsTable)
      .where(eq(engagementsTable.userId, req.userId!))
      .orderBy(desc(engagementsTable.createdAt));

    let totalEntries = 0, totalHigh = 0, totalMedium = 0, totalLow = 0;
    for (const eng of engagements) {
      const counts = await db.select({
        total: sql<number>`count(*)`,
        high: sql<number>`sum(case when rs.risk_level = 'HIGH' then 1 else 0 end)`,
        medium: sql<number>`sum(case when rs.risk_level = 'MEDIUM' then 1 else 0 end)`,
        low: sql<number>`sum(case when rs.risk_level = 'LOW' then 1 else 0 end)`,
      }).from(journalEntriesTable)
        .leftJoin(riskScoresTable, eq(riskScoresTable.entryId, journalEntriesTable.id))
        .where(eq(journalEntriesTable.engagementId, eng.id));
      const c = counts[0];
      totalEntries += Number(c?.total ?? 0);
      totalHigh += Number(c?.high ?? 0);
      totalMedium += Number(c?.medium ?? 0);
      totalLow += Number(c?.low ?? 0);
    }

    res.json({
      totalEngagements: engagements.length,
      activeEngagements: engagements.filter(e => e.status === "ACTIVE").length,
      totalEntriesProcessed: totalEntries,
      totalHighRisk: totalHigh,
      totalMediumRisk: totalMedium,
      totalLowRisk: totalLow,
      recentEngagements: engagements.slice(0, 5).map(e => ({ ...e, totalEntries: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0 })),
      overallRiskTrend: totalHigh > totalMedium ? "ELEVATED" : "NORMAL",
    });
  } catch (err) {
    req.log.error({ err }, "Overall dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Engagement dashboard summary
router.get("/engagements/:id/summary", async (req: AuthenticatedRequest, res) => {
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

    const highEntries = scores.filter(s => s.riskLevel === "HIGH");
    const mediumEntries = scores.filter(s => s.riskLevel === "MEDIUM");
    const lowEntries = scores.filter(s => s.riskLevel === "LOW");

    const total = entries.length;
    const avgScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + parseFloat(s.totalScore), 0) / scores.length
      : 0;

    // Top risky users
    const userStats: Record<string, { count: number; high: number; totalAmount: number; totalScore: number }> = {};
    for (const entry of entries) {
      const score = scoreMap.get(entry.id);
      if (!userStats[entry.postedBy]) {
        userStats[entry.postedBy] = { count: 0, high: 0, totalAmount: 0, totalScore: 0 };
      }
      userStats[entry.postedBy].count++;
      userStats[entry.postedBy].totalAmount += parseFloat(entry.amount);
      if (score) {
        userStats[entry.postedBy].totalScore += parseFloat(score.totalScore);
        if (score.riskLevel === "HIGH") userStats[entry.postedBy].high++;
      }
    }

    const topRiskyUsers = Object.entries(userStats)
      .map(([user, stats]) => ({
        user,
        entryCount: stats.count,
        highRiskCount: stats.high,
        avgScore: stats.count > 0 ? stats.totalScore / stats.count : 0,
        totalAmount: stats.totalAmount,
      }))
      .sort((a, b) => b.highRiskCount - a.highRiskCount || b.avgScore - a.avgScore)
      .slice(0, 10);

    // After hours and weekend counts
    const afterHoursCount = entries.filter(e => {
      if (!e.postingTime) return false;
      const match = e.postingTime.match(/(\d{1,2}):/);
      if (!match) return false;
      const hour = parseInt(match[1], 10);
      return hour < 8 || hour >= 18;
    }).length;

    const weekendCount = entries.filter(e => {
      try {
        const d = new Date(e.entryDate);
        return d.getDay() === 0 || d.getDay() === 6;
      } catch { return false; }
    }).length;

    const explanationCount = entryIds.length > 0
      ? (await db.select({ count: sql<number>`count(*)` }).from(aiExplanationsTable)
          .where(sql`${aiExplanationsTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`))[0]?.count ?? 0
      : 0;

    // Recent high risk entries
    const recentHighRiskScores = scores
      .filter(s => s.riskLevel === "HIGH")
      .slice(0, 5);
    const recentHighRisk = recentHighRiskScores.map(s => {
      const entry = entries.find(e => e.id === s.entryId);
      return entry ? { ...entry, amount: parseFloat(entry.amount), riskScore: { ...s, totalScore: parseFloat(s.totalScore) } } : null;
    }).filter(Boolean);

    // Duplicate suspects: same user + same amount + same day
    const seen = new Set<string>();
    let duplicateSuspects = 0;
    for (const entry of entries) {
      const key = `${entry.postedBy}|${entry.amount}|${entry.entryDate}`;
      if (seen.has(key)) duplicateSuspects++;
      seen.add(key);
    }

    res.json({
      engagementId: engId,
      totalEntries: total,
      highRiskCount: highEntries.length,
      mediumRiskCount: mediumEntries.length,
      lowRiskCount: lowEntries.length,
      highRiskPct: total > 0 ? (highEntries.length / total) * 100 : 0,
      mediumRiskPct: total > 0 ? (mediumEntries.length / total) * 100 : 0,
      lowRiskPct: total > 0 ? (lowEntries.length / total) * 100 : 0,
      avgRiskScore: avgScore,
      topRiskyUsers,
      recentHighRisk,
      afterHoursCount,
      weekendCount,
      aiExplanationCount: Number(explanationCount),
      duplicateSuspects,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// User heatmap
router.get("/engagements/:id/heatmap/users", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];
    const scoreMap = new Map(scores.map(s => [s.entryId, s]));

    const userStats: Record<string, { total: number; high: number; totalScore: number; totalAmount: number }> = {};
    for (const e of entries) {
      const s = scoreMap.get(e.id);
      if (!userStats[e.postedBy]) userStats[e.postedBy] = { total: 0, high: 0, totalScore: 0, totalAmount: 0 };
      userStats[e.postedBy].total++;
      userStats[e.postedBy].totalAmount += parseFloat(e.amount);
      if (s) {
        userStats[e.postedBy].totalScore += parseFloat(s.totalScore);
        if (s.riskLevel === "HIGH") userStats[e.postedBy].high++;
      }
    }

    const result = Object.entries(userStats).map(([user, stats]) => ({
      user,
      totalEntries: stats.total,
      highRiskEntries: stats.high,
      avgRiskScore: stats.total > 0 ? stats.totalScore / stats.total : 0,
      totalAmount: stats.totalAmount,
      riskConcentration: stats.total > 0 ? (stats.high / stats.total) * 100 : 0,
    })).sort((a, b) => b.riskConcentration - a.riskConcentration);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "User heatmap error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Time heatmap
router.get("/engagements/:id/heatmap/time", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];
    const scoreMap = new Map(scores.map(s => [s.entryId, s]));

    const heatmap: Record<string, { count: number; totalScore: number }> = {};

    for (const e of entries) {
      const s = scoreMap.get(e.id);
      let hour = -1;
      let dayOfWeek = -1;

      if (e.postingTime) {
        const match = e.postingTime.match(/(\d{1,2}):/);
        if (match) hour = parseInt(match[1], 10);
      }
      try {
        const d = new Date(e.entryDate);
        dayOfWeek = d.getDay();
      } catch { }

      if (hour === -1 || dayOfWeek === -1) continue;

      const key = `${hour}|${dayOfWeek}`;
      if (!heatmap[key]) heatmap[key] = { count: 0, totalScore: 0 };
      heatmap[key].count++;
      if (s) heatmap[key].totalScore += parseFloat(s.totalScore);
    }

    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = Object.entries(heatmap).map(([key, data]) => {
      const [hour, dayOfWeek] = key.split("|").map(Number);
      return {
        hour,
        dayOfWeek,
        entryCount: data.count,
        avgRiskScore: data.count > 0 ? data.totalScore / data.count : 0,
        label: `${DAYS[dayOfWeek]} ${hour}:00`,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Time heatmap error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Risk distribution
router.get("/engagements/:id/risk-distribution", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];

    const high = scores.filter(s => s.riskLevel === "HIGH").length;
    const medium = scores.filter(s => s.riskLevel === "MEDIUM").length;
    const low = scores.filter(s => s.riskLevel === "LOW").length;

    const ranges = [
      { range: "0-20", count: 0 }, { range: "21-40", count: 0 },
      { range: "41-60", count: 0 }, { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ];

    for (const s of scores) {
      const score = parseFloat(s.totalScore);
      if (score <= 20) ranges[0].count++;
      else if (score <= 40) ranges[1].count++;
      else if (score <= 60) ranges[2].count++;
      else if (score <= 80) ranges[3].count++;
      else ranges[4].count++;
    }

    res.json({ high, medium, low, scoreBreakdown: ranges });
  } catch (err) {
    req.log.error({ err }, "Risk distribution error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Benford's Law analysis
router.get("/engagements/:id/benford", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const amounts = entries.map(e => parseFloat(e.amount));
    const digits = computeBenford(amounts);

    const avgDeviation = digits.reduce((sum, d) => sum + d.deviation, 0) / digits.length;
    let riskAssessment = "LOW";
    if (avgDeviation > 5) riskAssessment = "HIGH";
    else if (avgDeviation > 3) riskAssessment = "MEDIUM";

    res.json({
      engagementId: engId,
      digits,
      deviationScore: parseFloat(avgDeviation.toFixed(2)),
      riskAssessment,
      summary: `Average deviation from Benford's Law: ${avgDeviation.toFixed(2)}%. ${riskAssessment === "HIGH" ? "Significant deviations detected — potential data manipulation risk." : riskAssessment === "MEDIUM" ? "Some deviations noted — further review recommended." : "Distribution broadly consistent with Benford's Law."}`,
    });
  } catch (err) {
    req.log.error({ err }, "Benford analysis error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Duplicate detection
router.get("/engagements/:id/duplicates", async (req: AuthenticatedRequest, res) => {
  try {
    const engId = parseInt(req.params.id, 10);
    const entries = await db.select().from(journalEntriesTable)
      .where(eq(journalEntriesTable.engagementId, engId));

    const entryIds = entries.map(e => e.id);
    const scores = entryIds.length > 0
      ? await db.select().from(riskScoresTable)
          .where(sql`${riskScoresTable.entryId} = ANY(ARRAY[${sql.raw(entryIds.join(",") || "NULL")}]::int[])`)
      : [];
    const scoreMap = new Map(scores.map(s => [s.entryId, s]));

    const groups: Map<string, typeof entries> = new Map();
    for (const e of entries) {
      const key = `${e.postedBy}|${parseFloat(e.amount).toFixed(2)}|${e.entryDate}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }

    const duplicateGroups = Array.from(groups.entries())
      .filter(([, grp]) => grp.length > 1)
      .map(([key, grp]) => {
        const avgScore = grp.reduce((sum, e) => {
          const s = scoreMap.get(e.id);
          return sum + (s ? parseFloat(s.totalScore) : 0);
        }, 0) / grp.length;

        return {
          groupId: key,
          entries: grp.map(e => ({ ...e, amount: parseFloat(e.amount), riskScore: scoreMap.get(e.id) ?? null })),
          matchReason: "Same user, amount, and date",
          riskScore: avgScore,
        };
      });

    res.json(duplicateGroups);
  } catch (err) {
    req.log.error({ err }, "Duplicates error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
