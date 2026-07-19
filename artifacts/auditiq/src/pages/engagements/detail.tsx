import { useState } from "react";
import { useLocation } from "wouter";
import { useGetEngagement, getGetEngagementQueryKey, useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, FileText, BarChart3, Clock, AlertTriangle, Copy, History } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

import OverviewTab from "./tabs/overview-tab";
import EntriesTab from "./tabs/entries-tab";
import HeatmapsTab from "./tabs/heatmaps-tab";
import BenfordTab from "./tabs/benford-tab";
import DuplicatesTab from "./tabs/duplicates-tab";
import ReportsTab from "./tabs/reports-tab";
import AuditTrailTab from "./tabs/audit-trail-tab";
import { DriveImportDialog } from "@/components/drive-import-dialog";

export default function EngagementDetail({ params }: { params?: { id: string } }) {
  const id = parseInt(params?.id || "0", 10);
  const { data: engagement, isLoading } = useGetEngagement(id, {
    query: { enabled: !!id, queryKey: getGetEngagementQueryKey(id) }
  });

  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-muted rounded"></div>
      <div className="h-96 bg-muted rounded"></div>
    </div>;
  }

  if (!engagement) {
    return <div>Engagement not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/engagements">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Engagements</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">{engagement.name}</h1>
              <Badge variant="outline">{engagement.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{engagement.clientName} &middot; {engagement.period}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DriveImportDialog engagementId={id} />
          <Button asChild>
            <Link href={`/engagements/${id}/upload`}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Journal Entries
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full lg:w-auto">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:block" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="entries">
            <FileText className="h-4 w-4 mr-1.5 hidden sm:block" />
            Entries
          </TabsTrigger>
          <TabsTrigger value="heatmaps">
            <Clock className="h-4 w-4 mr-1.5 hidden sm:block" />
            Heatmaps
          </TabsTrigger>
          <TabsTrigger value="benford">
            <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:block" />
            Benford
          </TabsTrigger>
          <TabsTrigger value="duplicates">
            <Copy className="h-4 w-4 mr-1.5 hidden sm:block" />
            Duplicates
          </TabsTrigger>
          <TabsTrigger value="reports">
            <AlertTriangle className="h-4 w-4 mr-1.5 hidden sm:block" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="audit-trail">
            <History className="h-4 w-4 mr-1.5 hidden sm:block" />
            Audit Trail
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="entries" className="space-y-4">
          <EntriesTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="heatmaps" className="space-y-4">
          <HeatmapsTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="benford" className="space-y-4">
          <BenfordTab engagementId={id} />
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          <DuplicatesTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <ReportsTab engagementId={id} />
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <AuditTrailTab engagementId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
