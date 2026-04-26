import React, { useState } from "react";
import { useListJournalEntries, getListJournalEntriesQueryKey, useGetAiExplanation, useGenerateAiExplanation, useOverrideRiskScore } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Bot, ShieldAlert, Check, X, Shield, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry, ListJournalEntriesRiskLevel, OverrideBodyRiskLevel } from "@workspace/api-client-react/src/generated/api.schemas";
import { Progress } from "@/components/ui/progress";

function RiskBadge({ level }: { level?: string }) {
  if (level === "HIGH") return <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">HIGH</Badge>;
  if (level === "MEDIUM") return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">MEDIUM</Badge>;
  if (level === "LOW") return <Badge className="bg-green-500 hover:bg-green-500 text-white">LOW</Badge>;
  return <Badge variant="outline">UNKNOWN</Badge>;
}

function FormatCurrency({ value }: { value: number }) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function ExplanationPanel({ entryId, score }: { entryId: number, score: any }) {
  const { data: explanation, isLoading } = useGetAiExplanation(entryId);
  const generateMutation = useGenerateAiExplanation();
  const queryClient = useQueryClient();

  const handleGenerate = () => {
    generateMutation.mutate({ data: { entryId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/journal-entries', entryId, 'explanation'] });
      }
    });
  };

  return (
    <div className="p-4 bg-muted/30 border-t space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Risk Score Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Posting Time (25%)</span>
              <span className="font-mono">{score?.postingTimeScore || 0}/100</span>
            </div>
            <Progress value={score?.postingTimeScore || 0} className="h-1.5" />
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Amount Anomaly (25%)</span>
              <span className="font-mono">{score?.amountScore || 0}/100</span>
            </div>
            <Progress value={score?.amountScore || 0} className="h-1.5" />
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">User Concentration (20%)</span>
              <span className="font-mono">{score?.userConcentrationScore || 0}/100</span>
            </div>
            <Progress value={score?.userConcentrationScore || 0} className="h-1.5" />
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Keywords (20%)</span>
              <span className="font-mono">{score?.keywordScore || 0}/100</span>
            </div>
            <Progress value={score?.keywordScore || 0} className="h-1.5" />
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Frequency (10%)</span>
              <span className="font-mono">{score?.frequencyScore || 0}/100</span>
            </div>
            <Progress value={score?.frequencyScore || 0} className="h-1.5" />

            <div className="flex justify-between items-center mt-4 pt-2 border-t font-semibold">
              <span>Total Score</span>
              <span className="font-mono">{score?.totalScore || 0}/100</span>
            </div>
            
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>Model Confidence</span>
              <span className="font-mono">{score?.confidenceScore || 0}%</span>
            </div>
            <Progress value={score?.confidenceScore || 0} className="h-1" />
          </div>
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

function OverrideDialog({ entryId, currentRisk, engagementId }: { entryId: number, currentRisk?: string, engagementId: number }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<OverrideBodyRiskLevel>((currentRisk as OverrideBodyRiskLevel) || "LOW");
  const [reason, setReason] = useState("");
  
  const overrideMutation = useOverrideRiskScore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOverride = () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    
    overrideMutation.mutate({ data: { entryId, riskLevel: level, reason } }, {
      onSuccess: () => {
        toast({ title: "Risk score overridden" });
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(engagementId) });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Override
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auditor Override</DialogTitle>
          <DialogDescription>
            Manually adjust the risk level for this journal entry. This action will be logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
          <div className="space-y-2">
            <Label>Override Reason</Label>
            <Textarea 
              placeholder="Provide a detailed explanation for this override..." 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleOverride} disabled={overrideMutation.isPending}>
            Confirm Override
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

  const { data, isLoading } = useListJournalEntries(engagementId, {
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
                      <TableCell className="max-w-[250px] truncate" title={entry.description}>
                        {entry.description}
                      </TableCell>
                      <TableCell>{entry.postedBy}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        <FormatCurrency value={entry.amount} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <RiskBadge level={entry.riskScore?.riskLevel} />
                          {entry.riskScore?.overridden && (
                            <History className="h-3 w-3 text-muted-foreground" title="Manually overridden" />
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
                          <ExplanationPanel entryId={entry.id} score={entry.riskScore} />
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
