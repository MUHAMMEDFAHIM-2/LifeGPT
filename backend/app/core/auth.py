"""Single-user shared-passphrase auth.

If APP_PASSWORD is unset, auth is a no-op — every request passes. This
keeps local/LAN dev exactly as before; setting APP_PASSWORD (in cloud
deployment) turns the lock on everywhere at once.

Session tokens are signed with the password itself as the secret, so
changing the password invalidates every previously-issued token for free.
"""

import hmac

from fastapi import Header, HTTPException
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings

TOKEN_MAX_AGE = 90 * 24 * 60 * 60  # 90 days


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.app_password, salt="lifegpt-session")


def auth_enabled() -> bool:
    return bool(settings.app_password)


def check_password(password: str) -> bool:
    return hmac.compare_digest(password, settings.app_password)


def create_token() -> str:
    return _serializer().dumps({"ok": True})


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not auth_enabled():
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        _serializer().loads(token, max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        raise HTTPException(status_code=401, detail="Session expired")


def require_cron_secret(x_cron_secret: str | None = Header(default=None)) -> None:
    if not settings.cron_secret:
        return  # unset — endpoint is open (fine for local-only use)
    if not x_cron_secret or not hmac.compare_digest(x_cron_secret, settings.cron_secret):
        raise HTTPException(status_code=401, detail="Invalid cron secret")
