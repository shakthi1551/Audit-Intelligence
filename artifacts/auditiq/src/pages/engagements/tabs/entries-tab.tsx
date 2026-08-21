import { useState } from "react";
import {
  useListJournalEntries,
  getListJournalEntriesQueryKey,
  useGetAiExplanation,
  useGenerateAiExplanation,
  useOverrideRiskScore,
  type ListJournalEntriesRiskLevel,
  type OverrideBodyRiskLevel,
  type OverrideBodyFeedbackCategory,
  type OverrideBodyConfidenceLevel,
  type BeneishTag,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, ChevronDown, ChevronRight, Bot, Shield, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { RiskNarrativeBox } from "@/components/risk-narrative";
import { TextHighlight } from "@/components/text-highlight";
import { ShapChart } from "@/components/shap-chart";

interface EntriesTabProps {
  engagementId: number;
}

function RiskPill({ level, score }: { level?: string; score?: number }) {
  const colors = {
    HIGH: "bg-destructive/20 text-destructive border-destructive/40 glow-destructive",
    MEDIUM: "bg-chart-3/20 text-chart-3 border-chart-3/40",
    LOW: "bg-chart-5/20 text-chart-5 border-chart-5/40",
  };

  const color = colors[level as keyof typeof colors] || "bg-muted text-muted-foreground border-border";

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold ${color}`}>
      <span className="text-xs">{level}</span>
      {score !== undefined && (
        <span className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
}

function BeneishTagBadge({ tag }: { tag: BeneishTag }) {
  const colors = {
    HIGH: "bg-destructive/20 text-destructive border-destructive/40",
    MEDIUM: "bg-chart-3/20 text-chart-3 border-chart-3/40",
    LOW: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${colors[tag.severity]} cursor-help whitespace-nowrap`}
      title={tag.description}
    >
      <AlertTriangle className="h-3 w-3" />
      {tag.variable}
    </span>
  );
}

export default function EntriesTab({ engagementId }: EntriesTabProps) {
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState<ListJournalEntriesRiskLevel | undefined>(undefined);
  const [userFilter, setUserFilter] = useState("");
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const { data, isLoading } = useListJournalEntries(engagementId, {
    page,
    pageSize: 20,
    riskLevel: riskFilter,
    user: userFilter || undefined,
  }, {
    query: {
      enabled: !!engagementId,
      queryKey: getListJournalEntriesQueryKey(engagementId, { page, pageSize: 20, riskLevel: riskFilter, user: userFilter || undefined }),
    },
  });

  const entries = data?.entries || [];
  const totalPages = data?.totalPages || 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading journal entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-card-border rounded-xl p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Button
              variant={!riskFilter ? "default" : "outline"}
              onClick={() => setRiskFilter(undefined)}
              className={!riskFilter ? "bg-primary text-primary-foreground" : ""}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={riskFilter === "HIGH" ? "default" : "outline"}
              onClick={() => setRiskFilter("HIGH")}
              className={riskFilter === "HIGH" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              size="sm"
            >
              HIGH
            </Button>
            <Button
              variant={riskFilter === "MEDIUM" ? "default" : "outline"}
              onClick={() => setRiskFilter("MEDIUM")}
              className={riskFilter === "MEDIUM" ? "bg-chart-3 text-foreground hover:bg-chart-3/90" : ""}
              size="sm"
            >
              MEDIUM
            </Button>
            <Button
              variant={riskFilter === "LOW" ? "default" : "outline"}
              onClick={() => setRiskFilter("LOW")}
              className={riskFilter === "LOW" ? "bg-chart-5 text-foreground hover:bg-chart-5/90" : ""}
              size="sm"
            >
              LOW
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Entries list */}
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const isExpanded = expandedEntry === entry.id;
          const isHighRisk = entry.riskScore?.riskLevel === "HIGH";

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`
                bg-card border rounded-xl overflow-hidden transition-all
                ${isHighRisk ? "border-destructive/40 bg-destructive/5" : "border-card-border"}
                ${isExpanded ? "ring-2 ring-primary" : ""}
              `}
            >
              {/* Main row */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors relative"
                onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
              >
                {isHighRisk && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive animate-pulse" />
                )}
                
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="shrink-0 p-1">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-primary" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(entry.entryDate), "MMM dd, yyyy")}
                      </p>
                      {entry.postingTime && (
                        <p className="text-xs text-muted-foreground">{entry.postingTime}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Posted By</p>
                      <p className="font-semibold text-foreground">{entry.postedBy}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(entry.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Accounts</p>
                      <p className="text-sm text-foreground">
                        {entry.debitAccount} → {entry.creditAccount}
                      </p>
                    </div>

                    <div className="md:col-span-1">
                      <p className="text-sm text-muted-foreground mb-1">Risk Score</p>
                      <RiskPill
                        level={entry.riskScore?.riskLevel}
                        score={entry.riskScore?.totalScore}
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.beneishTags?.map((tag) => (
                        <BeneishTagBadge key={tag.variable} tag={tag} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 ml-12">
                  <p className="text-sm text-muted-foreground line-clamp-1">{entry.description}</p>
                </div>
              </div>

              {/* Expanded section */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-card-border bg-muted/20"
                  >
                    <ExpandedEntryPanel
                      entryId={entry.id}
                      entry={entry}
                      engagementId={engagementId}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function ExpandedEntryPanel({
  entryId,
  entry,
  engagementId,
}: {
  entryId: number;
  entry: any;
  engagementId: number;
}) {
  const { data: explanation, isLoading: loadingExplanation } = useGetAiExplanation(entryId);
  const generateMutation = useGenerateAiExplanation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleGenerate = () => {
    generateMutation.mutate(
      { entryId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/journal-entries", entryId, "explanation"] });
          toast({
            title: "AI Explanation Generated",
            description: "The AI has analyzed this entry and generated an explanation.",
          });
        },
        onError: () => {
          toast({
            title: "Generation Failed",
            description: "Unable to generate AI explanation. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Risk narrative */}
      <div className="bg-card border border-card-border rounded-lg p-4">
        <RiskNarrativeBox
          entryDate={entry.entryDate}
          postingTime={entry.postingTime}
          postedBy={entry.postedBy}
          amount={entry.amount}
          description={entry.description}
          debitAccount={entry.debitAccount}
          score={entry.riskScore}
        />
      </div>

      {/* Description analysis */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Description Analysis</h4>
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <TextHighlight text={entry.description} />
        </div>
      </div>

      {/* SHAP chart */}
      {entry.riskScore && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">XAI Feature Importance</h4>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <ShapChart score={entry.riskScore} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Risk Score Breakdown</h4>
            <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
              <ScoreBar label="Posting Time" score={entry.riskScore.postingTimeScore} />
              <ScoreBar label="Amount" score={entry.riskScore.amountScore} />
              <ScoreBar label="User Concentration" score={entry.riskScore.userConcentrationScore} />
              <ScoreBar label="Keyword" score={entry.riskScore.keywordScore} />
              <ScoreBar label="Frequency" score={entry.riskScore.frequencyScore} />
              {entry.riskScore.mlAnomalyScore !== undefined && (
                <ScoreBar label="ML Anomaly" score={entry.riskScore.mlAnomalyScore} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      <div className="bg-card border border-primary/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            AI Explanation
          </h4>
          {!explanation && (
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          )}
        </div>

        {loadingExplanation ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading explanation...</p>
          </div>
        ) : explanation ? (
          <div className="space-y-3">
            <div className="space-y-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">1. Forensic Risk Hypothesis</p><p className="text-sm text-foreground leading-relaxed">{explanation.forensicRiskHypothesis || explanation.explanation}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">2. ISA 240 Mapping</p><p className="text-sm text-foreground leading-relaxed">{explanation.isa240Mapping || explanation.isaReference || "ISA 240 — validate the applicable paragraph against the firm's licensed standard."}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-chart-3 mb-1">3. Recommended Substantive Action</p><p className="text-sm text-foreground leading-relaxed">{explanation.recommendedSubstantiveAction || "Inspect the supporting document and make a documented management inquiry."}</p></div>
            </div>
            {explanation.triggers && explanation.triggers.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Key Triggers:</p>
                <div className="flex flex-wrap gap-2">
                  {explanation.triggers.map((trigger, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium border border-primary/30"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No AI explanation available yet.</p>
        )}
      </div>

      {/* Override button */}
      <div className="flex justify-end">
        <OverrideDialog entryId={entryId} currentRisk={entry.riskScore} engagementId={engagementId} />
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  if (score === undefined || score === null) return null;

  const percentage = Math.min(100, Math.max(0, score));
  const color = percentage > 70 ? "bg-destructive" : percentage > 40 ? "bg-chart-3" : "bg-chart-5";

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function OverrideDialog({
  entryId,
  currentRisk,
  engagementId,
}: {
  entryId: number;
  currentRisk: any;
  engagementId: number;
}) {
  const [open, setOpen] = useState(false);
  const [riskLevel, setRiskLevel] = useState<OverrideBodyRiskLevel>("LOW");
  const [reason, setReason] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<OverrideBodyFeedbackCategory>("OTHER");
  const [confidenceLevel, setConfidenceLevel] = useState<OverrideBodyConfidenceLevel>("MEDIUM");

  const overrideMutation = useOverrideRiskScore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = () => {
    overrideMutation.mutate(
      {
        entryId,
        data: { riskLevel, reason, feedbackCategory, confidenceLevel },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(engagementId, {}) });
          toast({
            title: "Risk Score Overridden",
            description: "The risk assessment has been updated.",
          });
          setOpen(false);
          setReason("");
        },
        onError: () => {
          toast({
            title: "Override Failed",
            description: "Unable to override risk score. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-chart-3 text-chart-3 hover:bg-chart-3/10">
          <Shield className="h-4 w-4 mr-2" />
          Override Risk
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-card-border">
        <DialogHeader>
          <DialogTitle>Override Risk Assessment</DialogTitle>
          <DialogDescription>
            Manually adjust the risk level for this entry. Current: {currentRisk?.riskLevel || "UNKNOWN"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Risk Level</Label>
            <RadioGroup value={riskLevel} onValueChange={(val) => setRiskLevel(val as OverrideBodyRiskLevel)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HIGH" id="high" />
                <Label htmlFor="high" className="cursor-pointer">HIGH</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MEDIUM" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer">MEDIUM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="LOW" id="low" />
                <Label htmlFor="low" className="cursor-pointer">LOW</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={feedbackCategory} onValueChange={(val) => setFeedbackCategory(val as OverrideBodyFeedbackCategory)}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLERICAL_ERROR">Clerical Error</SelectItem>
                <SelectItem value="POLICY_EXCEPTION">Policy Exception</SelectItem>
                <SelectItem value="BUSINESS_JUSTIFICATION">Business Justification</SelectItem>
                <SelectItem value="SYSTEM_ERROR">System Error</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Confidence</Label>
            <Select value={confidenceLevel} onValueChange={(val) => setConfidenceLevel(val as OverrideBodyConfidenceLevel)}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're overriding this risk assessment..."
              rows={4}
              className="bg-input border-border"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || overrideMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {overrideMutation.isPending ? "Submitting..." : "Submit Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
