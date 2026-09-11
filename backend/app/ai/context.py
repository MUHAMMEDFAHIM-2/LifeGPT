"""Builds the verified-facts context handed to the LLM.

Everything in the context is computed by existing analytics code from
recorded data. The LLM never sees raw guesses — and the prompt forbids it
from inventing anything beyond this block.
"""

import json
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.patterns import get_patterns
from app.analytics.service import get_summary
from app.ml.evaluation import get_accuracy
from app.models.daily_entry import DailyEntry
from app.models.prediction import Prediction


def _recent_entries(db: Session, limit: int = 14) -> list[dict]:
    entries = db.scalars(
        select(DailyEntry).order_by(DailyEntry.date.desc()).limit(limit)
    ).all()
    days = []
    for e in entries:
        days.append(
            {
                "date": e.date.isoformat(),
                "weekday": e.date.strftime("%A"),
                "sleep_hours": e.sleep_duration,
                "bedtime": e.bedtime.strftime("%H:%M") if e.bedtime else None,
                "wake_time": e.wake_time.strftime("%H:%M") if e.wake_time else None,
                "work_hours": e.work_hours,
                "gym": e.gym_attended,
                "exercise_minutes": e.exercise_minutes,
                "steps": e.steps,
                "mood": e.mood,
                "energy": e.energy,
                "productivity": e.productivity,
                "coffee_cups": e.coffee_cups,
                "screen_time_hours": e.screen_time_hours,
                "social_media_hours": e.social_media_hours,
                "notes": e.notes,
            }
        )
    return days


def _public_week_stats(stats: dict) -> dict:
    """Study tracking is retired (the user doesn't study currently) — the
    backend still computes total_study_hours for API back-compat, but it
    must never reach the LLM or it starts commenting on a feature that no
    longer exists."""
    return {k: v for k, v in stats.items() if k != "total_study_hours"}


def _tomorrows_predictions(db: Session) -> list[dict]:
    tomorrow = date.today() + timedelta(days=1)
    rows = db.scalars(
        select(Prediction).where(Prediction.target_date == tomorrow)
    ).all()
    return [
        {
            "target": p.target,
            "kind": p.kind,
            "predicted": p.predicted_value,
            "confidence": p.confidence,
            "based_on_days": p.days_of_data,
        }
        for p in rows
    ]


def build_life_context(db: Session) -> dict:
    summary = get_summary(db)
    patterns = get_patterns(db)
    accuracy = get_accuracy(db)
    return {
        "days_logged_total": summary["total_entries"],
        "data_maturity": patterns["maturity"],
        "this_week": _public_week_stats(summary["week"]),
        "previous_week": _public_week_stats(summary["prev_week"]),
        "week_over_week_deltas": summary["deltas"],
        "streaks": summary["streaks"],
        "detected_patterns": [
            {"text": i["text"], "confidence": i["confidence"]}
            for i in patterns["insights"]
        ],
        "prediction_performance": {
            "evaluated_predictions": accuracy["evaluated_predictions"],
            "overall_accuracy": accuracy["overall_accuracy"],
            "per_target": accuracy["per_target"],
        },
        "recent_days_newest_first": _recent_entries(db),
        "tomorrows_predictions": _tomorrows_predictions(db),
        "today_date": date.today().isoformat(),
    }


def context_as_json(db: Session) -> str:
    return json.dumps(build_life_context(db), indent=2)
