from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.db import Base


class Prediction(Base):
    """One stored prediction for one target on one future date.

    Rows are written BEFORE the outcome is known; actual_value / error /
    correct are filled in later when the day's entry exists (AI vs Reality).
    """

    __tablename__ = "predictions"
    __table_args__ = (UniqueConstraint("target_date", "target"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    target_date: Mapped[date] = mapped_column(Date, index=True)
    target: Mapped[str] = mapped_column(String(50))  # e.g. "gym_attended"
    kind: Mapped[str] = mapped_column(String(20))  # "binary" | "regression"

    predicted_value: Mapped[float] = mapped_column(Float)  # probability or value
    confidence: Mapped[float] = mapped_column(Float)  # 0..1
    method: Mapped[str] = mapped_column(String(100))
    days_of_data: Mapped[int] = mapped_column()

    actual_value: Mapped[float | None] = mapped_column(Float)
    error: Mapped[float | None] = mapped_column(Float)  # regression: |pred-actual|
    correct: Mapped[float | None] = mapped_column(Float)  # binary: 1.0/0.0
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
