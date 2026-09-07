from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AIReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    intensity: str | None
    content: str
    days_of_data: int
    created_at: datetime


class RoastRequest(BaseModel):
    intensity: Literal["light", "brutal", "nuclear"]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


class ChatResponse(BaseModel):
    reply: str


class CommentaryResponse(BaseModel):
    commentary: str
