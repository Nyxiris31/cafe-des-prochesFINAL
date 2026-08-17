import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Coffee, Flame, Info, Snowflake, MoveLeft, Check } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import type { Drink, Order, TodayInfo } from "@/lib/types";

const CATEGORIES = [
  { id: "chaudes", label: "Boissons chaudes", hint: "Cafés & chocolats réconfortants" },
  { id: "fraiches", label: "Boissons fraîches", hint: "Bientôt disponible" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Commander() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [infoDrink, setInfoDrink] = useState<Drink | null>(null);
  const [bookingDrink, setBookingDrink] = useState<Drink | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [note, setNote] = useState("");
  const [ticket, setTicket] = useState<Order | null>(null);

  const { data: meta } = useQuery({
    queryKey: ["today"],
    queryFn: () => apiGet<TodayInfo>("/today"),
  });
  const { data: hotDrinks, isError: hotError } = useQuery({
    queryKey: ["drinks", "chaudes"],
    queryFn: () => apiGet<Drink[]>("/drinks?category=chaudes"),
    enabled: category === "chaudes",
  });

  const slots = meta?.slots ?? [];
  const minDate = meta ? parseISO(meta.today) : new Date();

  const createOrder = useMutation({
    mutationFn: (drink: Drink) =>
      apiPost<Order>("/orders", {
        drink_id: drink.id,
        date: date ? toIsoDate(date) : "",
        time: slot ?? "",
        first_name: firstName,
        note: note || null,
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setBookingDrink(null);
      setTicket(order);
      toast.success("Commande enregistrée !");
    },
    onError: () => toast.error("La commande n'a pas pu être enregistrée."),
  });

  function openBooking(drink: Drink) {
    setBookingDrink(drink);
    setDate(meta ? parseISO(meta.today) : new Date());
    setSlot(null);
    setFirstName("");
    setNote("");
  }

  const canSubmit = Boolean(date && slot && firstName.trim().length > 0);

  return (
    <div className="min-h-screen bg-background px-3 py-5 md:px-8" data-testid="commander-page">
      <div className="mx-auto flex min-h-[720px] max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#d8cab8] bg-[#efe8dc] p-3 shadow-xl md:p-6">
        <header className="flex items-center justify-between border-b border-[#d8cab8] px-2 pb-4">
          <Link
            to="/"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            data-testid="kiosk-back-home-link"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Accueil
          </Link>
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-[#8a4b20]" />
            <span className="font-heading text-lg tracking-tight">Borne de commande</span>
          </div>
          <Link
            to="/commandes"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            data-testid="kiosk-my-orders-link"
          >
            Mes commandes
          </Link>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 pt-6 md:grid-cols-12">
          <aside className="flex gap-3 md:col-span-4 md:flex-col lg:col-span-3">
            <p className="hidden px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground md:block">
              Catégories
            </p>
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  data-testid={`kiosk-category-${c.id}-btn`}
                  className={`flex w-full flex-col items-start gap-1 rounded-2xl border px-4 py-4 text-left transition-colors duration-200 min-h-[64px] ${
                    active
                      ? "border-transparent bg-[#2a1810] text-[#faf6f0] shadow-md"
                      : "border-[#e0d4c5] bg-white text-[#2a1810] hover:bg-[#f3ece0]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-base font-bold uppercase tracking-wide">
                    {c.id === "chaudes" ? (
                      <Flame className="h-4 w-4" />
                    ) : (
                      <Snowflake className="h-4 w-4" />
                    )}
                    {c.label}
                  </span>
                  <span
                    className={`text-xs ${active ? "text-[#d8cab8]" : "text-muted-foreground"}`}
                  >
                    {c.hint}
                  </span>
                </button>
              );
            })}
          </aside>

          <main className="md:col-span-8 lg:col-span-9">
            {category === null && (
              <div
                className="flex h-full flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-[#d8cab8] bg-[#f7f3ee] p-10 text-center"
                data-testid="kiosk-empty-category-message"
              >
                <div className="relative">
                  <span className="absolute -top-6 left-1/2 h-6 w-1.5 -translate-x-1/2 rounded-full bg-[#d8cab8] animate-steam" />
                  <Coffee className="h-14 w-14 text-[#8a4b20]" />
                </div>
                <h2 className="max-w-sm font-heading text-2xl tracking-tight">
                  Aucune catégorie sélectionnée, veuillez en choisir une
                </h2>
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <MoveLeft className="h-4 w-4 animate-nudge-left" /> Choisissez une catégorie sur
                  la gauche
                </p>
              </div>
            )}

            {category === "fraiches" && (
              <div
                className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-[#d8cab8] bg-white p-10 text-center"
                data-testid="cold-drinks-coming-soon-screen"
              >
                <Snowflake className="h-14 w-14 text-[#8a4b20]" />
                <h2 className="font-heading text-3xl tracking-tight">Bientôt disponible</h2>
                <p className="max-w-md text-muted-foreground">
                  La carte des boissons fraîches est en préparation. Revenez très vite !
                </p>
                <Button
                  variant="outline"
                  onClick={() => setCategory("chaudes")}
                  data-testid="cold-back-to-hot-btn"
                >
                  Voir les boissons chaudes
                </Button>
              </div>
            )}

            {category === "chaudes" && (
              <div>
                <h2 className="mb-4 font-heading text-2xl tracking-tight">Boissons chaudes</h2>
                {hotError && (
                  <p className="mb-4 text-sm text-destructive" data-testid="drinks-error-message">
                    Carte momentanément indisponible.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {(hotDrinks ?? []).map((d) => (
                    <div
                      key={d.id}
                      className="group flex flex-col rounded-2xl border border-[#e8ded1] bg-white p-3 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl border border-[#efe8dc] bg-[#f7f3ee]">
                        <img
                          src={d.image}
                          alt={d.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Infos sur ${d.name}`}
                          onClick={() => setInfoDrink(d)}
                          data-testid={`drink-info-btn-${d.id}`}
                          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#e0d4c5] bg-white/90 text-[#8a4b20] shadow-md transition-colors duration-200 hover:bg-[#2a1810] hover:text-[#faf6f0]"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-base font-semibold">{d.name}</p>
                      <p className="mb-3 text-xs text-muted-foreground">{d.tagline}</p>
                      <Button
                        className="mt-auto w-full"
                        onClick={() => openBooking(d)}
                        data-testid={`drink-card-${d.id}`}
                      >
                        Choisir un créneau
                      </Button>
                    </div>
                  ))}
                  {!hotDrinks && !hotError && (
                    <p className="col-span-full text-sm text-muted-foreground">Chargement…</p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Info dialog */}
      <Dialog open={infoDrink !== null} onOpenChange={(o) => !o && setInfoDrink(null)}>
        <DialogContent className="max-w-lg" data-testid="drink-info-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{infoDrink?.name}</DialogTitle>
            <DialogDescription>{infoDrink?.tagline}</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed" data-testid="drink-info-description">
            {infoDrink?.description}
          </p>
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Composition
            </p>
            <ul className="mt-2 space-y-1 text-sm" data-testid="drink-info-composition">
              {(infoDrink?.composition ?? []).map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a4b20]" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground" data-testid="drink-info-allergens">
              Allergènes : {infoDrink?.allergens}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking agenda dialog */}
      <Dialog open={bookingDrink !== null} onOpenChange={(o) => !o && setBookingDrink(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="drink-agenda-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {bookingDrink?.name} — choisir date & heure
            </DialogTitle>
            <DialogDescription>
              Créneaux toutes les 30 minutes, de 08h00 à 20h00.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2">
            <div data-testid="booking-date-picker">
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Date
              </Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={fr}
                disabled={{ before: minDate }}
                className="rounded-xl border border-border bg-card p-2"
              />
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Heure
              </Label>
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    data-testid={`time-slot-${s.replace(":", "")}`}
                    className={`rounded-lg border px-2 py-2 text-sm transition-colors duration-150 ${
                      slot === s
                        ? "border-transparent bg-[#2a1810] text-[#faf6f0]"
                        : "border-[#e0d4c5] bg-white text-[#2a1810] hover:bg-[#f3ece0]"
                    }`}
                  >
                    {s.replace(":", "h")}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="first-name">Prénom</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex. Camille"
                    data-testid="booking-client-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="note">Note (optionnel)</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Sans sucre, lait d'avoine…"
                    data-testid="booking-notes-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={!canSubmit || createOrder.isPending}
              onClick={() => bookingDrink && createOrder.mutate(bookingDrink)}
              data-testid="booking-submit-confirm-btn"
            >
              {createOrder.isPending ? "Envoi…" : "Confirmer la commande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket confirmation */}
      <Dialog open={ticket !== null} onOpenChange={(o) => !o && setTicket(null)}>
        <DialogContent className="max-w-md" data-testid="order-confirmation-ticket">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl">
              <Check className="h-5 w-5 text-[#2d6a4f]" /> C'est noté !
            </DialogTitle>
            <DialogDescription>Votre boisson sera prête à l'heure choisie.</DialogDescription>
          </DialogHeader>
          {ticket && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <p className="font-heading text-xl">{ticket.drink_name}</p>
              <p className="mt-1 text-muted-foreground" data-testid="ticket-slot">
                {format(parseISO(ticket.date), "EEEE d MMMM", { locale: fr })} à{" "}
                {ticket.time.replace(":", "h")}
              </p>
              <p className="mt-1">Pour {ticket.first_name}</p>
              {ticket.note && <p className="mt-1 italic text-muted-foreground">« {ticket.note} »</p>}
            </div>
          )}
          <DialogFooter>
            <Link
              to="/commandes"
              className={buttonVariants({ variant: "outline" })}
              data-testid="ticket-see-orders-link"
            >
              Voir mes commandes
            </Link>
            <Button onClick={() => setTicket(null)} data-testid="ticket-close-btn">
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
