"""Drinks catalog + order (reservation) routes. Mounted under /api by server.py."""
import asyncio
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from lib.auth import User, current_user, require_admin
from lib.db import db
from lib.notify import notify_new_order

router = APIRouter()

ASSETS = "https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts"
ASSETS2 = "https://customer-assets-m6fa6gv7.emergentagent.net/job_beverage-booking-2/artifacts"


class Drink(BaseModel):
    id: str
    name: str
    category: str
    tagline: str
    image: str
    description: str
    composition: List[str]
    allergens: str
    available: bool = True


CATALOG: List[Drink] = [
    Drink(
        id="cafe-latte",
        name="Café latte",
        category="chaudes",
        tagline="Douceur lactée & espresso délicat",
        image=f"{ASSETS}/f7xy0nv3_Caf%C3%A9%20latte.png",
        description=(
            "Un espresso adouci par un lait chaud délicatement moussé : la boisson la plus douce "
            "de la carte."
        ),
        composition=["Lait chaud moussé", "Double espresso"],
        allergens="Lait",
    ),
    Drink(
        id="cappuccino",
        name="Cappuccino",
        category="chaudes",
        tagline="Mousse aérienne & cacao fin",
        image=f"{ASSETS}/eixmrmi9_Cappuccino.png",
        description=(
            "Le classique italien : un espresso corsé, du lait chaud velouté et une mousse dense "
            "coiffée de chantilly."
        ),
        composition=["Lait chaud", "Espresso", "Chantilly"],
        allergens="Lait",
    ),
    Drink(
        id="espresso",
        name="Espresso",
        category="chaudes",
        tagline="Concentré pur & crema dorée",
        image=f"{ASSETS}/8716v30s_Espresso.png",
        description="Court, intense et aromatique, coiffé d'une crema couleur noisette.",
        composition=["Espresso serré"],
        allergens="Aucun",
    ),
    Drink(
        id="viennois-chocolat",
        name="Viennois au chocolat",
        category="chaudes",
        tagline="Chocolat velouté & chantilly maison",
        image=f"{ASSETS}/sc6hbig2_Viennois%20au%20chocolat.png",
        description="Un chocolat chaud gourmand, généreusement couronné de chantilly maison.",
        composition=[
            "Lait chaud",
            "Cacao en poudre",
            "Chantilly",
            "Chocolat noir",
            "Topping chocolat",
        ],
        allergens="Lait",
    ),
    Drink(
        id="cafe-allonge",
        name="Café allongé",
        category="chaudes",
        tagline="Café long & aromatique",
        image=f"{ASSETS2}/5u5o826z_caf%C3%A9%20allong%C3%A9.png",
        description="Un espresso allongé à l'eau chaude : plus doux en bouche, parfait pour prendre son temps.",
        composition=["Espresso", "Eau chaude"],
        allergens="Aucun",
    ),
    Drink(
        id="chocolat-chaud",
        name="Chocolat chaud",
        category="chaudes",
        tagline="Cacao doux & réconfortant",
        image=f"{ASSETS2}/p2vhytw5_Chocolat%20chaud.png",
        description="Un simple et bon chocolat chaud : du lait chaud et du cacao, sans chichi.",
        composition=["Lait chaud", "Cacao en poudre"],
        allergens="Lait",
    ),
    Drink(
        id="cafe-latte-glace",
        name="Café latte glacé",
        category="fraiches",
        tagline="Fraîcheur intense & lait soyeux",
        image=f"{ASSETS}/5wr0zn61_Caf%C3%A9%20latte%20glac%C3%A9.png",
        description="Un double espresso versé sur du lait froid et des glaçons.",
        composition=["Lait froid", "Double espresso", "Glaçons"],
        allergens="Lait",
    ),
]


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drink_id: str
    drink_name: str
    drink_image: str
    date: str
    time: str
    first_name: str
    note: Optional[str] = None
    user_id: str
    user_email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderCreate(BaseModel):
    drink_id: str
    date: str
    time: str
    first_name: str = Field(min_length=1, max_length=40)
    note: Optional[str] = Field(default=None, max_length=300)

    @field_validator("date")
    @classmethod
    def _date_shape(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            raise ValueError("date must be YYYY-MM-DD")
        return v

    @field_validator("time")
    @classmethod
    def _half_hour(cls, v: str) -> str:
        if not re.fullmatch(r"([01]\d|2[0-3]):(00|30)", v):
            raise ValueError("time must be on a 30-minute slot, e.g. 13:00 or 13:30")
        return v


class AvailabilityUpdate(BaseModel):
    available: bool


class TodayInfo(BaseModel):
    today: str
    slots: List[str]


SLOTS: List[str] = [
    f"{h:02d}:{m:02d}" for h in range(8, 21) for m in (0, 30) if not (h == 20 and m == 30)
]


async def _unavailable_ids() -> set[str]:
    docs = await db.drink_availability.find({"available": False}, {"_id": 0}).to_list(100)
    return {d["drink_id"] for d in docs}


def _order_from_doc(doc: dict) -> Order:
    doc.pop("_id", None)
    created = doc.get("created_at")
    if isinstance(created, datetime) and created.tzinfo is None:
        doc["created_at"] = created.replace(tzinfo=timezone.utc)
    return Order(**doc)


@router.get("/today", response_model=TodayInfo)
async def get_today():
    from lib.dates import today_iso

    return TodayInfo(today=today_iso(), slots=SLOTS)


@router.get("/drinks", response_model=List[Drink])
async def list_drinks(category: Optional[str] = Query(default=None)):
    unavailable = await _unavailable_ids()
    out: List[Drink] = []
    for d in CATALOG:
        if category is not None and d.category != category:
            continue
        out.append(d.model_copy(update={"available": d.id not in unavailable}))
    return out


@router.patch("/drinks/{drink_id}/availability", response_model=Drink)
async def set_availability(
    drink_id: str, payload: AvailabilityUpdate, _: User = Depends(require_admin)
):
    drink = next((d for d in CATALOG if d.id == drink_id), None)
    if drink is None:
        raise HTTPException(status_code=404, detail="Boisson inconnue")
    await db.drink_availability.update_one(
        {"drink_id": drink_id}, {"$set": {"available": payload.available}}, upsert=True
    )
    return drink.model_copy(update={"available": payload.available})


@router.get("/orders", response_model=List[Order])
async def list_orders(user: User = Depends(current_user)):
    docs = await db.orders.find({"user_id": user.user_id}).sort("created_at", -1).to_list(200)
    return [_order_from_doc(d) for d in docs]


@router.get("/orders/all", response_model=List[Order])
async def list_all_orders(_: User = Depends(require_admin)):
    docs = await db.orders.find().sort([("date", 1), ("time", 1)]).to_list(500)
    return [_order_from_doc(d) for d in docs]


@router.post("/orders", response_model=Order, status_code=201)
async def create_order(payload: OrderCreate, user: User = Depends(current_user)):
    drink = next((d for d in CATALOG if d.id == payload.drink_id), None)
    if drink is None:
        raise HTTPException(status_code=404, detail="Boisson inconnue")
    if drink.category != "chaudes":
        raise HTTPException(status_code=400, detail="Cette boisson n'est pas encore disponible")
    if drink.id in await _unavailable_ids():
        raise HTTPException(status_code=409, detail="Boisson momentanément indisponible")

    order = Order(
        drink_id=drink.id,
        drink_name=drink.name,
        drink_image=drink.image,
        date=payload.date,
        time=payload.time,
        first_name=payload.first_name.strip(),
        note=(payload.note or "").strip() or None,
        user_id=user.user_id,
        user_email=user.email,
    )
    await db.orders.insert_one(order.model_dump())
    asyncio.create_task(notify_new_order(order))
    return order


@router.post("/orders/{order_id}/served", status_code=204)
async def mark_served(order_id: str, _: User = Depends(require_admin)):
    """Admin marks the drink as served — the order is removed from the board."""
    res = await db.orders.delete_one({"id": order_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return None


@router.delete("/orders/{order_id}", status_code=204)
async def delete_order(order_id: str, user: User = Depends(current_user)):
    query = {"id": order_id} if user.is_admin else {"id": order_id, "user_id": user.user_id}
    res = await db.orders.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return None
