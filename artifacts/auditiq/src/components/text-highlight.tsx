import React from "react";
import { tokeniseText, countFinNegHits } from "@/lib/fin-lexicon";
import { AlertTriangle, Info, BookOpen } from "lucide-react";

interface TextHighlightProps {
  text: string;
}

const SEGMENT_STYLES = {
  "fin-neg": {
    className:
      "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200 rounded px-0.5 font-semibold underline decoration-red-400 decoration-dotted underline-offset-2 cursor-help",
  },
  "fin-neutral": {
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded px-0.5 cursor-help",
  },
  normal: {
    className: "",
  },
};

export function TextHighlight({ text }: TextHighlightProps) {
  const segments = tokeniseText(text);
  const negCount = segments.filter((s) => s.type === "fin-neg").length;
  const neutralCount = segments.filter((s) => s.type === "fin-neutral").length;

  return (
    <div className="space-y-3">
      <div className="text-sm leading-7 bg-background border rounded-md px-4 py-3 font-mono tracking-wide select-text">
        {segments.map((seg, i) =>
          seg.type === "normal" ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span
              key={i}
              className={SEGMENT_STYLES[seg.type].className}
              title={seg.tooltip}
            >
              {seg.text}
            </span>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {negCount > 0 && (
          <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-medium">
            <AlertTriangle className="h-3 w-3" />
            {negCount} audit risk {negCount === 1 ? "term" : "terms"} flagged
          </span>
        )}
        {neutralCount > 0 && (
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Info className="h-3 w-3" />
            {neutralCount} finance-neutral {neutralCount === 1 ? "word" : "words"} (not flagged)
          </span>
        )}
        {negCount === 0 && neutralCount === 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            No flagged terminology detected
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground border-t pt-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-300" />
          Audit risk term (ISA 240 / Fin-Neg lexicon)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300" />
          Finance-neutral (general dictionaries flag as negative; normal in accounting)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-background border" />
          No lexicon match
        </span>
      </div>
    </div>
  );
}

/** Inline badge shown on the table row when a description has fin-neg hits */
export function FinNegCount({ description }: { description: string }) {
  const count = countFinNegHits(description);
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-1 py-0.5 ml-1 cursor-help"
      title={`${count} audit risk term${count > 1 ? "s" : ""} in description — expand to see highlighting`}
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {count}
    </span>
  );
}
