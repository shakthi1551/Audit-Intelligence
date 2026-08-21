import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowLeft, File, Scale, CopyCheck } from "lucide-react";
import { useUploadJournalEntries } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function UploadJournalEntries({ params }: { params?: { id: string } }) {
  const engagementId = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reconciliation, setReconciliation] = useState<{ sourceDebitTotal: number; sourceCreditTotal: number; imbalance: number; isBalanced: boolean; duplicateReferenceCount: number; missingReferenceCount: number; warnings: string[] } | null>(null);

  const uploadMutation = useUploadJournalEntries();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or XLSX file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    uploadMutation.mutate(
      { id: engagementId, data: file as any },
      {
        onSuccess: (response) => {
          setReconciliation(response.reconciliation ?? null);
          toast({
            title: "Upload successful",
            description: `Processed ${response.processedRows} of ${response.totalRows} rows`,
          });
          setLocation(`/engagements/${engagementId}`);
        },
        onError: (error: Error) => {
          toast({
            title: "Upload failed",
            description: error.message || "Unable to upload file",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-4"
        >
          <Link href={`/engagements/${engagementId}`}>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Upload Journal Entries
            </h1>
            <p className="text-muted-foreground mt-1">Upload a CSV or XLSX file containing journal entry data</p>
          </div>
        </motion.div>

        {/* Upload area */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-card-border rounded-xl p-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer
              ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            {/* Animated border glow */}
            {isDragging && (
              <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse" />
            )}

            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="text-center space-y-4">
              <div className="mx-auto w-fit p-6 rounded-2xl bg-primary/10 border-2 border-primary/30">
                <Upload className="h-12 w-12 text-primary" />
              </div>

              {file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-chart-5" />
                    <p className="text-lg font-semibold text-foreground">File selected</p>
                  </div>
                  <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-muted border border-border">
                    <File className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove file
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-lg font-semibold text-foreground mb-1">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <div className="flex items-center justify-center gap-6 pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">CSV</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">XLSX</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {uploadMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processing...</span>
                <span className="font-semibold text-foreground">Please wait</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </motion.div>
          )}
          {reconciliation && (
            <div className={`mt-6 rounded-xl border p-5 ${reconciliation.isBalanced && reconciliation.warnings.length === 0 ? "border-chart-5/30 bg-chart-5/5" : "border-chart-3/30 bg-chart-3/5"}`}>
              <div className="flex items-center gap-3 mb-4"><Scale className="h-5 w-5 text-primary" /><div><h3 className="font-semibold">Ledger reconciliation</h3><p className="text-xs text-muted-foreground">Ingestion quality checks completed</p></div></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Debit total</p><p className="font-bold">{reconciliation.sourceDebitTotal.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Credit total</p><p className="font-bold">{reconciliation.sourceCreditTotal.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Imbalance</p><p className="font-bold">{reconciliation.imbalance.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Duplicates</p><p className="font-bold">{reconciliation.duplicateReferenceCount}</p></div>
              </div>
              {reconciliation.warnings.length > 0 && <div className="mt-4 space-y-1">{reconciliation.warnings.map((warning) => <p key={warning} className="text-xs text-chart-3 flex items-center gap-2"><CopyCheck className="h-3 w-3" />{warning}</p>)}</div>}
            </div>
          )}

          {uploadMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Upload Failed</p>
                <p className="text-sm">{(uploadMutation.error as Error)?.message || "An error occurred during upload"}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-card-border rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
            File Requirements
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>File must be in CSV or XLSX format</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Required columns: entryDate, postedBy, description, amount</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Optional columns: debitAccount, creditAccount, postingTime, referenceNumber</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Dates should be in YYYY-MM-DD format</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Amount values should be numeric (without currency symbols)</span>
            </li>
          </ul>
        </motion.div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/engagements/${engagementId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground gap-2 px-6"
          >
            <Upload className="h-5 w-5" />
            {uploadMutation.isPending ? "Uploading..." : "Upload & Process"}
          </Button>
        </div>
      </div>
    </div>
  );
}
