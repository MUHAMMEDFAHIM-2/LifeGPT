"""Scoring stored predictions against what actually happened.

A prediction is evaluated once the daily entry for its target_date exists.
If the user later edits that entry, the date is re-evaluated — actuals
follow reality, but the predicted values themselves are never touched.

Regression predictions also get a tolerance-based "hit": the prediction
counts as correct if it lands within the target's tolerance. This is what
lets a single honest headline accuracy number cover both kinds.
"""

from datetime import date as date_type
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.predictor import actual_for
from app.models.daily_entry import DailyEntry
from app.models.prediction import Prediction

REGRESSION_TOLERANCE = {
    "sleep_duration": 1.0,  # hours
    "mood": 1.5,  # points on /10
    "productivity": 1.5,
}

TARGET_LABELS = {
    "gym_attended": "Gym",
    "studied": "Study",
    "sleep_duration": "Sleep",
    "mood": "Mood",
    "productivity": "Productivity",
}


def evaluate_for_date(db: Session, target_date: date_type) -> int:
    """(Re)score all predictions for one date. Returns rows updated."""
    entry = db.scalar(select(DailyEntry).where(DailyEntry.date == target_date))
    if entry is None:
        return 0
    predictions = db.scalars(
        select(Prediction).where(Prediction.target_date == target_date)
    ).all()
    updated = 0
    for p in predictions:
        actual = actual_for(entry, p.target, p.kind)
        if actual is None:
            continue
        p.actual_value = actual
        if p.kind == "binary":
            predicted_label = 1.0 if p.predicted_value >= 0.5 else 0.0
            p.correct = 1.0 if predicted_label == actual else 0.0
            p.error = None
        else:
            p.error = round(abs(p.predicted_value - actual), 2)
            tolerance = REGRESSION_TOLERANCE.get(p.target, 1.0)
            p.correct = 1.0 if p.error <= tolerance else 0.0
        p.evaluated_at = datetime.now()
        updated += 1
    db.commit()
    return updated


def evaluate_pending(db: Session) -> int:
    """Score every unevaluated prediction whose day has been logged."""
    pending_dates = db.scalars(
        select(Prediction.target_date)
        .where(Prediction.evaluated_at.is_(None))
        .distinct()
    ).all()
    return sum(evaluate_for_date(db, d) for d in pending_dates)


def _rate(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 3) if values else None


def get_accuracy(db: Session) -> dict:
    evaluated = db.scalars(
        select(Prediction).where(Prediction.evaluated_at.is_not(None))
    ).all()

    n = len(evaluated)
    per_target = []
    for target, label in TARGET_LABELS.items():
        rows = [p for p in evaluated if p.target == target]
        if not rows:
            continue
        kind = rows[0].kind
        stats: dict = {
            "target": target,
            "label": label,
            "kind": kind,
            "n": len(rows),
            "hit_rate": _rate([p.correct for p in rows if p.correct is not None]),
        }
        if kind == "regression":
            errors = [p.error for p in rows if p.error is not None]
            stats["mae"] = round(sum(errors) / len(errors), 2) if errors else None
            stats["tolerance"] = REGRESSION_TOLERANCE.get(target)
        per_target.append(stats)

    hits = [p.correct for p in evaluated if p.correct is not None]
    overall = _rate(hits)

    if n < 5:
        verdict = "Too early to judge — LifeGPT needs more scored days."
    elif overall is None:
        verdict = "No scorable predictions yet."
    elif overall < 0.45:
        verdict = "LifeGPT barely knows you. You are chaos incarnate."
    elif overall < 0.6:
        verdict = "LifeGPT is starting to get you."
    elif overall < 0.75:
        verdict = "LifeGPT understands you moderately well."
    elif overall < 0.85:
        verdict = "LifeGPT knows you disturbingly well."
    else:
        verdict = "LifeGPT basically is you at this point."

    return {
        "evaluated_predictions": n,
        "days_scored": len({p.target_date for p in evaluated}),
        "overall_accuracy": overall,
        "verdict": verdict,
        "per_target": per_target,
        "note": (
            "Regression predictions count as correct within tolerance "
            "(sleep ±1h, mood/productivity ±1.5)."
        ),
    }
