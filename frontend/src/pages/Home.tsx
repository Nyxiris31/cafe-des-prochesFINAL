import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Coffee, ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import type { Drink } from "@/lib/types";

export default function Home() {
  const { data: drinks } = useQuery({
    queryKey: ["drinks", "chaudes"],
    queryFn: () => apiGet<Drink[]>("/drinks?category=chaudes"),
  });

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
            Choisissez une boisson chaude, réservez un créneau — toutes les 30 minutes — et
            retrouvez-la prête à l'heure dite.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/commander"
              className={buttonVariants({ size: "lg" })}
              data-testid="nav-commander-btn"
            >
              Commander
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" /> Créneaux de 08h00 à 20h00
            </span>
          </div>
        </section>

        <section className="relative" data-testid="home-drink-preview">
          <div className="absolute -left-6 -top-6 hidden h-24 w-24 rounded-full bg-[#e8ddd0] md:block" />
          <div className="relative grid grid-cols-2 gap-4">
            {(drinks ?? []).slice(0, 4).map((d, i) => (
              <div
                key={d.id}
                className={`overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-300 hover:-translate-y-1 ${
                  i % 2 === 1 ? "md:translate-y-8" : ""
                }`}
                data-testid={`home-preview-${d.id}`}
              >
                <img
                  src={d.image}
                  alt={d.name}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <p className="px-3 py-2.5 text-sm font-medium">{d.name}</p>
              </div>
            ))}
            {!drinks && (
              <div className="col-span-2 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Notre carte s'affiche ici.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
