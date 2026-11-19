"""Standard forecast-verification measures for a set of dated categorical predictions.

Each pre-registered test i is a deterministic "yes" forecast that its event will happen in its window.
  o_i = 1 if the event happened (the H of SNS-Score), else 0
  b_i = climatological probability of the event: the fraction of earlier years (same calendar window,
        1981 .. target year - 1) in which it happened, each year judged against the others (leave-one-out)

Pooled over n tests (Wilks 2019; Jolliffe & Stephenson 2012):
  PC   = (1/n) sum o_i                                   proportion correct (hit rate)
  E    = (1/n) sum b_i                                   proportion correct expected by chance
  HSS  = (PC - E) / (1 - E)                              Heidke skill score (1 = perfect, 0 = chance)
  BS   = (1/n) sum (1 - o_i)^2                           Brier score of the forecasts (f_i = 1)
  BSc  = (1/n) sum (b_i - o_i)^2                         Brier score of the climatological forecast
  BSS  = 1 - BS / BSc                                    Brier skill score vs climatology
Significance: under no skill the number of hits C = sum o_i follows a Poisson-binomial distribution
with success probabilities b_i; one-sided exact p = Pr(C >= c_observed).
"""
from __future__ import annotations


def poisson_binomial_sf(probs, c):
    """Pr(sum of independent Bernoulli(p_i) >= c), exact by dynamic programming."""
    dist = [1.0]
    for p in probs:
        new = [0.0] * (len(dist) + 1)
        for k, v in enumerate(dist):
            new[k] += v * (1 - p)
            new[k + 1] += v * p
        dist = new
    return float(sum(dist[c:])) if c < len(dist) else 0.0


def verify(outcomes, base_rates):
    """outcomes: list of 0/1; base_rates: list of climatological probabilities b_i."""
    n = len(outcomes)
    if n == 0:
        return None
    pc = sum(outcomes) / n
    e = sum(base_rates) / n
    hss = (pc - e) / (1 - e) if e < 1 else None
    bs = sum((1 - o) ** 2 for o in outcomes) / n
    bsc = sum((b - o) ** 2 for b, o in zip(base_rates, outcomes)) / n
    bss = (1 - bs / bsc) if bsc > 0 else None
    p = poisson_binomial_sf(base_rates, int(sum(outcomes)))
    return dict(n=n, hits=int(sum(outcomes)), expected_hits=round(sum(base_rates), 2), PC=round(pc, 3),
                PC_chance=round(e, 3), HSS=None if hss is None else round(hss, 3),
                BS=round(bs, 3), BS_clim=round(bsc, 3), BSS=None if bss is None else round(bss, 3),
                p_exact=round(p, 4))
