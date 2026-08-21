import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetRiskDistribution,
  getGetRiskDistributionQueryKey,
  useGetEngagement,
  getGetEngagementQueryKey,
  useUpdateEngagementSettings,
  useGetCalibrationSummary,
  getGetCalibrationSummaryQueryKey,
} from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, Users, Clock, FileText, Settings2, BrainCircuit, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

interface OverviewTabProps {
  engagementId: number;
}

const COLORS = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--chart-3))",
  low: "hsl(var(--chart-5))",
};

export default function OverviewTab({ engagementId }: OverviewTabProps) {
  const queryClient = useQueryClient();
  const { data: engagement } = useGetEngagement(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetEngagementQueryKey(engagementId) },
  });
  const { data: calibration } = useGetCalibrationSummary(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetCalibrationSummaryQueryKey(engagementId) },
  });
  const updateSettings = useUpdateEngagementSettings();
  const [overallMateriality, setOverallMateriality] = useState(0);
  const [performanceMateriality, setPerformanceMateriality] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (engagement) {
      setOverallMateriality(Number(engagement.overallMateriality ?? 0));
      setPerformanceMateriality(Number(engagement.performanceMateriality ?? 0));
    }
  }, [engagement]);
  const saveSettings = () => {
    updateSettings.mutate({ id: engagementId, data: { overallMateriality, performanceMateriality } }, {
      onSuccess: () => {
        setSaved(true);
        void queryClient.invalidateQueries({ queryKey: getGetEngagementQueryKey(engagementId) });
        setTimeout(() => setSaved(false), 2200);
      },
    });
  };
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetDashboardSummaryQueryKey(engagementId) },
  });

  const { data: distribution, isLoading: loadingDist } = useGetRiskDistribution(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetRiskDistributionQueryKey(engagementId) },
  });

  if (loadingSummary || loadingDist) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading overview...</p>
        </div>
      </div>
    );
  }

  if (!summary || !distribution) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const pieData = [
    { name: "HIGH", value: distribution.high, color: COLORS.high },
    { name: "MEDIUM", value: distribution.medium, color: COLORS.medium },
    { name: "LOW", value: distribution.low, color: COLORS.low },
  ];

  const scoreBreakdown = distribution.scoreBreakdown?.map((item) => ({
    range: item.range,
    count: item.count,
  })) || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-card-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
            <p className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {summary.totalEntries.toLocaleString()}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-destructive/30 rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">HIGH Risk</p>
            </div>
            <p className="text-4xl font-bold text-destructive" style={{ fontFamily: "var(--font-display)" }}>
              {summary.highRiskCount}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.highRiskPct?.toFixed(1)}% of total
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-card-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Avg Risk Score</p>
            </div>
            <p className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {summary.avgRiskScore.toFixed(1)}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-card-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-chart-3/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-chart-3/10 border border-chart-3/20">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              <p className="text-sm text-muted-foreground">After Hours</p>
            </div>
            <p className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {summary.afterHoursCount || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              +{summary.weekendCount || 0} weekend
            </p>
          </div>
        </motion.div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk distribution donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-card-border rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
            Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Score breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card border border-card-border rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="range"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top risky users */}
      {summary.topRiskyUsers && summary.topRiskyUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card border border-card-border rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Top Risky Users
            </h3>
          </div>
          <div className="space-y-3">
            {summary.topRiskyUsers.map((user, index) => (
              <div
                key={user.user}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{user.user}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.entryCount} entries • ${user.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">HIGH Risk</p>
                    <p className="text-xl font-bold text-destructive" style={{ fontFamily: "var(--font-display)" }}>
                      {user.highRiskCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                      {user.avgScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
        </div>
        <aside className="xl:sticky xl:top-6 space-y-4">
          <div className="bg-card border border-primary/25 rounded-xl p-5 shadow-lg shadow-primary/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><Settings2 className="h-4 w-4" /></div>
              <div>
                <h3 className="font-bold text-foreground">Engagement settings</h3>
                <p className="text-xs text-muted-foreground">Materiality thresholds</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed my-4">
              Use the thresholds to anchor your review around what could materially affect the financial statements.
            </p>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall materiality</span>
                <Input type="number" min={0} value={overallMateriality} onChange={(e) => setOverallMateriality(Number(e.target.value))} data-testid="input-overall-materiality" />
              </label>
              <label className="block space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance materiality</span>
                  <span className="text-xs text-primary font-bold">{overallMateriality ? Math.round((performanceMateriality / overallMateriality) * 100) : 0}%</span>
                </div>
                <Slider min={0} max={Math.max(overallMateriality, 1)} step={1} value={[performanceMateriality]} onValueChange={([value]) => setPerformanceMateriality(value)} data-testid="slider-performance-materiality" />
                <Input type="number" min={0} max={overallMateriality} value={performanceMateriality} onChange={(e) => setPerformanceMateriality(Math.min(Number(e.target.value), overallMateriality))} data-testid="input-performance-materiality" />
              </label>
              {performanceMateriality > overallMateriality && <p className="text-xs text-destructive">Performance materiality must not exceed overall materiality.</p>}
              <Button onClick={saveSettings} disabled={updateSettings.isPending || performanceMateriality > overallMateriality} className="w-full gap-2" data-testid="button-save-materiality">
                <Save className="h-4 w-4" /> {updateSettings.isPending ? "Saving..." : saved ? "Saved" : "Save settings"}
              </Button>
            </div>
          </div>
          <div className="bg-card border border-accent/25 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <BrainCircuit className="h-5 w-5 text-accent" />
              <div><h3 className="font-bold text-foreground">Heuristic calibration</h3><p className="text-xs text-muted-foreground">Active learning signal</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Labels</p><p className="text-xl font-bold">{calibration?.labeledOverrides ?? 0}</p></div>
              <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Confidence</p><p className="text-xl font-bold text-accent">{calibration?.agreementRate ?? 0}%</p></div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{calibration?.recommendation ?? "Loading calibration signal..."}</p>
            {calibration?.weights && <div className="mt-4 space-y-2">{Object.entries(calibration.weights).map(([key, value]) => <div key={key} className="flex justify-between text-xs"><span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span><span className="font-semibold">{value}%</span></div>)}</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
