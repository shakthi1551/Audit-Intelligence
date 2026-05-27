import { tokeniseText } from "./fin-lexicon";

export interface RiskNarrativeParams {
  entryDate: string;
  postingTime?: string;
  postedBy: string;
  amount: number;
  description: string;
  debitAccount?: string;
  score: {
    riskLevel?: string;
    totalScore?: number;
    postingTimeScore?: number;
    amountScore?: number;
    userConcentrationScore?: number;
    keywordScore?: number;
    frequencyScore?: number;
    overridden?: boolean;
  };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Derive posting hour from a "HH:MM" or "HH:MM:SS" string.
 * Returns -1 if unparseable.
 */
function parseHour(postingTime?: string): number {
  if (!postingTime) return -1;
  const h = parseInt(postingTime.split(":")[0], 10);
  return isNaN(h) ? -1 : h;
}

/**
 * Return a specific, human-readable sentence explaining why an entry was
 * flagged as MEDIUM or HIGH risk, combining:
 *   - posting day / time context
 *   - user
 *   - amount (when elevated)
 *   - Fin-Neg lexicon terms found in the description
 *   - Beneish / keyword / frequency flags
 */
export function buildRiskNarrative(p: RiskNarrativeParams): string {
  const {
    entryDate,
    postingTime,
    postedBy,
    amount,
    description,
    debitAccount,
    score,
  } = p;

  // ── 1. Temporal analysis ─────────────────────────────────────────────────
  const date = new Date(entryDate);
  const dayName = DAY_NAMES[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const hour = parseHour(postingTime);
  const isBeforeOpen = hour >= 0 && hour < 8;
  const isAfterClose = hour >= 18;
  const isAfterHours = isBeforeOpen || isAfterClose;
  const timeIsElevated = (score.postingTimeScore ?? 0) > 35;

  let timeClause = "";
  if (timeIsElevated && postingTime) {
    if (isWeekend && isAfterHours) {
      timeClause = `it was posted on a ${dayName} at ${postingTime}, outside normal business hours`;
    } else if (isWeekend) {
      timeClause = `it was posted on a ${dayName} at ${postingTime} (weekend posting)`;
    } else if (isAfterHours) {
      const period = isBeforeOpen ? "before opening" : "after close";
      timeClause = `it was posted at ${postingTime} (${period}, outside business hours)`;
    } else {
      timeClause = `it was posted at ${postingTime} with an unusual timing pattern`;
    }
  }

  // ── 2. Fin-Neg terms ─────────────────────────────────────────────────────
  const finNegHits = tokeniseText(description)
    .filter((s) => s.type === "fin-neg")
    .map((s) => s.text.toLowerCase())
    .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe

  // ── 3. Amount analysis ───────────────────────────────────────────────────
  const amtScore = score.amountScore ?? 0;
  const fmtAmt = formatAmount(amount);
  let amountDescriptor = "";
  if (amtScore > 70) {
    amountDescriptor = "unusually large";
  } else if (amtScore > 40) {
    amountDescriptor = "above-average";
  }

  // Blend amount + first Fin-Neg term into one clause when both are elevated:
  // "for a large [term] entry ($X)" reads more naturally than two separate clauses
  let amountClause = "";
  if (amountDescriptor) {
    if (finNegHits.length > 0) {
      const blendTerm = finNegHits[0];
      amountClause = `for an ${amountDescriptor} amount (${fmtAmt}) — the description flags the risk term '${blendTerm}'`;
    } else {
      amountClause = `for an ${amountDescriptor} amount (${fmtAmt})`;
    }
  }

  // ── 4. Remaining Fin-Neg terms (not yet mentioned in amountClause) ───────
  const remainingTerms = amountDescriptor && finNegHits.length > 0
    ? finNegHits.slice(1)
    : finNegHits;

  let finNegClause = "";
  if (remainingTerms.length > 0) {
    const plural = remainingTerms.length > 1;
    const termList = remainingTerms.slice(0, 3).map((t) => `'${t}'`).join(" and ");
    finNegClause = `the description contains the Fin-Neg term${plural ? "s" : ""} ${termList}`;
  }

  // ── 5. Secondary risk signals ─────────────────────────────────────────────
  const secondaryClauses: string[] = [];

  if ((score.userConcentrationScore ?? 0) > 60) {
    secondaryClauses.push(
      `${postedBy} accounts for a disproportionately high share of postings in this engagement`
    );
  }

  if ((score.frequencyScore ?? 0) > 60) {
    secondaryClauses.push(
      `this account/user combination shows an unusual posting frequency`
    );
  }

  if (debitAccount && (score.keywordScore ?? 0) > 50) {
    secondaryClauses.push(`the account '${debitAccount}' matches a risk-sensitive account pattern`);
  }

  // ── 6. Assemble sentence ──────────────────────────────────────────────────
  // Collect all distinct clauses in logical order
  const clauses: string[] = [];

  if (timeClause) {
    // Merge time + user + amount into the primary clause
    const userPart = `by ${postedBy}`;
    if (amountClause) {
      clauses.push(`${timeClause} ${userPart} ${amountClause}`);
    } else {
      clauses.push(`${timeClause} ${userPart}`);
    }
  } else if (amountClause) {
    clauses.push(`it was posted by ${postedBy} ${amountClause}`);
  } else {
    // No time or amount flags — open with user
    clauses.push(`it was posted by ${postedBy}`);
  }

  if (finNegClause) clauses.push(finNegClause);
  clauses.push(...secondaryClauses);

  const riskLevel = score.riskLevel ?? "ELEVATED";

  if (clauses.length === 1) {
    return `This entry was flagged as ${riskLevel} risk because ${clauses[0]}.`;
  }

  const last = clauses.pop()!;
  return `This entry was flagged as ${riskLevel} risk because ${clauses.join("; ")}, and ${last}.`;
}

/**
 * Returns a short phrase (no trailing punctuation) listing the most
 * significant risk signals — useful for tooltip / badge contexts.
 */
export function buildShortRiskSummary(p: RiskNarrativeParams): string {
  const signals: string[] = [];

  const date = new Date(p.entryDate);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const hour = parseHour(p.postingTime);
  const isAfterHours = hour >= 0 && (hour < 8 || hour >= 18);

  if (isWeekend && p.postingTime) signals.push(`weekend posting (${DAY_NAMES[date.getDay()]} ${p.postingTime})`);
  else if (isAfterHours && p.postingTime) signals.push(`after-hours posting (${p.postingTime})`);

  if ((p.score.amountScore ?? 0) > 40) signals.push(`large amount (${formatAmount(p.amount)})`);

  const finNeg = tokeniseText(p.description).filter((s) => s.type === "fin-neg");
  if (finNeg.length > 0) signals.push(`Fin-Neg term '${finNeg[0].text.toLowerCase()}'`);

  return signals.length > 0 ? signals.join(", ") : "multiple statistical anomalies";
}
