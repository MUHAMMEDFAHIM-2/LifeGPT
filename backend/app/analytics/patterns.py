"""Rule-based pattern detection over daily entries.

Everything here is computed from recorded data — no ML, no LLM.
Insights are gated by data volume so LifeGPT never overclaims:
  < 5 paired days  -> no comparisons at all
  < 10 paired days -> comparisons shown as "early signal"
  >= 10            -> full insight
Correlation is reported as association, never causation.
"""

from datetime import date
from math import sqrt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.daily_entry import DailyEntry

MIN_PAIRS_EARLY = 5
MIN_PAIRS_FULL = 10
MIN_DAYS_WEEKDAY = 14
CORR_THRESHOLD = 0.35

WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    vx = sum((x - mx) ** 2 for x in xs)
    vy = sum((y - my) ** 2 for y in ys)
    if vx == 0 or vy == 0:
        return None
    return cov / sqrt(vx * vy)


def _avg(vals: list[float]) -> float | None:
    return round(sum(vals) / len(vals), 1) if vals else None


def _pairs(
    entries: list[DailyEntry], attr_x: str, attr_y: str
) -> tuple[list[float], list[float]]:
    xs, ys = [], []
    for e in entries:
        x, y = getattr(e, attr_x), getattr(e, attr_y)
        if x is not None and y is not None:
            xs.append(float(x))
            ys.append(float(y))
    return xs, ys


def _split_comparison(
    entries: list[DailyEntry],
    cond_attr: str,
    threshold: float,
    target_attr: str,
) -> dict | None:
    """Average of target on days where cond >= threshold vs below."""
    high, low = [], []
    for e in entries:
        c, t = getattr(e, cond_attr), getattr(e, target_attr)
        if c is None or t is None:
            continue
        (high if float(c) >= threshold else low).append(float(t))
    if len(high) < 2 or len(low) < 2:
        return None
    return {
        "high_avg": _avg(high),
        "low_avg": _avg(low),
        "high_n": len(high),
        "low_n": len(low),
    }


def _confidence(n_pairs: int) -> str:
    return "early signal" if n_pairs < MIN_PAIRS_FULL else "pattern"


def _correlation_insights(entries: list[DailyEntry]) -> list[dict]:
    checks = [
        # (x, y, category, positive_text, negative_text, x_label, y_label)
        (
            "sleep_duration", "productivity", "sleep",
            "More sleep tends to go with more productive days",
            "Longer sleep tends to go with less productive days",
            "sleep", "productivity",
        ),
        (
            "sleep_duration", "mood", "sleep",
            "You tend to report better mood after more sleep",
            "You tend to report worse mood after more sleep",
            "sleep", "mood",
        ),
        (
            "sleep_duration", "energy", "sleep",
            "More sleep tends to go with higher energy",
            "More sleep tends to go with lower energy",
            "sleep", "energy",
        ),
        (
            "screen_time_hours", "study_hours", "focus",
            "Higher screen time tends to go with more study hours",
            "Higher screen time tends to go with fewer study hours",
            "screen time", "study hours",
        ),
        (
            "screen_time_hours", "productivity", "focus",
            "Higher screen time tends to go with higher productivity",
            "Higher screen time tends to go with lower productivity",
            "screen time", "productivity",
        ),
        (
            "work_hours", "energy", "work",
            "Longer work days tend to go with higher energy",
            "Longer work days tend to drain your energy",
            "work hours", "energy",
        ),
        (
            "exercise_minutes", "mood", "exercise",
            "More exercise tends to go with better mood",
            "More exercise tends to go with worse mood",
            "exercise", "mood",
        ),
    ]
    insights = []
    for x_attr, y_attr, category, pos_text, neg_text, x_label, y_label in checks:
        xs, ys = _pairs(entries, x_attr, y_attr)
        n = len(xs)
        if n < MIN_PAIRS_EARLY:
            continue
        r = _pearson(xs, ys)
        if r is None or abs(r) < CORR_THRESHOLD:
            continue
        insights.append(
            {
                "id": f"corr_{x_attr}_{y_attr}",
                "category": category,
                "text": pos_text if r > 0 else neg_text,
                "confidence": _confidence(n),
                "evidence": {
                    "type": "correlation",
                    "r": round(r, 2),
                    "n": n,
                    "x": x_label,
                    "y": y_label,
                },
            }
        )
    return insights


def _threshold_insights(entries: list[DailyEntry]) -> list[dict]:
    results = []

    sleep_split = _split_comparison(entries, "sleep_duration", 7.0, "productivity")
    if sleep_split and sleep_split["high_avg"] is not None:
        diff = round(sleep_split["high_avg"] - sleep_split["low_avg"], 1)
        if abs(diff) >= 0.8:
            direction = "higher" if diff > 0 else "lower"
            results.append(
                {
                    "id": "split_sleep7_productivity",
                    "category": "sleep",
                    "text": (
                        f"On days after 7+ hours of sleep your productivity averages "
                        f"{sleep_split['high_avg']}/10, vs {sleep_split['low_avg']}/10 "
                        f"on shorter nights — {abs(diff)} points {direction}."
                    ),
                    "confidence": _confidence(
                        sleep_split["high_n"] + sleep_split["low_n"]
                    ),
                    "evidence": {"type": "threshold_split", **sleep_split},
                }
            )

    gym_days = [e for e in entries if e.gym_attended]
    rest_days = [e for e in entries if not e.gym_attended]
    gym_mood = _avg([float(e.mood) for e in gym_days if e.mood is not None])
    rest_mood = _avg([float(e.mood) for e in rest_days if e.mood is not None])
    if (
        gym_mood is not None
        and rest_mood is not None
        and len(gym_days) >= 3
        and len(rest_days) >= 3
        and abs(gym_mood - rest_mood) >= 0.8
    ):
        better = "better" if gym_mood > rest_mood else "worse"
        results.append(
            {
                "id": "gym_vs_mood",
                "category": "exercise",
                "text": (
                    f"Your mood averages {gym_mood}/10 on gym days vs "
                    f"{rest_mood}/10 on rest days — noticeably {better} when you train."
                ),
                "confidence": _confidence(len(gym_days) + len(rest_days)),
                "evidence": {
                    "type": "group_comparison",
                    "gym_avg": gym_mood,
                    "rest_avg": rest_mood,
                    "gym_n": len(gym_days),
                    "rest_n": len(rest_days),
                },
            }
        )

    return results


def _weekday_profile(entries: list[DailyEntry]) -> dict | None:
    if len(entries) < MIN_DAYS_WEEKDAY:
        return None
    by_day: dict[int, list[DailyEntry]] = {}
    for e in entries:
        by_day.setdefault(e.date.weekday(), []).append(e)

    profile = []
    for wd in range(7):
        day_entries = by_day.get(wd, [])
        gym_n = sum(1 for e in day_entries if e.gym_attended)
        profile.append(
            {
                "weekday": WEEKDAYS[wd],
                "n": len(day_entries),
                "avg_productivity": _avg(
                    [float(e.productivity) for e in day_entries if e.productivity is not None]
                ),
                "avg_mood": _avg(
                    [float(e.mood) for e in day_entries if e.mood is not None]
                ),
                "gym_rate": round(gym_n / len(day_entries), 2) if day_entries else None,
            }
        )

    rated = [p for p in profile if p["avg_productivity"] is not None and p["n"] >= 2]
    best = max(rated, key=lambda p: p["avg_productivity"], default=None)
    worst = min(rated, key=lambda p: p["avg_productivity"], default=None)
    insight = None
    if best and worst and best is not worst and (
        best["avg_productivity"] - worst["avg_productivity"] >= 1.0
    ):
        insight = {
            "id": "weekday_productivity",
            "category": "rhythm",
            "text": (
                f"You are historically most productive on {best['weekday']}s "
                f"({best['avg_productivity']}/10) and least on {worst['weekday']}s "
                f"({worst['avg_productivity']}/10)."
            ),
            "confidence": "pattern",
            "evidence": {"type": "weekday", "best": best, "worst": worst},
        }
    return {"profile": profile, "insight": insight}


def get_patterns(db: Session, today: date | None = None) -> dict:
    entries = db.scalars(select(DailyEntry).order_by(DailyEntry.date.asc())).all()
    n = len(entries)

    if n < 14:
        maturity = {
            "phase": "collecting",
            "label": "Data Collection Phase",
            "days_logged": n,
            "next_unlock": 14,
            "description": (
                "LifeGPT is still gathering data. Basic comparisons appear from "
                "5 days; weekly rhythms unlock at 14."
            ),
        }
    elif n < 30:
        maturity = {
            "phase": "learning",
            "label": "Learning Phase",
            "days_logged": n,
            "next_unlock": 30,
            "description": (
                "Enough data for real patterns. Prediction models unlock at 30 days."
            ),
        }
    else:
        maturity = {
            "phase": "modeling",
            "label": "Prediction Model Phase",
            "days_logged": n,
            "next_unlock": None,
            "description": "Full pattern analysis and prediction models are active.",
        }

    insights = _correlation_insights(entries) + _threshold_insights(entries)
    weekday = _weekday_profile(entries)
    if weekday and weekday["insight"]:
        insights.append(weekday["insight"])

    return {
        "maturity": maturity,
        "insights": insights,
        "weekday_profile": weekday["profile"] if weekday else None,
        "note": "All patterns are associations in your data, not proof of causation.",
    }
