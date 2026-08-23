import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Bell, BellOff, Check, Coffee, LogOut, Pencil, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import DrinkEditor from "@/components/DrinkEditor";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Drink, Order, PushKey } from "@/lib/types";

const NOTIFICATIONS_ENABLED_KEY = "cafe-notifications-enabled";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function Admin() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"orders" | "drinks">("orders");
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [notificationMode, setNotificationMode] = useState<"push" | "browser" | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Drink | null>(null);
  const knownOrderIds = useRef<Set<string> | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["orders", "all"],
    queryFn: () => apiGet<Order[]>("/orders/all"),
    refetchInterval: 15_000,
  });
  const { data: drinks } = useQuery({
    queryKey: ["drinks", "all"],
    queryFn: () => apiGet<Drink[]>("/drinks"),
  });

  useEffect(() => {
    const enabled = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true";
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    setNotificationsOn(true);
    navigator.serviceWorker
      ?.getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setNotificationMode(sub ? "push" : "browser"))
      .catch(() => setNotificationMode("browser"));
  }, []);

  useEffect(() => {
    if (!orders) return;
    const currentIds = new Set(orders.map((order) => order.id));
    const previousIds = knownOrderIds.current;
    knownOrderIds.current = currentIds;
    if (!previousIds || !notificationsOn || notificationMode !== "browser") return;

    orders
      .filter((order) => !previousIds.has(order.id))
      .forEach((order) => {
        new Notification("Nouvelle commande", {
          body: `${order.drink_name} — ${order.date} à ${order.time.replace(":", "h")} pour ${order.first_name}`,
          icon: "/favicon.svg",
        });
      });
  }, [orders, notificationMode, notificationsOn]);

  const served = useMutation({
    mutationFn: (id: string) => apiPost<void>(`/orders/${id}/served`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Commande servie et retirée du tableau.");
    },
    onError: () => toast.error("Action impossible."),
  });

  const availability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      apiPatch<Drink>(`/drinks/${id}/availability`, { available }),
    onSuccess: (drink) => {
      queryClient.invalidateQueries({ queryKey: ["drinks"] });
      toast.success(
        drink.available ? `${drink.name} est de nouveau disponible.` : `${drink.name} est indisponible.`,
      );
    },
    onError: () => toast.error("Mise à jour impossible."),
  });

  async function enableNotifications() {
    try {
      if (typeof Notification === "undefined") {
        toast.error("Ce navigateur ne gère pas les notifications du site.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications refusées par le navigateur.");
        return;
      }

      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      setNotificationsOn(true);

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotificationMode("browser");
        toast.success("Notifications du site activées sur cet appareil.");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const { public_key } = await apiGet<PushKey>("/push/public-key");
        if (!public_key) throw new Error("VAPID public key missing");
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource,
        }));
        const json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
        await apiPost("/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
        setNotificationMode("push");
        toast.success("Notifications activées sur cet appareil.");
      } catch {
        setNotificationMode("browser");
        toast.success("Notifications du site activées sur cet appareil.");
      }
    } catch {
      localStorage.removeItem(NOTIFICATIONS_ENABLED_KEY);
      setNotificationsOn(false);
      setNotificationMode(null);
      toast.error("Activation des notifications impossible.");
    }
  }

  async function disableNotifications() {
    localStorage.removeItem(NOTIFICATIONS_ENABLED_KEY);
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
      await apiPost("/push/unsubscribe", { endpoint: json.endpoint, keys: json.keys ?? {} }).catch(
        () => undefined,
      );
      await sub.unsubscribe();
    }
    setNotificationsOn(false);
    setNotificationMode(null);
    toast.success("Notifications désactivées.");
  }

  const list = orders ?? [];

  return (
    <div className="min-h-screen bg-background" data-testid="admin-page">
      <header className="border-b border-border bg-[#efe8dc]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <Link
            to="/commander"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 hover:bg-[#f3ece0]"
            data-testid="admin-back-kiosk-link"
          >
            <ArrowLeft className="h-4 w-4" /> Borne
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#2a1810] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#faf6f0]" data-testid="admin-badge">
            <ShieldCheck className="h-3.5 w-3.5" /> Administrateur
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 hover:bg-[#f3ece0]"
            data-testid="admin-logout-btn"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
          <ProfileAvatar user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 md:px-6">
        <h1 className="font-heading text-3xl leading-tight tracking-tight md:text-5xl">
          Tableau de bord
        </h1>
        <p className="mt-2 text-muted-foreground" data-testid="admin-user-email">
          Connecté en tant que {user?.name} ({user?.email})
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTab("orders")}
            data-testid="admin-tab-orders"
            className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-200 ${
              tab === "orders"
                ? "bg-[#2a1810] text-[#faf6f0]"
                : "bg-secondary text-[#2a1810] hover:bg-[#e3d8c8]"
            }`}
          >
            Commandes en cours
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#8a4b20] px-1.5 text-xs text-white"
              data-testid="admin-orders-badge"
            >
              {list.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("drinks")}
            data-testid="admin-tab-drinks"
            className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-200 ${
              tab === "drinks"
                ? "bg-[#2a1810] text-[#faf6f0]"
                : "bg-secondary text-[#2a1810] hover:bg-[#e3d8c8]"
            }`}
          >
            <Coffee className="h-4 w-4" /> Disponibilité des boissons
          </button>
          <Button
            variant="outline"
            className="h-12 rounded-full"
            onClick={() => (notificationsOn ? disableNotifications() : enableNotifications())}
            data-testid="admin-push-toggle-btn"
          >
            {notificationsOn ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
            {notificationsOn ? "Notifs activées" : "Activer les notifs"}
          </Button>
        </div>

        {tab === "orders" && (
          <section className="mt-8" data-testid="admin-orders-panel">
            {list.length === 0 ? (
              <div
                className="rounded-3xl border border-dashed border-[#d8cab8] bg-[#faf7f2] px-6 py-14 text-center text-muted-foreground"
                data-testid="admin-orders-empty"
              >
                Aucune commande en cours.
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {list.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                    data-testid={`admin-order-row-${o.id}`}
                  >
                    <img
                      src={o.drink_image}
                      alt={o.drink_name}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-xl tracking-tight">{o.drink_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {format(parseISO(o.date), "EEEE d MMMM yyyy", { locale: fr })} ·{" "}
                        {o.time.replace(":", "h")}
                      </p>
                      <p className="mt-1.5 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-[#3d2417]">
                        {o.first_name} · {o.user_email}
                      </p>
                      {o.note && (
                        <p className="mt-2 text-sm italic text-muted-foreground">« {o.note} »</p>
                      )}
                    </div>
                    <Button
                      className="h-12 rounded-full sm:w-auto"
                      onClick={() => served.mutate(o.id)}
                      disabled={served.isPending}
                      data-testid={`admin-order-served-btn-${o.id}`}
                    >
                      <Check className="mr-2 h-4 w-4" /> Servie
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "drinks" && (
          <section className="mt-8 flex flex-col gap-3" data-testid="admin-drinks-panel">
            <Button
              className="h-12 self-start rounded-full"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              data-testid="admin-add-drink-btn"
            >
              <Plus className="mr-2 h-4 w-4" /> Ajouter une boisson
            </Button>
            {(drinks ?? []).map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                data-testid={`admin-drink-row-${d.id}`}
              >
                <img
                  src={d.image}
                  alt={d.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.category === "chaudes" ? "Boisson chaude" : "Boisson fraîche"} ·{" "}
                    <span data-testid={`admin-drink-state-${d.id}`}>
                      {d.available ? "disponible" : "non disponible"}
                    </span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(d);
                    setEditorOpen(true);
                  }}
                  data-testid={`admin-drink-edit-btn-${d.id}`}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Modifier
                </Button>
                <Switch
                  checked={d.available}
                  onCheckedChange={(available) => availability.mutate({ id: d.id, available })}
                  aria-label={`Disponibilité de ${d.name}`}
                  data-testid={`admin-drink-toggle-${d.id}`}
                />
              </div>
            ))}
          </section>
        )}
      </main>

      <DrinkEditor open={editorOpen} drink={editing} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
