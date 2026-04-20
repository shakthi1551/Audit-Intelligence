import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRiskDistribution, getGetRiskDistributionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AlertTriangle, AlertCircle, CheckCircle2, FileText, Database } from "lucide-react";
import { format } from "date-fns";

export default function OverviewTab({ engagementId }: { engagementId: number }) {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetDashboardSummaryQueryKey(engagementId) }
  });

  const { data: riskDist, isLoading: isRiskDistLoading } = useGetRiskDistribution(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetRiskDistributionQueryKey(engagementId) }
  });

  if (isSummaryLoading || isRiskDistLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded"></div>)}
      </div>
      <div className="h-96 bg-muted rounded"></div>
    </div>;
  }

  if (!summary || !riskDist) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <Database className="h-12 w-12 text-muted-foreground" />
          <div className="text-xl font-medium">No Data Available</div>
          <p className="text-muted-foreground">Upload journal entries to see the overview.</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: "High Risk", value: riskDist.high, color: "#ef4444" },
    { name: "Medium Risk", value: riskDist.medium, color: "#f59e0b" },
    { name: "Low Risk", value: riskDist.low, color: "#22c55e" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEntries.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.highRiskCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{summary.highRiskPct}% of total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{summary.mediumRiskCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{summary.mediumRiskPct}% of total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{summary.lowRiskCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{summary.lowRiskPct}% of total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Breakdown of journal entries by risk level</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Entries']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Key Risk Indicators</CardTitle>
            <CardDescription>Notable patterns requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">After-Hours Posting</div>
                  <div className="text-sm text-muted-foreground">Entries posted outside 8 AM - 6 PM</div>
                </div>
                <div className="font-bold">{summary.afterHoursCount?.toLocaleString() || 0}</div>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">Weekend Posting</div>
                  <div className="text-sm text-muted-foreground">Entries posted on Sat/Sun</div>
                </div>
                <div className="font-bold">{summary.weekendCount?.toLocaleString() || 0}</div>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">Duplicate Suspects</div>
                  <div className="text-sm text-muted-foreground">Identical amounts by same user</div>
                </div>
                <div className="font-bold">{summary.duplicateSuspects?.toLocaleString() || 0}</div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">AI Explanations</div>
                  <div className="text-sm text-muted-foreground">Claude analyzed entries</div>
                </div>
                <div className="font-bold">{summary.aiExplanationCount?.toLocaleString() || 0}</div>
              </div>
            </div>
            
            <div className="mt-6 text-xs text-muted-foreground border-l-2 border-amber-500 pl-3 py-1 bg-amber-500/5 rounded-r">
              <strong>Disclaimer:</strong> This is a risk indicator, not an audit conclusion. Auditor judgment is required to determine material misstatement.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
