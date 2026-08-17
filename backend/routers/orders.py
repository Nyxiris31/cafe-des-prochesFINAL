"""Drinks catalog + order (reservation) routes. Mounted under /api by server.py."""
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from lib.db import db

router = APIRouter()

ASSETS = "https://customer-assets-m6fa6gv7.emergentagent.net/job_690c1dec-8486-4f8b-8982-dcf42ece7bb2/artifacts"


class Drink(BaseModel):
    id: str
    name: str
    category: str
    tagline: str
    image: str
    description: str
    intensity: str
    serving_temp: str
    allergens: str
    prep_time: str


CATALOG: List[Drink] = [
    Drink(
        id="cafe-latte",
        name="Café latte",
        category="chaudes",
        tagline="Douceur lactée & espresso délicat",
        image=f"{ASSETS}/f7xy0nv3_Caf%C3%A9%20latte.png",
        description=(
            "Une alliance harmonieuse entre un espresso fraîchement extrait et un lit généreux "
            "de lait entier délicatement texturé à la vapeur, surmonté d'une fine couche de "
            "micro-mousse onctueuse."
        ),
        intensity="2/5",
        serving_temp="Chaud (65°C)",
        allergens="Lait",
        prep_time="3-5 min",
    ),
    Drink(
        id="cappuccino",
        name="Cappuccino",
        category="chaudes",
        tagline="Mousse aérienne & cacao fin",
        image=f"{ASSETS}/eixmrmi9_Cappuccino.png",
        description=(
            "Le grand classique italien composé d'un tiers d'espresso corsé, d'un tiers de lait "
            "chaud velouté et d'un tiers de mousse dense et crémeuse, saupoudré d'un nuage de "
            "cacao pur."
        ),
        intensity="3/5",
        serving_temp="Chaud (68°C)",
        allergens="Lait",
        prep_time="3-4 min",
    ),
    Drink(
        id="espresso",
        name="Espresso",
        category="chaudes",
        tagline="Concentré pur & crema dorée",
        image=f"{ASSETS}/8716v30s_Espresso.png",
        description=(
            "Une extraction courte sous haute pression révélant les arômes profonds de fèves de "
            "café torréfiées artisanalement, coiffée d'une épaisse crema couleur noisette."
        ),
        intensity="5/5",
        serving_temp="Très chaud (75°C)",
        allergens="Aucun",
        prep_time="2 min",
    ),
    Drink(
        id="viennois-chocolat",
        name="Viennois au chocolat",
        category="chaudes",
        tagline="Chocolat velouté & chantilly maison",
        image=f"{ASSETS}/sc6hbig2_Viennois%20au%20chocolat.png",
        description=(
            "Un chocolat chaud riche fondu à l'ancienne avec des fèves de cacao 70%, couronné "
            "d'un dôme généreux de crème chantilly vanillée maison et de copeaux de chocolat noir."
        ),
        intensity="Gourmand",
        serving_temp="Chaud (62°C)",
        allergens="Lait",
        prep_time="4-6 min",
    ),
    Drink(
        id="cafe-latte-glace",
        name="Café latte glacé",
        category="fraiches",
        tagline="Fraîcheur intense & lait soyeux",
        image=f"{ASSETS}/5wr0zn61_Caf%C3%A9%20latte%20glac%C3%A9.png",
        description=(
            "Double espresso versé sur une cascade de glaçons cristallins et de lait frais "
            "tempéré, relevé d'une pointe de vanille."
        ),
        intensity="3/5",
        serving_temp="Glacé (4°C)",
        allergens="Lait",
        prep_time="3 min",
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
        m = re.fullmatch(r"([01]\d|2[0-3]):(00|30)", v)
        if not m:
            raise ValueError("time must be on a 30-minute slot, e.g. 13:00 or 13:30")
        return v


class TodayInfo(BaseModel):
    today: str
    slots: List[str]


SLOTS: List[str] = [
    f"{h:02d}:{m:02d}" for h in range(8, 21) for m in (0, 30) if not (h == 20 and m == 30)
]


@router.get("/today", response_model=TodayInfo)
async def get_today():
    from lib.dates import today_iso

    return TodayInfo(today=today_iso(), slots=SLOTS)


@router.get("/drinks", response_model=List[Drink])
async def list_drinks(category: Optional[str] = Query(default=None)):
    if category is None:
        return CATALOG
    return [d for d in CATALOG if d.category == category]


@router.get("/orders", response_model=List[Order])
async def list_orders():
    docs = await db.orders.find().sort("created_at", -1).to_list(500)
    out: List[Order] = []
    for doc in docs:
        doc.pop("_id", None)
        created = doc.get("created_at")
        if isinstance(created, datetime) and created.tzinfo is None:
            doc["created_at"] = created.replace(tzinfo=timezone.utc)
        out.append(Order(**doc))
    return out


@router.post("/orders", response_model=Order, status_code=201)
async def create_order(payload: OrderCreate):
    drink = next((d for d in CATALOG if d.id == payload.drink_id), None)
    if drink is None:
        raise HTTPException(status_code=404, detail="Boisson inconnue")
    if drink.category != "chaudes":
        raise HTTPException(status_code=400, detail="Cette boisson n'est pas encore disponible")
    order = Order(
        drink_id=drink.id,
        drink_name=drink.name,
        drink_image=drink.image,
        date=payload.date,
        time=payload.time,
        first_name=payload.first_name.strip(),
        note=(payload.note or "").strip() or None,
    )
    await db.orders.insert_one(order.model_dump())
    return order


@router.delete("/orders/{order_id}", status_code=204)
async def delete_order(order_id: str):
    res = await db.orders.delete_one({"id": order_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return None
