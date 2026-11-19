"""Cross-implementation test: the Python port must give exactly the same result as the
website's TypeScript scoring.ts on thousands of random cases (including missing days,
ties, dry-season zeros, leap days and every outcome).

Run:  python3 tests/test_equivalence.py     (needs Node.js; compiles scoring.ts with esbuild via npx)
"""
import datetime as dt
import json
import os
import random
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from sns_score import score_sign_v1, ScoreError, V1_OUTCOMES  # noqa: E402

TS = os.path.join(HERE, "ts")


def make_series(rng, start_year, end_year, style):
    days = []
    d = dt.date(start_year, 1, 1)
    while d <= dt.date(end_year, 12, 31):
        if style == "dry":
            mm = 0.0 if rng.random() < 0.9 else round(rng.random() * 3, 1)
        elif style == "ties":
            mm = rng.choice([0.0, 0.0, 1.0, 5.0, 20.0])
        else:
            mm = 0.0 if rng.random() < 0.5 else round(rng.expovariate(1 / 8), rng.choice([0, 1, 2, 3]))
        if rng.random() < 0.002:
            mm = None
        days.append({"date": d.isoformat(), "mm": mm})
        d += dt.timedelta(days=1)
    return days


def build_cases(n=3000, seed=7):
    rng = random.Random(seed)
    cases = []
    series = {}
    for i in range(n):
        style = rng.choice(["wet", "dry", "ties"])
        key = f"{style}-{i % 5}"
        if key not in series:
            series[key] = make_series(rng, 1990, 2025, style)
        y = rng.randint(2000, 2025)
        obs = dt.date(y, 1, 1) + dt.timedelta(days=rng.randint(0, 364))
        if rng.random() < 0.03:
            obs = dt.date(2024, 2, 28)  # leap-year handling
        cases.append({
            "series": key,
            "observationDate": obs.isoformat(),
            "windowDays": rng.choice([1, 3, 7, 14, 21, 30, 60, 90, 120]),
            "predicted": rng.choice(V1_OUTCOMES),
            "referenceYears": rng.choice([3, 5, 10, 30]),
        })
    return series, cases


def py_run(c, series):
    try:
        r = score_sign_v1(series[c["series"]], c["observationDate"], c["windowDays"], c["predicted"], c["referenceYears"])
        d = r.to_dict()
        return {"ok": True, "r": d}
    except ScoreError as e:
        return {"ok": False, "err": str(e)}


def main():
    subprocess.run(["npx", "-y", "esbuild@0.24.0", "scoring.ts", "--format=esm", "--outfile=scoring.mjs",
                    "--log-level=warning"], cwd=TS, check=True)
    series, cases = build_cases()
    with tempfile.TemporaryDirectory() as tmp:
        cp, op = os.path.join(tmp, "cases.json"), os.path.join(tmp, "ts_out.json")
        json.dump({"series": series, "cases": cases}, open(cp, "w"))
        subprocess.run(["node", os.path.join(TS, "run.mjs"), cp, op], check=True)
        ts = json.load(open(op))
    mismatches = 0
    scored = 0
    for c, t in zip(cases, ts):
        p = py_run(c, series)
        if p["ok"] != t["ok"]:
            mismatches += 1
        elif p["ok"]:
            scored += 1
            a, b = p["r"], t["r"]
            for k in b:
                if a[k] != b[k]:
                    mismatches += 1
                    if mismatches <= 5:
                        print("MISMATCH", k, a[k] if k != "reference" else "...", "|", b[k] if k != "reference" else "...")
                    break
        elif p["err"] != t["err"]:
            mismatches += 1
            print("ERR MISMATCH", p["err"], "|", t["err"])
    print(f"{len(cases)} cases, {scored} scored, {len(cases) - scored} rejected by both, {mismatches} mismatches")
    assert mismatches == 0
    print("PASS: Python port is identical to scoring.ts")


if __name__ == "__main__":
    main()
