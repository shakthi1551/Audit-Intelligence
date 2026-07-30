import { useGetBenfordAnalysis, getGetBenfordAnalysisQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Info } from "lucide-react";

interface BenfordTabProps {
  engagementId: number;
}

export default function BenfordTab({ engagementId }: BenfordTabProps) {
  const { data: benford, isLoading } = useGetBenfordAnalysis(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetBenfordAnalysisQueryKey(engagementId) },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading Benford analysis...</p>
        </div>
      </div>
    );
  }

  if (!benford || !benford.digits || benford.digits.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">No Benford analysis data available</p>
      </div>
    );
  }

  const chartData = benford.digits.map((item) => ({
    digit: item.digit,
    expected: item.expected * 100,
    actual: item.actual * 100,
    deviation: Math.abs(item.deviation),
    count: item.count,
  }));

  const getRiskLevel = (deviation: number) => {
    if (deviation > 0.15) return "HIGH";
    if (deviation > 0.08) return "MEDIUM";
    return "LOW";
  };

  const getRiskColor = (level: string) => {
    if (level === "HIGH") return "hsl(var(--destructive))";
    if (level === "MEDIUM") return "hsl(var(--chart-3))";
    return "hsl(var(--chart-5))";
  };

  const overallRiskLevel = getRiskLevel(benford.deviationScore);

  return (
    <div className="space-y-8">
      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`
          bg-card border rounded-xl p-6
          ${overallRiskLevel === "HIGH" ? "border-destructive/40 bg-destructive/5" : "border-card-border"}
        `}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Benford's Law Analysis
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                First-digit distribution anomaly detection
              </p>
            </div>
          </div>
          <div className={`
            px-4 py-2 rounded-full border font-bold
            ${overallRiskLevel === "HIGH" ? "bg-destructive/20 text-destructive border-destructive/40" : ""}
            ${overallRiskLevel === "MEDIUM" ? "bg-chart-3/20 text-chart-3 border-chart-3/40" : ""}
            ${overallRiskLevel === "LOW" ? "bg-chart-5/20 text-chart-5 border-chart-5/40" : ""}
          `}>
            {benford.riskAssessment}
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-foreground leading-relaxed">{benford.summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Deviation Score</p>
            <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {(benford.deviationScore * 100).toFixed(2)}%
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Analysis</p>
            <p className="text-sm text-foreground">
              {benford.deviationScore > 0.15 ? "Significant deviation detected - requires investigation" :
               benford.deviationScore > 0.08 ? "Moderate deviation - review recommended" :
               "Distribution follows expected pattern"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-card-border rounded-xl p-6"
      >
        <h4 className="text-lg font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
          Expected vs Actual Distribution
        </h4>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="digit"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
              label={{ value: "First Digit", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
              label={{ value: "Frequency (%)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: any, name: string) => {
                if (name === "expected") return [value.toFixed(2) + "%", "Expected"];
                if (name === "actual") return [value.toFixed(2) + "%", "Actual"];
                return [value, name];
              }}
            />
            <Bar dataKey="actual" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => {
                const riskLevel = getRiskLevel(entry.deviation);
                return <Cell key={`cell-${index}`} fill={getRiskColor(riskLevel)} />;
              })}
            </Bar>
            <Line
              type="monotone"
              dataKey="expected"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
            <span className="text-muted-foreground">Expected (Benford)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <span className="text-muted-foreground">Actual Distribution</span>
          </div>
        </div>
      </motion.div>

      {/* Digit breakdown table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-card-border rounded-xl p-6"
      >
        <h4 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Detailed Breakdown
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Digit</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Count</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Expected</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Actual</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Deviation</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {benford.digits.map((digit) => {
                const riskLevel = getRiskLevel(digit.deviation);
                return (
                  <tr key={digit.digit} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{digit.digit}</td>
                    <td className="py-3 px-4 text-right text-foreground">{digit.count}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{(digit.expected * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right text-foreground font-semibold">{(digit.actual * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`
                        font-bold
                        ${riskLevel === "HIGH" ? "text-destructive" : ""}
                        ${riskLevel === "MEDIUM" ? "text-chart-3" : ""}
                        ${riskLevel === "LOW" ? "text-chart-5" : ""}
                      `}>
                        {digit.deviation > 0 ? "+" : ""}{(digit.deviation * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-semibold border
                        ${riskLevel === "HIGH" ? "bg-destructive/20 text-destructive border-destructive/40" : ""}
                        ${riskLevel === "MEDIUM" ? "bg-chart-3/20 text-chart-3 border-chart-3/40" : ""}
                        ${riskLevel === "LOW" ? "bg-chart-5/20 text-chart-5 border-chart-5/40" : ""}
                      `}>
                        {riskLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Info box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-primary/5 border border-primary/30 rounded-xl p-6"
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">About Benford's Law</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Benford's Law states that in many naturally occurring datasets, the first digit is more likely to be small. 
              For example, "1" appears as the first digit about 30% of the time, while "9" appears only about 5% of the time. 
              Significant deviations from this pattern may indicate data manipulation or fraud.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
