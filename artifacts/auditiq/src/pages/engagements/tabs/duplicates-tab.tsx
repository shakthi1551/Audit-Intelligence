import { useGetDuplicates, getGetDuplicatesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy } from "lucide-react";

export default function DuplicatesTab({ engagementId }: { engagementId: number }) {
  const { data: duplicates, isLoading } = useGetDuplicates(engagementId, {
    query: { enabled: !!engagementId, queryKey: getGetDuplicatesQueryKey(engagementId) }
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-24 bg-muted rounded"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  if (!duplicates || duplicates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Copy className="h-12 w-12 mb-4 opacity-20" />
          <p>No exact duplicate journal entries detected in this engagement.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Suspects</CardTitle>
          <CardDescription>
            Groups of journal entries with identical amounts posted by the same user within a short timeframe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {duplicates.map((group, idx) => (
              <AccordionItem key={group.groupId} value={group.groupId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="bg-muted">Group {idx + 1}</Badge>
                      <span className="font-medium">{group.entries.length} matching entries</span>
                      <span className="text-sm text-muted-foreground hidden sm:inline-block">
                        {group.matchReason}
                      </span>
                    </div>
                    <div className="font-mono font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(group.entries[0]?.amount || 0)}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md border mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Accounts</TableHead>
                          <TableHead>Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(entry.entryDate), 'MMM dd, yyyy')}
                              <div className="text-xs text-muted-foreground">{entry.postingTime}</div>
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate" title={entry.description}>
                              {entry.description}
                            </TableCell>
                            <TableCell>{entry.postedBy}</TableCell>
                            <TableCell>
                              <div className="font-mono text-xs text-muted-foreground">
                                {entry.debitAccount} / {entry.creditAccount}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                entry.riskScore?.riskLevel === "HIGH" ? "bg-destructive hover:bg-destructive text-destructive-foreground" :
                                entry.riskScore?.riskLevel === "MEDIUM" ? "bg-amber-500 hover:bg-amber-500 text-white" :
                                "bg-green-500 hover:bg-green-500 text-white"
                              }>
                                {entry.riskScore?.riskLevel || "UNKNOWN"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-xs text-muted-foreground mt-6 italic border-l-2 border-primary pl-3 py-1 bg-muted/30">
            <strong>Disclaimer:</strong> This is a risk indicator. Not all duplicates are errors or fraud; some repetitive transactions (e.g., standard monthly accruals) are expected.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
