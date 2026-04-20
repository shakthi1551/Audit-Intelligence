import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Briefcase, Plus, Shield, Moon, Sun, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <Shield className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold text-lg tracking-tight">AuditIQ</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          <Link href="/dashboard" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${location === "/dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Home className="h-4 w-4 mr-3" />
            Dashboard
          </Link>
          <Link href="/engagements" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${location === "/engagements" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Briefcase className="h-4 w-4 mr-3" />
            Engagements
          </Link>
          <Link href="/engagements/new" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${location === "/engagements/new" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Plus className="h-4 w-4 mr-3" />
            New Engagement
          </Link>
          {user?.role === "MANAGER" && (
            <Link href="/admin" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${location === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <Settings className="h-4 w-4 mr-3" />
              Admin
            </Link>
          )}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button variant="outline" className="w-full flex justify-center" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
