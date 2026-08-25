import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthError, getIdentityConfig, getUser, login, oauthLogin, signup } from "@netlify/identity";
import { ArrowLeft, Coffee, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { markSession } from "@/lib/session";
import type { User } from "@/lib/types";

type AuthMode = "login" | "signup";

function identityErrorMessage(error: unknown): string {
  if (!(error instanceof AuthError)) return "Une erreur inattendue est survenue. Réessaie.";
  if (error.status === 401) return "Email ou mot de passe incorrect.";
  if (error.status === 403) return "Les inscriptions ne sont pas autorisées sur ce site.";
  if (error.status === 422) return "Vérifie ton email et utilise un mot de passe suffisamment sécurisé.";
  if (error.status === 409) return "Un compte existe déjà avec cet email.";
  return error.message || "La connexion a échoué. Réessaie.";
}

export default function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const from = (location.state as { from?: string } | null)?.from;
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={from ?? (user.is_admin ? "/admin" : "/commander")} replace />;

  const signIn = () => {
    const identity = getIdentityConfig();
    if (!identity) {
      setError("Le service de connexion n'est pas disponible sur ce site.");
      return;
    }
    sessionStorage.setItem("auth_redirect", from ?? "/commander");
    oauthLogin("google");
  };

  const finishAuthentication = async () => {
    const appUser = await apiGet<User>("/auth/me");
    queryClient.setQueryData(["auth", "me"], appUser);
    navigate(from ?? (appUser.is_admin ? "/admin" : "/commander"), { replace: true });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && name.trim().length < 2) {
      setError("Indique ton prénom ou ton nom.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPending(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        markSession();
        await finishAuthentication();
      } else {
        await signup(email.trim(), password, { full_name: name.trim() });
        const currentIdentityUser = await getUser();
        if (!currentIdentityUser) {
          setNotice("Compte créé. Consulte ta boîte mail pour confirmer ton adresse avant de te connecter.");
        } else {
          markSession();
          await finishAuthentication();
        }
      }
    } catch (authError) {
      setError(identityErrorMessage(authError));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="login-page">
      <header className="px-6 py-5 md:px-12">
        <Link
          to="/"
          className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 hover:bg-secondary"
          data-testid="login-back-home-link"
        >
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col items-start gap-6 px-6 pt-10 md:pt-20">
        <Coffee className="h-12 w-12 text-[#8a4b20]" />
        <h1 className="font-heading text-4xl leading-tight tracking-tight md:text-5xl">
          Connexion au café
        </h1>
        <p className="text-muted-foreground">
          Connecte-toi pour commander une boisson et suivre tes créneaux. Google ou email et mot de passe,
          à toi de choisir.
        </p>
        <div className="flex w-full rounded-full bg-secondary p-1" role="tablist" aria-label="Mode d'authentification">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => { setMode("login"); setError(null); setNotice(null); }}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-white text-[#2a1810] shadow-sm" : "text-muted-foreground"
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => { setMode("signup"); setError(null); setNotice(null); }}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              mode === "signup" ? "bg-white text-[#2a1810] shadow-sm" : "text-muted-foreground"
            }`}
          >
            Créer un compte
          </button>
        </div>
        <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Nom affiché
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                className="h-12 rounded-2xl border border-[#d8cab8] bg-white px-4 outline-none transition focus:border-[#8a4b20] focus:ring-2 focus:ring-[#8a4b20]/20"
                placeholder="Ton prénom"
              />
            </label>
          )}
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-12 rounded-2xl border border-[#d8cab8] bg-white px-4 outline-none transition focus:border-[#8a4b20] focus:ring-2 focus:ring-[#8a4b20]/20"
              placeholder="toi@exemple.com"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
              className="h-12 rounded-2xl border border-[#d8cab8] bg-white px-4 outline-none transition focus:border-[#8a4b20] focus:ring-2 focus:ring-[#8a4b20]/20"
              placeholder="8 caractères minimum"
            />
          </label>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#2a1810] px-8 text-base font-semibold text-[#faf6f0] shadow-lg transition-colors duration-200 hover:bg-[#8a4b20] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === "login" ? "Se connecter avec email" : "Créer mon compte"}
          </button>
        </form>
        <div className="flex w-full items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-[#d8cab8]" /> ou <span className="h-px flex-1 bg-[#d8cab8]" />
        </div>
        <button
          type="button"
          onClick={signIn}
          className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#2a1810] px-8 text-base font-semibold text-[#faf6f0] shadow-lg transition-colors duration-200 hover:bg-[#8a4b20]"
          data-testid="login-google-btn"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          Continuer avec Google
        </button>
      </main>
    </div>
  );
}
