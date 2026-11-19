# Sign & Sky research code: verifying the 17 Wolaita indicators

This folder holds the analysis behind the paper *Integrating indigenous weather forecasting knowledge and climate data for agricultural decision support: an AI-enabled digital framework for Sign & Sky in Wolaita, Ethiopia*. It tests each farmer prediction in the 2025 field record against satellite and reanalysis rainfall, compares it with what a no-skill forecast would achieve, and keeps the full data trail, so anyone can recompute every number in the paper.

## Run it

**Google Colab (easiest, about 15 minutes, free).** Open `Sign_and_Sky_17_signs.ipynb` in colab.research.google.com, enter your Google Earth Engine project ID and choose Runtime → Run all. The notebook writes all modules, runs the self-tests, extracts the rainfall, runs the analysis and downloads `results.zip`.

**On your own computer** (Python 3.10 or later):

```bash
pip install -r requirements.txt earthengine-api
python fetch_data.py --source gee --gee-project YOUR_PROJECT   # CHIRPS v2.0, CHIRPS v3.0, ERA5-Land
python rescore.py                                               # writes results/
```

To reproduce the paper exactly from the archived series, without downloading anything:

```bash
python rescore.py --data results-2026-11-13/data --out results-check
```

## What is in here

| File | Purpose |
|---|---|
| `PREREGISTRATION.md`, `specs.yaml` | The test for each indicator, fixed on 6 November 2026 before any rainfall was examined, with two dated amendments |
| `sns_score.py` | The Sign and Sky score (SNS-Score). `score_sign_v1` is a line-for-line port of the website's `src/lib/scoring.ts`; `score_window` adds season windows and tercile outcomes |
| `standard_metrics.py` | Proportion correct, Heidke skill score, Brier skill score and the exact Poisson-binomial test |
| `fetch_data.py` | Extracts the rainfall series through the data APIs and logs every request with a SHA-256 checksum in `data/manifest.json` |
| `rescore.py`, `figures.py` | The pre-registered analysis, zero-skill baselines, the sensitivity grid, data trails and figures |
| `Sign_and_Sky_17_signs.ipynb` | Self-contained Colab notebook that runs everything above |
| `results-2026-11-13/` | The run reported in the paper (extracted 13 November 2026): the 12 rainfall series with checksums, all result tables, per-test data trails and figures |
| `tests/` | Self-tests (below) and simulated rainfall used only to check that every step runs |

## Tests

| Test | What it shows |
|---|---|
| `tests/test_equivalence.py` | The Python score equals the website's TypeScript `scoring.ts` on 3,000 random cases (needs Node.js) |
| `tests/test_standard.py` | The verification measures match hand-computed values |
| `tests/test_calibration.py` | On simulated predictions with no skill, the exact test gives p ≤ 0.05 at or below the nominal 5% rate |

## Outputs

- `signs.csv`: one row per indicator, with the preliminary field score, the reproducible score, the zero-skill score and the p-value
- `primary.csv`: one row per pre-registered test (the paper's Table 2)
- `standard.csv`: hits, expected hits, proportion correct, Heidke skill score and exact p (Table 3)
- `branches.csv`: every reading of the two-way indicators 3, 4 and 8
- `sensitivity.csv`, `null.csv`: the detail behind the sensitivity analysis and the zero-skill baselines
- `trail/*.json`: the daily rainfall of the target window and of every reference window for each test

## Data sources

CHIRPS v2.0 and v3.0 (Climate Hazards Center, UC Santa Barbara) and ERA5-Land (Copernicus Climate Change Service, ECMWF), read through Google Earth Engine. The archived series in `results-2026-11-13/data` are derived from these products and are redistributed under their terms; cite the original datasets when you use them (see the paper and `CITATION.cff`).
