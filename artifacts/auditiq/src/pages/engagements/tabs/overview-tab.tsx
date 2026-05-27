import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRiskDistribution, getGetRiskDistributionQueryKey, useGetBeneishAnalysis, getGetBeneishAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { AlertTriangle, AlertCircle, CheckCircle2, FileText, Database, TrendingUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import type { BeneishAnalysis } from "@workspace/api-client-react/src/generated/api.schemas";

function MScoreGauge({ mScore }: { mScore: number }) {
  const min = -4, max = 1;
  const pct = Math.max(0, Math.min(100, ((mScore - min) / (max - min)) * 100));
  const color = mScore > -1.78 ? "#ef4444" : mScore > -2.22 ? "#f59e0b" : "#22c55e";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>-4 (Safe)</span>
        <span className="font-mono font-bold" style={{ color }}>{mScore.toFixed(2)}</span>
        <span>+1 (Risk)</span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-amber-400 to-red-500 opacity-20 rounded-full" />
        <div
          className="absolute top-0 bottom-0 w-2 rounded-full -translate-x-1/2 transition-all duration-700"
          style={{ left: `${pct}%`, backgroundColor: color }}
        />
        <div className="absolute inset-y-0 left-[37.8%] w-px bg-amber-400 opacity-60" title="-2.22" />
        <div className="absolute inset-y-0 left-[51.1%] w-px bg-red-400 opacity-80" title="-1.78" />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span />
        <span className="text-amber-500">–2.22</span>
        <span className="text-red-500 ml-4">–1.78</span>
        <span />
      </div>
    </div>
  );
}

function BeneishWidget({ data }: { data: BeneishAnalysis }) {
  const verdictColor = data.verdictSeverity === "HIGH"
    ? "bg-destructive text-destructive-foreground"
    : data.verdictSeverity === "MEDIUM"
    ? "bg-amber-500 text-white"
    : "bg-green-500 text-white";

  const radarData = data.indices.map(idx => ({
    subject: idx.variable,
    value: Math.min(parseFloat((idx.value / idx.threshold * 100).toFixed(1)), 200),
    threshold: 100,
    fullLabel: idx.label,
  }));

  return (
    <Card className="col-span-7">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Beneish M-Score
            </CardTitle>
            <CardDescription>Earnings manipulation probability model (Beneish 1999) — proxy indices derived from journal entry patterns</CardDescription>
          </div>
          <Badge className={`${verdictColor} text-sm px-3 py-1`}>
            {data.verdict}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MScoreGauge mScore={data.mScore} />

        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r">
          {data.summary}
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">Index Values vs Thresholds</h4>
            <div className="space-y-2">
              {data.indices.map(idx => (
                <div key={idx.variable} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {idx.flagged && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
                      <span className={idx.flagged ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        {idx.variable}
                      </span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[240px] text-xs">
                          <p className="font-medium mb-1">{idx.label}</p>
                          <p>{idx.description}</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className={`font-mono ${idx.flagged ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {idx.value.toFixed(3)} / {idx.threshold}
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${idx.flagged ? "bg-destructive" : "bg-green-500"}`}
                      style={{ width: `${Math.min((idx.value / idx.threshold) * 100, 100)}%` }}
                    />
                    {idx.value > idx.threshold && (
                      <div
                        className="absolute top-0 bottom-0 bg-destructive/40 rounded-full"
                        style={{
                          left: "100%",
                          width: `${Math.min(((idx.value - idx.threshold) / idx.threshold) * 100, 50)}%`
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Radar Profile</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Score % of threshold" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                  <Radar name="Threshold (100%)" dataKey="threshold" stroke="#94a3b8" fill="transparent" strokeDasharray="4 2" />
                  <Tooltip
                    formatter={(val: number, name: string) =>
                      name === "Threshold (100%)" ? null : [`${val.toFixed(0)}% of threshold`, "Score"]
                    }
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">Bars beyond 100% indicate a flagged index</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3 italic">
          <strong>Note:</strong> Beneish indices are computed as proxies from journal entry account patterns, not audited financial statements. Use in conjunction with ISA 240 risk assessment — not as a standalone conclusion.
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewTab({ engagementId }: { engagementId: number }) {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetDashboardSummaryQueryKey(engagementId) }
  });

  const { data: riskDist, isLoading: isRiskDistLoading } = useGetRiskDistribution(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetRiskDistributionQueryKey(engagementId) }
  });

  const { data: beneish } = useGetBeneishAnalysis(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetBeneishAnalysisQueryKey(engagementId) }
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

      {beneish && (
        <div className="grid gap-4 lg:grid-cols-7">
          <BeneishWidget data={beneish} />
        </div>
      )}
    </div>
  );
}
