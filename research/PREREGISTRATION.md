# Pre-registration: re-scoring the 17 Wolaita indicators

**Fixed on 6 November 2026, before any 2025 rainfall for Wolaita was downloaded or examined.**
The machine-readable version is `specs.yaml`; the pipeline reads only that file. Any change after this date
goes in the `amendments` list at the bottom of `specs.yaml`, dated and with its reason. Earlier text is never edited.
This is what lets the paper claim that the predictions were not tuned to fit the data.

## Why the scores must be redone

The 2025 field record gives each indicator a score out of 10 labelled "AI-calculated" (`field-ai-2025`).
The rainfall series, windows and thresholds behind those numbers were not kept. So they cannot be reproduced,
and reviewers will not accept them as results. The paper reports them as **the original field scores** and sets the
re-scored values beside them. Where the two disagree, the paper says so.

## The score (unchanged from the website)

`score = 10 × (0.5·H + 0.5·P)`. **H** is 1 if the predicted outcome happened in the target window. **P** is the
target window's rank among the same calendar window in the reference years, oriented toward the prediction.
The Python implementation (`sns_score.py`) is tested against the website's `scoring.ts`: on 3,000 random cases
the two give identical outputs.

**v1.1 extensions.** These are needed for season-scale signs; with a D+1…D+W window and a v1 outcome, nothing changes.

- **Calendar-date windows.** "A normal rainy season" seen in November refers to the *next* season, not the next 30 days.
- **Three tercile outcomes,** the standard categories of operational seasonal outlooks (WMO; GHACOF):

  | Outcome | H | P |
  |---|---|---|
  | `below_normal` | p ≤ 1/3 | 1 − p |
  | `above_normal` | p ≥ 2/3 | p |
  | `not_below_normal` | p > 1/3 | p |

## Rules that turn an interpretation into a test

Seasons: **Belg** 1 Mar–31 May, **Kiremt** 1 Jun–30 Sep, **Bega** 1 Oct–end Feb.

- **R1, short-lead events.** "Rain is coming", "heavy rain", "within hours/days/weeks": window D+1…D+W.
  W is the stated delay ("a few hours or days" → 3, "a few weeks" → 21). If no delay is stated, W is the website's
  v1 default (rain and heavy rain → 7). Shorter and longer windows are sensitivity runs.
- **R2, season character.** "Normal", "poor", "drought", "rain this season":
  - Seen inside Belg or Kiremt → the rest of that season.
  - Seen in Bega → the next Belg.
  - Mapping: normal → `normal_rain`; poor → `below_normal`; drought → `drought`; "rain will come this season" →
    `not_below_normal`. ("≥10 mm somewhere in three months" would be true almost every year, so it tests nothing.)
- **R3, seasonal transition.** Flowering before Belg means "the rains will start": `rain_onset` in the first month of Belg.
- **R4, two-way signs.** For "seasonal rainfall *or* drought" and "onset, intensity *or* failure", the record does not
  say which reading the farmers made on that date. Choosing one after seeing the rainfall would be cheating. So every
  branch is written down now, and the sign stays **out of the primary analysis** until the team records, from the
  interview notes, which reading was given.

## What the team must confirm (status in `specs.yaml`)

| # | Sign | Status | Question for the team |
|---|---|---|---|
| 3 | Wind pattern changes | direction needed | On 5 Jun and 3 Nov 2025, did farmers read onset, strong rains, or failure? |
| 4 | Star pattern shifts | direction needed | On 23 Mar 2025, good rains or drought? |
| 8 | Star–moon alignment | direction needed | On 3 Feb 2025, good rains or drought? |
| 7 | Ants marching in line | timing provisional | Does "normal rainfall" (10 Dec) mean the coming Belg? |
| 11 | Dusty slow winds | timing provisional | Seen 3 Jul, after onset: does it describe the rest of Kiremt? |
| 13 | Red sun at sunrise | timing provisional | "Jue 7": June or July? |
| 14 | Flowering of trees | timing provisional | Which day in February, and which trees? Onset expected in March? |

Status of the other ten:

- **Sign 2** (plumage): already confirmed by the owner (greyish → poor rains).
- **Signs 1, 5, 6, 9, 10, 12, 15, 16, 17:** follow mechanically from the record.

## Data and comparisons

- **Primary:** CHIRPS v2.0 daily, pixel at Wolaita Sodo (6.855° N, 37.761° E), 30 reference years.
- **Sensitivity:**
  - reference years: 10 vs 30;
  - dataset: CHIRPS vs ERA5 vs ERA5-Land;
  - location: Sodo pixel vs Wolaita box average;
  - the alternative windows and outcomes listed per sign.
- **Null model (zero-skill baseline):** issue the same prediction on the same date every year from 1981 and score each
  year against the others. This gives:
  - how often the outcome happens anyway (base rate);
  - the score a sign with no skill would get on average;
  - a one-sided p-value for the 2025 score.

  This matters because in Kiremt, "rain within 7 days" comes true almost every year. A sign that only ever predicts
  it would score about 7.5 with no skill at all.
- **Collective test:** Fisher's combination of the p-values of the confirmed signs. Reported with the caveat that the
  signs share one season and one place, so the p-values are not fully independent.

## Honest limits stated in advance

Each sign was tested on **one or two observations**. A single score is evidence about one event, not a measure of a
sign's long-run skill. The paper frames the 2025 test as a pilot and the platform as the means of collecting
repeated observations.

## Amendment 1 — 7 November 2026 (before any data were seen)

**Primary measures changed to standard ones.** The tests, windows, outcomes and data stay the same. Each pre-registered test is a
"yes" forecast of its event, with outcome o_i (the H of SNS-Score) and climatological probability b_i (how often the event happened on
the same dates in earlier years since 1981). Pooled over the tests:

- **Proportion correct** PC = mean of o_i, against the chance level E = mean of b_i.
- **Heidke skill score** HSS = (PC − E) / (1 − E): 1 is perfect, 0 is no better than climatology, below 0 is worse.
- **Exact significance:** under no skill the number of hits follows a Poisson-binomial distribution with probabilities b_i;
  p = Pr(hits ≥ observed).
- **Supplementary:** Brier skill score against climatology.

These are reported for the confirmed tests and for confirmed plus timing-provisional tests. SNS-Score is kept unchanged as the per-sign
score that farmers see. The exact test was checked on 20,000 simulated no-skill sets: p ≤ 0.05 in 2.7% and p ≤ 0.10 in 5.7%.

## Amendment 2 — 12 November 2026 (before any data were seen)

**Primary location moved to Offa Woreda.** The team's recovered field-methods record shows the interviews took place in three kebeles
of Offa Woreda (W/Dekeya, Wareza and Yakima), about 29 km south-west of Sodo. The primary rainfall point is now 6.75° N, 37.50° E
in Offa Woreda. Offa Woreda's area mean is added as a sensitivity location, and the Sodo pixel and Wolaita Zone box are kept as
sensitivity locations. Tests, windows, outcomes and measures are unchanged.
