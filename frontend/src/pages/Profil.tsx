import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Coffee, Mail, ShieldCheck, UserRound } from "lucide-react";

import LogoutButton from "@/components/LogoutButton";
import { useAuth } from "@/lib/auth";

export default function Profil() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const source = user?.name?.trim() || user?.email?.trim() || "?";
  const initial = Array.from(source)[0]?.toLocaleUpperCase("fr-FR") || "?";

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      <header className="border-b border-border bg-[#efe8dc]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#2a1810] transition-colors duration-200 hover:bg-[#f3ece0]"
            aria-label="Retourner à la page précédente"
            title="Retour"
            data-testid="profile-back-link"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="hidden items-center gap-2 font-heading text-lg tracking-tight sm:flex">
            <Coffee className="h-5 w-5 text-[#8a4b20]" /> Le Café des Proches
          </span>
          <Link
            to="/commander"
            className="inline-flex h-11 items-center rounded-full bg-[#2a1810] px-4 text-sm font-semibold text-[#faf6f0] transition-colors duration-200 hover:bg-[#8a4b20]"
            data-testid="profile-order-link"
          >
            Commander
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 md:px-6 md:pt-16">
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-widest text-[#8a4b20]">Mon espace</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight tracking-tight md:text-5xl">
            Mon profil
          </h1>
          <p className="mt-3 text-muted-foreground">
            Retrouvez les informations du compte actuellement connecté.
          </p>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#d8cab8] bg-[#efe8dc] shadow-lg">
          <div className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:flex-row sm:text-left md:px-8">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#6f3f24] text-3xl font-bold text-[#f8eee2]"
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-2xl tracking-tight text-[#2a1810]">
                {user?.name?.trim() || "Mon compte"}
              </h2>
              <p className="mt-1 flex items-center justify-center gap-2 truncate text-sm text-muted-foreground sm:justify-start">
                <Mail className="h-4 w-4 shrink-0" /> {user?.email}
              </p>
              {user?.is_admin && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#2a1810] px-3 py-1 text-xs font-semibold text-[#faf6f0]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Administrateur
                </p>
              )}
            </div>
          </div>
          <div className="border-t border-[#d8cab8] bg-[#f7f3ee] px-6 py-5 md:px-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#2a1810]">
              <UserRound className="h-4 w-4 text-[#8a4b20]" /> Gestion du compte
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              La déconnexion se fait uniquement après confirmation par le bouton ci-dessous.
            </p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
