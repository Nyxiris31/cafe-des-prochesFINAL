import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Trash2, CalendarClock, Coffee } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiDelete, apiGet } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function Commandes() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/orders"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Commande annulée.");
    },
    onError: () => toast.error("Annulation impossible."),
  });

  const list = orders ?? [];

  return (
    <div className="min-h-screen bg-background" data-testid="commandes-page">
      <header className="border-b border-border bg-[#efe8dc]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 md:px-6">
          <Link
            to="/"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[#2a1810] transition-colors duration-200 hover:bg-[#f3ece0]"
            data-testid="orders-back-home-link"
          >
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <span className="hidden items-center gap-2 font-heading text-lg tracking-tight sm:flex">
            <Coffee className="h-5 w-5 text-[#8a4b20]" /> Le Café des Proches
          </span>
          <Link
            to="/commander"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#2a1810] px-5 text-sm font-semibold text-[#faf6f0] transition-colors duration-200 hover:bg-[#8a4b20]"
            data-testid="orders-new-order-btn"
          >
            Commander
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 md:px-6">
        <h1 className="font-heading text-3xl leading-tight tracking-tight md:text-5xl">
          Mes commandes
        </h1>
        <p className="mt-3 text-muted-foreground">
          {list.length > 0
            ? `${list.length} boisson${list.length > 1 ? "s" : ""} programmée${
                list.length > 1 ? "s" : ""
              }.`
            : "Vos dégustations programmées apparaîtront ici."}
        </p>

        {isError && (
          <p
            className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm text-destructive"
            data-testid="orders-error-message"
          >
            Impossible de charger les commandes pour le moment.
          </p>
        )}

        {isLoading && !isError && (
          <p className="mt-8 text-sm text-muted-foreground" data-testid="orders-loading">
            Chargement…
          </p>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div
            className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-[#d8cab8] bg-[#faf7f2] px-6 py-14 text-center"
            data-testid="orders-empty-state"
          >
            <CalendarClock className="h-10 w-10 text-[#8a4b20]" />
            <p className="text-muted-foreground">Aucune commande pour l'instant.</p>
            <Link
              to="/commander"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#2a1810] px-7 text-sm font-semibold text-[#faf6f0] transition-colors duration-200 hover:bg-[#8a4b20]"
              data-testid="orders-empty-cta"
            >
              Commander une boisson
            </Link>
          </div>
        )}

        <ul className="mt-10 flex flex-col gap-4">
          {list.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:flex-row sm:items-center"
              data-testid={`order-row-${o.id}`}
            >
              <img
                src={o.drink_image}
                alt={o.drink_name}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl tracking-tight">{o.drink_name}</p>
                <p className="mt-1 text-sm text-muted-foreground" data-testid={`order-slot-${o.id}`}>
                  {format(parseISO(o.date), "EEEE d MMMM yyyy", { locale: fr })} · {" "}
                  {o.time.replace(":", "h")}
                </p>
                <p className="mt-1.5 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-[#3d2417]">
                  Pour {o.first_name}
                </p>
                {o.note && (
                  <p className="mt-2 text-sm italic text-muted-foreground">« {o.note} »</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-destructive sm:self-center"
                onClick={() => cancel.mutate(o.id)}
                disabled={cancel.isPending}
                data-testid={`order-cancel-btn-${o.id}`}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Annuler
              </Button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
