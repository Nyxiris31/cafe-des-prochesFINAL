"""Admin notifications: Resend email + Web Push (VAPID)."""
import asyncio
import json
import logging
import os
from typing import Any

from lib.db import db

logger = logging.getLogger(__name__)


def _sender() -> str:
    return os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


async def send_admin_email(subject: str, html: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY")
    recipients = [e.strip() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]
    if not api_key or not recipients:
        logger.info("Resend non configuré, email ignoré")
        return
    try:
        import resend

        resend.api_key = api_key
        # One call per recipient: in Resend test mode only the account owner's address is
        # accepted, and a single rejected address must not cancel the others.
        for recipient in recipients:
            params: dict[str, Any] = {
                "from": _sender(),
                "to": [recipient],
                "subject": subject,
                "html": html,
            }
            try:
                await asyncio.to_thread(resend.Emails.send, params)
            except Exception as exc:
                logger.warning("Envoi email à %s échoué: %s", recipient, exc)
    except Exception as exc:  # notifications must never break an order
        logger.warning("Envoi email échoué: %s", exc)


async def send_admin_push(title: str, body: str, url: str = "/admin") -> None:
    private_key = os.environ.get("VAPID_PRIVATE_KEY")
    subject = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")
    if not private_key:
        return
    subs = await db.push_subscriptions.find({}, {"_id": 0}).to_list(200)
    if not subs:
        return
    try:
        from pywebpush import WebPushException, webpush
    except Exception as exc:
        logger.warning("pywebpush indisponible: %s", exc)
        return

    payload = json.dumps({"title": title, "body": body, "url": url})

    def _send(sub: dict) -> None:
        webpush(
            subscription_info=sub["subscription"],
            data=payload,
            vapid_private_key=private_key,
            vapid_claims={"sub": subject},
        )

    for sub in subs:
        try:
            await asyncio.to_thread(_send, sub)
        except WebPushException as exc:  # type: ignore[misc]
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
            else:
                logger.warning("Push échoué: %s", exc)
        except Exception as exc:
            logger.warning("Push échoué: %s", exc)


async def notify_new_order(order: Any) -> None:
    """Fire-and-forget notification for a freshly created order."""
    when = f"{order.date} à {order.time.replace(':', 'h')}"
    html = (
        "<div style=\"font-family:Arial,sans-serif;color:#2a1810\">"
        f"<h2 style=\"margin:0 0 8px\">Nouvelle commande : {order.drink_name}</h2>"
        f"<p style=\"margin:0 0 4px\"><strong>Quand :</strong> {when}</p>"
        f"<p style=\"margin:0 0 4px\"><strong>Pour :</strong> {order.first_name}</p>"
        f"<p style=\"margin:0 0 4px\"><strong>Compte :</strong> {order.user_email}</p>"
        + (f"<p style=\"margin:0\"><strong>Note :</strong> {order.note}</p>" if order.note else "")
        + "</div>"
    )
    await asyncio.gather(
        send_admin_email(f"Nouvelle commande : {order.drink_name} ({when})", html),
        send_admin_push(
            "Nouvelle commande",
            f"{order.drink_name} — {when} pour {order.first_name}",
        ),
        return_exceptions=True,
    )
