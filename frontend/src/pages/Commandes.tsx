import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { apiDelete, apiGet } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function Commandes() {
  const queryClient = useQueryClient();
  const { data: orders, isError } = useQuery({
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

  return (
    <div className="min-h-screen bg-background px-6 py-6 md:px-12" data-testid="commandes-page">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <Link
          to="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          data-testid="orders-back-home-link"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Accueil
        </Link>
        <Link
          to="/commander"
          className={buttonVariants({ size: "sm" })}
          data-testid="orders-new-order-btn"
        >
          Commander
        </Link>
      </header>

      <main className="mx-auto mt-8 max-w-3xl">
        <h1 className="font-heading text-3xl tracking-tight md:text-4xl">Mes commandes</h1>
        <p className="mt-2 text-muted-foreground">Vos dégustations programmées.</p>

        {isError && (
          <p className="mt-6 text-sm text-destructive" data-testid="orders-error-message">
            Impossible de charger les commandes pour le moment.
          </p>
        )}

        {orders && orders.length === 0 && (
          <div
            className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center"
            data-testid="orders-empty-state"
          >
            <CalendarClock className="mx-auto h-10 w-10 text-[#8a4b20]" />
            <p className="mt-3 text-muted-foreground">Aucune commande pour l'instant.</p>
          </div>
        )}

        <ul className="mt-8 space-y-3">
          {(orders ?? []).map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-sm"
              data-testid={`order-row-${o.id}`}
            >
              <img
                src={o.drink_image}
                alt={o.drink_name}
                loading="lazy"
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.drink_name}</p>
                <p className="text-sm text-muted-foreground" data-testid={`order-slot-${o.id}`}>
                  {format(parseISO(o.date), "EEEE d MMMM", { locale: fr })} à{" "}
                  {o.time.replace(":", "h")} · {o.first_name}
                </p>
                {o.note && <p className="truncate text-xs italic text-muted-foreground">« {o.note} »</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Annuler la commande"
                onClick={() => cancel.mutate(o.id)}
                data-testid={`order-cancel-btn-${o.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
