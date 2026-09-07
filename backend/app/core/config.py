from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./lifegpt.db"

    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"

    vapid_public_key: str = ""
    vapid_private_key_file: str = "vapid_private.pem"
    vapid_claim_email: str = ""
    reminder_hour: int = 21


settings = Settings()
