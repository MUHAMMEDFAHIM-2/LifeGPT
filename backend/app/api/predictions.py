from datetime import date as date_type
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.ml.evaluation import evaluate_pending, get_accuracy
from app.ml.predictor import generate_predictions
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionRead

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.post("/generate", response_model=list[PredictionRead])
def generate(
    target_date: date_type | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Generate and store predictions for target_date (default: tomorrow).

    Predictions are only allowed for future dates — LifeGPT never
    "predicts" a day whose outcome could already be known.
    Existing unevaluated predictions for the date are replaced.
    """
    target = target_date or (date.today() + timedelta(days=1))
    if target <= date.today():
        raise HTTPException(
            status_code=422,
            detail="Predictions can only be generated for future dates.",
        )

    existing = db.scalars(
        select(Prediction).where(Prediction.target_date == target)
    ).all()
    if any(p.evaluated_at is not None for p in existing):
        raise HTTPException(
            status_code=409,
            detail=f"Predictions for {target} are already evaluated and locked.",
        )
    for p in existing:
        db.delete(p)
    db.flush()  # deletes must hit the DB before the replacement inserts

    results = generate_predictions(db, target)
    rows = [
        Prediction(
            target_date=target,
            target=r.target,
            kind=r.kind,
            predicted_value=r.predicted_value,
            confidence=r.confidence,
            method=r.method,
            days_of_data=r.days_of_data,
        )
        for r in results
    ]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


@router.get("", response_model=list[PredictionRead])
def list_predictions(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Prediction)
        .order_by(Prediction.target_date.desc(), Prediction.target)
        .limit(limit)
    ).all()


@router.get("/accuracy")
def accuracy(db: Session = Depends(get_db)):
    """The AI performance report. Scores anything pending first."""
    evaluate_pending(db)
    return get_accuracy(db)


@router.get("/compare", response_model=list[PredictionRead])
def compare(
    limit: int = Query(default=60, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Evaluated predictions, newest first — the AI vs Reality feed."""
    evaluate_pending(db)
    return db.scalars(
        select(Prediction)
        .where(Prediction.evaluated_at.is_not(None))
        .order_by(Prediction.target_date.desc(), Prediction.target)
        .limit(limit)
    ).all()


@router.get("/{target_date}", response_model=list[PredictionRead])
def get_for_date(target_date: date_type, db: Session = Depends(get_db)):
    return db.scalars(
        select(Prediction)
        .where(Prediction.target_date == target_date)
        .order_by(Prediction.target)
    ).all()
