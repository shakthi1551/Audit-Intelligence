import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FolderOpen, AlertTriangle, TrendingUp, Plus, Clock } from "lucide-react";
import { useListEngagements, useGetOverallDashboard } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: engagements, isLoading: loadingEngagements } = useListEngagements();
  const { data: dashboard, isLoading: loadingDashboard } = useGetOverallDashboard();

  const [animatedStats, setAnimatedStats] = useState({
    totalEngagements: 0,
    totalHighRisk: 0,
    totalEntriesProcessed: 0,
  });

  useEffect(() => {
    if (!dashboard) return;

    const duration = 1000;
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedStats({
        totalEngagements: Math.floor(dashboard.totalEngagements * progress),
        totalHighRisk: Math.floor(dashboard.totalHighRisk * progress),
        totalEntriesProcessed: Math.floor(dashboard.totalEntriesProcessed * progress),
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats({
          totalEngagements: dashboard.totalEngagements,
          totalHighRisk: dashboard.totalHighRisk,
          totalEntriesProcessed: dashboard.totalEntriesProcessed,
        });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [dashboard]);

  const getRiskLevel = (engagement: any) => {
    const total = engagement.totalEntries || 1;
    const highPct = ((engagement.highRiskCount || 0) / total) * 100;
    if (highPct > 10) return "high";
    if (highPct > 5) return "medium";
    return "low";
  };

  const getRiskBarColor = (count: number, total: number) => {
    const pct = (count / (total || 1)) * 100;
    if (pct > 10) return "bg-destructive";
    if (pct > 5) return "bg-chart-3";
    return "bg-chart-5";
  };

  if (loadingEngagements || loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Portfolio Overview
          </h1>
          <p className="text-muted-foreground">Monitor all active engagements and risk indicators</p>
        </div>
        <Link href="/engagements/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 glow" data-testid="button-new-engagement">
            <Plus className="h-5 w-5" />
            New Engagement
          </Button>
        </Link>
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-card-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Total Engagements</p>
            </div>
            <p className="text-5xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {animatedStats.totalEngagements}
            </p>
            <p className="text-sm text-muted-foreground">
              {dashboard?.activeEngagements || 0} active
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-card-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">High Risk Entries</p>
            </div>
            <p className="text-5xl font-bold text-destructive mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {animatedStats.totalHighRisk}
            </p>
            <p className="text-sm text-muted-foreground">
              Requires immediate review
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-card-border rounded-xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Entries Processed</p>
            </div>
            <p className="text-5xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {animatedStats.totalEntriesProcessed.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              All-time total
            </p>
          </div>
        </motion.div>
      </div>

      {/* Engagements grid */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
          Active Engagements
        </h2>

        {!engagements || engagements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-card-border rounded-xl p-12 text-center"
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-6 rounded-full bg-muted/50 w-fit mx-auto">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                No engagements yet
              </h3>
              <p className="text-muted-foreground">
                Create your first engagement to start analyzing journal entries for fraud indicators
              </p>
              <Link href="/engagements/new">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-4">
                  <Plus className="h-5 w-5" />
                  Create Engagement
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {engagements.map((engagement, index) => {
              const totalEntries = engagement.totalEntries || 0;
              const highCount = engagement.highRiskCount || 0;
              const mediumCount = engagement.mediumRiskCount || 0;
              const lowCount = engagement.lowRiskCount || 0;

              return (
                <motion.div
                  key={engagement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Link href={`/engagements/${engagement.id}`}>
                    <div className="bg-card border border-card-border rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-all h-full group">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                              {engagement.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{engagement.clientName}</p>
                          </div>
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium border
                            ${engagement.status === "ACTIVE" ? "bg-chart-5/10 text-chart-5 border-chart-5/30" : ""}
                            ${engagement.status === "COMPLETED" ? "bg-primary/10 text-primary border-primary/30" : ""}
                            ${engagement.status === "ARCHIVED" ? "bg-muted text-muted-foreground border-border" : ""}
                          `}>
                            {engagement.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Period: {engagement.period}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(engagement.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {totalEntries > 0 && (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Risk Distribution</span>
                                <span className="font-semibold text-foreground">{totalEntries} entries</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                                {highCount > 0 && (
                                  <div
                                    className="bg-destructive"
                                    style={{ width: `${(highCount / totalEntries) * 100}%` }}
                                  />
                                )}
                                {mediumCount > 0 && (
                                  <div
                                    className="bg-chart-3"
                                    style={{ width: `${(mediumCount / totalEntries) * 100}%` }}
                                  />
                                )}
                                {lowCount > 0 && (
                                  <div
                                    className="bg-chart-5"
                                    style={{ width: `${(lowCount / totalEntries) * 100}%` }}
                                  />
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-destructive" style={{ fontFamily: "var(--font-display)" }}>
                                  {highCount}
                                </p>
                                <p className="text-xs text-muted-foreground">HIGH</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-chart-3" style={{ fontFamily: "var(--font-display)" }}>
                                  {mediumCount}
                                </p>
                                <p className="text-xs text-muted-foreground">MEDIUM</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-chart-5" style={{ fontFamily: "var(--font-display)" }}>
                                  {lowCount}
                                </p>
                                <p className="text-xs text-muted-foreground">LOW</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
