import { useListEngagements } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function EngagementsList() {
  const { data: engagements, isLoading } = useListEngagements();
  const [search, setSearch] = useState("");

  const filteredEngagements = engagements?.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Engagements</h1>
          <p className="text-muted-foreground mt-2">Manage your audit engagements and analyze journal entries.</p>
        </div>
        <Button asChild>
          <Link href="/engagements/new">
            <Plus className="mr-2 h-4 w-4" />
            New Engagement
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search engagements..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-lg"></CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEngagements?.map((engagement) => (
            <Card key={engagement.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Link href={`/engagements/${engagement.id}`} className="text-xl font-semibold hover:text-primary transition-colors">
                      {engagement.name}
                    </Link>
                    <div className="text-sm text-muted-foreground flex items-center space-x-2">
                      <span className="font-medium text-foreground">{engagement.clientName}</span>
                      <span>&middot;</span>
                      <span>{engagement.period}</span>
                      <span>&middot;</span>
                      <span>Created {format(new Date(engagement.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {engagement.highRiskCount || 0} High Risk
                      </Badge>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        {engagement.mediumRiskCount || 0} Med Risk
                      </Badge>
                    </div>
                    
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/engagements/${engagement.id}`}>
                        <ChevronRight className="h-5 w-5" />
                        <span className="sr-only">View Engagement</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredEngagements?.length === 0 && (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No engagements found</h3>
              <p className="text-muted-foreground mt-1 mb-4">Get started by creating a new audit engagement.</p>
              <Button asChild variant="outline">
                <Link href="/engagements/new">Create Engagement</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
