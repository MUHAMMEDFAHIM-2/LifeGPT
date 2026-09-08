"""Web Push sending + the daily check-in reminder.

Two ways the reminder fires, controlled by REMINDER_MODE:
  "internal" (default, local/laptop dev) — reminder_tick() runs every
    minute in-process and fires once at REMINDER_HOUR (server local time).
  "external" (cloud) — the in-process loop is disabled (app/main.py skips
    starting it); an external scheduler such as GitHub Actions calls
    POST /api/push/send-reminder once a day instead. This avoids relying
    on a free-tier server that sleeps between requests, and sidesteps its
    clock possibly not being in your timezone.
Both paths call the same send_reminder_if_needed() so the "don't nag if
you already logged today" rule lives in exactly one place.
"""

import json
import logging
from datetime import date, datetime

from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.db import SessionLocal
from app.models.daily_entry import DailyEntry
from app.models.push_subscription import PushSubscription

log = logging.getLogger("lifegpt.push")

_last_reminder_date: date | None = None


def _vapid_key() -> str:
    # Raw base64url key (env var) takes priority — cloud hosts don't give
    # you a writable filesystem for secrets. Falls back to the local PEM
    # file for laptop dev.
    return settings.vapid_private_key or settings.vapid_private_key_file


def send_to_all(db: Session, title: str, body: str, url: str = "/checkin") -> dict:
    subs = db.scalars(select(PushSubscription)).all()
    payload = json.dumps({"title": title, "body": body, "url": url})
    sent, dropped = 0, 0
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=_vapid_key(),
                vapid_claims={"sub": f"mailto:{settings.vapid_claim_email}"},
            )
            sent += 1
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status in (404, 410):  # subscription expired — clean it up
                db.delete(sub)
                dropped += 1
            else:
                log.warning("push failed (%s): %s", status, exc)
    db.commit()
    return {"sent": sent, "dropped": dropped, "total": len(subs)}


def send_reminder_if_needed(db: Session) -> dict:
    """The actual rule: nudge once, only if today has no entry yet."""
    today = date.today()
    already_logged = (
        db.scalar(select(DailyEntry.id).where(DailyEntry.date == today)) is not None
    )
    if already_logged:
        log.info("reminder skipped — today already logged")
        return {"skipped": True, "reason": "already logged"}
    result = send_to_all(
        db,
        "LifeGPT is waiting 👀",
        "You haven't logged today. 60 seconds, that's all it takes.",
    )
    log.info("reminder sent: %s", result)
    return {"skipped": False, **result}


def reminder_tick() -> None:
    """Called every minute by the in-process loop (REMINDER_MODE=internal)."""
    global _last_reminder_date
    now = datetime.now()
    today = now.date()
    if now.hour != settings.reminder_hour or _last_reminder_date == today:
        return
    _last_reminder_date = today

    db = SessionLocal()
    try:
        send_reminder_if_needed(db)
    finally:
        db.close()
