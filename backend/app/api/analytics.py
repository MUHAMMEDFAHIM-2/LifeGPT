from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.service import get_summary, get_trends
from app.database.db import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    return get_summary(db)


@router.get("/trends")
def trends(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    return get_trends(db, days=days)
