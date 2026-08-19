# Le Café des Proches — spec

Kiosk-style ordering app (French UI, PWA) so family can order a hot drink and book a 30-minute slot.
Same two-column kiosk layout on phone and desktop.

## Auth & roles
Emergent-managed Google OAuth. `POST /api/auth/session` exchanges the `#session_id` for a
`session_token` stored in Mongo `user_sessions` + httpOnly cookie (7 days).
`ADMIN_EMAILS` (backend/.env) decides `is_admin` — currently gauthier.bonnaventuresauta@gmail.com
and nyxiris.bs@gmail.com. See memory/test_credentials.md.

## Routes
- `/` Home (public) — hero + carousel (auto-advancing, motion transitions) with image + name +
  description only. CTA "Commander" → /login when signed out.
- `/login` — "Continuer avec Google".
- `/commander` (auth) — kiosk: left category rail, empty state
  "Aucune catégorie sélectionnée, veuillez en choisir une"; hot drinks grid (whole card clickable →
  fullscreen agenda: calendar with month/year dropdowns + 30-min slots + prénom + note); the "i"
  opens description/composition/allergens; unavailable drinks are greyed with a "Non disponible"
  badge and cannot be ordered. Cold category → "Bientôt disponible".
- `/commandes` (auth) — the signed-in user's own reservations, cancellable.
- `/admin` (admin only) — tabs "Commandes en cours" (badge count, polls every 15 s, button
  "Servie" deletes the order) and "Disponibilité des boissons" (switch per drink), plus a
  button to enable/disable Web Push on the current device.

## Notifications (admin)
On every new order: Resend email to each ADMIN_EMAILS address (one call per recipient — Resend test
mode only accepts the account owner's address) + Web Push (VAPID, `frontend/public/sw.js`).
Env: RESEND_API_KEY, SENDER_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
PWA manifest at `frontend/public/manifest.webmanifest` (needed for push on iOS).

## Data
Catalog hardcoded in `backend/routers/orders.py`; availability overrides in Mongo
`drink_availability {drink_id, available}`.
- chaudes: cafe-latte, cappuccino, espresso, viennois-chocolat, cafe-allonge, chocolat-chaud
- fraiches: cafe-latte-glace (category shows "Bientôt disponible")

Info dialog stays simple: short description + composition + allergens (no temperature, no cacao %,
no prep time).

`Order` in Mongo `orders`: id (uuid), drink_id, drink_name, drink_image, date (YYYY-MM-DD),
time (HH:MM — minutes 00 or 30), first_name, note?, user_id, user_email, created_at (aware UTC).
Collections: users, user_sessions, orders, drink_availability, push_subscriptions.

## API (all on api_router, /api)
- POST /api/auth/session · GET /api/auth/me · POST /api/auth/logout
- GET /api/push/public-key · POST /api/push/subscribe (admin) · POST /api/push/unsubscribe (admin)
- GET /api/today → { today, slots[] } (08:00→20:00 step 30)
- GET /api/drinks?category= → Drink[] (includes `available`)
- PATCH /api/drinks/{id}/availability (admin) → Drink
- GET /api/orders (own) · POST /api/orders (201; 409 if drink unavailable, 422 if time off-slot)
- GET /api/orders/all (admin) · POST /api/orders/{id}/served (admin, 204) · DELETE /api/orders/{id}
