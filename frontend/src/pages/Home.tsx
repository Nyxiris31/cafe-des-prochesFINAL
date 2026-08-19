import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Coffee, ArrowRight, CalendarClock, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import type { Drink } from "@/lib/types";

export default function Home() {
  const { data: drinks } = useQuery({
    queryKey: ["drinks", "chaudes"],
    queryFn: () => apiGet<Drink[]>("/drinks?category=chaudes"),
  });

  const list = drinks ?? [];
  const [index, setIndex] = useState(0);

  // Auto-advance the showcase; pauses whenever the list is empty.
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 4500);
    return () => clearInterval(t);
  }, [list.length]);

  const current = list[Math.min(index, Math.max(list.length - 1, 0))];

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5" data-testid="home-brand">
          <Coffee className="h-6 w-6 text-[#8a4b20]" />
          <span className="font-heading text-xl tracking-tight">Le Café des Proches</span>
        </div>
        <Link
          to="/commandes"
          className={buttonVariants({ variant: "ghost" })}
          data-testid="nav-my-orders-link"
        >
          Mes commandes
        </Link>
      </header>

      <main className="grid items-center gap-12 px-6 pb-20 pt-6 md:grid-cols-[1.05fr_0.95fr] md:px-12 lg:gap-20">
        <section className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm text-[#3d2417]">
            <Sparkles className="h-3.5 w-3.5" /> Torréfaction maison, service à la demande
          </span>
          <h1 className="mt-6 font-heading text-4xl leading-[1.08] tracking-tight md:text-6xl">
            Commandez votre boisson,
            <span className="block text-[#8a4b20]">on s'occupe du reste.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Choisissez une boisson, réservez un créneau — toutes les 30 minutes — et retrouvez-la
            prête à l'heure dite.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/commander"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#2a1810] px-9 text-base font-semibold text-[#faf6f0] shadow-lg transition-colors duration-200 hover:bg-[#8a4b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a4b20] focus-visible:ring-offset-2"
              data-testid="nav-commander-btn"
            >
              Commander
              <ArrowRight className="h-5 w-5" />
            </Link>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" /> Créneaux de 08h00 à 20h00
            </span>
          </div>
        </section>

        <section className="relative" data-testid="home-drink-carousel">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            {current ? (
              <>
                <div className="relative aspect-square w-full overflow-hidden bg-[#f7f3ee]">
                  <img
                    key={current.id}
                    src={current.image}
                    alt={current.name}
                    className="h-full w-full object-cover"
                    data-testid="carousel-image"
                  />
                  <button
                    type="button"
                    aria-label="Boisson précédente"
                    onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
                    data-testid="carousel-prev-btn"
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d4c5] bg-white/90 text-[#2a1810] shadow-md transition-colors duration-200 hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Boisson suivante"
                    onClick={() => setIndex((i) => (i + 1) % list.length)}
                    data-testid="carousel-next-btn"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d4c5] bg-white/90 text-[#2a1810] shadow-md transition-colors duration-200 hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="px-6 py-5">
                  <p className="font-heading text-2xl tracking-tight" data-testid="carousel-name">
                    {current.name}
                  </p>
                  <p
                    className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-muted-foreground"
                    data-testid="carousel-description"
                  >
                    {current.description}
                  </p>
                  <div className="mt-4 flex gap-1.5">
                    {list.map((d, i) => (
                      <button
                        key={d.id}
                        type="button"
                        aria-label={`Voir ${d.name}`}
                        onClick={() => setIndex(i)}
                        data-testid={`carousel-dot-${d.id}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
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
        </section>
      </main>
    </div>
  );
}
