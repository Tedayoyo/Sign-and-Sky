"""The p-values must be honest: when rainfall has nothing to do with the sign, a test at the 5% level
should flag 'skill' in about 5% of cases or fewer. Runs each pre-registered primary test on 200
independent synthetic climates and reports the false-positive rate."""
import os, random, sys, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import yaml
from rescore import run_test

PW = [0.10,0.15,0.35,0.55,0.50,0.55,0.75,0.75,0.65,0.35,0.15,0.08]; MU = [4,5,7,9,8,8,10,10,8,7,5,4]
def climate(seed):
    rng = random.Random(seed); d = dt.date(1981,1,1); m = {}; f = {}
    while d <= dt.date(2026,6,30):
        k = (d.year, d.month in (3,4,5)); f.setdefault(k, rng.lognormvariate(0,0.25))
        mo = d.month-1
        m[d.isoformat()] = round(rng.expovariate(1/(MU[mo]*f[k])),1) if rng.random() < min(0.95, PW[mo]*f[k]) else 0.0
        d += dt.timedelta(days=1)
    return m

spec = yaml.safe_load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "specs.yaml")))
tests = [t for s in spec["signs"] if s["status"] != "direction_needed" for t in s["tests"]]
n, hits05, hits10, total = 200, 0, 0, 0
for seed in range(n):
    days = climate(seed)
    for t in tests:
        _, _, _, _, p = run_test(days, t, 30, 1981)
        total += 1; hits05 += p <= 0.05; hits10 += p <= 0.10
print(f"{total} null tests: p<=0.05 in {hits05/total:.3f}, p<=0.10 in {hits10/total:.3f}")
assert hits05/total <= 0.07 and hits10/total <= 0.13, "p-values are anti-conservative"
print("PASS: p-values are calibrated (not over-optimistic)")
