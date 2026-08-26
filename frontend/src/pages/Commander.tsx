import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Coffee,
  Flame,
  Info,
  MoveLeft,
  MoveUp,
  ShieldCheck,
  Snowflake,
} from "lucide-react";
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
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import type { Drink, Order, TodayInfo } from "@/lib/types";

const CATEGORIES = [
  { id: "chaudes", label: "Boisson chaude", hint: "Cafés & chocolats réconfortants" },
  { id: "fraiches", label: "Boisson froide", hint: "Thés glacés & cafés frappés" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function Commander() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
  const { data: coldDrinks } = useQuery({
    queryKey: ["drinks", "fraiches"],
    queryFn: () => apiGet<Drink[]>("/drinks?category=fraiches"),
    enabled: category === "fraiches",
  });

  const slots = meta?.slots ?? [];
  const minDate = meta ? parseISO(meta.today) : new Date();
  const isToday = Boolean(meta && date && toIsoDate(date) === meta.today);
  // A slot already gone today can't be ordered — the server rejects it too.
  const isPastSlot = (s: string) => isToday && Boolean(meta) && s <= meta!.now;
  const shownDrinks = category === "chaudes" ? hotDrinks : coldDrinks;
  const coldAvailable = (coldDrinks ?? []).filter((d) => d.available);

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
    if (!drink.available) {
      toast.error(`${drink.name} est momentanément indisponible.`);
      return;
    }
    setBookingDrink(drink);
    setDate(meta ? parseISO(meta.today) : new Date());
    setSlot(null);
    setFirstName(user?.name?.split(" ")[0] ?? "");
    setNote("");
  }

  const canSubmit = Boolean(
    date && slot && !isPastSlot(slot) && firstName.trim().length > 0,
  );

  return (
    <div className="min-h-screen bg-background px-2 py-3 sm:px-4 sm:py-5 md:px-8" data-testid="commander-page">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#d8cab8] bg-[#efe8dc] p-3 shadow-xl md:p-6">
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-[#d8cab8] pb-4">
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-200 hover:bg-[#f3ece0]"
            data-testid="kiosk-back-home-link"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" /> <span>Accueil</span>
          </Link>
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-[#8a4b20]" />
            <span className="hidden font-heading text-lg tracking-tight sm:inline">
              Borne de commande
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-1">
            {user?.is_admin && (
              <Link
                to="/admin"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#2a1810] px-3 text-xs font-semibold text-[#faf6f0] transition-colors duration-200 hover:bg-[#8a4b20]"
                data-testid="kiosk-admin-link"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link
              to="/commandes"
              aria-label="Mes commandes"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full px-2 text-sm font-medium transition-colors duration-200 hover:bg-[#f3ece0] sm:h-10 sm:w-auto sm:justify-start sm:px-3"
              data-testid="kiosk-my-orders-link"
            >
              <ClipboardList className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Commandes</span>
            </Link>
            <ProfileAvatar user={user} />
            <LogoutButton />
          </div>
        </header>

        <div className="grid flex-1 grid-cols-12 gap-3 pt-5 md:gap-6">
          <aside className="col-span-12 flex flex-col gap-2 md:col-span-4 lg:col-span-3">
            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:text-xs">
              Catégories
            </p>
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
              {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  data-testid={`kiosk-category-${c.id}-btn`}
                  className={`flex min-h-20 w-full flex-col items-start justify-center gap-1 rounded-2xl border px-3 py-2.5 text-left transition-colors duration-200 md:min-h-0 md:gap-1.5 md:px-4 md:py-4 ${
                    active
                      ? "border-transparent bg-[#2a1810] text-[#faf6f0] shadow-md"
                      : "border-[#e0d4c5] bg-white text-[#2a1810] hover:bg-[#f3ece0]"
                  }`}
                >
                  <span className="flex items-start gap-1.5 text-[11px] font-bold uppercase leading-tight tracking-wide md:text-base">
                    {c.id === "chaudes" ? (
                      <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                    ) : (
                      <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                    )}
                    {c.label}
                  </span>
                  <span
                    className={`text-[10px] leading-snug md:text-xs ${
                      active ? "text-[#d8cab8]" : "text-muted-foreground"
                    }`}
                  >
                    {c.hint}
                  </span>
                </button>
              );
              })}
            </div>
          </aside>

          <main className="col-span-12 min-w-0 md:col-span-8 lg:col-span-9">
            {category === null && (
              <div
                className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#d8cab8] bg-[#f7f3ee] p-5 text-center md:p-10"
                data-testid="kiosk-empty-category-message"
              >
                <div className="relative">
                  <span className="absolute -top-6 left-1/2 h-6 w-1.5 -translate-x-1/2 rounded-full bg-[#d8cab8] animate-steam" />
                  <Coffee className="h-10 w-10 text-[#8a4b20] md:h-14 md:w-14" />
                </div>
                <h2 className="max-w-full font-heading text-base leading-snug tracking-tight sm:text-lg md:max-w-sm md:text-2xl">
                  <span className="sm:hidden">Choisissez une catégorie</span>
                  <span className="hidden sm:inline">Aucune catégorie sélectionnée, veuillez en choisir une</span>
                </h2>
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
                  <MoveUp className="h-4 w-4 animate-nudge-up md:hidden" />
                  <MoveLeft className="hidden h-4 w-4 animate-nudge-left md:block" />
                  <span className="md:hidden">Choisissez-en une au-dessus</span>
                  <span className="hidden md:inline">Choisissez-en une à gauche</span>
                </p>
              </div>
            )}

            {category === "fraiches" && coldAvailable.length === 0 && (
              <div
                className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-[#d8cab8] bg-white p-5 text-center md:gap-4 md:p-10"
                data-testid="cold-drinks-coming-soon-screen"
              >
                <Snowflake className="h-10 w-10 text-[#8a4b20] md:h-14 md:w-14" />
                <h2 className="font-heading text-2xl tracking-tight md:text-3xl">
                  Bientôt disponible
                </h2>
                <p className="max-w-md text-sm text-muted-foreground md:text-base">
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

            {category !== null && !(category === "fraiches" && coldAvailable.length === 0) && (
              <div>
                <h2 className="mb-3 font-heading text-xl tracking-tight md:mb-4 md:text-2xl">
                  {category === "chaudes" ? "Boissons chaudes" : "Boissons fraîches"}
                </h2>
                {hotError && (
                  <p className="mb-4 text-sm text-destructive" data-testid="drinks-error-message">
                    Carte momentanément indisponible.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {(shownDrinks ?? []).map((d, drinkIndex) => (
                    <div
                      key={d.id}
                      role="button"
                      tabIndex={0}
                      aria-disabled={!d.available}
                      onClick={() => openBooking(d)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openBooking(d);
                        }
                      }}
                      data-testid={`drink-card-${d.id}`}
                      className={`group flex flex-col rounded-2xl border border-[#e8ded1] bg-white p-2 text-left shadow-sm transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a4b20] md:p-3 ${
                        d.available
                          ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                          : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl border border-[#efe8dc] bg-[#f7f3ee] md:mb-3">
                        <img
                          src={d.image}
                          alt={d.name}
                          loading={drinkIndex < 3 ? "eager" : "lazy"}
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        {!d.available && (
                          <span
                            className="absolute inset-x-0 bottom-0 bg-[#2a1810]/85 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-[#faf6f0] md:text-xs"
                            data-testid={`drink-unavailable-badge-${d.id}`}
                          >
                            Non disponible
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={`Infos sur ${d.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoDrink(d);
                          }}
                          data-testid={`drink-info-btn-${d.id}`}
                          className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d4c5] bg-white/90 text-[#8a4b20] shadow-md transition-colors duration-200 hover:bg-[#2a1810] hover:text-[#faf6f0] md:right-2 md:top-2 md:h-9 md:w-9"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold leading-tight md:text-base">{d.name}</p>
                      <p className="mb-2 text-[11px] leading-tight text-muted-foreground md:mb-3 md:text-xs">
                        {d.tagline}
                      </p>
                      <span
                        className={`mt-auto inline-flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold transition-colors duration-200 md:h-10 md:text-sm ${
                          d.available
                            ? "bg-[#2a1810] text-[#faf6f0] group-hover:bg-[#8a4b20]"
                            : "bg-[#d8cab8] text-[#6e584d]"
                        }`}
                      >
                        {d.available ? (
                          <>
                            <span className="sm:hidden">Réserver</span>
                            <span className="hidden sm:inline">Choisir un créneau</span>
                          </>
                        ) : (
                          "Indisponible"
                        )}
                      </span>
                    </div>
                  ))}
                  {!shownDrinks && !hotError && (
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" data-testid="drink-info-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{infoDrink?.name}</DialogTitle>
            <DialogDescription>{infoDrink?.tagline}</DialogDescription>
          </DialogHeader>
          {infoDrink && (
            <img
              src={infoDrink.image}
              alt={infoDrink.name}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-2xl border border-border object-cover"
              data-testid="drink-info-large-image"
            />
          )}
          <p className="mt-1 text-sm leading-relaxed" data-testid="drink-info-description">
            {infoDrink?.description}
          </p>
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            {(infoDrink?.composition ?? []).length > 0 && (
              <>
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
              </>
            )}
            <p className="mt-4 text-xs text-muted-foreground" data-testid="drink-info-allergens">
              Allergènes : {infoDrink?.allergens || "non précisés"}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking agenda dialog — full screen on every device */}
      <Dialog open={bookingDrink !== null} onOpenChange={(o) => !o && setBookingDrink(null)}>
        <DialogContent
          className="flex flex-col gap-0 overflow-y-auto rounded-none border-0 p-4 sm:p-8 md:p-10"
          style={{
            top: 0,
            left: 0,
            width: "100vw",
            maxWidth: "100vw",
            height: "100dvh",
            translate: "none",
            transform: "none",
          }}
          data-testid="drink-agenda-dialog"
        >
          <DialogHeader className="mx-auto w-full max-w-4xl text-left">
            <DialogTitle className="font-heading text-2xl tracking-tight md:text-4xl">
              {bookingDrink?.name} — choisir date & heure
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Créneaux toutes les 30 minutes, de 08h00 à 20h00.
            </DialogDescription>
          </DialogHeader>

          <div className="mx-auto mt-5 grid w-full max-w-4xl gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="min-w-0" data-testid="booking-date-picker">
              <Label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                1. Date
              </Label>
              <div className="flex justify-center rounded-2xl border border-border bg-card p-2 md:p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={fr}
                  captionLayout="dropdown"
                  startMonth={minDate}
                  endMonth={new Date(minDate.getFullYear() + 1, 11)}
                  disabled={{ before: minDate }}
                  className="w-full [--cell-size:2.3rem] md:[--cell-size:2.6rem]"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div className="min-w-0">
                <Label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  2. Heure
                </Label>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 sm:grid-cols-4 md:p-3 lg:grid-cols-5">
                  {slots.map((s) => {
                    const past = isPastSlot(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={past}
                        onClick={() => setSlot(s)}
                        data-testid={`time-slot-${s.replace(":", "")}`}
                        className={`min-w-0 whitespace-nowrap rounded-lg border px-1 py-2.5 text-center text-xs font-medium transition-colors duration-150 md:px-2 md:py-3 md:text-sm ${
                          past
                            ? "cursor-not-allowed border-transparent bg-[#ece3d4] text-[#b3a394] line-through"
                            : slot === s
                              ? "border-transparent bg-[#2a1810] text-[#faf6f0]"
                              : "border-[#e0d4c5] bg-white text-[#2a1810] hover:bg-[#f3ece0]"
                        }`}
                      >
                        {s.replace(":", "h")}
                      </button>
                    );
                  })}
                </div>
                {isToday && (
                  <p className="mt-2 text-xs text-muted-foreground" data-testid="past-slots-hint">
                    Les créneaux déjà passés aujourd'hui sont désactivés.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <Label htmlFor="first-name" className="mb-1.5 block">
                    Prénom
                  </Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex. Camille"
                    data-testid="booking-client-name-input"
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="note" className="mb-1.5 block">
                    Note (optionnel)
                  </Label>
                  <Input
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

          <DialogFooter className="mx-auto mt-6 w-full max-w-4xl">
            <Button
              size="lg"
              className="h-14 w-full text-base sm:w-auto sm:px-10"
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
