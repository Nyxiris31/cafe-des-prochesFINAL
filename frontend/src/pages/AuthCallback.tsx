import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Coffee } from "lucide-react";
import { apiPost } from "@/lib/api";
import type { User } from "@/lib/types";

/**
 * Handles `#session_id=...` returned by Emergent Google auth: exchanges it server-side
 * (httpOnly cookie) then lands the user on the kiosk.
 */
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const processed = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const sessionId = new URLSearchParams(location.hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const user = await apiPost<User>("/auth/session", { session_id: sessionId });
        queryClient.setQueryData(["auth", "me"], user);
        window.history.replaceState(null, "", window.location.pathname);
        navigate(user.is_admin ? "/admin" : "/commander", { replace: true });
      } catch {
        setError("La connexion a échoué. Réessaie depuis la page de connexion.");
      }
    })();
  }, [location.hash, navigate, queryClient]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      data-testid="auth-callback-screen"
    >
      <Coffee className="h-10 w-10 text-[#8a4b20]" />
      <p className="text-muted-foreground">{error ?? "Connexion en cours…"}</p>
      {error && (
        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="inline-flex h-12 items-center rounded-full bg-[#2a1810] px-6 text-sm font-semibold text-[#faf6f0]"
          data-testid="auth-callback-retry-btn"
        >
          Retour à la connexion
        </button>
      )}
    </div>
  );
}
