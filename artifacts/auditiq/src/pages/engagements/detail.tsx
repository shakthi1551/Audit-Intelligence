import { useState } from "react";
import { useGetEngagement, getGetEngagementQueryKey, useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, FileText, BarChart3, Clock, AlertTriangle, Copy, History, Cloud } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

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

  const { data: summary } = useGetDashboardSummary(id, {
    query: { enabled: !!id, queryKey: getGetDashboardSummaryQueryKey(id) }
  });

  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading engagement...</p>
        </div>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Engagement not found</h2>
          <Link href="/engagements">
            <Button variant="outline" className="mt-4">
              Back to Engagements
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalEntries = summary?.totalEntries || 0;
  const highCount = summary?.highRiskCount || 0;
  const mediumCount = summary?.mediumRiskCount || 0;
  const lowCount = summary?.lowRiskCount || 0;
  const avgRisk = summary?.avgRiskScore || 0;

  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <Link href="/engagements">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {engagement.name}
              </h1>
              <span className={`
                px-4 py-1.5 rounded-full text-sm font-semibold border
                ${engagement.status === "ACTIVE" ? "bg-chart-5/10 text-chart-5 border-chart-5/30" : ""}
                ${engagement.status === "COMPLETED" ? "bg-primary/10 text-primary border-primary/30" : ""}
                ${engagement.status === "ARCHIVED" ? "bg-muted text-muted-foreground border-border" : ""}
              `}>
                {engagement.status}
              </span>
            </div>
            <p className="text-muted-foreground text-lg">
              {engagement.clientName} • {engagement.period}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DriveImportDialog engagementId={id} />
            <Link href={`/engagements/${id}/upload`}>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground gap-2" data-testid="button-upload">
                <Upload className="h-5 w-5" />
                Upload Entries
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary stats */}
        {totalEntries > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-card-border rounded-xl p-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Entries</p>
                <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  {totalEntries.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">HIGH Risk</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-destructive" style={{ fontFamily: "var(--font-display)" }}>
                    {highCount}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-semibold">
                    {totalEntries > 0 ? ((highCount / totalEntries) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">MEDIUM Risk</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-chart-3" style={{ fontFamily: "var(--font-display)" }}>
                    {mediumCount}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-chart-3/20 text-chart-3 text-xs font-semibold">
                    {totalEntries > 0 ? ((mediumCount / totalEntries) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">LOW Risk</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-chart-5" style={{ fontFamily: "var(--font-display)" }}>
                    {lowCount}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-chart-5/20 text-chart-5 text-xs font-semibold">
                    {totalEntries > 0 ? ((lowCount / totalEntries) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Risk Score</p>
                <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  {avgRisk.toFixed(1)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-card border border-card-border p-1 gap-1">
            <TabsTrigger
              value="overview"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="entries"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <FileText className="h-4 w-4 mr-2" />
              Entries
            </TabsTrigger>
            <TabsTrigger
              value="heatmaps"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Clock className="h-4 w-4 mr-2" />
              Heatmaps
            </TabsTrigger>
            <TabsTrigger
              value="benford"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Benford
            </TabsTrigger>
            <TabsTrigger
              value="duplicates"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicates
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="audit-trail"
              className="relative h-10 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <History className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="mt-0">
          <OverviewTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="entries" className="mt-0">
          <EntriesTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="heatmaps" className="mt-0">
          <HeatmapsTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="benford" className="mt-0">
          <BenfordTab engagementId={id} />
        </TabsContent>

        <TabsContent value="duplicates" className="mt-0">
          <DuplicatesTab engagementId={id} />
        </TabsContent>
        
        <TabsContent value="reports" className="mt-0">
          <ReportsTab engagementId={id} />
        </TabsContent>

        <TabsContent value="audit-trail" className="mt-0">
          <AuditTrailTab engagementId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
