import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Download, Settings, Lock, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ReportsTab({ engagementId }: { engagementId: number }) {
  const { toast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);

  const extFromContentType = (ct: string | null): string => {
    if (!ct) return "bin";
    if (ct.includes("pdf")) return "pdf";
    if (ct.includes("html")) return "html";
    if (ct.includes("spreadsheetml") || ct.includes("xlsx")) return "xlsx";
    if (ct.includes("csv")) return "csv";
    return "bin";
  };

  const downloadReport = async (
    kind: "pdf" | "excel",
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auditiq_token");
      const res = await fetch(
        `/api/engagements/${engagementId}/report/${kind}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const ext = extFromContentType(res.headers.get("content-type"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `engagement-${engagementId}-report.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Could not download report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => downloadReport("pdf", setPdfLoading);
  const handleDownloadExcel = () => downloadReport("excel", setXlsxLoading);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Executive Summary (PDF)
            </CardTitle>
            <CardDescription>
              Comprehensive audit trail report including risk distribution, Benford's analysis, and AI explanation summaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Includes:</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Overall risk assessment</li>
              <li>Top 50 highest risk entries with explanations</li>
              <li>User concentration heatmap</li>
              <li>Auditor overrides log</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={handleDownloadPdf} className="w-full" disabled={pdfLoading}>
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {pdfLoading ? "Generating..." : "Download PDF"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
              Detailed Export (Excel)
            </CardTitle>
            <CardDescription>
              Full dataset export containing all journal entries with computed risk scores and component breakdowns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Includes:</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>All journal entries</li>
              <li>Individual component risk scores</li>
              <li>AI explanation text (if generated)</li>
              <li>Override status and reasons</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={handleDownloadExcel} variant="outline" className="w-full" disabled={xlsxLoading}>
              {xlsxLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {xlsxLoading ? "Generating..." : "Export XLSX"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Engagement Settings
          </CardTitle>
          <CardDescription>
            Configure modules and integrations for this engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">ERP Integrations</Label>
              <p className="text-sm text-muted-foreground">Direct API connection to SAP, Oracle, or NetSuite.</p>
            </div>
            <div className="flex items-center">
              <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
              <Switch disabled checked={false} />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Real-time Monitoring</Label>
              <p className="text-sm text-muted-foreground">Continuous scoring of entries as they are posted.</p>
            </div>
            <div className="flex items-center">
              <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
              <Switch disabled checked={false} />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Client Portal</Label>
              <p className="text-sm text-muted-foreground">Allow client management to review and comment on flagged entries.</p>
            </div>
            <div className="flex items-center">
              <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
              <Switch disabled checked={false} />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Multi-currency Translation</Label>
              <p className="text-sm text-muted-foreground">Normalize all entries to a base currency for analysis.</p>
            </div>
            <div className="flex items-center">
              <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
              <Switch disabled checked={false} />
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground pt-4 border-t">
            * Locked features require an Enterprise license upgrade. Contact your account manager.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
