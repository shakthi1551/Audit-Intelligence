import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEngagement, getListEngagementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NewEngagement() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    clientName: "",
    period: "",
    description: ""
  });

  const createMutation = useCreateEngagement({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListEngagementsQueryKey() });
        toast({ title: "Engagement created successfully" });
        setLocation(`/engagements/${data.id}`);
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to create engagement", 
          description: err.data?.message || err.message,
          variant: "destructive"
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/engagements">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Engagement</h1>
          <p className="text-muted-foreground mt-1">Create a new workspace for journal entry analysis.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Engagement Details</CardTitle>
            <CardDescription>Enter the basic information for this audit engagement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Engagement Name</Label>
              <Input 
                id="name" 
                placeholder="e.g., FY23 Q4 Financial Audit" 
                required 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input 
                  id="clientName" 
                  placeholder="e.g., Acme Corp" 
                  required 
                  value={formData.clientName}
                  onChange={e => setFormData({...formData, clientName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Audit Period</Label>
                <Input 
                  id="period" 
                  placeholder="e.g., Jan 1 - Dec 31, 2023" 
                  required 
                  value={formData.period}
                  onChange={e => setFormData({...formData, period: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Additional details about this engagement..." 
                rows={4}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" asChild>
              <Link href="/engagements">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Engagement"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
