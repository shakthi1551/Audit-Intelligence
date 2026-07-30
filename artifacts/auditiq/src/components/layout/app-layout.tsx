import { Shield, LayoutDashboard, FolderOpen, Settings, LogOut, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Engagements", href: "/engagements", icon: FolderOpen },
    { name: "Admin Panel", href: "/admin", icon: Settings, roles: ["MANAGER"] },
  ];

  const handleLogout = () => {
    logout();
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "MANAGER":
        return "bg-primary/20 text-primary border-primary/30";
      case "SENIOR":
        return "bg-accent/20 text-accent border-accent/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col relative"
      >
        {/* Glow effect on border */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent pointer-events-none" />
        
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 group-hover:bg-primary/20 transition-colors">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground" style={{ fontFamily: "var(--font-display)" }}>
              AuditIQ
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            if (item.roles && user && !item.roles.includes(user.role)) {
              return null;
            }

            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer
                    ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full glow"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                  <span className={`font-medium ${isActive ? "text-primary" : ""}`}>{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Dark Mode
              </>
            )}
          </Button>

          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
