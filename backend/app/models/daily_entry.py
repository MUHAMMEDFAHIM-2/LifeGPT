from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.db import Base


class DailyEntry(Base):
    __tablename__ = "daily_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)

    sleep_duration: Mapped[float | None] = mapped_column(Float)
    bedtime: Mapped[time | None] = mapped_column(Time)
    wake_time: Mapped[time | None] = mapped_column(Time)

    work_hours: Mapped[float | None] = mapped_column(Float)
    study_hours: Mapped[float | None] = mapped_column(Float)

    gym_attended: Mapped[bool] = mapped_column(Boolean, default=False)
    exercise_minutes: Mapped[int | None] = mapped_column(Integer)
    steps: Mapped[int | None] = mapped_column(Integer)

    mood: Mapped[int | None] = mapped_column(Integer)
    energy: Mapped[int | None] = mapped_column(Integer)
    productivity: Mapped[int | None] = mapped_column(Integer)

    coffee_cups: Mapped[int | None] = mapped_column(Integer)
    screen_time_hours: Mapped[float | None] = mapped_column(Float)
    social_media_hours: Mapped[float | None] = mapped_column(Float)

    notes: Mapped[str | None] = mapped_column(String(2000))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
