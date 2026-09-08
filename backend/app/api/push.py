from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_auth, require_cron_secret
from app.core.config import settings
from app.database.db import get_db
from app.models.push_subscription import PushSubscription
from app.services.push import send_reminder_if_needed, send_to_all

router = APIRouter(prefix="/api/push", tags=["push"])


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionPayload(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


@router.get("/vapid-public-key")
def vapid_public_key():
    return {"key": settings.vapid_public_key}


@router.post("/subscribe", status_code=201, dependencies=[Depends(require_auth)])
def subscribe(payload: SubscriptionPayload, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(PushSubscription).where(
            PushSubscription.endpoint == payload.endpoint
        )
    )
    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        db.add(
            PushSubscription(
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
            )
        )
    db.commit()
    return {"status": "subscribed"}


@router.post("/test", dependencies=[Depends(require_auth)])
def test_push(db: Session = Depends(get_db)):
    """Send an immediate test notification to every subscription."""
    return send_to_all(db, "LifeGPT test 🔔", "Push notifications are working.")


@router.post("/send-reminder", dependencies=[Depends(require_cron_secret)])
def send_reminder(db: Session = Depends(get_db)):
    """For an external scheduler (GitHub Actions) — see REMINDER_MODE=external.
    Protected by X-Cron-Secret, not user login, since nothing signs in here."""
    return send_reminder_if_needed(db)
