import { useDownloadPdfReport, useDownloadExcelReport } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Download, Settings, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ReportsTab({ engagementId }: { engagementId: number }) {
  const handleDownloadPdf = () => {
    window.open(`/api/engagements/${engagementId}/reports/pdf`, "_blank");
  };

  const handleDownloadExcel = () => {
    window.open(`/api/engagements/${engagementId}/reports/excel`, "_blank");
  };

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
            <Button onClick={handleDownloadPdf} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
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
            <Button onClick={handleDownloadExcel} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export XLSX
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
