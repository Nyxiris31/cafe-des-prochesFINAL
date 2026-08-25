import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { AUTH_EVENTS, getUser, logout as identityLogout, onAuthChange } from "@netlify/identity";
import { apiGet } from "@/lib/api";
import { clearSessionMarker, hasSessionMarker } from "@/lib/session";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  switchAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  logout: async () => {},
  switchAccount: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        if (!hasSessionMarker()) return null;
        if (!(await getUser())) return null;
        return await apiGet<User>("/auth/me");
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    return onAuthChange((event) => {
      if (event === AUTH_EVENTS.LOGOUT) {
        queryClient.setQueryData(["auth", "me"], null);
        queryClient.removeQueries({ queryKey: ["orders"] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    });
  }, [queryClient]);

  const leaveSession = async (redirectTo: string) => {
    try {
      await identityLogout();
    } finally {
      clearSessionMarker();
      queryClient.clear();
      window.location.href = redirectTo;
    }
  };

  const logout = () => leaveSession("/");
  const switchAccount = () => leaveSession("/login");

  return (
    <AuthContext.Provider
      value={{ user: data ?? null, loading: isLoading, logout, switchAccount }}
    >
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
