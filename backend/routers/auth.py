"""Auth + web-push subscription routes (mounted under /api)."""
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from lib.auth import COOKIE_NAME, SESSION_DAYS, User, current_user, exchange_session, optional_user, require_admin
from lib.db import db

router = APIRouter()


class SessionRequest(BaseModel):
    session_id: str


class PushKey(BaseModel):
    public_key: str


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict[str, str]


@router.post("/auth/session", response_model=User)
async def create_session(payload: SessionRequest, response: Response):
    user, session_token = await exchange_session(payload.session_id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_DAYS * 24 * 3600,
    )
    return user


@router.get("/auth/me", response_model=User)
async def me(user: User = Depends(current_user)):
    return user


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(COOKIE_NAME, path="/", samesite="none", secure=True)
    return {"ok": True}


@router.get("/push/public-key", response_model=PushKey)
async def push_public_key(_: Optional[User] = Depends(optional_user)):
    return PushKey(public_key=os.environ.get("VAPID_PUBLIC_KEY", ""))


@router.post("/push/subscribe")
async def push_subscribe(sub: PushSubscription, admin: User = Depends(require_admin)):
    doc: dict[str, Any] = {
        "endpoint": sub.endpoint,
        "subscription": {"endpoint": sub.endpoint, "keys": sub.keys},
        "user_id": admin.user_id,
    }
    await db.push_subscriptions.update_one(
        {"endpoint": sub.endpoint}, {"$set": doc}, upsert=True
    )
    return {"ok": True}


@router.post("/push/unsubscribe")
async def push_unsubscribe(sub: PushSubscription, _: User = Depends(require_admin)):
    await db.push_subscriptions.delete_one({"endpoint": sub.endpoint})
    return {"ok": True}
