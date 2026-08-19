"""Auth helpers: Emergent-managed Google sessions + admin role gating."""
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel

from lib.db import db

SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
COOKIE_NAME = "session_token"
SESSION_DAYS = 7


def admin_emails() -> set[str]:
    raw = os.environ.get("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_admin: bool = False


async def exchange_session(session_id: str) -> tuple[User, str]:
    """Trade the one-time session_id for the persistent session_token (server side only)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(SESSION_DATA_URL, headers={"X-Session-ID": session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Session invalide")
    data = resp.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Compte Google sans email")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name") or existing.get("name"), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": data.get("name") or email.split("@")[0],
                "picture": data.get("picture"),
                "created_at": datetime.now(timezone.utc),
            }
        )

    session_token = data.get("session_token") or str(uuid.uuid4())
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
            "created_at": datetime.now(timezone.utc),
        }
    )
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    assert doc is not None
    return _to_user(doc), session_token


def _to_user(doc: dict) -> User:
    return User(
        user_id=doc["user_id"],
        email=doc["email"],
        name=doc.get("name") or doc["email"],
        picture=doc.get("picture"),
        is_admin=doc["email"].lower() in admin_emails(),
    )


def _token_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


async def optional_user(request: Request) -> Optional[User]:
    token = _token_from_request(request)
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        return None
    doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return _to_user(doc) if doc else None


async def current_user(request: Request) -> User:
    user = await optional_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Connexion requise")
    return user


async def require_admin(request: Request) -> User:
    user = await current_user(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Réservé à l'administrateur")
    return user
