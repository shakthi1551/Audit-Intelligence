import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { History, User, ArrowRightLeft, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { useState } from "react";

interface AuditMeta {
  feedbackCategory?: string;
  confidenceLevel?: string;
  newRiskLevel?: string;
  previousRiskLevel?: string;
  auditorName?: string;
  reason?: string;
}

const FEEDBACK_LABELS: Record<string, string> = {
  CLERICAL_ERROR: "Clerical Error",
  POLICY_EXCEPTION: "Policy Exception",
  BUSINESS_JUSTIFICATION: "Business Justification",
  SYSTEM_ERROR: "System Error",
  OTHER: "Other",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  LOW: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const RISK_COLORS: Record<string, string> = {
  HIGH: "text-destructive font-semibold",
  MEDIUM: "text-amber-600 font-semibold",
  LOW: "text-green-600 font-semibold",
};

function RiskChip({ level }: { level?: string }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return <span className={RISK_COLORS[level] ?? ""}>{level}</span>;
}

function AuditLogEntry({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const meta = (log.metadata ?? {}) as AuditMeta;
  const isOverride = log.action === "RISK_OVERRIDE";

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="mt-0.5 shrink-0">
          {isOverride ? (
            <Shield className="h-4 w-4 text-amber-500" />
          ) : (
            <History className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{log.action.replace(/_/g, " ")}</span>
            {isOverride && meta.previousRiskLevel && meta.newRiskLevel && (
              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                <RiskChip level={meta.previousRiskLevel} />
                <ArrowRightLeft className="h-3 w-3 mx-0.5" />
                <RiskChip level={meta.newRiskLevel} />
              </span>
            )}
            {meta.feedbackCategory && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {FEEDBACK_LABELS[meta.feedbackCategory] ?? meta.feedbackCategory}
              </Badge>
            )}
            {meta.confidenceLevel && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CONFIDENCE_COLORS[meta.confidenceLevel] ?? ""}`}>
                {meta.confidenceLevel} confidence
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {meta.auditorName ?? log.userId ?? "System"}
            </span>
            <span>Entry #{log.entityId}</span>
            <span>{format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}</span>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 text-sm space-y-2">
          {log.details && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</span>
              <p className="mt-1 text-foreground/90">{log.details}</p>
            </div>
          )}
          {meta.reason && meta.reason !== log.details && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auditor Rationale</span>
              <p className="mt-1 text-foreground/90 italic">"{meta.reason}"</p>
            </div>
          )}
          {log.ipAddress && (
            <p className="text-xs text-muted-foreground">IP: {log.ipAddress}</p>
          )}
          <div className="text-[10px] text-muted-foreground font-mono">
            Log ID: {log.id} · Entity: {log.entityType} #{log.entityId}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditTrailTab({ engagementId }: { engagementId: number }) {
  const params = { engagementId, page: 1 };
  const { data: logs, isLoading } = useListAuditLogs(
    params,
    { query: { enabled: !!engagementId, queryKey: getListAuditLogsQueryKey(params) } },
  );

  const overrideCount = logs?.filter((l: any) => l.action === "RISK_OVERRIDE").length ?? 0;
  const highConfidence = logs?.filter((l: any) => (l.metadata as AuditMeta)?.confidenceLevel === "HIGH").length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{logs?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{overrideCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Auditor Overrides</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{highConfidence}</p>
            <p className="text-xs text-muted-foreground mt-1">High-Confidence Decisions</p>
          </CardContent>
        </Card>
      </div>

      {/* Governance note */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-blue-800 dark:text-blue-300">
          All auditor overrides are permanently logged with rationale, feedback category, confidence level,
          previous risk state, IP address, and auditor identity in accordance with ISA 230.
        </p>
      </div>

      {/* Log entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Full Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No audit events yet for this engagement.</p>
            </div>
          ) : (
            <ScrollArea className="h-[520px]">
              <div className="space-y-2 pr-2">
                {logs.map((log: any) => (
                  <AuditLogEntry key={log.id} log={log} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
