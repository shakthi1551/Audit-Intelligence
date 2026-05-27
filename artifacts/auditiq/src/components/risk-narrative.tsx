import React from "react";
import { buildRiskNarrative, type RiskNarrativeParams } from "@/lib/risk-narrative";
import { Lightbulb } from "lucide-react";

interface RiskNarrativeBoxProps extends RiskNarrativeParams {
  className?: string;
}

const BORDER_COLORS: Record<string, string> = {
  HIGH: "border-destructive bg-destructive/5 dark:bg-destructive/10",
  MEDIUM: "border-amber-500 bg-amber-500/5 dark:bg-amber-500/10",
};

const LABEL_COLORS: Record<string, string> = {
  HIGH: "text-destructive",
  MEDIUM: "text-amber-600 dark:text-amber-400",
};

const ICON_COLORS: Record<string, string> = {
  HIGH: "text-destructive",
  MEDIUM: "text-amber-500",
};

/**
 * A "Why flagged?" callout that renders one specific, human-readable
 * sentence explaining the primary risk signals for this entry.
 * Only rendered for MEDIUM or HIGH risk entries.
 */
export function RiskNarrativeBox({ className, ...params }: RiskNarrativeBoxProps) {
  const level = params.score.riskLevel ?? "";
  if (level !== "HIGH" && level !== "MEDIUM") return null;

  const narrative = buildRiskNarrative(params);

  return (
    <div
      className={`
        flex gap-3 rounded-md border-l-4 px-4 py-3
        ${BORDER_COLORS[level] ?? "border-muted bg-muted/30"}
        ${className ?? ""}
      `}
    >
      <Lightbulb
        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${ICON_COLORS[level] ?? "text-muted-foreground"}`}
      />
      <div className="space-y-1 min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide ${LABEL_COLORS[level] ?? "text-foreground"}`}>
          Why flagged?
        </p>
        <p className="text-sm leading-relaxed text-foreground">
          {highlightNarrativeTerms(narrative)}
        </p>
      </div>
    </div>
  );
}

/**
 * Bold the Fin-Neg terms and amounts inside the narrative sentence
 * so they visually pop without adding another colour layer.
 */
function highlightNarrativeTerms(text: string): React.ReactNode {
  // Bold anything inside single quotes (the flagged terms) and dollar amounts
  const parts = text.split(/('[\w-]+'|\$[\d,]+)/g);
  return parts.map((part, i) => {
    if (/^'[\w-]+'$/.test(part) || /^\$[\d,]+$/.test(part)) {
      return <strong key={i}>{part}</strong>;
    }
    return part;
  });
}
