"""Sign & Sky verification score in Python.

`score_sign_v1` is a line-for-line port of website/src/lib/scoring.ts (METHOD_VERSION "sns-score-v1").
tests/test_equivalence.py runs both implementations on thousands of random cases and requires identical output.

`score_window` is the v1.1 generalisation used by the paper. It keeps the v1 formula unchanged
    score = 10 x (0.5*H + 0.5*P)
and adds only two things, both written down in PREREGISTRATION.md before any data were seen:
  1. a target window given by calendar dates (for season-scale predictions, e.g. "next Belg season"),
     instead of always D+1 .. D+W;
  2. three tercile outcomes used in operational seasonal forecasting (WMO; GHACOF):
       below_normal      H = p <= 1/3,  P = 1 - p
       above_normal      H = p >= 2/3,  P = p
       not_below_normal  H = p >  1/3,  P = p
With a D+1 .. D+W window and a v1 outcome, score_window returns exactly what score_sign_v1 returns.
"""
from __future__ import annotations

import datetime as _dt
import math
from dataclasses import dataclass, asdict, field
from typing import Iterable, Mapping, Optional

METHOD_VERSION = "sns-score-v1"
METHOD_VERSION_EXT = "sns-score-v1.1"

V1_OUTCOMES = ["rain", "heavy_rain", "normal_rain", "rain_onset", "dry", "drought"]
TERCILE_OUTCOMES = ["below_normal", "above_normal", "not_below_normal"]
ALL_OUTCOMES = V1_OUTCOMES + TERCILE_OUTCOMES

THRESHOLDS = dict(
    wetDayMm=1,
    heavyDayMm=20,
    rainTotalMm=10,
    onset3DayMm=20,
    dryTotalMm=5,
    droughtPct=0.2,
    normalBand=(0.25, 0.75),
    minReferenceYears=5,
    tercileLow=1 / 3,
    tercileHigh=2 / 3,
)

DEFAULT_WINDOW = dict(rain=7, heavy_rain=7, rain_onset=21, normal_rain=30, dry=30, drought=30)


# ---------- rounding identical to JavaScript Math.round (half up, toward +inf) ----------
def js_round(x: float) -> float:
    """JavaScript Math.round: nearest integer, exact halves go up."""
    f = math.floor(x)
    return float(f + 1) if x - f >= 0.5 else float(f)


def r1(x: float) -> float:
    """Math.round(x * 10) / 10"""
    return js_round(x * 10) / 10


# ---------- dates ----------
def add_days(iso: str, n: int) -> str:
    return (_dt.date.fromisoformat(iso) + _dt.timedelta(days=n)).isoformat()


def shift_years(iso: str, years: int) -> str:
    y, m, d = map(int, iso.split("-"))
    ny = y + years
    nm_first = _dt.date(ny + (m // 12), (m % 12) + 1, 1)
    last = (nm_first - _dt.timedelta(days=1)).day
    return f"{ny:04d}-{m:02d}-{min(d, last):02d}"


def window_for(observation_date: str, window_days: int):
    return add_days(observation_date, 1), add_days(observation_date, window_days)


def trust_v1(score: float) -> str:
    """Trust levels as coded in scoring.ts trustLevel() (owner decision, 5 Nov 2026)."""
    return "very_strong" if score >= 9 else "strong" if score >= 8 else "fair" if score >= 7 else "weak"


def trust_4band(score: float) -> str:
    """Trust levels as written in the website README / paper plan."""
    return "very strong" if score >= 9 else "strong" if score >= 8 else "fair" if score >= 7 else "weak"


@dataclass
class WindowStats:
    year: int
    start: str
    end: str
    totalMm: float
    maxDayMm: float
    wetDays: int
    max3DayMm: float
    complete: bool


def stats_for(days: Mapping[str, Optional[float]], start: str, end: str, year: int) -> WindowStats:
    total = 0.0
    mx = 0.0
    wet = 0
    complete = True
    vals = []
    d = start
    while d <= end:
        v = days.get(d)
        if v is None or (isinstance(v, float) and math.isnan(v)):
            complete = False
            vals.append(0.0)
        else:
            total += v
            mx = max(mx, v)
            if v >= THRESHOLDS["wetDayMm"]:
                wet += 1
            vals.append(v)
        d = add_days(d, 1)
    max3 = 0.0
    for i in range(len(vals) - 2):
        s = vals[i] + vals[i + 1] + vals[i + 2]
        wet3 = sum(1 for v in vals[i : i + 3] if v >= THRESHOLDS["wetDayMm"])
        if wet3 >= 2:
            max3 = max(max3, s)
    return WindowStats(year, start, end, r1(total), r1(mx), wet, r1(max3), complete)


def percentile_of(x: float, ref: list) -> float:
    if not ref:
        return 0.5
    below = sum(1 for v in ref if v < x)
    equal = sum(1 for v in ref if v == x)
    return (below + 0.5 * equal) / len(ref)


def _median(xs):
    s = sorted(xs)
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def classify_actual(s: WindowStats) -> str:
    if s.maxDayMm >= THRESHOLDS["heavyDayMm"]:
        return "heavy_rain"
    if s.totalMm >= THRESHOLDS["rainTotalMm"]:
        return "rain"
    if s.totalMm >= THRESHOLDS["wetDayMm"]:
        return "light_rain"
    return "dry"


@dataclass
class ScoreResult:
    version: str
    predicted: str
    windowDays: int
    target: WindowStats
    reference: list
    referenceUsed: int
    happened: bool
    percentile: float
    oriented: float
    score: float
    trust: str
    actualOutcome: str
    explanation: str

    def to_dict(self):
        d = asdict(self)
        return d


class ScoreError(ValueError):
    pass


def _evaluate(predicted, target: WindowStats, used: list):
    """The outcome switch of scoring.ts, plus the three tercile outcomes."""
    T = THRESHOLDS
    totals = [r.totalMm for r in used]
    maxes = [r.maxDayMm for r in used]
    onsets = [r.max3DayMm for r in used]
    p_total = percentile_of(target.totalMm, totals)
    happened, percentile, oriented, why = False, p_total, p_total, ""
    if predicted == "rain":
        happened = target.totalMm >= T["rainTotalMm"]
        why = f"rain counts as happened when the window total reaches {T['rainTotalMm']} mm"
    elif predicted == "heavy_rain":
        happened = target.maxDayMm >= T["heavyDayMm"]
        percentile = oriented = percentile_of(target.maxDayMm, maxes)
        why = f"heavy rain counts as happened when one day reaches {T['heavyDayMm']} mm; the comparison uses the wettest day"
    elif predicted == "rain_onset":
        happened = target.max3DayMm >= T["onset3DayMm"]
        percentile = oriented = percentile_of(target.max3DayMm, onsets)
        why = f"onset counts as happened when 3 days bring {T['onset3DayMm']} mm with at least 2 wet days"
    elif predicted == "normal_rain":
        happened = T["normalBand"][0] <= p_total <= T["normalBand"][1]
        oriented = 1 - 2 * abs(p_total - 0.5)
        why = "normal rain counts as happened when the total falls between the 25th and 75th percentile of the reference years"
    elif predicted == "dry":
        happened = target.totalMm < max(T["dryTotalMm"], 0.5 * _median(totals))
        oriented = 1 - p_total
        why = f"dry counts as happened when the total is under {T['dryTotalMm']} mm or under half the reference median"
    elif predicted == "drought":
        happened = p_total <= T["droughtPct"] or target.totalMm < T["dryTotalMm"]
        oriented = 1 - p_total
        why = "drought counts as happened when the total is at or below the 20th percentile of the reference years"
    elif predicted == "below_normal":
        happened = p_total <= T["tercileLow"]
        oriented = 1 - p_total
        why = "below normal counts as happened when the total is in the lowest third of the reference years"
    elif predicted == "above_normal":
        happened = p_total >= T["tercileHigh"]
        oriented = p_total
        why = "above normal counts as happened when the total is in the highest third of the reference years"
    elif predicted == "not_below_normal":
        happened = p_total > T["tercileLow"]
        oriented = p_total
        why = "not below normal counts as happened when the total is above the lowest third of the reference years"
    else:
        raise ScoreError(f'"{predicted}" cannot be tested automatically.')
    return happened, percentile, oriented, why


def _score(happened, oriented):
    return js_round(10 * (0.5 * (1 if happened else 0) + 0.5 * oriented) * 10) / 10


def _fmt_oriented(x: float) -> str:
    # JavaScript Number.prototype.toFixed(2): exact binary value, ties go to the larger number
    from decimal import Decimal, ROUND_HALF_UP
    return str(Decimal(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def score_window(days: Mapping[str, Optional[float]], start: str, end: str, predicted: str,
                 reference_years: int, *, require_complete_target=True, version=None) -> ScoreResult:
    """Score a prediction for the target window [start, end] against the same calendar
    window in each of the `reference_years` previous years."""
    if predicted not in ALL_OUTCOMES:
        raise ScoreError(f'"{predicted}" cannot be tested automatically.')
    window_days = (_dt.date.fromisoformat(end) - _dt.date.fromisoformat(start)).days + 1
    if not (1 <= window_days <= 366):
        raise ScoreError("The window must be between 1 and 366 days.")
    target_year = int(start[:4])
    target = stats_for(days, start, end, target_year)
    if require_complete_target and not target.complete:
        raise ScoreError("The weather data for the prediction window is incomplete, so the sign cannot be scored yet.")
    reference = [stats_for(days, shift_years(start, -y), shift_years(end, -y), target_year - y)
                 for y in range(1, reference_years + 1)]
    used = [r for r in reference if r.complete]
    if len(used) < THRESHOLDS["minReferenceYears"]:
        raise ScoreError(f"Only {len(used)} complete reference years were found; at least {THRESHOLDS['minReferenceYears']} are needed.")
    happened, percentile, oriented, why = _evaluate(predicted, target, used)
    score = _score(happened, oriented)
    lower = predicted in ("dry", "drought", "below_normal")
    explanation = (
        f"{'The predicted outcome happened' if happened else 'The predicted outcome did not happen'} in {start} to {end} "
        f"({_num(target.totalMm)} mm total, wettest day {_num(target.maxDayMm)} mm; {why}). "
        f"Compared with the same window in {len(used)} earlier years, the result ranks at {int(js_round(percentile * 100))}%"
        f"{' (lower is drier)' if lower else ''}. Score = 10 × (0.5 × {1 if happened else 0} + 0.5 × {_fmt_oriented(oriented)}) = {_num(score)}."
    )
    if version is None:
        version = METHOD_VERSION if predicted in V1_OUTCOMES else METHOD_VERSION_EXT
    return ScoreResult(version, predicted, window_days, target, reference, len(used), happened,
                       percentile, oriented, score, trust_v1(score), classify_actual(target), explanation)


def _num(x: float) -> str:
    """Format a number the way JavaScript template literals do (12.0 -> '12')."""
    if float(x).is_integer():
        return str(int(x))
    return repr(float(x))


def score_sign_v1(days: Iterable[Mapping], observation_date: str, window_days: int, predicted: str,
                  reference_years: int) -> ScoreResult:
    """Exact port of scoreSign() in scoring.ts. `days` is a list of {"date": iso, "mm": float|None}."""
    if predicted not in V1_OUTCOMES:
        raise ScoreError(f'"{predicted}" cannot be tested automatically.')
    if not (1 <= window_days <= 120):
        raise ScoreError("The window must be between 1 and 120 days.")
    m = {d["date"]: d["mm"] for d in days}
    start, end = window_for(observation_date, window_days)
    return score_window(m, start, end, predicted, reference_years, version=METHOD_VERSION)
