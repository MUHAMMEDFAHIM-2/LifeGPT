"""Web Push sending + the daily 9 PM check-in reminder."""

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
                vapid_private_key=settings.vapid_private_key_file,
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


def reminder_tick() -> None:
    """Called every minute. Sends the 9 PM reminder once per day,
    and only if today's entry hasn't been logged yet."""
    global _last_reminder_date
    now = datetime.now()
    today = now.date()
    if now.hour != settings.reminder_hour or _last_reminder_date == today:
        return
    _last_reminder_date = today

    db = SessionLocal()
    try:
        already_logged = (
            db.scalar(select(DailyEntry.id).where(DailyEntry.date == today))
            is not None
        )
        if already_logged:
            log.info("reminder skipped — today already logged")
            return
        result = send_to_all(
            db,
            "LifeGPT is waiting 👀",
            "You haven't logged today. 60 seconds, that's all it takes.",
        )
        log.info("reminder sent: %s", result)
    finally:
        db.close()
