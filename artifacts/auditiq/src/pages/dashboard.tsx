import { useGetOverallDashboard, getGetOverallDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Briefcase, AlertTriangle, AlertCircle, CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetOverallDashboard();

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-muted rounded"></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded"></div>)}
      </div>
    </div>;
  }

  if (!dashboard) {
    return <div>Failed to load dashboard</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
        <p className="text-muted-foreground mt-2">Aggregate risk metrics across all active engagements.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Engagements</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.activeEngagements}</div>
            <p className="text-xs text-muted-foreground">Out of {dashboard.totalEngagements} total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Entries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{dashboard.totalHighRisk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Requires immediate review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk Entries</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{dashboard.totalMediumRisk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Requires sample review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk Entries</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{dashboard.totalLowRisk.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Standard processing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Engagements</CardTitle>
            <CardDescription>Recently updated audit engagements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.recentEngagements?.map(eng => (
                <div key={eng.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <Link href={`/engagements/${eng.id}`} className="font-medium hover:underline flex items-center">
                      {eng.name}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                    <div className="text-sm text-muted-foreground">{eng.clientName} &middot; {eng.period}</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-2 py-1 bg-destructive/10 text-destructive rounded text-xs font-semibold">
                      {eng.highRiskCount || 0} High
                    </div>
                    <div className="flex items-center justify-center px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs font-semibold">
                      {eng.mediumRiskCount || 0} Med
                    </div>
                  </div>
                </div>
              ))}
              {(!dashboard.recentEngagements || dashboard.recentEngagements.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">No engagements found</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Risk Trend</CardTitle>
            <CardDescription>Overall portfolio risk assessment</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
            <div className="text-xl font-medium">{dashboard.overallRiskTrend || "Stable"}</div>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
              Based on recent journal entry analysis across all active audit engagements.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
