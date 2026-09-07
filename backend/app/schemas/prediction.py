from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_date: date_type
    target: str
    kind: str
    predicted_value: float
    confidence: float
    method: str
    days_of_data: int
    actual_value: float | None
    error: float | None
    correct: float | None
    evaluated_at: datetime | None
    created_at: datetime
