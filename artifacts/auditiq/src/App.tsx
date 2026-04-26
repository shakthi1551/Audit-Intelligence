import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import EngagementsList from "@/pages/engagements/list";
import NewEngagement from "@/pages/engagements/new";
import EngagementDetail from "@/pages/engagements/detail";
import UploadJournalEntries from "@/pages/engagements/upload";
import AdminPanel from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/engagements/new" component={() => <ProtectedRoute component={NewEngagement} />} />
      <Route path="/engagements/:id/upload">
        {(params) => <ProtectedRoute component={() => <UploadJournalEntries params={params} />} />}
      </Route>
      <Route path="/engagements/:id">
        {(params) => <ProtectedRoute component={() => <EngagementDetail params={params} />} />}
      </Route>
      <Route path="/engagements" component={() => <ProtectedRoute component={EngagementsList} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} roles={["MANAGER"]} />} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "") }>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
