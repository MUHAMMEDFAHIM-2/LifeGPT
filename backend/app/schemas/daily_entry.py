from datetime import date as date_type
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class DailyEntryBase(BaseModel):
    sleep_duration: float | None = Field(default=None, ge=0, le=24)
    bedtime: time | None = None
    wake_time: time | None = None

    work_hours: float | None = Field(default=None, ge=0, le=24)
    study_hours: float | None = Field(default=None, ge=0, le=24)

    gym_attended: bool = False
    exercise_minutes: int | None = Field(default=None, ge=0, le=1440)
    steps: int | None = Field(default=None, ge=0, le=200000)

    mood: int | None = Field(default=None, ge=1, le=10)
    energy: int | None = Field(default=None, ge=1, le=10)
    productivity: int | None = Field(default=None, ge=1, le=10)

    coffee_cups: int | None = Field(default=None, ge=0, le=30)
    screen_time_hours: float | None = Field(default=None, ge=0, le=24)
    social_media_hours: float | None = Field(default=None, ge=0, le=24)

    notes: str | None = Field(default=None, max_length=2000)


class DailyEntryCreate(DailyEntryBase):
    date: date_type


class DailyEntryUpdate(DailyEntryBase):
    pass


class DailyEntryRead(DailyEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    created_at: datetime
    updated_at: datetime
