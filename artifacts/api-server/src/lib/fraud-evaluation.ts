import { db } from "@workspace/db";
import { journalEntriesTable, riskScoresTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

export type FraudEvaluationThreshold = "MEDIUM" | "HIGH";

export async function calculateFraudEvaluationSummary(
  engagementId: number,
  threshold: FraudEvaluationThreshold,
) {
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

  const positiveThreshold = threshold === "HIGH" ? 70 : 40;
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

  return {
    threshold,
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
  };
}