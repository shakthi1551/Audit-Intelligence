import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetRiskDistribution,
  getGetRiskDistributionQueryKey,
} from "@workspace/api-client-react";
import { AlertTriangle, TrendingUp, Users, Clock, FileText } from "lucide-react";
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
  );
}
