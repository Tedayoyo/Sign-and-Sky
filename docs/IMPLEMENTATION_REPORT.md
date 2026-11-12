# Sign & Sky — Feature expansion and premium UI upgrade: implementation report

Branch: `feature/sign-and-sky-feature-expansion` (not merged into `main`; waiting for review)
Date: 13 November 2026
Live site (unchanged until merge): https://sign-and-sky-wolaita.vercel.app

This was an expansion of the existing website, not a rebuild. Every existing route, the database, sign-in, the SNS-Score v1 formula and the 17 Wolaita records are kept.

## 1. Features added (brief features 1–15)

| # | Feature | What was built | Where |
|---|---|---|---|
| 1 | Animated homepage | Team photo hero with drifting clouds, light particles, scroll parallax and staged text; "What signs did nature show you today?" kept; supporting headline and description; Ask and Test stay first; three CTAs (Explore Indigenous Knowledge, Explore Environmental Data, Discover Our Research → Science page) | `/[lang]` |
| 2 | Indigenous knowledge explorer | Group tabs (clouds and sky, birds and animals, insects and ants, wind, trees and flowering), search, trust filter, filters kept in the address; animated cards with score rings. Sign pages show description, interpretation, expected outcome, observation history, place, forecast window, rainfall comparison, SNS-Score, evaluation status, photos and audio where available | `/[lang]/signs`, `/[lang]/signs/[n]` |
| 3 | Satellite and rainfall map | Wolaita map on Sentinel-2 cloudless imagery; ERA5 monthly rainfall grid; year select, month slider and Play animation; monthly and seasonal charts against the 1991–2020 normal; study point and observations; source, date and availability shown; GI-AI4AFS used first once access is granted, ERA5 fallback stated on screen | `/[lang]/environment` |
| 4 | SNS-Score v1 dashboard | Animated score gauges, H and P indicators, forecast-window timeline, per-year rainfall chart and table, data source, score calculator; preliminary field scores clearly separated from re-tested scores. Formula unchanged | `/[lang]/results`, sign pages |
| 5 | Knowledge-to-science animation | Five scroll-revealed stages with icons and connecting line | Home page, "How it works" |
| 6 | "Wisdom Written in Nature" | Field-record meanings by season, how the knowledge was documented (283 households, 3 kebeles, 17 signs), consent block. No invented stories or quotes | `/[lang]/stories` |
| 7 | Farmer voice and observation | Voice recording with live waveform, playback, photo upload, date, place, language, confirmation, offline drafts, offline outbox with sync status | `/[lang]/share` |
| 8 | Seasonal calendar | Belg, Kiremt (Meher), Bega; average rainfall per month; documented signs and observation dates; farm activities; month selection | `/[lang]/calendar` |
| 9 | Community knowledge map | Published signs placed at the public study point of the area where they were documented; filters by type, season and month; area summary by type and season; observation list. No farm, village or person locations | `/[lang]/environment` |
| 10 | Research and publication centre | Manuscript (in preparation, not peer reviewed, no DOI or PDF yet), methodology, rules R1–R4, standard measures, evidence levels, SNS-Score v1 documentation, zero-skill benchmarks, datasets, the 17 pre-registered tests, projects, acknowledgements (no claimed partnerships) | `/[lang]/science` (the researcher login stays at `/[lang]/research`) |
| 11 | Meet the team | Supplied portraits (resized only), names, roles, biographies, expertise and contributions | `/[lang]/team` |
| 12 | About and mission | Mission, vision, why indigenous knowledge matters, datasets, role of AI, research approach, focus area, long-term goals | `/[lang]/about` |
| 13 | Design and animation system | Midnight navy, forest green, nature green, earth gold, sky blue, soft neutrals; light and dark themes with no flash; CSS-only scroll and entrance animations (no animation library added, to keep phones fast); reduced-motion respected | `src/app/globals.css` |
| 14 | UX and accessibility | Navigation with "More" menu, loading, error and empty states, form validation, language switch on every page, search; all pages pass axe-core WCAG 2 A/AA checks in both themes | all pages |
| 15 | Technical requirements | App Router, Supabase/Postgres, sign-in, roles, API routes, migrations, records, integrations and Vercel settings all preserved | — |

## 2. Existing features preserved

Ask by voice or text (English and Amharic), Amharic voice through Addis AI, the 17 published records and their translations, the built-in library when the database is down, SNS-Score v1 and its trust bands, the researcher area (sign-in, records, submissions, team, account, weather tests with data trails), the open API (`/api/v1/signs`, `/api/v1/tests/{id}`, `/api/analyze`), sharing signs with consent and privacy, the health check, sitemap and robots.

## 3. Database changes

One additive migration, already run on production by the team on 12 Nov 2026:

- `supabase/migrations/0003_voice_notes.sql` — allows audio types (voice notes) in the existing media table. No tables were dropped or reset.

## 4. API and data integrations

| Route | Purpose |
|---|---|
| `GET /api/climate/point` | Monthly and seasonal rainfall at the Offa study point, with the 1991–2020 normal |
| `GET /api/climate/grid?year=` | Monthly rainfall for 9 grid cells over Wolaita |
| `GET /api/giai/ndvi` | Vegetation from GI-AI4AFS; returns `configured: false` until access exists (no stand-in data) |
| `POST /api/share` | Same handler as the share form, used by the offline outbox |

Secondary data: GI-AI4AFS Spatio-Temporal API is the first source as soon as `GIAI_*` settings exist; ERA5 (Open-Meteo archive) is the fallback and every response names its source. Map background: Sentinel-2 cloudless 2016 (EOX, CC BY 4.0, credited). No API keys are sent to the browser.

## 5. Files

New pages: `science`, `environment` (with `EnvironmentExplorer`, `KnowledgeMap`, `VegetationPanel`), `calendar` (`CalendarClient`), `stories`, `team`; `signs/SignsExplorer`, `results/ScoreCalculator`.
New components: `PageHero`, `Photo`, `Reveal`, `ScoreRing`, `StepIcon`, `TestEvidence`, `ThemeToggle`, `VoiceRecorder`.
New libraries: `climate`, `explorer`, `giai`, `mapgeo`, `media`, `observations`, `science`, `series`, `share-handler`, `share-store`.
Changed: home, about, layout, nav, signs, sign page, results, share, research actions and submission page, `submissions`, `weather` (now uses the shared ERA5 request), dictionaries (English and Amharic, same keys), styles, sitemap, README, `.env.example`.
Removed: `Landscape.tsx` (replaced by the photo hero).
Media: team photos in `public/media` and `public/team`, resized to 640 px and original width (WebP and JPEG); not altered otherwise.

## 6. Testing

| Check | Result |
|---|---|
| Type check (`npm run typecheck`) | Pass |
| Unit and pipeline tests (`npm test`) | 58 / 58 pass |
| End-to-end browser checks (`tests/e2e/run.cjs`) | 112 / 112 pass |
| Production build (`npm run build`) | Pass, no errors |
| Vercel preview of the branch (project `sign-and-sky`) | Built successfully |

The end-to-end checks cover 13 pages × 2 languages × desktop and phone, WCAG 2 A/AA (axe-core) in light and dark, and the journeys listed in the README. Problems they found and that were fixed in Phase E:

- Text contrast of trust badges and status pills in light mode, and button text in dark mode (now WCAG AA).
- Researcher weather tests built their ERA5 request separately from the rest of the site; they now share one request builder.
- The community knowledge map (feature 9) was only partly covered by the rainfall map; it is now a full section.

Limits of the checks: the sandbox cannot reach Open-Meteo, EOX or Addis AI, so those were replaced by local stand-ins during the checks. Real rainfall, map imagery and Amharic voice must be confirmed on the preview link (see §8).

## 7. Deployment

1. Open the branch preview in Vercel (project `sign-and-sky`, not `sign-and-sky-6zz4`) and check the items in §8.
2. If all is well, merge `feature/sign-and-sky-feature-expansion` into `main` on GitHub. Vercel deploys production automatically.
3. No new environment variables are required. Optional, when access is granted: `GIAI_TOKEN_URL`, `GIAI_CLIENT_ID`, `GIAI_CLIENT_SECRET`, `GIAI_API_URL`, `GIAI_COLLECTION`, `GIAI_RAIN_COLLECTION`, `GIAI_RAIN_LAYER`, then redeploy.

## 8. Open items for the team

- On the preview: confirm real ERA5 rainfall on Environment and Calendar, the satellite background, and Amharic voice on Ask.
- GI-AI4AFS: client credentials and the rainfall collection and layer names.
- Wolaytta: the translation sheet, then Wolaytta text and voice.
- Science page: affiliations and the hackathon award wording were left out because the manuscript marks them as unconfirmed.
- Amharic text added in this branch has not been reviewed by a native speaker.
