# Re-scoring results (SYNTHETIC)

Generated 2026-11-11T19:21:23+00:00 from `specs.yaml` (fixed 2026-11-06). Primary: chirps at offa_point, 30 reference years, method sns-score-v1.1.

> **SYNTHETIC: these numbers come from made-up rainfall and mean nothing about Wolaita.** They only show that every step of the pipeline runs.

| # | Sign | Status | Field score | Re-scored | Trust | Zero-skill score | Skill vs zero-skill | Outcome base rate | p |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ants carrying eggs uphill | confirmed | 9 | 0.7 | weak | 3.63 | -2.93 | 0.23 | 0.867 |
| 2 | Bird plumage colouration | confirmed | 6 | 10.0 | very strong | 4.2 | +5.8 | 0.34 | 0.044 |
| 5 | Coloured solar or lunar rings | confirmed | 6 | 6.2 | weak | 7.39 | -1.19 | 0.98 | 0.778 |
| 6 | Misty and foggy conditions | confirmed | 8 | 7.0 | fair | 7.5 | -0.5 | 1.0 | 0.622 |
| 7 | Ants marching in line | timing_provisional | 7.5 | 0.3 | weak | 5.0 | -4.7 | 0.51 | 0.913 |
| 9 | Squirrel digging behaviour | confirmed | 6 | 0.3 | weak | 5.0 | -4.7 | 0.51 | 0.913 |
| 10 | Dispersed ant behaviour | confirmed | 7 | 10.0 | very strong | 3.52 | +6.48 | 0.2 | 0.044 |
| 11 | Dusty slow winds | timing_provisional | 8 | 7.7 | fair | 4.95 | +2.75 | 0.5 | 0.467 |
| 12 | Strong east-to-west winds | confirmed | 7 | 10.0 | very strong | 3.52 | +6.48 | 0.2 | 0.044 |
| 13 | Red sun at sunrise | timing_provisional | 6 | 8.0 | strong | 4.95 | +3.05 | 0.5 | 0.422 |
| 14 | Flowering of trees | timing_provisional | 7.5 | 0.5 | weak | 5.8 | -5.3 | 0.66 | 0.911 |
| 15 | Frogs croaking | confirmed | 8 | 1.3 | weak | 5.8 | -4.5 | 0.66 | 0.756 |
| 16 | Birds migrating from far away | confirmed | 8.5 | 1.7 | weak | 4.66 | -2.96 | 0.43 | 0.689 |
| 17 | Dark cloud formation and movement | confirmed | 8 | 4.2 | weak | 4.67 | -0.47 | 0.43 | 0.756 |

- Signs scored in the primary analysis: 14 (10 confirmed, 4 timing provisional). 3 signs await the direction the farmers read (see branches.csv).
- Mean field score 7.32; mean re-scored 4.85; mean absolute difference 4.21.
- Signs beating the zero-skill score: 5 of 14; with p < 0.10: 3.
- Fisher combined p, confirmed signs (k=10): 0.313; all scored signs (k=14): 0.565. Signs share one place and one year, so these are optimistic.

## Standard verification (primary)

| Set | n tests | Hits | Hits expected by chance | PC | PC by chance | HSS | BSS | Exact p (hits) |
|---|---|---|---|---|---|---|---|---|
| confirmed | 11 | 6 | 5.42 | 0.545 | 0.493 | 0.104 | -0.856 | 0.4673 |
| confirmed + timing provisional | 15 | 8 | 7.59 | 0.533 | 0.506 | 0.055 | -0.8 | 0.5191 |

- Across datasets x locations x reference periods, the median per-sign score range is 9.7 points.
