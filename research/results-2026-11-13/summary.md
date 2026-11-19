# Re-scoring results

Generated 2026-11-13T19:34:01+00:00 from `specs.yaml` (fixed 2026-11-06). Primary: chirps at offa_point, 30 reference years, method sns-score-v1.1.

| # | Sign | Status | Field score | Re-scored | Trust | Zero-skill score | Skill vs zero-skill | Outcome base rate | p |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ants carrying eggs uphill | confirmed | 9 | 1.3 | weak | 4.33 | -3.03 | 0.36 | 0.756 |
| 2 | Bird plumage colouration | confirmed | 6 | 1.2 | weak | 4.2 | -3.0 | 0.34 | 0.778 |
| 5 | Coloured solar or lunar rings | confirmed | 6 | 8.8 | strong | 5.92 | +2.88 | 0.68 | 0.267 |
| 6 | Misty and foggy conditions | confirmed | 8 | 8.3 | strong | 5.8 | +2.5 | 0.66 | 0.378 |
| 7 | Ants marching in line | timing_provisional | 7.5 | 0.3 | weak | 5.0 | -4.7 | 0.51 | 0.913 |
| 9 | Squirrel digging behaviour | confirmed | 6 | 0.3 | weak | 5.0 | -4.7 | 0.51 | 0.913 |
| 10 | Dispersed ant behaviour | confirmed | 7 | 1.2 | weak | 3.52 | -2.32 | 0.2 | 0.778 |
| 11 | Dusty slow winds | timing_provisional | 8 | 9.7 | very strong | 4.95 | +4.75 | 0.5 | 0.111 |
| 12 | Strong east-to-west winds | confirmed | 7 | 1.2 | weak | 3.52 | -2.32 | 0.2 | 0.778 |
| 13 | Red sun at sunrise | timing_provisional | 6 | 9.8 | very strong | 4.95 | +4.85 | 0.5 | 0.067 |
| 14 | Flowering of trees | timing_provisional | 7.5 | 9.5 | very strong | 6.7 | +2.8 | 0.84 | 0.133 |
| 15 | Frogs croaking | confirmed | 8 | 7.5 | fair | 5.8 | +1.7 | 0.66 | 0.511 |
| 16 | Birds migrating from far away | confirmed | 8.5 | 7.7 | fair | 5.45 | +2.25 | 0.59 | 0.489 |
| 17 | Dark cloud formation and movement | confirmed | 8 | 1.6 | weak | 4.27 | -2.67 | 0.35 | 1.0 |

- Signs scored in the primary analysis: 14 (10 confirmed, 4 timing provisional). 3 signs await the direction the farmers read (see branches.csv).
- Mean field score 7.32; mean re-scored 4.89; mean absolute difference 3.95.
- Signs beating the zero-skill score: 7 of 14; with p < 0.10: 1.
- Fisher combined p, confirmed signs (k=10): 0.975; all scored signs (k=14): 0.701. Signs share one place and one year, so these are optimistic.

## Standard verification (primary)

| Set | n tests | Hits | Hits expected by chance | PC | PC by chance | HSS | BSS | Exact p (hits) |
|---|---|---|---|---|---|---|---|---|
| confirmed | 11 | 4 | 4.92 | 0.364 | 0.447 | -0.151 | -4.134 | 0.8224 |
| confirmed + timing provisional | 15 | 7 | 7.27 | 0.467 | 0.485 | -0.035 | -2.721 | 0.665 |

- Across datasets x locations x reference periods, the median per-sign score range is 3.3 points.
