from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.daily_entry import DailyEntry


def _avg(values: list[float | int | None]) -> float | None:
    present = [v for v in values if v is not None]
    if not present:
        return None
    return round(sum(present) / len(present), 2)


def _window_stats(entries: list[DailyEntry]) -> dict:
    gym_days = sum(1 for e in entries if e.gym_attended)
    days_logged = len(entries)
    return {
        "days_logged": days_logged,
        "avg_sleep": _avg([e.sleep_duration for e in entries]),
        "avg_mood": _avg([e.mood for e in entries]),
        "avg_energy": _avg([e.energy for e in entries]),
        "avg_productivity": _avg([e.productivity for e in entries]),
        "gym_days": gym_days,
        "gym_rate": round(gym_days / days_logged, 2) if days_logged else None,
        "total_study_hours": round(
            sum(e.study_hours for e in entries if e.study_hours is not None), 1
        ),
        "avg_screen_time": _avg([e.screen_time_hours for e in entries]),
    }


def _delta(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None:
        return None
    return round(current - previous, 2)


def _streaks(entries_desc: list[DailyEntry], today: date) -> dict:
    by_date = {e.date: e for e in entries_desc}
    logging_streak = 0
    d = today
    if d not in by_date:
        d = d - timedelta(days=1)  # today not logged yet doesn't break the streak
    while d in by_date:
        logging_streak += 1
        d -= timedelta(days=1)

    gym_streak = 0
    d = today
    if d not in by_date or not by_date[d].gym_attended:
        d = d - timedelta(days=1)
    while d in by_date and by_date[d].gym_attended:
        gym_streak += 1
        d -= timedelta(days=1)

    return {"logging": logging_streak, "gym": gym_streak}


def get_summary(db: Session, today: date | None = None) -> dict:
    today = today or date.today()
    since = today - timedelta(days=13)
    entries = (
        db.scalars(
            select(DailyEntry)
            .where(DailyEntry.date >= since, DailyEntry.date <= today)
            .order_by(DailyEntry.date.desc())
        ).all()
    )
    week_start = today - timedelta(days=6)
    this_week = [e for e in entries if e.date >= week_start]
    prev_week = [e for e in entries if e.date < week_start]

    week = _window_stats(this_week)
    prev = _window_stats(prev_week)

    today_entry = next((e for e in entries if e.date == today), None)

    total_entries = db.scalar(select(func.count(DailyEntry.id)))

    return {
        "today": {
            "date": today.isoformat(),
            "logged": today_entry is not None,
            "mood": today_entry.mood if today_entry else None,
            "energy": today_entry.energy if today_entry else None,
            "productivity": today_entry.productivity if today_entry else None,
            "sleep_duration": today_entry.sleep_duration if today_entry else None,
            "gym_attended": today_entry.gym_attended if today_entry else None,
        },
        "week": week,
        "prev_week": prev,
        "deltas": {
            "sleep": _delta(week["avg_sleep"], prev["avg_sleep"]),
            "mood": _delta(week["avg_mood"], prev["avg_mood"]),
            "productivity": _delta(week["avg_productivity"], prev["avg_productivity"]),
            "gym_rate": _delta(week["gym_rate"], prev["gym_rate"]),
        },
        "streaks": _streaks(entries, today),
        "total_entries": total_entries or 0,
    }


def get_trends(db: Session, days: int = 30, today: date | None = None) -> list[dict]:
    today = today or date.today()
    since = today - timedelta(days=days - 1)
    entries = db.scalars(
        select(DailyEntry)
        .where(DailyEntry.date >= since, DailyEntry.date <= today)
        .order_by(DailyEntry.date.asc())
    ).all()
    return [
        {
            "date": e.date.isoformat(),
            "sleep_duration": e.sleep_duration,
            "mood": e.mood,
            "energy": e.energy,
            "productivity": e.productivity,
            "study_hours": e.study_hours,
            "work_hours": e.work_hours,
            "screen_time_hours": e.screen_time_hours,
            "gym_attended": e.gym_attended,
        }
        for e in entries
    ]
