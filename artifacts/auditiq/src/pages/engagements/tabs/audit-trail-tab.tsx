import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { History, Shield, AlertTriangle, FileText, User } from "lucide-react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

interface AuditTrailTabProps {
  engagementId: number;
}

export default function AuditTrailTab({ engagementId }: AuditTrailTabProps) {
  const { data: logs, isLoading } = useListAuditLogs({ engagementId }, {
    query: { enabled: !!engagementId, queryKey: getListAuditLogsQueryKey({ engagementId }) },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="mx-auto w-fit p-6 rounded-2xl bg-muted/50 mb-4">
          <History className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">No audit events yet</p>
        <p className="text-sm text-muted-foreground">All actions and overrides will be logged here</p>
      </div>
    );
  }

  const getActionIcon = (action: string, entityType: string) => {
    if (action.includes("override") || action.includes("OVERRIDE")) return Shield;
    if (action.includes("upload") || action.includes("UPLOAD")) return FileText;
    if (action.includes("create") || action.includes("CREATE")) return FileText;
    return AlertTriangle;
  };

  const getActionColor = (action: string) => {
    if (action.includes("override") || action.includes("OVERRIDE")) return {
      dot: "bg-chart-3 border-chart-3",
      icon: "text-chart-3",
      card: "border-chart-3/30 bg-chart-3/5",
    };
    if (action.includes("upload") || action.includes("UPLOAD")) return {
      dot: "bg-primary border-primary",
      icon: "text-primary",
      card: "border-primary/30 bg-primary/5",
    };
    return {
      dot: "bg-accent border-accent",
      icon: "text-accent",
      card: "border-accent/30 bg-accent/5",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <History className="h-6 w-6 text-primary" />
        <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Audit Trail
        </h3>
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-border to-transparent" />

        <div className="space-y-6">
          {logs.map((log, index) => {
            const ActionIcon = getActionIcon(log.action, log.entityType);
            const colors = getActionColor(log.action);
            const isOverride = log.action.includes("override") || log.action.includes("OVERRIDE");

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-16"
              >
                {/* Timeline dot */}
                <div className={`absolute left-3 top-3 w-6 h-6 rounded-full border-4 ${colors.dot} z-10`}>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: colors.dot.split(" ")[0].replace("bg-", "") }} />
                </div>

                {/* Event card */}
                <div className={`bg-card border rounded-xl p-6 ${colors.card}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted/50 border border-border`}>
                        <ActionIcon className={`h-5 w-5 ${colors.icon}`} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">{log.action}</h4>
                        <p className="text-sm text-muted-foreground">
                          {log.entityType} {log.entityId ? `#${log.entityId}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground font-medium">
                        {format(new Date(log.createdAt), "MMM dd, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), "HH:mm:ss")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  {log.details && (
                    <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
                      <p className="text-sm text-foreground">{log.details}</p>
                    </div>
                  )}

                  {/* Override-specific info */}
                  {isOverride && log.metadata && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                      {log.previousValue && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Previous Risk</p>
                          <span className={`
                            inline-block px-2 py-1 rounded text-xs font-semibold
                            ${log.previousValue === "HIGH" ? "bg-destructive/20 text-destructive" : ""}
                            ${log.previousValue === "MEDIUM" ? "bg-chart-3/20 text-chart-3" : ""}
                            ${log.previousValue === "LOW" ? "bg-chart-5/20 text-chart-5" : ""}
                          `}>
                            {log.previousValue}
                          </span>
                        </div>
                      )}
                      {Boolean(log.metadata.newRiskLevel) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">New Risk</p>
                          <span className={`
                            inline-block px-2 py-1 rounded text-xs font-semibold
                            ${String(log.metadata.newRiskLevel) === "HIGH" ? "bg-destructive/20 text-destructive" : ""}
                            ${String(log.metadata.newRiskLevel) === "MEDIUM" ? "bg-chart-3/20 text-chart-3" : ""}
                            ${String(log.metadata.newRiskLevel) === "LOW" ? "bg-chart-5/20 text-chart-5" : ""}
                          `}>
                            {String(log.metadata.newRiskLevel)}
                          </span>
                        </div>
                      )}
                      {Boolean(log.metadata.feedbackCategory) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Category</p>
                          <p className="text-sm font-medium text-foreground">
                            {String(log.metadata.feedbackCategory).replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      {Boolean(log.metadata.confidenceLevel) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                          <p className="text-sm font-medium text-foreground">
                            {String(log.metadata.confidenceLevel)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer info */}
                  <div className="flex items-center gap-6 pt-4 border-t border-border text-xs text-muted-foreground">
                    {log.userId && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span>User ID: {log.userId}</span>
                      </div>
                    )}
                    {log.ipAddress && (
                      <div className="flex items-center gap-1.5">
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
