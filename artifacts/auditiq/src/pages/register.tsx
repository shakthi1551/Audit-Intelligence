import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Lock, Mail, User, Building, AlertCircle } from "lucide-react";
import { useRegister, RegisterBodyRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "ASSOCIATE",
    firmName: "",
  });

  const registerMutation = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { data: { ...formData, role: formData.role as RegisterBodyRole } },
      {
        onSuccess: () => {
          toast({
            title: "Account created",
            description: "Welcome to AuditIQ",
          });
          setLocation("/dashboard");
        },
        onError: (error: Error) => {
          toast({
            title: "Registration failed",
            description: error.message || "Unable to create account",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-background via-card to-background relative overflow-hidden"
      >
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
        
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/10 border-2 border-primary/30 glow">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                AuditIQ
              </h1>
            </div>

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

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              AuditIQ
            </h1>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Create your account
              </h2>
              <p className="text-muted-foreground">Join AuditIQ to start detecting fraud</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Sarah Chen"
                    required
                    className="pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                    data-testid="input-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sarah@firm.com"
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                    data-testid="input-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmName" className="text-foreground">Firm name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="firmName"
                    type="text"
                    value={formData.firmName}
                    onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                    placeholder="Anderson & Partners LLP"
                    className="pl-10 bg-input border-border focus:border-primary focus:ring-primary"
                    data-testid="input-firm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-foreground">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-input border-border" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSOCIATE">Associate</SelectItem>
                    <SelectItem value="SENIOR">Senior</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {registerMutation.isError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">Registration failed. Please try again.</p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold py-6 text-base relative overflow-hidden group"
                data-testid="button-register"
              >
                <span className="relative z-10">
                  {registerMutation.isPending ? "Creating account..." : "Create account"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:text-accent font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
