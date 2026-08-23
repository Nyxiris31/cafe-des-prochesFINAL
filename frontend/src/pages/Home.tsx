import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Coffee,
  ArrowRight,
  CalendarClock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import type { Drink } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  const { user } = useAuth();
  const { data: drinks } = useQuery({
    queryKey: ["drinks", "all"],
    queryFn: () => apiGet<Drink[]>("/drinks"),
  });

  // The carousel mirrors the live catalog the admin edits (name, image, description).
  const list = (drinks ?? []).filter((d) => d.available);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 5000);
    return () => clearInterval(t);
  }, [list.length]);

  const current = list[Math.min(index, Math.max(list.length - 1, 0))];

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-12"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="flex items-center gap-2.5" data-testid="home-brand">
          <Coffee className="h-6 w-6 text-[#8a4b20]" />
          <span className="font-heading text-lg tracking-tight sm:text-xl">Le Café des Proches</span>
        </div>
        <nav className="flex items-center gap-2">
          {user?.is_admin && (
            <Link
              to="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#2a1810] px-4 text-sm font-semibold text-[#faf6f0] transition-colors duration-200 hover:bg-[#8a4b20]"
              data-testid="nav-admin-link"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          {user ? (
            <>
              <Link
                to="/commandes"
                className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium transition-colors duration-200 hover:bg-secondary"
                data-testid="nav-my-orders-link"
              >
                Mes commandes
              </Link>
              <ProfileAvatar user={user} />
              <LogoutButton />
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium transition-colors duration-200 hover:bg-secondary"
              data-testid="nav-login-link"
            >
              Se connecter
            </Link>
          )}
        </nav>
      </motion.header>

      <main className="grid items-center gap-10 px-5 pb-20 pt-4 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-12">
        <motion.section
          className="max-w-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm text-[#3d2417]">
            <Sparkles className="h-3.5 w-3.5" /> Torréfaction maison, service à la demande
          </span>
          <h1 className="mt-6 font-heading text-4xl leading-[1.08] tracking-tight md:text-6xl">
            Commandez votre boisson,
            <span className="block text-[#8a4b20]">on s'occupe du reste.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
            Choisissez une boisson, réservez un créneau — toutes les 30 minutes — et retrouvez-la
            prête à l'heure dite.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={user ? "/commander" : "/login"}
                className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#2a1810] px-9 text-base font-semibold text-[#faf6f0] shadow-lg transition-colors duration-200 hover:bg-[#8a4b20]"
                data-testid="nav-commander-btn"
              >
                Commander
                <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" /> Créneaux de 08h00 à 20h00
            </span>
          </div>
        </motion.section>

        <motion.section
          className="relative"
          data-testid="home-drink-carousel"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
        >
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            {current ? (
              <>
                <div className="relative aspect-square w-full overflow-hidden bg-[#f7f3ee]">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={current.id}
                      src={current.image}
                      alt={current.name}
                      className="h-full w-full object-cover"
                      data-testid="carousel-image"
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.65, ease: EASE }}
                    />
                  </AnimatePresence>
                  <button
                    type="button"
                    aria-label="Boisson précédente"
                    onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
                    data-testid="carousel-prev-btn"
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d4c5] bg-white/90 text-[#2a1810] shadow-md transition-transform duration-200 hover:scale-110"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Boisson suivante"
                    onClick={() => setIndex((i) => (i + 1) % list.length)}
                    data-testid="carousel-next-btn"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d4c5] bg-white/90 text-[#2a1810] shadow-md transition-transform duration-200 hover:scale-110"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-5 py-5 md:px-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.45, ease: EASE }}
                    >
                      <p
                        className="font-heading text-2xl tracking-tight"
                        data-testid="carousel-name"
                      >
                        {current.name}
                      </p>
                      <p
                        className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-muted-foreground"
                        data-testid="carousel-description"
                      >
                        {current.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="mt-4 flex gap-1.5">
                    {list.map((d, i) => (
                      <button
                        key={d.id}
                        type="button"
                        aria-label={`Voir ${d.name}`}
                        onClick={() => setIndex(i)}
                        data-testid={`carousel-dot-${d.id}`}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          i === index ? "w-7 bg-[#8a4b20]" : "w-3 bg-[#d8cab8]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-sm text-muted-foreground">
                Notre carte s'affiche ici.
              </div>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
