"""Re-score the 17 Wolaita indicators exactly as pre-registered in specs.yaml.

Reads data/<dataset>__<location>.csv (made by fetch_data.py) and writes results/:
  primary.csv        one row per pre-registered test (primary dataset, location, reference years)
  signs.csv          one row per sign: field score, re-scored score, zero-skill baseline, p-value
  branches.csv       every branch of the 'direction needed' signs (NOT part of the primary analysis)
  sensitivity.csv    every test under every dataset x location x reference-years combination,
                     plus the per-sign alternative windows / outcomes
  null.csv           the zero-skill (climatology) score for every test and hindcast year
  trail/*.json       full data trail per test: daily values of the target and reference windows,
                     thresholds, explanation (what a reviewer needs to recompute any number)
  summary.md         the headline numbers in words
  fig_scores.png, fig_windows.png, fig_sensitivity.png

Usage:  python rescore.py [--data DIR] [--out DIR]
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import math
import os
import statistics as st

import yaml

from sns_score import (THRESHOLDS, ScoreError, _evaluate, _score, add_days, score_window, shift_years,
                       stats_for, trust_4band, METHOD_VERSION_EXT)

HERE = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------- loading
def load_series(data_dir):
    out = {}
    if not os.path.isdir(data_dir):
        return out
    for fn in sorted(os.listdir(data_dir)):
        if fn.endswith(".csv") and "__" in fn:
            ds, loc = fn[:-4].split("__", 1)
            m = {}
            with open(os.path.join(data_dir, fn), encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    m[row["date"]] = float(row["mm"]) if row["mm"] not in ("", None) else None
            out[(ds, loc)] = m
    return out


def window_of(test):
    if "start" in test:
        return test["start"], test["end"]
    return add_days(test["obs"], 1), add_days(test["obs"], int(test["window_days"]))


# ---------------------------------------------------------------- null model
def null_scores(days, start, end, outcome, first_year):
    """Climatology forecaster: same prediction, same calendar window, every earlier year,
    each scored against all the other earlier years (leave-one-out)."""
    ty = int(start[:4])
    stats = {}
    for y in range(first_year, ty):
        s = stats_for(days, shift_years(start, y - ty), shift_years(end, y - ty), y)
        if s.complete and int(s.start[:4]) >= first_year:
            stats[y] = s
    out = []
    for y, s in stats.items():
        ref = [r for yy, r in stats.items() if yy != y]
        if len(ref) < THRESHOLDS["minReferenceYears"]:
            continue
        h, _, o, _ = _evaluate(outcome, s, ref)
        out.append((y, h, _score(h, o)))
    return out


def p_value(observed, null):
    if not null:
        return None
    return (1 + sum(1 for _, _, sc in null if sc >= observed)) / (1 + len(null))


def fisher(ps):
    """Fisher's combined probability test; chi-square survival with 2k df in closed form."""
    ps = [p for p in ps if p is not None]
    if not ps:
        return None, 0
    x = -2 * sum(math.log(p) for p in ps)
    k = len(ps)
    term, s = 1.0, 1.0
    for i in range(1, k):
        term *= (x / 2) / i
        s += term
    return min(1.0, math.exp(-x / 2) * s), k


# ---------------------------------------------------------------- one test
def run_test(days, test, n_ref, first_year, with_null=True):
    start, end = window_of(test)
    r = score_window(days, start, end, test["outcome"], n_ref)
    null = null_scores(days, start, end, test["outcome"], first_year) if with_null else []
    base_rate = (sum(1 for _, h, _ in null if h) / len(null)) if null else None
    null_mean = st.mean(sc for _, _, sc in null) if null else None
    return r, null, base_rate, null_mean, p_value(r.score, null)


def trail(days, r, test, spec_meta):
    def window_days(a, b):
        out, d = [], a
        while d <= b:
            out.append({"date": d, "mm": days.get(d)}); d = add_days(d, 1)
        return out
    return dict(
        method=METHOD_VERSION_EXT if r.version != "sns-score-v1" else r.version,
        **spec_meta, test=test, thresholds=THRESHOLDS,
        target=dict(stats=r.target.__dict__, daily=window_days(r.target.start, r.target.end)),
        reference=[dict(stats=x.__dict__, daily=window_days(x.start, x.end)) for x in r.reference],
        happened=r.happened, percentile=r.percentile, oriented=r.oriented, score=r.score,
        explanation=r.explanation)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(HERE, "data"))
    ap.add_argument("--out", default=os.path.join(HERE, "results"))
    ap.add_argument("--label", default="", help="text added to summary/figure titles (e.g. SYNTHETIC)")
    a = ap.parse_args()

    spec = yaml.safe_load(open(os.path.join(HERE, "specs.yaml"), encoding="utf-8"))
    series = load_series(a.data)
    P = spec["primary"]
    first_year = spec["null_model"]["first_year"]
    key = (P["dataset"], P["location"])
    os.makedirs(os.path.join(a.out, "trail"), exist_ok=True)
    if key not in series:
        raise SystemExit(f"Primary series data/{key[0]}__{key[1]}.csv not found. Run fetch_data.py first. "
                         f"Found: {sorted(series)}")
    days = series[key]

    primary_rows, sign_rows, branch_rows, sens_rows, null_rows = [], [], [], [], []

    for s in spec["signs"]:
        meta = dict(sign_id=s["id"], sign=s["name"], status=s["status"], rule=s["rule"])
        # -------- primary
        if s["status"] != "direction_needed":
            scores, ps, nms, brs = [], [], [], []
            for i, t in enumerate(s["tests"]):
                try:
                    r, null, br, nm, p = run_test(days, t, P["reference_years"], first_year)
                except ScoreError as e:
                    primary_rows.append({**meta, "test": i + 1, "obs": t["obs"], "outcome": t["outcome"], "error": str(e)})
                    continue
                scores.append(r.score); ps.append(p); nms.append(nm); brs.append(br)
                primary_rows.append({**meta, "test": i + 1, "obs": t["obs"], "outcome": t["outcome"],
                                     "start": r.target.start, "end": r.target.end, "total_mm": r.target.totalMm,
                                     "max_day_mm": r.target.maxDayMm, "ref_years": r.referenceUsed,
                                     "happened": int(r.happened), "percentile": round(r.percentile, 3),
                                     "P": round(r.oriented, 3), "score": r.score, "trust": trust_4band(r.score),
                                     "base_rate": None if br is None else round(br, 3), "b": br,
                                     "null_mean": None if nm is None else round(nm, 2),
                                     "p_value": None if p is None else round(p, 3), "error": ""})
                for y, h, sc in null:
                    null_rows.append({"sign_id": s["id"], "test": i + 1, "year": y, "happened": int(h), "score": sc})
                json.dump(trail(days, r, t, {**meta, "dataset": key[0], "location": key[1]}),
                          open(os.path.join(a.out, "trail", f"sign{s['id']:02d}_test{i + 1}.json"), "w"), indent=1)
            if scores:
                sc = round(st.mean(scores), 2)
                # combine the tests of a two-observation sign by the mean score and the larger p-value (conservative)
                sign_rows.append({**meta, "category": s["category"], "field_score": s["field_score"], "rescored": sc,
                                  "trust": trust_4band(sc), "null_mean": round(st.mean(nms), 2),
                                  "skill_vs_null": round(sc - st.mean(nms), 2),
                                  "base_rate": round(st.mean(brs), 2), "p_value": round(max(ps), 3), "n_tests": len(scores)})
        # -------- branches of direction-needed signs (reported, never pooled)
        for bname, tests in (s.get("branches") or {}).items():
            for i, t in enumerate(tests):
                try:
                    r, null, br, nm, p = run_test(days, t, P["reference_years"], first_year)
                    branch_rows.append({**meta, "branch": bname, "obs": t["obs"], "outcome": t["outcome"],
                                        "start": r.target.start, "end": r.target.end, "total_mm": r.target.totalMm,
                                        "percentile": round(r.percentile, 3), "score": r.score,
                                        "null_mean": None if nm is None else round(nm, 2),
                                        "p_value": None if p is None else round(p, 3)})
                except ScoreError as e:
                    branch_rows.append({**meta, "branch": bname, "obs": t["obs"], "outcome": t["outcome"], "error": str(e)})

        # -------- sensitivity
        all_tests = list(s.get("tests") or [])
        for (ds, loc), dd in sorted(series.items()):
            for n_ref in spec["sensitivity"]["reference_years"]:
                for i, t in enumerate(all_tests):
                    sens_rows.append(_sens(meta, f"{ds}/{loc}/N{n_ref}", dd, t, n_ref, "pre-registered test", i + 1))
        for i, t in enumerate(all_tests):
            for w in s.get("sensitivity_windows", []):
                t2 = {**t, "window_days": w}; t2.pop("start", None); t2.pop("end", None)
                sens_rows.append(_sens(meta, "primary", days, t2, P["reference_years"], f"window {w} d", i + 1))
            for o in s.get("sensitivity_outcomes", []):
                sens_rows.append(_sens(meta, "primary", days, {**t, "outcome": o}, P["reference_years"], f"outcome {o}", i + 1))
        for j, t in enumerate(s.get("sensitivity_tests", [])):
            desc = f"{t['outcome']} " + (f"{t['start']}..{t['end']}" if "start" in t else f"{t['window_days']} d")
            sens_rows.append(_sens(meta, "primary", days, t, P["reference_years"], f"alt: {desc}", j + 1))

    # ---------------------------------------------------------------- write tables
    def wcsv(name, rows):
        if not rows:
            return
        cols = []
        for r in rows:
            for k in r:
                if k not in cols:
                    cols.append(k)
        with open(os.path.join(a.out, name), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)

    for name, rows in [("primary.csv", primary_rows), ("signs.csv", sign_rows), ("branches.csv", branch_rows),
                       ("sensitivity.csv", sens_rows), ("null.csv", null_rows)]:
        wcsv(name, rows)

    # ---------------------------------------------------------------- summary
    # standard verification measures, pooled over the pre-registered tests (primary analysis)
    from standard_metrics import verify
    std_rows = []
    for label, keep in [("confirmed", ("confirmed",)), ("confirmed + timing provisional", ("confirmed", "timing_provisional"))]:
        rows = [r for r in primary_rows if not r.get("error") and r["status"] in keep and r.get("b") is not None]
        v = verify([r["happened"] for r in rows], [r["b"] for r in rows])
        if v:
            std_rows.append({"set": label, **v})
    for r in primary_rows:
        r.pop("b", None)
    wcsv("standard.csv", std_rows)
    comb_p, k = fisher([r["p_value"] for r in sign_rows if r["status"] == "confirmed"])
    comb_all, k_all = fisher([r["p_value"] for r in sign_rows])
    rho = spearman_rfc(sign_rows, os.path.join(a.data, "rfc.csv"))
    write_summary(a, spec, key, sign_rows, branch_rows, sens_rows, comb_p, k, comb_all, k_all, rho, std_rows)
    try:
        import figures
        figures.make_all(a.out, sign_rows, primary_rows, null_rows, sens_rows, days, spec, a.label)
    except ImportError as e:
        print("figures skipped:", e)
    print(open(os.path.join(a.out, "summary.md"), encoding="utf-8").read())


def _sens(meta, config, days, t, n_ref, variant, i):
    try:
        start, end = window_of(t)
        r = score_window(days, start, end, t["outcome"], n_ref)
        return {**meta, "config": config, "variant": variant, "test": i, "outcome": t["outcome"],
                "start": start, "end": end, "ref_years": r.referenceUsed, "total_mm": r.target.totalMm,
                "happened": int(r.happened), "score": r.score, "error": ""}
    except ScoreError as e:
        return {**meta, "config": config, "variant": variant, "test": i, "outcome": t["outcome"], "error": str(e)}


def spearman_rfc(sign_rows, path):
    """If data/rfc.csv exists (columns: sign_id, mentions, n_farmers) test whether widely shared signs score higher."""
    if not os.path.exists(path):
        return None
    rfc = {int(r["sign_id"]): int(r["mentions"]) / int(r["n_farmers"]) for r in csv.DictReader(open(path))}
    pairs = [(rfc[r["sign_id"]], r["rescored"]) for r in sign_rows if r["sign_id"] in rfc]
    if len(pairs) < 4:
        return None

    def ranks(xs):
        order = sorted(range(len(xs)), key=lambda i: xs[i])
        rk = [0.0] * len(xs); i = 0
        while i < len(xs):
            j = i
            while j + 1 < len(xs) and xs[order[j + 1]] == xs[order[i]]:
                j += 1
            for q in range(i, j + 1):
                rk[order[q]] = (i + j) / 2 + 1
            i = j + 1
        return rk
    a, b = ranks([p[0] for p in pairs]), ranks([p[1] for p in pairs])
    ma, mb = st.mean(a), st.mean(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return (num / den if den else None), len(pairs)


def write_summary(a, spec, key, sign_rows, branch_rows, sens_rows, comb_p, k, comb_all, k_all, rho, std_rows=()):
    L = []
    lab = f" ({a.label})" if a.label else ""
    L.append(f"# Re-scoring results{lab}\n")
    L.append(f"Generated {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} from `specs.yaml` "
             f"(fixed {spec['fixed_on']}). Primary: {key[0]} at {key[1]}, {spec['primary']['reference_years']} reference years, "
             f"method {spec['method']}.\n")
    if a.label:
        L.append(f"> **{a.label}: these numbers come from made-up rainfall and mean nothing about Wolaita.** "
                 "They only show that every step of the pipeline runs.\n")
    L.append("| # | Sign | Status | Field score | Re-scored | Trust | Zero-skill score | Skill vs zero-skill | Outcome base rate | p |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for r in sign_rows:
        L.append(f"| {r['sign_id']} | {r['sign']} | {r['status']} | {r['field_score']} | {r['rescored']} | {r['trust']} | "
                 f"{r['null_mean']} | {r['skill_vs_null']:+} | {r['base_rate']} | {r['p_value']} |")
    if sign_rows:
        fs = [r["field_score"] for r in sign_rows]; rs = [r["rescored"] for r in sign_rows]
        L.append("")
        L.append(f"- Signs scored in the primary analysis: {len(sign_rows)} "
                 f"({sum(1 for r in sign_rows if r['status'] == 'confirmed')} confirmed, "
                 f"{sum(1 for r in sign_rows if r['status'] == 'timing_provisional')} timing provisional). "
                 f"{sum(1 for s in spec['signs'] if s['status'] == 'direction_needed')} signs await the direction the farmers read (see branches.csv).")
        L.append(f"- Mean field score {st.mean(fs):.2f}; mean re-scored {st.mean(rs):.2f}; "
                 f"mean absolute difference {st.mean(abs(x - y) for x, y in zip(fs, rs)):.2f}.")
        L.append(f"- Signs beating the zero-skill score: {sum(1 for r in sign_rows if r['skill_vs_null'] > 0)} of {len(sign_rows)}; "
                 f"with p < 0.10: {sum(1 for r in sign_rows if r['p_value'] < 0.10)}.")
        if comb_p is not None:
            L.append(f"- Fisher combined p, confirmed signs (k={k}): {comb_p:.3f}; all scored signs (k={k_all}): {comb_all:.3f}. "
                     "Signs share one place and one year, so these are optimistic.")
    if std_rows:
        L.append("\n## Standard verification (primary)\n")
        L.append("| Set | n tests | Hits | Hits expected by chance | PC | PC by chance | HSS | BSS | Exact p (hits) |")
        L.append("|---|---|---|---|---|---|---|---|---|")
        for v in std_rows:
            L.append(f"| {v['set']} | {v['n']} | {v['hits']} | {v['expected_hits']} | {v['PC']} | {v['PC_chance']} | {v['HSS']} | {v['BSS']} | {v['p_exact']} |")
        L.append("")
    if rho:
        L.append(f"- Spearman correlation between citation frequency (RFC) and re-scored score: {rho[0]:.2f} (n={rho[1]}).")
    # sensitivity: spread of each sign's score across data configurations
    by = {}
    for r in sens_rows:
        if r.get("error") == "" and r["variant"] == "pre-registered test":
            by.setdefault(r["sign_id"], []).append(r["score"])
    if by:
        spread = {s: (min(v), max(v)) for s, v in by.items()}
        L.append(f"- Across datasets x locations x reference periods, the median per-sign score range is "
                 f"{st.median(b - a_ for a_, b in spread.values()):.1f} points.")
    open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
