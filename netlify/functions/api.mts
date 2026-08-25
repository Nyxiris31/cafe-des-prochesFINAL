import type { Config, Context } from "@netlify/functions";
import { getUser as getIdentityUser } from "@netlify/identity";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import webPush from "web-push";

import { db } from "../../db/index.js";
import { drinks, orders, pushSubscriptions, users } from "../../db/schema.js";

type User = {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  is_admin: boolean;
};

type DrinkRow = typeof drinks.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

class HttpError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

const CATEGORIES = new Set(["chaudes", "fraiches"]);
const AUTHORIZED_ADMIN_EMAILS = new Set([
  "nysira.bs@gmail.com",
  "gauthier.bonnaventuresauta@gmail.com",
]);
const SLOTS = Array.from({ length: 25 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

function noContent(headers?: HeadersInit): Response {
  return new Response(null, { status: 204, headers });
}

function authorizedAdminEmails(): Set<string> {
  return AUTHORIZED_ADMIN_EMAILS;
}

function publicUser(row: typeof users.$inferSelect): User {
  return {
    user_id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture,
    is_admin: authorizedAdminEmails().has(row.email.toLowerCase()),
  };
}

function drinkJson(row: DrinkRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tagline: row.tagline,
    image: row.image,
    description: row.description,
    composition: row.composition,
    allergens: row.allergens,
    available: row.available,
    sort_order: row.sortOrder,
  };
}

function orderJson(row: OrderRow) {
  return {
    id: row.id,
    drink_id: row.drinkId,
    drink_name: row.drinkName,
    drink_image: row.drinkImage,
    date: row.date,
    time: row.time,
    first_name: row.firstName,
    note: row.note,
    user_id: row.userId,
    user_email: row.userEmail,
    created_at: row.createdAt.toISOString(),
  };
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body === null) return {};
    if (typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(422, "Corps JSON invalide");
  }
}

function requiredString(
  body: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number } = {},
): string {
  const value = body[key];
  if (typeof value !== "string") throw new HttpError(422, `${key} est requis`);
  const trimmed = value.trim();
  if (trimmed.length < (options.min ?? 1) || trimmed.length > (options.max ?? Infinity)) {
    throw new HttpError(422, `${key} est invalide`);
  }
  return trimmed;
}

function optionalString(
  body: Record<string, unknown>,
  key: string,
  max: number,
): string | undefined {
  if (body[key] === undefined || body[key] === null) return undefined;
  if (typeof body[key] !== "string" || body[key].length > max) {
    throw new HttpError(422, `${key} est invalide`);
  }
  return body[key].trim();
}

function composition(body: Record<string, unknown>, required: boolean): string[] | undefined {
  if (body.composition === undefined && !required) return undefined;
  if (body.composition === undefined) return [];
  if (!Array.isArray(body.composition) || body.composition.some((item) => typeof item !== "string")) {
    throw new HttpError(422, "composition est invalide");
  }
  return body.composition.map((item) => item.trim()).filter(Boolean);
}

function category(value: unknown): string {
  if (typeof value !== "string" || !CATEGORIES.has(value)) {
    throw new HttpError(422, "category doit être 'chaudes' ou 'fraiches'");
  }
  return value;
}

function timezoneParts(): { today: string; now: string } {
  const timeZone = process.env.APP_TIMEZONE || process.env.APP_TZ || "Europe/Paris";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { today: `${value("year")}-${value("month")}-${value("day")}`, now: `${value("hour")}:${value("minute")}` };
}

async function currentUser(request: Request, required = true): Promise<User | null> {
  void request;
  const identity = await getIdentityUser();
  const email = identity?.email?.trim().toLowerCase();
  if (!identity || !email) {
    if (required) throw new HttpError(401, "Connexion requise");
    return null;
  }
  const name = identity.name?.trim() || email.split("@")[0];
  const picture = identity.pictureUrl ?? null;
  const [byId] = await db.select().from(users).where(eq(users.id, identity.id)).limit(1);
  let userRow: typeof users.$inferSelect;
  if (byId) {
    [userRow] = await db
      .update(users)
      .set({ email, name, picture, updatedAt: new Date() })
      .where(eq(users.id, identity.id))
      .returning();
  } else {
    const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (byEmail) {
      [userRow] = await db
        .update(users)
        .set({ name, picture, updatedAt: new Date() })
        .where(eq(users.id, byEmail.id))
        .returning();
    } else {
      [userRow] = await db.insert(users).values({ id: identity.id, email, name, picture }).returning();
    }
  }
  return publicUser(userRow);
}

async function requireAdmin(request: Request): Promise<User> {
  const user = await currentUser(request);
  if (!user?.is_admin) throw new HttpError(403, "Réservé à l'administrateur");
  return user;
}

async function getDrink(id: string): Promise<DrinkRow> {
  const [drink] = await db.select().from(drinks).where(eq(drinks.id, id)).limit(1);
  if (!drink) throw new HttpError(404, "Boisson inconnue");
  return drink;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

async function sendOrderEmail(order: OrderRow): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = [...authorizedAdminEmails()];
  if (!apiKey || recipients.length === 0) return;
  const when = `${order.date} à ${order.time.replace(":", "h")}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#2a1810"><h2>Nouvelle commande : ${escapeHtml(order.drinkName)}</h2><p><strong>Quand :</strong> ${escapeHtml(when)}</p><p><strong>Pour :</strong> ${escapeHtml(order.firstName)}</p><p><strong>Compte :</strong> ${escapeHtml(order.userEmail)}</p>${order.note ? `<p><strong>Note :</strong> ${escapeHtml(order.note)}</p>` : ""}</div>`;

  await Promise.allSettled(
    recipients.map((recipient) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.SENDER_EMAIL || "onboarding@resend.dev",
          to: [recipient],
          subject: `Nouvelle commande : ${order.drinkName} (${when})`,
          html,
        }),
      }),
    ),
  );
}

async function sendOrderPush(order: OrderRow): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
  const subscriptions = await db.select().from(pushSubscriptions);
  const payload = JSON.stringify({
    title: "Nouvelle commande",
    body: `${order.drinkName} — ${order.date} à ${order.time.replace(":", "h")} pour ${order.firstName}`,
    url: "/admin",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(subscription.subscription, payload);
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        }
      }
    }),
  );
}

async function handleAuth(request: Request, path: string): Promise<Response | null> {
  if (request.method === "GET" && path === "/auth/me") {
    return json(await currentUser(request));
  }
  return null;
}

async function handlePush(request: Request, path: string): Promise<Response | null> {
  if (request.method === "GET" && path === "/push/public-key") {
    await currentUser(request, false);
    return json({ public_key: process.env.VAPID_PUBLIC_KEY ?? "" });
  }
  if (request.method === "POST" && path === "/push/subscribe") {
    const admin = await requireAdmin(request);
    const body = await requestBody(request);
    const endpoint = requiredString(body, "endpoint");
    const keys = body.keys;
    if (
      typeof keys !== "object" ||
      keys === null ||
      Array.isArray(keys) ||
      typeof (keys as Record<string, unknown>).p256dh !== "string" ||
      typeof (keys as Record<string, unknown>).auth !== "string"
    ) {
      throw new HttpError(422, "Clés push invalides");
    }
    const subscription = {
      endpoint,
      keys: {
        p256dh: (keys as Record<string, string>).p256dh,
        auth: (keys as Record<string, string>).auth,
      },
    };
    await db
      .insert(pushSubscriptions)
      .values({ endpoint, subscription, userId: admin.user_id })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { subscription, userId: admin.user_id, updatedAt: new Date() },
      });
    return json({ ok: true });
  }
  if (request.method === "POST" && path === "/push/unsubscribe") {
    await requireAdmin(request);
    const body = await requestBody(request);
    const endpoint = requiredString(body, "endpoint");
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return json({ ok: true });
  }
  return null;
}

async function handleDrinks(request: Request, path: string, url: URL): Promise<Response | null> {
  if (request.method === "GET" && path === "/drinks") {
    const requestedCategory = url.searchParams.get("category");
    const rows = requestedCategory
      ? await db.select().from(drinks).where(eq(drinks.category, requestedCategory)).orderBy(asc(drinks.sortOrder))
      : await db.select().from(drinks).orderBy(asc(drinks.sortOrder));
    return json(rows.map(drinkJson));
  }

  if (request.method === "POST" && path === "/drinks") {
    await requireAdmin(request);
    const body = await requestBody(request);
    const [{ value: highestSortOrder }] = await db.select({ value: max(drinks.sortOrder) }).from(drinks);
    const name = requiredString(body, "name", { max: 60 });
    const [created] = await db
      .insert(drinks)
      .values({
        id: `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "boisson"}-${randomUUID().slice(0, 6)}`,
        name,
        category: category(body.category),
        tagline: optionalString(body, "tagline", 80) ?? "",
        image: requiredString(body, "image"),
        description: requiredString(body, "description", { max: 600 }),
        composition: composition(body, true) ?? [],
        allergens: optionalString(body, "allergens", 120) ?? "",
        sortOrder: (highestSortOrder ?? 0) + 1,
      })
      .returning();
    return json(drinkJson(created), 201);
  }

  const availabilityMatch = path.match(/^\/drinks\/([^/]+)\/availability$/);
  if (request.method === "PATCH" && availabilityMatch) {
    await requireAdmin(request);
    const id = decodeURIComponent(availabilityMatch[1]);
    await getDrink(id);
    const body = await requestBody(request);
    if (typeof body.available !== "boolean") throw new HttpError(422, "available est requis");
    const [updated] = await db
      .update(drinks)
      .set({ available: body.available, updatedAt: new Date() })
      .where(eq(drinks.id, id))
      .returning();
    return json(drinkJson(updated));
  }

  const drinkMatch = path.match(/^\/drinks\/([^/]+)$/);
  if (request.method === "PATCH" && drinkMatch) {
    await requireAdmin(request);
    const id = decodeURIComponent(drinkMatch[1]);
    await getDrink(id);
    const body = await requestBody(request);
    const changes: Partial<typeof drinks.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) changes.name = requiredString(body, "name", { max: 60 });
    if (body.category !== undefined) changes.category = category(body.category);
    if (body.tagline !== undefined) changes.tagline = optionalString(body, "tagline", 80) ?? "";
    if (body.image !== undefined) changes.image = requiredString(body, "image");
    if (body.description !== undefined) changes.description = requiredString(body, "description", { max: 600 });
    if (body.composition !== undefined) changes.composition = composition(body, false) ?? [];
    if (body.allergens !== undefined) changes.allergens = optionalString(body, "allergens", 120) ?? "";
    if (body.available !== undefined) {
      if (typeof body.available !== "boolean") throw new HttpError(422, "available est invalide");
      changes.available = body.available;
    }
    const [updated] = await db.update(drinks).set(changes).where(eq(drinks.id, id)).returning();
    return json(drinkJson(updated));
  }

  if (request.method === "DELETE" && drinkMatch) {
    await requireAdmin(request);
    const id = decodeURIComponent(drinkMatch[1]);
    const deleted = await db.delete(drinks).where(eq(drinks.id, id)).returning({ id: drinks.id });
    if (deleted.length === 0) throw new HttpError(404, "Boisson inconnue");
    return noContent();
  }
  return null;
}

async function handleOrders(request: Request, path: string): Promise<Response | null> {
  if (request.method === "GET" && path === "/orders/all") {
    await requireAdmin(request);
    const rows = await db.select().from(orders).orderBy(asc(orders.date), asc(orders.time));
    return json(rows.map(orderJson));
  }
  if (request.method === "GET" && path === "/orders") {
    const user = await currentUser(request);
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user!.user_id))
      .orderBy(desc(orders.createdAt));
    return json(rows.map(orderJson));
  }
  if (request.method === "POST" && path === "/orders") {
    const user = await currentUser(request);
    const body = await requestBody(request);
    const drink = await getDrink(requiredString(body, "drink_id"));
    if (!drink.available) throw new HttpError(409, "Boisson momentanément indisponible");
    const date = requiredString(body, "date");
    const time = requiredString(body, "time");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):(00|30)$/.test(time)) {
      throw new HttpError(422, "Date ou créneau invalide");
    }
    const clock = timezoneParts();
    if (date < clock.today) throw new HttpError(400, "Cette date est déjà passée");
    if (date === clock.today && time <= clock.now) throw new HttpError(400, "Ce créneau est déjà passé");
    const [created] = await db
      .insert(orders)
      .values({
        drinkId: drink.id,
        drinkName: drink.name,
        drinkImage: drink.image,
        date,
        time,
        firstName: requiredString(body, "first_name", { max: 40 }),
        note: optionalString(body, "note", 300) || null,
        userId: user!.user_id,
        userEmail: user!.email,
      })
      .returning();
    await Promise.allSettled([sendOrderEmail(created), sendOrderPush(created)]);
    return json(orderJson(created), 201);
  }

  const servedMatch = path.match(/^\/orders\/([^/]+)\/served$/);
  if (request.method === "POST" && servedMatch) {
    await requireAdmin(request);
    const id = decodeURIComponent(servedMatch[1]);
    const deleted = await db.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });
    if (deleted.length === 0) throw new HttpError(404, "Commande introuvable");
    return noContent();
  }

  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (request.method === "DELETE" && orderMatch) {
    const user = await currentUser(request);
    const id = decodeURIComponent(orderMatch[1]);
    const condition = user!.is_admin
      ? eq(orders.id, id)
      : and(eq(orders.id, id), eq(orders.userId, user!.user_id));
    const deleted = await db.delete(orders).where(condition).returning({ id: orders.id });
    if (deleted.length === 0) throw new HttpError(404, "Commande introuvable");
    return noContent();
  }
  return null;
}

export default async function handler(request: Request, _context: Context): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, "") || "/";

    if (request.method === "GET" && path === "/today") {
      return json({ ...timezoneParts(), slots: SLOTS });
    }

    const response =
      (await handleAuth(request, path)) ??
      (await handlePush(request, path)) ??
      (await handleDrinks(request, path, url)) ??
      (await handleOrders(request, path));
    if (response) return response;
    throw new HttpError(404, "Route introuvable");
  } catch (error) {
    if (error instanceof HttpError) return json({ detail: error.detail }, error.status);
    console.error("API request failed", error instanceof Error ? error.message : "Unknown error");
    return json({ detail: "Erreur interne du serveur" }, 500);
  }
}

export const config: Config = {
  path: "/api/*",
};
