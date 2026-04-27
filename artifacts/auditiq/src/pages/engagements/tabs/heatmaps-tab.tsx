import { useGetUserHeatmap, getGetUserHeatmapQueryKey, useGetTimeHeatmap, getGetTimeHeatmapQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

function riskColor(avgScore: number) {
  if (avgScore >= 60) return "#ef4444";
  if (avgScore >= 30) return "#f59e0b";
  return "#10b981";
}

export default function HeatmapsTab({ engagementId }: { engagementId: number }) {
  const { data: userHeatmap, isLoading: isUserLoading } = useGetUserHeatmap(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetUserHeatmapQueryKey(engagementId) }
  });
  
  const { data: timeHeatmap, isLoading: isTimeLoading } = useGetTimeHeatmap(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetTimeHeatmapQueryKey(engagementId) }
  });

  if (isUserLoading || isTimeLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-96 bg-muted rounded"></div>
      <div className="h-96 bg-muted rounded"></div>
    </div>;
  }

  // Format data for time heatmap chart
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedTimeData = timeHeatmap?.map(row => ({
    name: `${days[row.dayOfWeek]} ${row.hour}:00`,
    entryCount: row.entryCount,
    riskScore: row.avgRiskScore,
  })) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Risk Concentration</CardTitle>
          <CardDescription>Users ranked by their volume of high-risk entries and average risk score.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={userHeatmap?.slice(0, 10) || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="user" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}
                  formatter={(value: any, name: any, item: any) => {
                    if (name === "Total Entries") {
                      const avg = item?.payload?.avgRiskScore ?? 0;
                      return [`${value} (avg score ${avg.toFixed(1)})`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="totalEntries" name="Total Entries" radius={[0, 4, 4, 0]}>
                  {(userHeatmap?.slice(0, 10) || []).map((row, i) => (
                    <Cell key={i} fill={riskColor(row.avgRiskScore)} />
                  ))}
                </Bar>
                <Bar dataKey="highRiskEntries" name="High Risk Entries" fill="#7f1d1d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Total Entries</TableHead>
                <TableHead className="text-right">High Risk</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right">Total Amount ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userHeatmap?.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.user}</TableCell>
                  <TableCell className="text-right">{row.totalEntries.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{row.highRiskEntries.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.avgRiskScore.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {new Intl.NumberFormat('en-US').format(row.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
              {!userHeatmap?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No user data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posting Time Analysis</CardTitle>
          <CardDescription>Volume of entries by day of week and hour. Spikes indicate unusual posting activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedTimeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  cursor={{fill: 'var(--muted)'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <Bar dataKey="entryCount" name="Entry Count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground mt-4 italic border-l-2 border-primary pl-3 py-1 bg-muted/30">
            <strong>Note:</strong> Standard business hours (8 AM - 6 PM, Mon-Fri) typically show the highest volume. Significant volume outside these hours increases risk scores.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
