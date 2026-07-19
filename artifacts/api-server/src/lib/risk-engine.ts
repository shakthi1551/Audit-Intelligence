import { db } from "@workspace/db";
import { journalEntriesTable, riskScoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runIsolationForest } from "./iforest.js";

interface RawEntry {
  id: number;
  entryDate: string;
  postedBy: string;
  description: string;
  amount: string;
  postingTime: string | null;
  engagementId: number;
}

const HIGH_RISK_KEYWORDS = [
  "adjustment", "write-off", "write off", "override", "correction", "reversal",
  "manual", "miscellaneous", "misc", "suspense", "clearing", "rounding",
  "year-end", "year end", "quarter end", "month end", "accrual",
  "dummy", "test", "temp", "temporary", "intercompany", "related party",
  "cash", "petty cash", "personal", "expense", "prepaid",
];

const WEEKEND_DAYS = [0, 6];

function getHour(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function scorePostingTime(entry: RawEntry): number {
  const hour = getHour(entry.postingTime);
  if (hour === null) return 10;
  if (hour < 8 || hour >= 18) return 25;
  if (hour < 9 || hour >= 17) return 15;
  return 0;
}

function scoreAmount(amount: number, allAmounts: number[]): number {
  if (allAmounts.length === 0) return 0;
  const sorted = [...allAmounts].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const mean = allAmounts.reduce((s, v) => s + v, 0) / allAmounts.length;

  const isRound = amount % 1000 === 0 && amount > 0;
  const isVeryLarge = amount > p99;
  const isLarge = amount > p95;

  let score = 0;
  if (isVeryLarge) score += 20;
  else if (isLarge) score += 10;
  if (isRound && amount > mean) score += 5;
  return Math.min(score, 25);
}

function scoreUserConcentration(postedBy: string, allEntries: RawEntry[]): number {
  const userCounts: Record<string, number> = {};
  for (const e of allEntries) {
    userCounts[e.postedBy] = (userCounts[e.postedBy] ?? 0) + 1;
  }
  const total = allEntries.length;
  const userPct = ((userCounts[postedBy] ?? 0) / total) * 100;

  if (userPct > 50) return 20;
  if (userPct > 30) return 12;
  if (userPct > 20) return 8;
  return 0;
}

function scoreKeywords(description: string): number {
  const lower = description.toLowerCase();
  const matches = HIGH_RISK_KEYWORDS.filter(k => lower.includes(k));
  if (matches.length >= 3) return 20;
  if (matches.length === 2) return 14;
  if (matches.length === 1) return 8;
  if (lower.length < 5) return 10;
  return 0;
}

function scoreFrequency(entry: RawEntry, allEntries: RawEntry[]): number {
  const sameUserSameDay = allEntries.filter(
    e => e.postedBy === entry.postedBy && e.entryDate === entry.entryDate && e.id !== entry.id,
  );
  if (sameUserSameDay.length > 10) return 10;
  if (sameUserSameDay.length > 5) return 6;
  if (sameUserSameDay.length > 2) return 3;
  return 0;
}

export function classifyRisk(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export async function scoreEntries(engagementId: number): Promise<void> {
  const entries = await db.select().from(journalEntriesTable)
    .where(eq(journalEntriesTable.engagementId, engagementId));

  if (entries.length === 0) return;

  const amounts = entries.map(e => parseFloat(e.amount));

  // Run Isolation Forest across all entries to produce ML anomaly scores
  const mlScores = runIsolationForest(entries as RawEntry[]);

  for (const entry of entries) {
    const amount = parseFloat(entry.amount);
    const postingTimeScore = scorePostingTime(entry as RawEntry);
    const amountScore = scoreAmount(amount, amounts);
    const userConcentrationScore = scoreUserConcentration(entry.postedBy, entries as RawEntry[]);
    const keywordScore = scoreKeywords(entry.description);
    const frequencyScore = scoreFrequency(entry as RawEntry, entries as RawEntry[]);

    const totalScore = postingTimeScore + amountScore + userConcentrationScore + keywordScore + frequencyScore;
    const riskLevel = classifyRisk(totalScore);

    const hasTime = !!entry.postingTime;
    const hasAccounts = !!entry.debitAccount && !!entry.creditAccount;
    const confidenceScore = (hasTime && hasAccounts) ? 90 : hasTime ? 80 : 70;

    const mlAnomalyScore = mlScores.get(entry.id) ?? 50;
    const mlAnomalyFlag = mlAnomalyScore >= 65;

    const existing = await db.select().from(riskScoresTable)
      .where(eq(riskScoresTable.entryId, entry.id));

    if (existing.length > 0) {
      await db.update(riskScoresTable)
        .set({
          totalScore: totalScore.toFixed(2),
          riskLevel,
          postingTimeScore: postingTimeScore.toFixed(2),
          amountScore: amountScore.toFixed(2),
          userConcentrationScore: userConcentrationScore.toFixed(2),
          keywordScore: keywordScore.toFixed(2),
          frequencyScore: frequencyScore.toFixed(2),
          confidenceScore: confidenceScore.toFixed(2),
          mlAnomalyScore,
          mlAnomalyFlag,
        })
        .where(eq(riskScoresTable.entryId, entry.id));
    } else {
      await db.insert(riskScoresTable).values({
        entryId: entry.id,
        totalScore: totalScore.toFixed(2),
        riskLevel,
        postingTimeScore: postingTimeScore.toFixed(2),
        amountScore: amountScore.toFixed(2),
        userConcentrationScore: userConcentrationScore.toFixed(2),
        keywordScore: keywordScore.toFixed(2),
        frequencyScore: frequencyScore.toFixed(2),
        confidenceScore: confidenceScore.toFixed(2),
        mlAnomalyScore,
        mlAnomalyFlag,
      });
    }
  }
}

export function benfordExpected(digit: number): number {
  return Math.log10(1 + 1 / digit) * 100;
}

export function computeBenford(amounts: number[]): Array<{ digit: number; expected: number; actual: number; count: number; deviation: number }> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let total = 0;

  for (const amt of amounts) {
    const abs = Math.abs(amt);
    if (abs === 0) continue;
    const firstDigit = parseInt(abs.toString().replace(".", "").replace(/^0+/, "")[0] ?? "0", 10);
    if (firstDigit >= 1 && firstDigit <= 9) {
      counts[firstDigit]++;
      total++;
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
    const expected = benfordExpected(digit);
    const actual = total > 0 ? (counts[digit] / total) * 100 : 0;
    return {
      digit,
      expected: parseFloat(expected.toFixed(2)),
      actual: parseFloat(actual.toFixed(2)),
      count: counts[digit],
      deviation: parseFloat(Math.abs(actual - expected).toFixed(2)),
    };
  });
}
