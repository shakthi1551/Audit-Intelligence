import { useState } from "react";
import { Link } from "wouter";
import { Shield, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function Login() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setIsError(false);
    try {
      await login({ email, password });
      toast({ title: "Welcome back", description: "Successfully logged in" });
    } catch {
      setIsError(true);
      toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left panel - Dark with geometric grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-background via-card to-background relative overflow-hidden"
      >
        {/* Animated geometric grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        
        {/* Glowing orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/10 border-2 border-primary/30 glow">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                AuditIQ
              </h1>
            </div>

            {/* Value props */}
            <div className="space-y-6 text-lg">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-3"
              >
                <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                <p className="text-muted-foreground">
                  <span className="text-foreground font-semibold">AI-powered fraud detection</span> that catches what humans miss
                </p>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-start gap-3"
              >
                <div className="w-2 h-2 mt-2 rounded-full bg-accent" />
                <p className="text-muted-foreground">
                  <span className="text-foreground font-semibold">Real-time risk scoring</span> across all journal entries
                </p>
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-start gap-3"
              >
                <div className="w-2 h-2 mt-2 rounded-full bg-chart-3" />
                <p className="text-muted-foreground">
                  <span className="text-foreground font-semibold">Forensic-grade audit trail</span> for compliance and oversight
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              AuditIQ
            </h1>
          </div>

          {/* Glass card */}
          <div className="bg-card border border-card-border rounded-xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Sign in to your account
              </h2>
              <p className="text-muted-foreground">Enter your credentials to access AuditIQ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="auditor@firm.com"
                    required
                    className="pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                    data-testid="input-password"
                  />
                </div>
              </div>

              {isError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">Invalid email or password</p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold py-6 text-base relative overflow-hidden group"
                data-testid="button-login"
              >
                <span className="relative z-10">
                  {isPending ? "Signing in..." : "Sign in"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary hover:text-accent font-semibold transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
