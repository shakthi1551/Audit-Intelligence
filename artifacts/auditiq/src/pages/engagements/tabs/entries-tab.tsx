import React, { useState } from "react";
import { useListJournalEntries, getListJournalEntriesQueryKey, useGetAiExplanation, useGenerateAiExplanation, useOverrideRiskScore } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Bot, ShieldAlert, Shield, History, AlertTriangle, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { ListJournalEntriesRiskLevel, OverrideBodyRiskLevel, OverrideBodyFeedbackCategory, OverrideBodyConfidenceLevel, BeneishTag } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { TextHighlight, FinNegCount } from "@/components/text-highlight";
import { RiskNarrativeBox } from "@/components/risk-narrative";
import { ShapChart } from "@/components/shap-chart";

function RiskBadge({ level }: { level?: string }) {
  if (level === "HIGH") return <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">HIGH</Badge>;
  if (level === "MEDIUM") return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">MEDIUM</Badge>;
  if (level === "LOW") return <Badge className="bg-green-500 hover:bg-green-500 text-white">LOW</Badge>;
  return <Badge variant="outline">UNKNOWN</Badge>;
}

function BeneishTagBadge({ tag }: { tag: BeneishTag }) {
  const colors: Record<string, string> = {
    HIGH: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
    MEDIUM: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
    LOW: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colors[tag.severity]} cursor-help whitespace-nowrap`}
      title={tag.description}
    >
      <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
      {tag.variable}
    </span>
  );
}

function FormatCurrency({ value }: { value: number }) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function ExplanationPanel({
  entryId, score, description, entryDate, postingTime, postedBy, amount, debitAccount,
}: {
  entryId: number;
  score: any;
  description: string;
  entryDate: string;
  postingTime?: string;
  postedBy: string;
  amount: number;
  debitAccount?: string;
}) {
  const { data: explanation, isLoading } = useGetAiExplanation(entryId);
  const generateMutation = useGenerateAiExplanation();
  const queryClient = useQueryClient();

  const handleGenerate = () => {
    generateMutation.mutate({ entryId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/journal-entries', entryId, 'explanation'] });
      }
    });
  };

  return (
    <div className="p-4 bg-muted/30 border-t space-y-4">
      <RiskNarrativeBox
        entryDate={entryDate}
        postingTime={postingTime}
        postedBy={postedBy}
        amount={amount}
        description={description}
        debitAccount={debitAccount}
        score={score}
      />

      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Description Analysis
        </h4>
        <TextHighlight text={description} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center">
            <ShieldAlert className="h-4 w-4 mr-2" />
            XAI Feature Importance
          </h4>
          {score ? (
            <ShapChart score={score} />
          ) : (
            <p className="text-sm text-muted-foreground">No score data available.</p>
          )}
          {score && (
            <div className="flex justify-between items-center mt-3 pt-2 border-t text-xs text-muted-foreground">
              <span>Rule-based total</span>
              <span className="font-mono font-semibold text-foreground">{score?.totalScore || 0}/100</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            AI Explanation
          </h4>
          
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/6"></div>
            </div>
          ) : explanation ? (
            <div className="space-y-3">
              <div className="text-sm bg-background p-3 rounded border text-foreground/90 leading-relaxed">
                {explanation.explanation}
              </div>
              {explanation.isaReference && (
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block font-medium">
                  {explanation.isaReference}
                </div>
              )}
              {explanation.triggers && explanation.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {explanation.triggers.map((t: string, i: number) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground border">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed rounded bg-background">
              <p className="text-sm text-muted-foreground mb-3">No AI explanation generated yet.</p>
              <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? "Generating..." : "Generate Explanation"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-4 italic">
        Disclaimer: This is a risk indicator, not an audit conclusion.
      </div>
    </div>
  );
}

const FEEDBACK_CATEGORIES: { value: OverrideBodyFeedbackCategory; label: string; desc: string }[] = [
  { value: "CLERICAL_ERROR",         label: "Clerical Error",           desc: "System mis-scored due to data entry issue" },
  { value: "POLICY_EXCEPTION",       label: "Policy Exception",         desc: "Entry is permitted under approved policy" },
  { value: "BUSINESS_JUSTIFICATION", label: "Business Justification",   desc: "Legitimate business rationale confirmed" },
  { value: "SYSTEM_ERROR",           label: "System / Model Error",     desc: "Risk engine produced incorrect result" },
  { value: "OTHER",                  label: "Other",                    desc: "Rationale explained in notes below" },
];

function OverrideDialog({ entryId, currentRisk, engagementId }: { entryId: number, currentRisk?: string, engagementId: number }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<OverrideBodyRiskLevel>((currentRisk as OverrideBodyRiskLevel) || "LOW");
  const [reason, setReason] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<OverrideBodyFeedbackCategory>("OTHER");
  const [confidenceLevel, setConfidenceLevel] = useState<OverrideBodyConfidenceLevel>("MEDIUM");

  const overrideMutation = useOverrideRiskScore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOverride = () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    overrideMutation.mutate(
      { entryId, data: { riskLevel: level, reason, feedbackCategory, confidenceLevel } },
      {
        onSuccess: () => {
          toast({ title: "Override recorded", description: "Logged to audit trail with full rationale." });
          setOpen(false);
          setReason("");
          queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(engagementId) });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Override
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Human-in-the-Loop Override
          </DialogTitle>
          <DialogDescription>
            Override the AI risk classification. All fields are logged permanently to the audit trail (ISA 230).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* New risk level */}
          <div className="space-y-2">
            <Label>New Risk Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as OverrideBodyRiskLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feedback category */}
          <div className="space-y-2">
            <Label>Override Category <span className="text-muted-foreground font-normal">(HITL feedback)</span></Label>
            <div className="space-y-1.5">
              {FEEDBACK_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFeedbackCategory(cat.value)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                    feedbackCategory === cat.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${feedbackCategory === cat.value ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                  <div>
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{cat.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Confidence level */}
          <div className="space-y-2">
            <Label>Override Confidence</Label>
            <RadioGroup
              value={confidenceLevel}
              onValueChange={(v) => setConfidenceLevel(v as OverrideBodyConfidenceLevel)}
              className="flex gap-4"
            >
              {(["HIGH", "MEDIUM", "LOW"] as OverrideBodyConfidenceLevel[]).map(lvl => (
                <div key={lvl} className="flex items-center space-x-2">
                  <RadioGroupItem value={lvl} id={`conf-${lvl}`} />
                  <Label htmlFor={`conf-${lvl}`} className="font-normal cursor-pointer">{lvl}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Rationale */}
          <div className="space-y-2">
            <Label>Auditor Rationale <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Provide a detailed justification for this override..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleOverride} disabled={overrideMutation.isPending || !reason.trim()}>
            {overrideMutation.isPending ? "Saving…" : "Confirm Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EntriesTab({ engagementId }: { engagementId: number }) {
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const queryParams: any = { page, pageSize: 20 };
  if (riskFilter !== "ALL") queryParams.riskLevel = riskFilter;

  const { data, isLoading } = useListJournalEntries(engagementId, queryParams, {
    query: { enabled: !!engagementId, queryKey: getListJournalEntriesQueryKey(engagementId, queryParams) }
  });

  const toggleRow = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Risk Levels</SelectItem>
              <SelectItem value="HIGH">High Risk</SelectItem>
              <SelectItem value="MEDIUM">Medium Risk</SelectItem>
              <SelectItem value="LOW">Low Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {data?.total || 0} entries found
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">Loading entries...</TableCell>
                </TableRow>
              ) : !data || data.entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No journal entries found</TableCell>
                </TableRow>
              ) : (
                data.entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow 
                      className={`cursor-pointer ${expandedId === entry.id ? 'bg-muted/50' : ''}`}
                      onClick={() => toggleRow(entry.id)}
                    >
                      <TableCell>
                        {expandedId === entry.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(entry.entryDate), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted-foreground">{entry.postingTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{entry.debitAccount}</div>
                        {entry.creditAccount && <div className="font-mono text-xs text-muted-foreground mt-1">{entry.creditAccount}</div>}
                      </TableCell>
                      <TableCell className="max-w-[250px]" title={entry.description}>
                        <span className="truncate block">{entry.description}</span>
                        <FinNegCount description={entry.description} />
                      </TableCell>
                      <TableCell>{entry.postedBy}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        <FormatCurrency value={entry.amount} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <RiskBadge level={entry.riskScore?.riskLevel} />
                            {entry.riskScore?.overridden && (
                              <span title="Manually overridden">
                                <History className="h-3 w-3 text-muted-foreground" />
                              </span>
                            )}
                          </div>
                          {(entry as any).beneishTags && (entry as any).beneishTags.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {(entry as any).beneishTags.map((tag: BeneishTag, i: number) => (
                                <BeneishTagBadge key={i} tag={tag} />
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <OverrideDialog 
                            entryId={entry.id} 
                            currentRisk={entry.riskScore?.riskLevel} 
                            engagementId={engagementId} 
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === entry.id && (
                      <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-0">
                        <TableCell colSpan={8} className="p-0">
                          <ExplanationPanel
                            entryId={entry.id}
                            score={entry.riskScore}
                            description={entry.description}
                            entryDate={entry.entryDate}
                            postingTime={entry.postingTime}
                            postedBy={entry.postedBy}
                            amount={entry.amount}
                            debitAccount={entry.debitAccount}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {data.totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
