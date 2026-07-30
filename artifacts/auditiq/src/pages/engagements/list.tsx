import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, FolderOpen, Clock } from "lucide-react";
import { useListEngagements } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function EngagementsList() {
  const { data: engagements, isLoading } = useListEngagements();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEngagements = engagements?.filter((engagement) => {
    const query = searchQuery.toLowerCase();
    return (
      engagement.name.toLowerCase().includes(query) ||
      engagement.clientName.toLowerCase().includes(query) ||
      engagement.period.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading engagements...</p>
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
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Engagements
          </h1>
          <p className="text-muted-foreground">Manage all audit engagements and journal entry analysis</p>
        </div>
        <Link href="/engagements/new">
          <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground gap-2 glow" data-testid="button-new-engagement">
            <Plus className="h-5 w-5" />
            New Engagement
          </Button>
        </Link>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-xl"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search engagements by name, client, or period..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 bg-card border-card-border focus:border-primary"
          data-testid="input-search"
        />
      </motion.div>

      {/* Engagements list */}
      {!filteredEngagements || filteredEngagements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-card-border rounded-xl p-12 text-center"
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-6 rounded-full bg-muted/50 w-fit mx-auto">
              <FolderOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {searchQuery ? "No engagements found" : "No engagements yet"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : "Create your first engagement to start analyzing journal entries"}
            </p>
            {!searchQuery && (
              <Link href="/engagements/new">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-4">
                  <Plus className="h-5 w-5" />
                  Create Engagement
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredEngagements.map((engagement, index) => {
            const totalEntries = engagement.totalEntries || 0;
            const highCount = engagement.highRiskCount || 0;
            const mediumCount = engagement.mediumRiskCount || 0;
            const lowCount = engagement.lowRiskCount || 0;

            return (
              <motion.div
                key={engagement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="stagger-in"
              >
                <Link href={`/engagements/${engagement.id}`}>
                  <div className="bg-card border border-card-border rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Left: engagement info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                              {engagement.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{engagement.clientName}</p>
                          </div>
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-semibold border shrink-0
                            ${engagement.status === "ACTIVE" ? "bg-chart-5/10 text-chart-5 border-chart-5/30" : ""}
                            ${engagement.status === "COMPLETED" ? "bg-primary/10 text-primary border-primary/30" : ""}
                            ${engagement.status === "ARCHIVED" ? "bg-muted text-muted-foreground border-border" : ""}
                          `}>
                            {engagement.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>Period: {engagement.period}</span>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Updated {formatDistanceToNow(new Date(engagement.updatedAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: risk stats */}
                      {totalEntries > 0 && (
                        <div className="flex items-center gap-8">
                          <div className="space-y-2 min-w-[200px]">
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

                          <div className="flex items-center gap-6">
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
                              <p className="text-xs text-muted-foreground">MED</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-chart-5" style={{ fontFamily: "var(--font-display)" }}>
                                {lowCount}
                              </p>
                              <p className="text-xs text-muted-foreground">LOW</p>
                            </div>
                          </div>
                        </div>
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
  );
}
