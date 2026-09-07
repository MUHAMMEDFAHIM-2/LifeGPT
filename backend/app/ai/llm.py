"""Provider-abstracted LLM client.

The rest of the app only sees `get_llm().generate(...)`. Swapping providers
means adding a client class here and changing LLM_PROVIDER in .env.
"""

from typing import Protocol

import httpx

from app.core.config import settings


class LLMError(Exception):
    pass


class LLMClient(Protocol):
    def generate(self, system: str, prompt: str) -> str: ...


class GeminiClient:
    BASE = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str, model: str):
        if not api_key:
            raise LLMError(
                "GEMINI_API_KEY is not set. Add it to backend/.env."
            )
        self.api_key = api_key
        self.model = model

    def generate(self, system: str, prompt: str) -> str:
        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.9, "maxOutputTokens": 2048},
        }
        try:
            response = httpx.post(
                f"{self.BASE}/models/{self.model}:generateContent",
                params={"key": self.api_key},
                json=payload,
                timeout=60,
            )
        except httpx.HTTPError as exc:
            raise LLMError(f"Could not reach Gemini: {exc}") from exc
        if response.status_code != 200:
            raise LLMError(
                f"Gemini returned {response.status_code}: {response.text[:200]}"
            )
        data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError) as exc:
            raise LLMError(f"Unexpected Gemini response shape: {data}") from exc


def get_llm() -> LLMClient:
    if settings.llm_provider == "gemini":
        return GeminiClient(settings.gemini_api_key, settings.gemini_model)
    raise LLMError(f"Unknown LLM provider: {settings.llm_provider}")
