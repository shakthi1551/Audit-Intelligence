import { useGetBenfordAnalysis, getGetBenfordAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BenfordTab({ engagementId }: { engagementId: number }) {
  const { data: benford, isLoading } = useGetBenfordAnalysis(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetBenfordAnalysisQueryKey(engagementId) }
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-24 bg-muted rounded"></div>
      <div className="h-96 bg-muted rounded"></div>
    </div>;
  }

  if (!benford) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No Benford's Law analysis available for this engagement.
        </CardContent>
      </Card>
    );
  }

  // Transform data for recharts
  const chartData = benford.digits.map(d => ({
    digit: d.digit.toString(),
    Actual: Number((d.actual * 100).toFixed(2)),
    Expected: Number((d.expected * 100).toFixed(2)),
  }));

  const isAnomalous = benford.deviationScore > 0.05;

  return (
    <div className="space-y-6">
      <Alert variant={isAnomalous ? "destructive" : "default"} className={!isAnomalous ? "bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800" : ""}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">
          {benford.riskAssessment} (Deviation Score: {benford.deviationScore.toFixed(4)})
        </AlertTitle>
        <AlertDescription>
          {benford.summary}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Benford's Law Analysis - First Digit Distribution</CardTitle>
          <CardDescription>
            Compares the actual distribution of first digits in journal entry amounts against the expected distribution defined by Benford's Law.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="digit" label={{ value: 'First Digit', position: 'insideBottom', offset: -10 }} />
                <YAxis label={{ value: 'Frequency (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Actual" fill="var(--primary)" barSize={40} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Expected" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-xs text-muted-foreground mt-6 italic border-l-2 border-primary pl-3 py-1 bg-muted/30">
            <strong>Disclaimer:</strong> Benford's Law is effective for large datasets spanning multiple orders of magnitude. Assigned numbers (e.g., invoice numbers) or strictly bounded amounts may naturally violate Benford's Law without indicating fraud.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
