import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { getUser, logout as identityLogout } from "@netlify/identity";
import { apiGet } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        if (!(await getUser())) return null;
        return await apiGet<User>("/auth/me");
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const logout = async () => {
    try {
      await identityLogout();
    } finally {
      queryClient.clear();
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user: data ?? null, loading: isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Redirects to /login while keeping the intended destination. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        data-testid="auth-loading"
      >
        Chargement…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !user.is_admin) return <Navigate to="/commander" replace />;
  return <>{children}</>;
}
