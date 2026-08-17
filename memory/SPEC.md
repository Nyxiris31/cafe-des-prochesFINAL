# Le Café des Proches — spec

Kiosk-style ordering app (French UI) so family can "order" a hot drink and book a 30-minute slot.

## Routes
- `/` Home — hero + "Commander" CTA + link "Mes commandes".
- `/commander` Kiosk: left category rail (Boissons chaudes / Boissons fraîches). Initial state shows
  "Aucune catégorie sélectionnée, veuillez en choisir une". Hot → grid of 4 drinks (image, name, "i"
  info dialog, "Choisir un créneau" → agenda dialog with calendar + 30-min slots + prénom + note).
  Cold → "Bientôt disponible" screen.
- `/commandes` list of reservations with cancel.

## Data
Catalog is hardcoded in `backend/routers/orders.py` (no seed data, no auth).
- chaudes: cafe-latte, cappuccino, espresso, viennois-chocolat
- fraiches: cafe-latte-glace (not orderable — category shows "Bientôt disponible")

`Drink` info dialog is intentionally simple: description courte + `composition` (liste d'ingrédients) +
`allergens`. Pas d'intensité, de température, de % de cacao ni de temps de préparation.

`Order` in Mongo `orders`: id (uuid), drink_id, drink_name, drink_image, date (YYYY-MM-DD),
time (HH:MM, minutes must be 00 or 30), first_name, note?, created_at (aware UTC).

## API (all on api_router, /api)
- GET /api/today → { today, slots[] } (08:00→20:00 step 30)
- GET /api/drinks?category=chaudes|fraiches → Drink[]
- POST /api/orders → 201 Order (422 if time not on a 30-min slot; 400 if drink not "chaudes")
- GET /api/orders → Order[]
- DELETE /api/orders/{id} → 204 (404 if unknown)

No auth / no credentials.
