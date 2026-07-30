import { useGetUserHeatmap, getGetUserHeatmapQueryKey, useGetTimeHeatmap, getGetTimeHeatmapQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { Users, Clock } from "lucide-react";

interface HeatmapsTabProps {
  engagementId: number;
}

export default function HeatmapsTab({ engagementId }: HeatmapsTabProps) {
  const { data: userHeatmap, isLoading: loadingUsers } = useGetUserHeatmap(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetUserHeatmapQueryKey(engagementId) },
  });

  const { data: timeHeatmap, isLoading: loadingTime } = useGetTimeHeatmap(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetTimeHeatmapQueryKey(engagementId) },
  });

  if (loadingUsers || loadingTime) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading heatmaps...</p>
        </div>
      </div>
    );
  }

  const userChartData = userHeatmap?.map((item) => ({
    user: item.user,
    avgRiskScore: item.avgRiskScore,
    highRiskEntries: item.highRiskEntries,
    totalEntries: item.totalEntries,
  })) || [];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getColorIntensity = (score: number) => {
    if (score >= 70) return "hsl(var(--destructive))";
    if (score >= 40) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-5))";
  };

  return (
    <div className="space-y-8">
      {/* User heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-card-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            User Risk Heatmap
          </h3>
        </div>

        {userChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={userChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                dataKey="user"
                type="category"
                width={120}
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
                formatter={(value: any, name: string) => {
                  if (name === "avgRiskScore") return [value.toFixed(1), "Avg Risk Score"];
                  if (name === "highRiskEntries") return [value, "High Risk Entries"];
                  if (name === "totalEntries") return [value, "Total Entries"];
                  return [value, name];
                }}
              />
              <Bar dataKey="avgRiskScore" radius={[0, 4, 4, 0]}>
                {userChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorIntensity(entry.avgRiskScore)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No user data available</p>
          </div>
        )}
      </motion.div>

      {/* Time heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-card-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Time-Based Activity Heatmap
          </h3>
        </div>

        {timeHeatmap && timeHeatmap.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <div className="grid grid-cols-25 gap-1">
                {/* Header row */}
                <div className="col-span-1" />
                {hours.map((hour) => (
                  <div key={hour} className="text-center text-xs text-muted-foreground py-1">
                    {hour}
                  </div>
                ))}

                {/* Heatmap rows */}
                {days.map((day, dayIndex) => (
                  <div key={day} className="contents">
                    <div className="text-xs text-muted-foreground py-1 pr-2 text-right">
                      {day}
                    </div>
                    {hours.map((hour) => {
                      const cell = timeHeatmap.find(
                        (item) => item.dayOfWeek === dayIndex && item.hour === hour
                      );
                      const intensity = cell?.avgRiskScore || 0;
                      const count = cell?.entryCount || 0;

                      return (
                        <div
                          key={`${dayIndex}-${hour}`}
                          className="aspect-square rounded border border-border relative group cursor-pointer transition-transform hover:scale-110"
                          style={{
                            backgroundColor: count > 0 ? getColorIntensity(intensity) : "hsl(var(--muted))",
                            opacity: count > 0 ? Math.min(1, 0.3 + (count / 100) * 0.7) : 0.3,
                          }}
                          title={`${day} ${hour}:00 - ${count} entries, avg risk ${intensity.toFixed(1)}`}
                        >
                          {count > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 rounded text-xs font-bold text-foreground">
                              {count}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--chart-5))" }} />
                  <span className="text-muted-foreground">Low Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
                  <span className="text-muted-foreground">Medium Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }} />
                  <span className="text-muted-foreground">High Risk</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No time data available</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
