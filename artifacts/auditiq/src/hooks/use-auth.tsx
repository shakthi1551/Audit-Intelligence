import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, useLogin, useLogout, useRegister } from "@workspace/api-client-react";
import type { LoginBody, RegisterBody, User } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginBody) => Promise<void>;
  register: (data: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(localStorage.getItem("auditiq_token"));

  const { data: user, isLoading: isMeLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (!token) {
      queryClient.setQueryData(getGetMeQueryKey(), null);
    }
  }, [token, queryClient]);

  const handleLogin = async (data: LoginBody) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("auditiq_token", res.token);
    setToken(res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    setLocation("/dashboard");
  };

  const handleRegister = async (data: RegisterBody) => {
    const res = await registerMutation.mutateAsync({ data });
    localStorage.setItem("auditiq_token", res.token);
    setToken(res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    setLocation("/dashboard");
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await logoutMutation.mutateAsync();
      }
    } finally {
      localStorage.removeItem("auditiq_token");
      setToken(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isMeLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
