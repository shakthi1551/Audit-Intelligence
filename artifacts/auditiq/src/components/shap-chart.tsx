/**
 * SHAP-style feature importance chart
 *
 * Displays each risk dimension's contribution as a horizontal bar,
 * colour-coded by whether it increases or decreases overall risk.
 * The Isolation Forest anomaly score is shown as a 6th dimension.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";

interface RiskScore {
  postingTimeScore?: number | null;
  amountScore?: number | null;
  userConcentrationScore?: number | null;
  keywordScore?: number | null;
  frequencyScore?: number | null;
  totalScore?: number | null;
  confidenceScore?: number | null;
  mlAnomalyScore?: number | null;
  mlAnomalyFlag?: boolean | null;
}

const MAX_WEIGHTS: Record<string, number> = {
  "Posting Time":       25,
  "Amount Anomaly":     25,
  "User Concentration": 20,
  "Keywords":           20,
  "Frequency":          10,
  "ML Anomaly (IF)":    100,
};

const FIELD_MAP: Record<string, keyof RiskScore> = {
  "Posting Time":       "postingTimeScore",
  "Amount Anomaly":     "amountScore",
  "User Concentration": "userConcentrationScore",
  "Keywords":           "keywordScore",
  "Frequency":          "frequencyScore",
  "ML Anomaly (IF)":    "mlAnomalyScore",
};

function shapValue(raw: number | null | undefined, max: number): number {
  const v = raw ?? 0;
  return parseFloat(((v / max) * 100).toFixed(1));
}

interface ShapEntry {
  name: string;
  value: number;
  raw: number;
  max: number;
  fill: string;
}

function buildData(score: RiskScore): ShapEntry[] {
  const labels = [
    "Posting Time",
    "Amount Anomaly",
    "User Concentration",
    "Keywords",
    "Frequency",
    "ML Anomaly (IF)",
  ];

  return labels.map(label => {
    const field = FIELD_MAP[label];
    const max = MAX_WEIGHTS[label];
    const raw = (score[field] as number | null | undefined) ?? 0;
    const value = shapValue(raw, max);

    let fill: string;
    if (label === "ML Anomaly (IF)") {
      fill = score.mlAnomalyFlag ? "#dc2626" : "#22c55e";
    } else if (value >= 70) {
      fill = "#dc2626";
    } else if (value >= 40) {
      fill = "#f59e0b";
    } else {
      fill = "#22c55e";
    }

    return { name: label, value, raw, max, fill };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ShapEntry }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-background border rounded shadow-sm px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">
        Raw score: <span className="font-mono text-foreground">{d.raw.toFixed(1)}</span>
        {" "}/ {d.max}
      </p>
      <p className="text-muted-foreground">
        Normalised contribution: <span className="font-mono text-foreground">{d.value}%</span>
      </p>
    </div>
  );
}

export function ShapChart({ score }: { score: RiskScore }) {
  const data = buildData(score);
  const mean = parseFloat((data.reduce((s, d) => s + d.value, 0) / data.length).toFixed(1));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span className="font-medium text-foreground text-sm flex items-center gap-1">
          Feature Importance (XAI)
        </span>
        <span>% contribution to total risk</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 32, bottom: 0, left: 130 }}
        >
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={125} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={mean} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: `avg ${mean}%`, position: "top", fontSize: 9, fill: "#94a3b8" }} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={14}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {score.mlAnomalyFlag && (
        <div className="flex items-center gap-2 text-xs px-2 py-1.5 bg-destructive/10 text-destructive rounded border border-destructive/30 mt-1">
          <span className="font-semibold">⚠ Isolation Forest</span>
          <span>ML anomaly detected — score {score.mlAnomalyScore ?? "—"}/100 (threshold 65)</span>
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-2">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#dc2626]" /> High contribution (≥70%)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> Medium (40–70%)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Low (&lt;40%)</span>
      </div>
    </div>
  );
}
