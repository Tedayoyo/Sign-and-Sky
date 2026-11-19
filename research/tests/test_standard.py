"""Checks the standard verification measures against hand-computed values and checks that the
exact Poisson-binomial test is calibrated when signs have no skill."""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from standard_metrics import verify, poisson_binomial_sf
from math import comb
from math import isclose as _ic
isclose = lambda a, b, rel_tol=None: _ic(a, b, abs_tol=1.5e-3) if rel_tol is None else _ic(a, b, rel_tol=rel_tol)

# 1. Poisson-binomial with equal p equals the binomial
for n, p, c in [(10, 0.3, 4), (14, 0.5, 10), (5, 0.9, 5)]:
    exact = sum(comb(n, k) * p**k * (1-p)**(n-k) for k in range(c, n+1))
    assert isclose(poisson_binomial_sf([p]*n, c), exact, rel_tol=1e-12)
# 2. Hand example: 4 tests, outcomes 1,1,0,1, base rates .9,.5,.2,.33
v = verify([1,1,0,1], [0.9,0.5,0.2,0.33])
pc, e = 0.75, (0.9+0.5+0.2+0.33)/4
assert isclose(v["PC"], round(pc,3)) and isclose(v["PC_chance"], round(e,3))
assert isclose(v["HSS"], round((pc-e)/(1-e),3))
bs = 1/4; bsc = ((0.9-1)**2+(0.5-1)**2+(0.2-0)**2+(0.33-1)**2)/4
assert isclose(v["BSS"], round(1-bs/bsc,3))
print("hand-computed checks: PASS")

# 3. Calibration: hits drawn with exactly the climatological probabilities (no skill)
rng = random.Random(1)
rej05 = rej10 = 0; T = 20000
for _ in range(T):
    b = [rng.choice([0.2, 0.33, 0.5, 0.67, 0.9, 0.97]) for _ in range(14)]
    o = [1 if rng.random() < x else 0 for x in b]
    p = verify(o, b)["p_exact"]
    rej05 += p <= 0.05; rej10 += p <= 0.10
print(f"no-skill sets: p<=0.05 in {rej05/T:.3f}, p<=0.10 in {rej10/T:.3f}")
assert rej05/T <= 0.05 + 0.005 and rej10/T <= 0.10 + 0.007
print("calibration: PASS (exact test is not over-optimistic)")
