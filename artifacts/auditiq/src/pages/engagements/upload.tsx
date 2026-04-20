import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useGetEngagement, getGetEngagementQueryKey, getListJournalEntriesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UploadCloud, File, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

export default function UploadJournalEntries({ params }: { params?: { id: string } }) {
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: engagement } = useGetEngagement(id, {
    query: { enabled: !!id, queryKey: getGetEngagementQueryKey(id) }
  });

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel (.xlsx) file.",
        variant: "destructive"
      });
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const token = localStorage.getItem("auditiq_token");
      
      // We simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 5, 90));
      }, 500);

      const response = await fetch(`/api/engagements/${id}/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/octet-stream"
        },
        body: file
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Upload failed");
      }

      setResult(data);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetEngagementQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey(id) });
      
      toast({ title: "Upload successful" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/engagements/${id}`}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Engagement</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Data</h1>
          <p className="text-muted-foreground mt-1">Upload journal entries for {engagement?.name}</p>
        </div>
      </div>

      <Card>
        {!result ? (
          <>
            <CardHeader>
              <CardTitle>Select File</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file containing your journal entries. Ensure columns match the standard template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud className={`h-12 w-12 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="text-lg font-medium mb-1">Drag & drop your file here</h3>
                <p className="text-sm text-muted-foreground mb-4">CSV or XLSX up to 50MB</p>
                
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".csv,.xlsx" 
                  onChange={handleFileChange}
                />
                <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading}>
                  Browse Files
                </Button>
              </div>

              {file && (
                <div className="mt-6 p-4 border rounded-md flex items-center justify-between bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <File className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={uploading}>
                    Remove
                  </Button>
                </div>
              )}

              {uploading && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading and analyzing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground text-center">
                    Depending on file size, risk scoring and AI explanation generation may take a few moments.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" asChild>
                <Link href={`/engagements/${id}`}>Cancel</Link>
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Processing..." : "Upload & Analyze"}
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="text-center pb-0">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle className="text-2xl">Analysis Complete</CardTitle>
              <CardDescription>
                {result.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 border rounded bg-muted/20 text-center">
                  <div className="text-3xl font-bold">{result.totalRows?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="p-4 border rounded bg-muted/20 text-center">
                  <div className="text-3xl font-bold">{result.processedRows?.toLocaleString() || 0}</div>
                  <div className="text-sm text-muted-foreground">Processed Successfully</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded text-amber-900 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-200">
                  <h4 className="flex items-center font-medium mb-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Warnings during processing
                  </h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {result.errors.slice(0, 5).map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more warnings.</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t p-6">
              <Button asChild>
                <Link href={`/engagements/${id}`}>View Engagement Dashboard</Link>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
