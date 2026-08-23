# Le Café des Proches — spec

Kiosk-style ordering app (French UI, PWA) so family can order a hot drink and book a 30-minute slot.
Same two-column kiosk layout on phone and desktop.

## Auth & roles
Netlify Identity with Google OAuth or email/password. The browser handles Identity callbacks and the
Netlify Function reads the same-origin `nf_jwt` cookie. Only `nyxiris.bs@gmail.com` and
`gauthier.bonnaventuresauta@gmail.com` receive `is_admin` access.

## Routes
- `/` Home (public) — hero + carousel (auto-advancing, motion transitions) with image + name +
  description only. CTA "Commander" → /login when signed out.
- `/login` — connexion Google ou email/mot de passe, création de compte et confirmation email.
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
Catalog lives in Netlify Database/Postgres `drinks` (admin editable). The initial migration inserts
the 7 original drinks. Admin can create/edit/delete a
drink — name, category (chaudes/fraiches), tagline, description, composition, allergens and image
(URL or an uploaded file downscaled client-side to a ~900 px JPEG data URL). Every surface (home
carousel, kiosk, info dialog, order snapshots) reads the same records.
The cold category shows its grid when at least one cold drink is available, otherwise the
"Bientôt disponible" screen.
Info dialog: large square image + short description + composition (hidden when empty) + allergens.
Slots already gone today are disabled in the UI and rejected by the API (400 "Ce créneau est déjà
passé"); a past date is rejected too. `GET /api/today` returns `today`, `now` (HH:MM) and `slots`.

`Order` in Postgres `orders`: id (uuid), drink_id, drink_name, drink_image, date (YYYY-MM-DD),
time (HH:MM — minutes 00 or 30), first_name, note?, user_id, user_email, created_at (aware UTC).
Tables: users, drinks, orders, push_subscriptions.

## API (all on api_router, /api)
- GET /api/auth/me (session and logout are managed by Netlify Identity)
- GET /api/push/public-key · POST /api/push/subscribe (admin) · POST /api/push/unsubscribe (admin)
- GET /api/today → { today, now, slots[] } (08:00→20:00 step 30)
- GET /api/drinks?category= → Drink[] (includes `available`)
- POST /api/drinks (admin, 201) · PATCH /api/drinks/{id} (admin) · DELETE /api/drinks/{id} (admin)
- PATCH /api/drinks/{id}/availability (admin) → Drink
- GET /api/orders (own) · POST /api/orders (201; 409 if drink unavailable, 422 if time off-slot)
- GET /api/orders/all (admin) · POST /api/orders/{id}/served (admin, 204) · DELETE /api/orders/{id}
