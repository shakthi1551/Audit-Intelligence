export type BeneishVariable = "DSRI" | "GMI" | "AQI" | "SGI" | "DEPI" | "SGAI" | "LVGI" | "TATA";

export interface BeneishTag {
  variable: BeneishVariable;
  label: string;
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface BeneishIndex {
  variable: BeneishVariable;
  label: string;
  value: number;
  threshold: number;
  flagged: boolean;
  description: string;
  interpretation: string;
}

export interface BeneishResult {
  mScore: number;
  verdict: "MANIPULATOR" | "NON-MANIPULATOR" | "UNCERTAIN";
  verdictSeverity: "HIGH" | "MEDIUM" | "LOW";
  indices: BeneishIndex[];
  flaggedCount: number;
  summary: string;
}

interface EntryData {
  id: number;
  debitAccount: string;
  creditAccount: string | null;
  description: string;
  amount: number;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

const REVENUE_RE = [/\b(revenue|sales|income|turnover|proceeds)\b/i];
const AR_RE = [/\b(receivable|receivables|debtor|debtors)\b/i, /\bar\b/i];
const COGS_RE = [/\b(cost\s+of\s+goods|cogs|cost\s+of\s+sales|cost\s+of\s+revenue|inventory\s+expense|materials)\b/i];
const SGA_RE = [/\b(selling|marketing|admin|general|overhead|sga|operating\s+expense)\b/i];
const DEFERRED_RE = [/\b(deferred|intangible|goodwill|prepaid|capitaliz|capitalize)\b/i];
const DEPR_RE = [/\b(depreciation|amortization|depr\b|amort\b)\b/i];
const LIABILITY_RE = [/\b(payable|payables|liability|liabilities|debt|loan|borrowing|credit\s+facility|notes\s+payable)\b/i];
const ACCRUAL_RE = [/\b(accrual|accrued|accruals|adjustment|reclass|reclassification|reversal|correction|manual|journal\s+entry)\b/i];

function classifyAccount(account: string) {
  const t = account.toLowerCase();
  return {
    isRevenue: matchesAny(t, REVENUE_RE),
    isAR: matchesAny(t, AR_RE),
    isCOGS: matchesAny(t, COGS_RE),
    isSGA: matchesAny(t, SGA_RE),
    isDeferred: matchesAny(t, DEFERRED_RE),
    isDepr: matchesAny(t, DEPR_RE),
    isLiability: matchesAny(t, LIABILITY_RE),
  };
}

function safe(numerator: number, denominator: number, fallback = 1.0): number {
  if (denominator === 0) return fallback;
  return numerator / denominator;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeBeneishTags(entry: EntryData, allEntries: EntryData[]): BeneishTag[] {
  const tags: BeneishTag[] = [];
  const dr = classifyAccount(entry.debitAccount);
  const cr = entry.creditAccount ? classifyAccount(entry.creditAccount) : null;
  const desc = (entry.description ?? "").toLowerCase();

  const allAmounts = allEntries.map(e => e.amount).sort((a, b) => a - b);
  const p75 = allAmounts[Math.floor(allAmounts.length * 0.75)] ?? 0;
  const p90 = allAmounts[Math.floor(allAmounts.length * 0.90)] ?? 0;

  const revenueEntries = allEntries.filter(e => e.creditAccount && classifyAccount(e.creditAccount).isRevenue);
  const revAmounts = revenueEntries.map(e => e.amount).sort((a, b) => a - b);
  const revP75 = revAmounts[Math.floor(revAmounts.length * 0.75)] ?? 0;

  // DSRI: DR to AR while CR to Revenue — inflating receivables relative to revenue
  if (dr.isAR && cr?.isRevenue) {
    tags.push({
      variable: "DSRI",
      label: "DSRI — AR/Revenue",
      description: "Debits AR while crediting Revenue; may indicate premature or inflated revenue recognition.",
      severity: entry.amount > p75 ? "HIGH" : "MEDIUM",
    });
  }

  // GMI: unusually large revenue credit (top 25% of revenue entries)
  if (cr?.isRevenue && entry.amount > revP75 && revP75 > 0) {
    tags.push({
      variable: "GMI",
      label: "GMI — Gross Margin",
      description: "Above-average revenue credit entry; may signal revenue inflation or gross margin improvement manipulation.",
      severity: entry.amount > p90 ? "HIGH" : "MEDIUM",
    });
  }

  // AQI: capitalizing costs into deferred/intangible assets
  if (dr.isDeferred) {
    tags.push({
      variable: "AQI",
      label: "AQI — Asset Quality",
      description: "Credits expense/liability into deferred or intangible assets; potential cost deferral.",
      severity: entry.amount > p75 ? "HIGH" : "MEDIUM",
    });
  }

  // SGI: large revenue entry (top 10%) — unusual sales growth signal
  if (cr?.isRevenue && entry.amount > p90 && p90 > 0) {
    tags.push({
      variable: "SGI",
      label: "SGI — Sales Growth",
      description: "Top-decile revenue entry; may contribute to anomalous sales growth indicators.",
      severity: "MEDIUM",
    });
  }

  // DEPI: crediting depreciation (reversal of depreciation charge)
  if (cr?.isDepr) {
    tags.push({
      variable: "DEPI",
      label: "DEPI — Depreciation",
      description: "Reversal or reduction of depreciation expense; may signal useful-life extension manipulation.",
      severity: "HIGH",
    });
  }

  // SGAI: SGA debit above p75 — elevated selling/admin costs
  if (dr.isSGA && entry.amount > p75 && p75 > 0) {
    tags.push({
      variable: "SGAI",
      label: "SGAI — SG&A Expense",
      description: "Above-average SG&A expense entry; review for expense reclassification or cost inflation.",
      severity: "MEDIUM",
    });
  }

  // LVGI: creating new liability — leverage increase
  if (cr?.isLiability && entry.amount > p75 && p75 > 0) {
    tags.push({
      variable: "LVGI",
      label: "LVGI — Leverage",
      description: "Large credit to liability/debt account; may indicate off-balance-sheet financing or leverage manipulation.",
      severity: entry.amount > p90 ? "HIGH" : "MEDIUM",
    });
  }

  // TATA: accrual/adjustment keyword in description
  if (matchesAny(desc, ACCRUAL_RE)) {
    tags.push({
      variable: "TATA",
      label: "TATA — Accruals",
      description: "Journal entry involves accruals, adjustments, or reclassifications — elevates total accruals-to-assets ratio.",
      severity: entry.amount > p75 ? "HIGH" : "MEDIUM",
    });
  }

  return tags;
}

export function computeBeneishIndices(entries: EntryData[]): BeneishResult {
  if (entries.length === 0) {
    return {
      mScore: -2.22,
      verdict: "NON-MANIPULATOR",
      verdictSeverity: "LOW",
      flaggedCount: 0,
      indices: buildIndices(1, 1, 1, 1, 1, 1, 1, 0),
      summary: "No entries available for Beneish M-Score analysis.",
    };
  }

  let revCR = 0, arDR = 0, cogsDR = 0, sgaDR = 0;
  let deferredDR = 0, deprCR = 0, deprDR = 0, liabilityCR = 0;
  let accrualAmount = 0, totalAmount = 0;

  for (const e of entries) {
    const dr = classifyAccount(e.debitAccount);
    const cr = e.creditAccount ? classifyAccount(e.creditAccount) : null;
    const desc = (e.description ?? "").toLowerCase();

    totalAmount += e.amount;

    if (cr?.isRevenue) revCR += e.amount;
    if (dr.isAR) arDR += e.amount;
    if (dr.isCOGS) cogsDR += e.amount;
    if (dr.isSGA) sgaDR += e.amount;
    if (dr.isDeferred) deferredDR += e.amount;
    if (cr?.isDepr) deprCR += e.amount;
    if (dr.isDepr) deprDR += e.amount;
    if (cr?.isLiability) liabilityCR += e.amount;
    if (matchesAny(desc, ACCRUAL_RE)) accrualAmount += e.amount;
  }

  // DSRI: (AR/Revenue) vs baseline of 0.30
  const arRevRatio = safe(arDR, revCR, 0.30);
  const dsri = clamp(arRevRatio / 0.30, 0.5, 3.0);

  // GMI: baseline gross margin 0.40; declining margin → GMI > 1
  const grossMargin = revCR > 0 ? (revCR - cogsDR) / revCR : 0.40;
  const gmi = clamp(safe(0.40, grossMargin > 0 ? grossMargin : 0.40), 0.5, 3.0);

  // AQI: deferred assets / total; baseline 0.05
  const deferredRatio = safe(deferredDR, totalAmount, 0.05);
  const aqi = clamp(deferredRatio / 0.05, 0.5, 3.0);

  // SGI: revenue concentration vs total; baseline 0.50
  const revRatio = safe(revCR, totalAmount, 0.50);
  const sgi = clamp(revRatio / 0.50, 0.5, 3.0);

  // DEPI: depreciation reversal ratio; baseline 0.50
  const deprTotal = deprCR + deprDR;
  const deprReversal = deprTotal > 0 ? deprCR / deprTotal : 0.0;
  const depi = clamp(deprReversal > 0 ? deprReversal / 0.50 : 1.0, 0.5, 2.0);

  // SGAI: SGA / Revenue; baseline 0.25
  const sgaRatio = revCR > 0 ? sgaDR / revCR : safe(sgaDR, totalAmount, 0.0);
  const sgai = clamp(sgaRatio > 0 ? sgaRatio / 0.25 : 1.0, 0.5, 2.0);

  // LVGI: liabilities / total; baseline 0.30
  const liabRatio = safe(liabilityCR, totalAmount, 0.30);
  const lvgi = clamp(liabRatio / 0.30, 0.5, 2.5);

  // TATA: accruals / total (absolute, not ratio of ratios)
  const tata = clamp(safe(accrualAmount, totalAmount, 0), 0, 1.0);

  // M-Score (Beneish 1999)
  const mScore = -4.84
    + 0.920 * dsri
    + 0.528 * gmi
    + 0.404 * aqi
    + 0.892 * sgi
    + 0.115 * depi
    - 0.172 * sgai
    + 4.679 * tata
    - 0.327 * lvgi;

  const roundedM = parseFloat(mScore.toFixed(3));

  let verdict: BeneishResult["verdict"];
  let verdictSeverity: BeneishResult["verdictSeverity"];
  if (roundedM > -1.78) {
    verdict = "MANIPULATOR";
    verdictSeverity = "HIGH";
  } else if (roundedM < -2.22) {
    verdict = "NON-MANIPULATOR";
    verdictSeverity = "LOW";
  } else {
    verdict = "UNCERTAIN";
    verdictSeverity = "MEDIUM";
  }

  const indices = buildIndices(dsri, gmi, aqi, sgi, depi, sgai, lvgi, tata);
  const flaggedCount = indices.filter(i => i.flagged).length;

  const summary = verdict === "MANIPULATOR"
    ? `M-Score of ${roundedM.toFixed(2)} exceeds the -1.78 threshold. ${flaggedCount} of 8 indices are flagged. High probability of earnings manipulation — escalate for detailed review.`
    : verdict === "UNCERTAIN"
    ? `M-Score of ${roundedM.toFixed(2)} falls in the uncertain range (-2.22 to -1.78). ${flaggedCount} indices flagged. Further investigation recommended.`
    : `M-Score of ${roundedM.toFixed(2)} is below -2.22. ${flaggedCount} indices flagged. No strong statistical signal of earnings manipulation detected.`;

  return { mScore: roundedM, verdict, verdictSeverity, indices, flaggedCount, summary };
}

function buildIndices(
  dsri: number, gmi: number, aqi: number, sgi: number,
  depi: number, sgai: number, lvgi: number, tata: number,
): BeneishIndex[] {
  return [
    {
      variable: "DSRI",
      label: "Days' Sales in Receivables",
      value: parseFloat(dsri.toFixed(3)),
      threshold: 1.465,
      flagged: dsri > 1.465,
      description: "Ratio of receivables growth to revenue growth. Elevated values indicate faster AR growth than sales — a revenue inflation signal.",
      interpretation: dsri > 1.465 ? "AR growing faster than revenue — potential premature revenue recognition." : "AR growth consistent with revenue.",
    },
    {
      variable: "GMI",
      label: "Gross Margin Index",
      value: parseFloat(gmi.toFixed(3)),
      threshold: 1.0,
      flagged: gmi > 1.0,
      description: "Ratio of prior-year to current-year gross margin. Values above 1 indicate a deteriorating gross margin, creating incentive to manipulate.",
      interpretation: gmi > 1.0 ? "Gross margin declining — management may be under pressure to inflate results." : "Gross margin stable or improving.",
    },
    {
      variable: "AQI",
      label: "Asset Quality Index",
      value: parseFloat(aqi.toFixed(3)),
      threshold: 1.254,
      flagged: aqi > 1.254,
      description: "Measures change in non-current, non-PPE assets relative to total assets. High values suggest cost deferral into intangibles or deferred charges.",
      interpretation: aqi > 1.254 ? "Significant capitalization activity detected — review deferred/intangible asset entries." : "Asset quality within normal range.",
    },
    {
      variable: "SGI",
      label: "Sales Growth Index",
      value: parseFloat(sgi.toFixed(3)),
      threshold: 1.607,
      flagged: sgi > 1.607,
      description: "Sales growth relative to the prior period. High growth companies face greater pressure to maintain performance, elevating manipulation risk.",
      interpretation: sgi > 1.607 ? "Unusually high revenue concentration detected — verify revenue recognition timing." : "Revenue volume within expected range.",
    },
    {
      variable: "DEPI",
      label: "Depreciation Index",
      value: parseFloat(depi.toFixed(3)),
      threshold: 1.077,
      flagged: depi > 1.077,
      description: "Compares depreciation rate between periods. A rising index suggests assets are being depreciated more slowly, inflating asset values.",
      interpretation: depi > 1.077 ? "Depreciation reversals or reductions detected — check for useful-life manipulation." : "Depreciation charges appear normal.",
    },
    {
      variable: "SGAI",
      label: "SG&A Expense Index",
      value: parseFloat(sgai.toFixed(3)),
      threshold: 1.041,
      flagged: sgai > 1.041,
      description: "Change in SG&A expenses relative to sales. Disproportionate SG&A growth may signal cost misclassification.",
      interpretation: sgai > 1.041 ? "SG&A elevated relative to revenue — review for expense reclassifications." : "SG&A in proportion to revenue.",
    },
    {
      variable: "LVGI",
      label: "Leverage Index",
      value: parseFloat(lvgi.toFixed(3)),
      threshold: 1.037,
      flagged: lvgi > 1.037,
      description: "Change in financial leverage. Increased leverage can incentivize earnings management to satisfy debt covenants.",
      interpretation: lvgi > 1.037 ? "Rising leverage detected — management may face debt covenant pressure." : "Leverage stable or declining.",
    },
    {
      variable: "TATA",
      label: "Total Accruals to Total Assets",
      value: parseFloat(tata.toFixed(3)),
      threshold: 0.031,
      flagged: tata > 0.031,
      description: "Accruals as a proportion of total assets. High accruals indicate earnings are less cash-backed and more susceptible to manipulation.",
      interpretation: tata > 0.031 ? "High accrual ratio — earnings quality may be low; review manual adjustments." : "Accrual ratio within acceptable range.",
    },
  ];
}
