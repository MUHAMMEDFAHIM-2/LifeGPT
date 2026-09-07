"""Statistical prediction engine.

No-leakage rule: predictions for target_date may only use entries dated
STRICTLY BEFORE target_date.

Strategy tiers by history size (per the data-availability plan):
  < 5 days   -> overall base rates / means, low confidence
  5-29 days  -> blend of recent (last 7 logged days), same-weekday, and
                overall statistics, weighted by how much data each has
  30+ days   -> ML models may join later, but only once they beat this
                baseline in evaluation — never before
"""

from dataclasses import dataclass
from datetime import date
from math import sqrt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.daily_entry import DailyEntry

# "studied" retired 2026-09-07 (user doesn't study currently); actual_for
# still understands it so historical prediction rows keep scoring.
BINARY_TARGETS = ["gym_attended"]
REGRESSION_TARGETS = ["sleep_duration", "mood", "productivity"]


@dataclass
class PredictionResult:
    target: str
    kind: str  # "binary" | "regression"
    predicted_value: float  # probability for binary, value for regression
    confidence: float
    method: str
    days_of_data: int


def _binary_actual(entry: DailyEntry, target: str) -> float | None:
    if target == "gym_attended":
        return 1.0 if entry.gym_attended else 0.0
    if target == "studied":
        if entry.study_hours is None:
            return None
        return 1.0 if entry.study_hours > 0 else 0.0
    return None


def _regression_actual(entry: DailyEntry, target: str) -> float | None:
    value = getattr(entry, target)
    return float(value) if value is not None else None


def actual_for(entry: DailyEntry, target: str, kind: str) -> float | None:
    if kind == "binary":
        return _binary_actual(entry, target)
    return _regression_actual(entry, target)


def _mean(vals: list[float]) -> float | None:
    return sum(vals) / len(vals) if vals else None


def _std(vals: list[float]) -> float:
    if len(vals) < 2:
        return 0.0
    m = sum(vals) / len(vals)
    return sqrt(sum((v - m) ** 2 for v in vals) / (len(vals) - 1))


def _blend(parts: list[tuple[float | None, float]]) -> float | None:
    """Weighted mean over (value, weight) pairs, skipping missing values."""
    present = [(v, w) for v, w in parts if v is not None and w > 0]
    if not present:
        return None
    total = sum(w for _, w in present)
    return sum(v * w for v, w in present) / total


def _confidence(n: int, spread_penalty: float = 0.0) -> float:
    """More history -> more confidence; high variance -> less."""
    base = min(0.9, 0.25 + 0.03 * n)
    return round(max(0.1, base - spread_penalty), 2)


def _predict_binary(
    history: list[DailyEntry], target: str, target_date: date
) -> PredictionResult | None:
    values: list[tuple[date, float]] = []
    for e in history:
        v = _binary_actual(e, target)
        if v is not None:
            values.append((e.date, v))
    n = len(values)
    if n == 0:
        return None

    overall = _mean([v for _, v in values])
    recent = _mean([v for _, v in values[-7:]])
    weekday_vals = [v for d, v in values if d.weekday() == target_date.weekday()]
    weekday = _mean(weekday_vals)

    if n < 5:
        prob, method = overall, "base_rate"
    else:
        prob = _blend(
            [
                (recent, 0.45),
                (weekday, 0.35 if len(weekday_vals) >= 2 else 0.0),
                (overall, 0.2),
            ]
        )
        method = "blend(recent7+weekday+overall)"

    prob = min(0.95, max(0.05, prob))  # never claim certainty
    # confidence higher when probability is decisive and history is longer
    decisiveness = abs(prob - 0.5)
    conf = _confidence(n) * (0.7 + 0.6 * decisiveness)
    return PredictionResult(
        target=target,
        kind="binary",
        predicted_value=round(prob, 2),
        confidence=round(min(conf, 0.95), 2),
        method=method,
        days_of_data=n,
    )


def _predict_regression(
    history: list[DailyEntry], target: str, target_date: date
) -> PredictionResult | None:
    values: list[tuple[date, float]] = []
    for e in history:
        v = _regression_actual(e, target)
        if v is not None:
            values.append((e.date, v))
    n = len(values)
    if n == 0:
        return None

    all_vals = [v for _, v in values]
    overall = _mean(all_vals)
    recent = _mean(all_vals[-7:])
    weekday_vals = [v for d, v in values if d.weekday() == target_date.weekday()]
    weekday = _mean(weekday_vals)

    if n < 5:
        pred, method = overall, "overall_mean"
    else:
        pred = _blend(
            [
                (recent, 0.5),
                (weekday, 0.3 if len(weekday_vals) >= 2 else 0.0),
                (overall, 0.2),
            ]
        )
        method = "blend(recent7+weekday+overall)"

    spread = _std(all_vals)
    scale = max(abs(overall), 1.0)
    spread_penalty = min(0.3, 0.15 * (spread / scale) * 2)
    return PredictionResult(
        target=target,
        kind="regression",
        predicted_value=round(pred, 2),
        confidence=_confidence(n, spread_penalty),
        method=method,
        days_of_data=n,
    )


def generate_predictions(db: Session, target_date: date) -> list[PredictionResult]:
    history = db.scalars(
        select(DailyEntry)
        .where(DailyEntry.date < target_date)  # leakage guard
        .order_by(DailyEntry.date.asc())
    ).all()

    results: list[PredictionResult] = []
    for target in BINARY_TARGETS:
        r = _predict_binary(history, target, target_date)
        if r:
            results.append(r)
    for target in REGRESSION_TARGETS:
        r = _predict_regression(history, target, target_date)
        if r:
            results.append(r)
    return results
