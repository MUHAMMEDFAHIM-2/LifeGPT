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
