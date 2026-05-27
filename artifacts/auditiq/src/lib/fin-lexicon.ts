/**
 * Financial sentiment lexicon — two tiers:
 *
 * FIN_NEG  — words that genuinely signal audit risk in a journal entry description.
 *             Based on ISA 240 fraud-risk indicators and Loughran-McDonald (2011)
 *             finance negative word list. Highlighted RED in the UI.
 *
 * FIN_NEUTRAL — words that general-purpose sentiment dictionaries (e.g. Harvard
 *               General Inquirer) classify as negative, but which are entirely
 *               normal in a financial accounting context (per Loughran-McDonald).
 *               Highlighted SLATE (neutral gray) in the UI so the auditor knows
 *               the system is aware of the word but has not flagged it.
 */

export interface LexiconMatch {
  word: string;
  tier: "fin-neg" | "fin-neutral";
  tooltip: string;
}

const FIN_NEG_MAP: Record<string, string> = {
  // Misstatement family
  misstatement: "ISA 240: potential material misstatement indicator",
  misstatements: "ISA 240: potential material misstatement indicator",
  misstated: "ISA 240: potential material misstatement indicator",
  restatement: "Prior-period restatement — high audit risk signal",
  restatements: "Prior-period restatement — high audit risk signal",
  restated: "Prior-period restatement — high audit risk signal",
  // Fraud family
  fraud: "ISA 240: direct fraud indicator",
  fraudulent: "ISA 240: direct fraud indicator",
  fraudulently: "ISA 240: direct fraud indicator",
  fictitious: "Fictitious transaction — ISA 240 red flag",
  fabricated: "Fabricated entry — ISA 240 red flag",
  fabrication: "Fabricated entry — ISA 240 red flag",
  // Irregularity
  irregularity: "Accounting irregularity — requires further investigation",
  irregularities: "Accounting irregularities — requires further investigation",
  irregular: "Irregular transaction pattern",
  // Authorisation failures
  unauthorized: "Lack of authorisation — ISA 315 control deficiency",
  unauthorised: "Lack of authorisation — ISA 315 control deficiency",
  unapproved: "Entry posted without approval",
  unsupported: "No supporting documentation",
  undocumented: "No supporting documentation",
  // Manipulation
  manipulation: "Earnings/results manipulation indicator",
  manipulate: "Earnings/results manipulation indicator",
  manipulated: "Earnings/results manipulation indicator",
  inflated: "Overstated figures — revenue manipulation risk",
  inflate: "Overstated figures — revenue manipulation risk",
  // Concealment
  concealment: "Deliberate concealment of a transaction",
  concealed: "Deliberate concealment of a transaction",
  conceal: "Deliberate concealment of a transaction",
  suppression: "Suppression of records — ISA 240 red flag",
  suppressed: "Suppression of records — ISA 240 red flag",
  // Falsification
  falsification: "Document falsification",
  falsified: "Document falsification",
  falsify: "Document falsification",
  forgery: "Forged document or signature",
  forged: "Forged document or signature",
  // Corruption
  embezzlement: "Misappropriation of assets — ISA 240",
  embezzled: "Misappropriation of assets — ISA 240",
  kickback: "Corrupt payment — bribery risk",
  kickbacks: "Corrupt payment — bribery risk",
  bribery: "Bribery indicator",
  collusion: "Collusion between parties — ISA 240 red flag",
  colluding: "Collusion between parties — ISA 240 red flag",
  laundering: "Money laundering risk",
  laundered: "Money laundering risk",
  // Control circumvention
  circumvention: "Bypassing internal controls",
  circumvented: "Bypassing internal controls",
  circumvent: "Bypassing internal controls",
  override: "Control override — ISA 240 management override risk",
  overridden: "Control override — ISA 240 management override risk",
  // Backdating / structuring
  backdated: "Backdating of entries — period cut-off risk",
  backdating: "Backdating of entries — period cut-off risk",
  roundtrip: "Round-trip transaction — revenue inflation risk",
  // Legal / regulatory
  litigation: "Active litigation — liability and going-concern risk",
  lawsuit: "Active lawsuit — legal liability risk",
  breach: "Contract or covenant breach",
  default: "Loan/covenant default — going-concern indicator",
};

const FIN_NEUTRAL_MAP: Record<string, string> = {
  // General dictionaries call these 'negative'; they are routine in accounting
  liability: "Normal balance-sheet item (Loughran-McDonald: finance-neutral)",
  liabilities: "Normal balance-sheet item (Loughran-McDonald: finance-neutral)",
  loss: "Accounting loss — routine P&L item",
  losses: "Accounting loss — routine P&L item",
  expense: "Operating expense — routine",
  expenses: "Operating expense — routine",
  expensed: "Operating expense — routine",
  debt: "Debt financing — routine capital structure item",
  debts: "Debt financing — routine capital structure item",
  deficit: "Retained earnings deficit — common in early-stage companies",
  deficits: "Retained earnings deficit — common in early-stage companies",
  tax: "Tax provision — routine accounting obligation",
  taxes: "Tax provision — routine accounting obligation",
  taxation: "Tax provision — routine accounting obligation",
  taxable: "Tax provision — routine accounting obligation",
  board: "Board of directors — corporate governance term",
  risk: "Risk disclosure language — routine",
  risks: "Risk disclosure language — routine",
  impairment: "Asset impairment — normal under IFRS/GAAP",
  impaired: "Asset impairment — normal under IFRS/GAAP",
  charge: "One-time or recurring charge — routine",
  charges: "One-time or recurring charge — routine",
  reserve: "Accounting reserve — routine prudence measure",
  reserves: "Accounting reserve — routine prudence measure",
  obligation: "Financial obligation — routine",
  obligations: "Financial obligation — routine",
  provision: "Accounting provision — routine under IFRS/GAAP",
  provisions: "Accounting provision — routine under IFRS/GAAP",
  penalty: "Tax or contractual penalty — routine disclosure",
  penalties: "Tax or contractual penalty — routine disclosure",
  depreciation: "Fixed-asset depreciation — routine non-cash expense",
  depreciated: "Fixed-asset depreciation — routine non-cash expense",
  amortization: "Intangible amortization — routine non-cash expense",
  amortised: "Intangible amortization — routine non-cash expense",
  amortized: "Intangible amortization — routine non-cash expense",
  interest: "Interest expense/income — routine financing item",
  goodwill: "Goodwill — routine M&A intangible asset",
  hedge: "Hedging instrument — routine risk management",
  hedging: "Hedging instrument — routine risk management",
  hedged: "Hedging instrument — routine risk management",
  contra: "Contra account — normal double-entry bookkeeping",
  correction: "Accounting correction — routine post-review adjustment",
  corrections: "Accounting correction — routine post-review adjustment",
  adjustment: "Period-end adjustment — routine",
  adjustments: "Period-end adjustment — routine",
  reversal: "Accrual reversal — routine month-end entry",
  reversals: "Accrual reversal — routine month-end entry",
  accrual: "Accrued expense/income — routine",
  accruals: "Accrued expense/income — routine",
  payable: "Accounts payable — routine current liability",
  payables: "Accounts payable — routine current liability",
  receivable: "Accounts receivable — routine current asset",
  receivables: "Accounts receivable — routine current asset",
  adverse: "Adverse condition — routine risk language",
  shortage: "Inventory/cash shortage — may require investigation",
  negative: "Negative balance/variance — routine accounting description",
  allowance: "Valuation allowance — routine under IFRS/GAAP",
  allowances: "Valuation allowance — routine under IFRS/GAAP",
  settlement: "Settlement of obligation — routine",
  settlements: "Settlement of obligation — routine",
  contingency: "Contingent liability — routine footnote disclosure",
  contingencies: "Contingent liability — routine footnote disclosure",
  writedown: "Write-down of asset value — routine impairment",
  writeoff: "Write-off of uncollectable asset — routine",
};

/**
 * Build a combined regex that matches all lexicon words at word boundaries.
 * Returns named-group captures so we know which tier matched.
 */
function buildPattern(): RegExp {
  const negTerms = Object.keys(FIN_NEG_MAP)
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[-]/g, "[-]?"))
    .join("|");
  const neutralTerms = Object.keys(FIN_NEUTRAL_MAP)
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[-]/g, "[-]?"))
    .join("|");
  return new RegExp(`\\b(${negTerms})\\b|\\b(${neutralTerms})\\b`, "gi");
}

const PATTERN = buildPattern();

export interface TextSegment {
  text: string;
  type: "fin-neg" | "fin-neutral" | "normal";
  tooltip?: string;
}

/**
 * Tokenise `text` into segments tagged by lexicon tier.
 * Non-matching spans are tagged as "normal".
 */
export function tokeniseText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  PATTERN.lastIndex = 0;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ text: text.slice(last, match.index), type: "normal" });
    }
    const raw = match[0];
    const lower = raw.toLowerCase();
    if (match[1] !== undefined) {
      segments.push({
        text: raw,
        type: "fin-neg",
        tooltip: FIN_NEG_MAP[lower] ?? "Audit risk indicator",
      });
    } else {
      segments.push({
        text: raw,
        type: "fin-neutral",
        tooltip: FIN_NEUTRAL_MAP[lower] ?? "Finance-neutral term",
      });
    }
    last = PATTERN.lastIndex;
  }

  if (last < text.length) {
    segments.push({ text: text.slice(last), type: "normal" });
  }

  return segments;
}

/** Count how many FIN_NEG hits appear in a text string. */
export function countFinNegHits(text: string): number {
  return tokeniseText(text).filter((s) => s.type === "fin-neg").length;
}
