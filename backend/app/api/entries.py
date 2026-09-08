from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_auth
from app.database.db import get_db
from app.ml.evaluation import evaluate_for_date
from app.models.daily_entry import DailyEntry
from app.schemas.daily_entry import (
    DailyEntryCreate,
    DailyEntryRead,
    DailyEntryUpdate,
)

router = APIRouter(
    prefix="/api/entries", tags=["entries"], dependencies=[Depends(require_auth)]
)


def get_entry_or_404(db: Session, entry_date: date_type) -> DailyEntry:
    entry = db.scalar(select(DailyEntry).where(DailyEntry.date == entry_date))
    if entry is None:
        raise HTTPException(status_code=404, detail=f"No entry for {entry_date}")
    return entry


@router.get("", response_model=list[DailyEntryRead])
def list_entries(
    limit: int = Query(default=30, ge=1, le=365),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(DailyEntry).order_by(DailyEntry.date.desc()).limit(limit).offset(offset)
    ).all()


@router.get("/{entry_date}", response_model=DailyEntryRead)
def get_entry(entry_date: date_type, db: Session = Depends(get_db)):
    return get_entry_or_404(db, entry_date)


@router.post("", response_model=DailyEntryRead, status_code=201)
def create_entry(payload: DailyEntryCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(DailyEntry).where(DailyEntry.date == payload.date))
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Entry for {payload.date} already exists. Use PUT to update it.",
        )
    entry = DailyEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    evaluate_for_date(db, entry.date)  # score any predictions made for this day
    return entry


@router.put("/{entry_date}", response_model=DailyEntryRead)
def update_entry(
    entry_date: date_type, payload: DailyEntryUpdate, db: Session = Depends(get_db)
):
    entry = get_entry_or_404(db, entry_date)
    for field, value in payload.model_dump().items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    evaluate_for_date(db, entry.date)  # re-score: actuals follow reality
    return entry


@router.delete("/{entry_date}", status_code=204)
def delete_entry(entry_date: date_type, db: Session = Depends(get_db)):
    entry = get_entry_or_404(db, entry_date)
    db.delete(entry)
    db.commit()
