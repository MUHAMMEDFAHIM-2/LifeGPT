from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./lifegpt.db"

    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"

    # Web push
    vapid_public_key: str = ""
    vapid_private_key_file: str = "vapid_private.pem"
    vapid_private_key: str = ""  # raw base64url key — takes priority when set
    vapid_claim_email: str = ""
    reminder_hour: int = 21
    # "internal": per-minute in-process loop (local/laptop dev).
    # "external": loop disabled — an external scheduler (e.g. GitHub Actions)
    # calls POST /api/push/send-reminder instead. Use this in the cloud,
    # where the server sleeps between requests and its clock may not be
    # in your timezone.
    reminder_mode: str = "internal"
    cron_secret: str = ""  # required header for /api/push/send-reminder

    # Auth — empty app_password disables login entirely (local/LAN dev).
    app_password: str = ""

    # Comma-separated extra origins allowed by CORS (e.g. your Vercel URL).
    extra_cors_origins: str = ""


settings = Settings()
