# Sign & Sky website

Farmers' weather signs, tested against recorded weather, and returned by voice in English and Amharic.
Built with Next.js 16, React 19 and PostgreSQL (Supabase). Requirements: `REQUIREMENTS.md`.

## What it does

| Page | For | What happens |
|---|---|---|
| `/en`, `/am` — Home and **Ask** | Farmers | The voice simulator, made real: 1 Listen (voice or text) → 2 Understand (sign, place, season, prediction, usual delay) → 3 Test (real score from `sign_evaluations` shown as a rain gauge, or "Not yet tested") → 4 Voice advice (spoken + written). "When should I sow?" answers from the last sign. Unknown signs can be saved for researchers, with consent. `?q=` opens the page with a sign already asked. |
| `/signs`, `/signs/[n]` | Everyone | The knowledge library: 17 published Wolaita indicators, all tested and scored, with search and filters (kind, prediction, trust). Each record shows the behaviour as recorded, both languages side by side, and every test with its data. |
| `/results` | Everyone | The 17 field scores from the 2025 Wolaita field record, a score chart, trust levels, and the scoring method. |
| `/share` | Farmers | Share a new sign (optional photo). Name and village stay private. Returns a reference code. |
| `/about` | Everyone | Method, promises, seasons, places, team, open API. |
| `/research` | Researchers | Sign in, review submissions (approve → new record, reject, ask for info), edit records and both translations, voice keywords and spoken advice, publish/unpublish (6 older compilation indicators wait unpublished), **run weather tests**, record outcomes, notes, team accounts, change password. |
| `/api/v1/signs` | Apps | Open JSON of the published library in both languages with test results (for the offline Android app). |
| `/api/v1/tests/[id]` | Everyone | The full data trail of one weather test (published records). |
| `/api/analyze` | Apps | The voice assistant's logic as an API (POST JSON `{text, lang, loc, last}` or GET with the same query parameters). |
| `/api/health` | Hosting | `{"ok":true,"published":17,"admins":1,"session_secret":"set","tts":"azure"}` when everything is set up; otherwise it names what is missing. |

Paths without a language (`/`, `/signs`, `/research` …) redirect to the visitor's language (cookie, then browser setting).

## Put it online (Supabase + Vercel, about 20 minutes, free tiers)

You need: a Supabase account, a Vercel account and a GitHub account.

### 1. Database (Supabase)

1. supabase.com → **New project**. Pick the region closest to your farmers (for Wolaita, Frankfurt). Save the database password.
2. Open **SQL Editor** → **New query**. Paste and **Run** each file below, in this order, one at a time:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_voice_and_testing.sql`
   3. `supabase/seed/0001_initial_records.sql`
   4. `supabase/seed/0002_voice_and_locations.sql`

   5. If your database was set up before 4 Nov 2026, also run `supabase/maintenance/remove_india_locations.sql` (removes the Telangana and Haryana places; safe to repeat).

   **Database already set up from 2 Nov 2026?** If 0001 says a table already exists, skip it. Run 0002 (safe to repeat), then
   `supabase/maintenance/replace_knowledge_records.sql`, then seed 0001, then seed 0002. That replaces only the knowledge library; researcher accounts, farmer submissions and locations are kept.
3. Create your admin account (still in the SQL Editor; change the email, name and password):

   ```sql
   insert into profiles (email, full_name, role, password_hash)
   values ('you@example.org', 'Your Name', 'admin', extensions.crypt('Choose-a-long-password', extensions.gen_salt('bf', 12)));
   ```
   If Supabase says `schema "extensions" does not exist`, remove the two `extensions.` prefixes. Change the password later under Research → My account.
4. Click **Connect** (top of the project page) → **Connection string** → **Transaction pooler**. Copy the URI (port 6543) and put your database password in it. This is your `DATABASE_URL`.

### 2. Code (GitHub)

The repository must look like this at the top level, with **nothing else** loose beside it:

```
public/  scripts/  src/  supabase/  tests/
.env.example  .gitignore  README.md  REQUIREMENTS.md  next.config.ts
package.json  package-lock.json  tsconfig.json  tsconfig.tools.json
```

Upload by **dragging the folders** from your computer into GitHub's *Add file → Upload files* page. The *choose your files* button flattens every file into the top level and drops the folders, which breaks the build.

### 3. Website (Vercel)

1. vercel.com → **Add New… → Project** → import the GitHub repository. Framework: Next.js (detected). Root Directory: leave empty (`./`).
2. **Environment Variables** (Settings → Environment Variables, for Production, Preview and Development):
   - `DATABASE_URL` — the pooler URI from step 1.4, with your real database password in place of `[YOUR-PASSWORD]` (no square brackets)
   - `SESSION_SECRET` — a random string of at least 32 characters (on a Mac or Linux: `openssl rand -base64 48`; or any password generator, 48+ characters)
   - `CHIRPS_ENDPOINT` — leave out until CHIRPS is connected
3. **Deploy**. Node.js 22 is used automatically (set in `package.json`). Then Project → Settings → Functions → Function Region: choose the region next to your Supabase project (for example Frankfurt `fra1` for an EU Central Supabase project, or Mumbai `bom1`), and redeploy.
   - Spoken replies (so every phone hears Amharic): `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` from an Azure "Speech" resource (portal.azure.com → Create a resource → Speech → Free F0 tier → Keys and Endpoint), or `GOOGLE_TTS_API_KEY` (Google Cloud → enable Text-to-Speech API → Credentials → API key). Optional: `TTS_VOICE_AM` (e.g. `am-ET-AmehaNeural` for a male voice).
   - Optional: `NEXT_PUBLIC_SITE_URL` — the official address (for the sitemap and shared previews).
4. Check: open `https://YOUR-SITE.vercel.app/api/health`. It should show `{"ok":true,"published":17,"admins":1,"session_secret":"set"}`. If not, it says what is missing: a wrong database password, a missing setting, or SQL files not yet run. Then open `/en`, `/am`, and sign in at `/en/research`.
5. Optional: Settings → Domains to use your own domain (for example `signandsky.org`).

After changing an environment variable, redeploy: Deployments → ⋯ on the latest → **Redeploy**.

Voice input needs HTTPS (Vercel gives you that) and works best in Chrome or Edge, including Chrome on Android.

### 4. Optional: recorded Amharic clips

Most phones have no Amharic voice. To play the team's recorded clips instead, run once on your computer (needs Node.js 20+):

```bash
npm install
npm run extract-audio -- "path/to/Sign & Sky – Voice Simulator (1).html"
```

This writes `public/audio/am/*.mp3` and `manifest.json`. Commit them and Vercel redeploys. Only clips whose words still match the current texts are copied (thanks, unknown-sign reply, advice for ants carrying eggs and birds migrating, and the "when should I sow" pieces). The simulator's score clips said "X out of 10 years", so they are left out on purpose. The full answer is always written.

## Run it locally

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL and SESSION_SECRET
npm run db:migrate                # supabase/migrations/0001, 0002 (records what ran; safe to repeat)
npm run db:seed                   # supabase/seed/0001 (only on an empty library), 0002 (safe to repeat)
npm run create-admin -- you@example.org "Your Name"   # prints a one-time password
npm run dev                       # http://localhost:3000
```

Security: all data access goes through the server. RLS is on with no policies, so the public Supabase API key cannot read anything. Passwords use bcrypt; sessions are signed httpOnly cookies that end when the password changes; sign-in is rate-limited (5 failures per email or 20 per connection in 15 minutes); farmer names, villages and private photos are only visible to signed-in researchers; uploaded photos are checked by their file bytes, not their name; one-time passwords are shown on the page, never put in a URL.

## Knowledge data (`scripts/build_seed.py` → `supabase/seed/`)

Source of truth: `indigenous_wolaita.pdf` — *Traditional Knowledge Systems & Microclimate Indicators, Wolaita, South Ethiopia* (2025 field record).

- Records 1–17: the 17 field indicators in table order, status `tested`, published, each with an AI-calculated score /10 (method `field-ai-2025`).
- Records 18–23: older compilation indicators that are not in the 2025 table, unpublished, status `needs_field_validation`.
- Every published record carries the simulator fields in both languages: name, behaviour/feature (`observation_text`), interpretation, prediction (`expected_weather`), usual delay (`expected_timing_text`), spoken advice (`voice_advice`) and voice keywords.
- Where the field table gave a day and month but no year, 2025 is used (confirmed by the owner). Two signs have two observation dates (wind: 5 Jun and 3 Nov; dark cloud: 8 Jul and 3 Dec 2025); `observation_date` is the first, and both appear in `observation_period`.
- Edit `scripts/build_seed.py`, then run `python3 scripts/build_seed.py` from this folder. Never edit the generated SQL by hand. Once the site is live, edit records in the research area instead.

## How a score is made (`src/lib/scoring.ts`, version `sns-score-v1`)

A sign seen on day D predicts an outcome within W days. The test takes daily rainfall for D+1…D+W and for the same calendar window in the N earlier years (default 10).

```
H = 1 if the predicted outcome happened in the window, else 0
P = rank of this year's window among the earlier years (0–1), oriented to the prediction
score = 10 × (0.5·H + 0.5·P)        Very strong ≥ 9 · Strong 8–8.9 · Fair 7–7.9 · Weak < 7
```

"Happened": rain ≥ 10 mm total; heavy rain = a day ≥ 20 mm; onset = 3 days ≥ 20 mm with ≥ 2 wet days; normal = total between the 25th–75th percentile; dry < 5 mm or < half the median; drought ≤ 20th percentile. Every test saves the request URL, the daily values used, the thresholds and the calculation in `weather_outcomes.dataset_payload`, linked from `sign_evaluations.weather_outcome_id`, and downloadable from the sign's page.

Data: ERA5 via the Open-Meteo Historical Weather API first (free, no key, ~6 days behind). **Connecting CHIRPS:** run a small extractor (Google Earth Engine or ClimateSERV) that answers `GET ?lat=&lon=&start=&end=` with `{ "dates": [...], "precipitation": [...] }`, and set `CHIRPS_ENDPOINT`. It then appears in the test form.

The 17 field scores are stored as recorded (AI-calculated, method `field-ai-2025`); they show "underlying data not attached" until re-run with the test tool. Signs whose prediction is a seasonal change (star and wind signs, flowering) need a researcher to choose the predicted outcome when re-testing; the form says so.

## Built-in library (works without the database)

`src/data/library.json` holds the 17 published signs exactly as the seed SQL stores them. When the database cannot be reached, the Ask page, the sign library, each sign's page and the results use it, so farmers always get an answer; `/api/health` and the research sign-in page say why the database is unreachable. Sharing a sign, saving an unknown sign and the research area need the database. When the database works, it is always used (so researchers' edits appear). After changing `scripts/build_seed.py`, run `python3 scripts/build_seed.py` and then `npm run build-library`.

## Languages and voice

- Text: `src/dictionaries/en.json`, `am.json`. A new language is a new file plus one line in `src/lib/i18n.ts`. `npm test` checks both files have the same keys, placeholders and list lengths, and that no Amharic string was left in English.
- Voice input: browser speech recognition (`en-US`, `am-ET`), best in Chrome/Edge. Listening stops after a short silence (2 s English, 2.6 s Amharic); alternative transcripts help matching.
- Spoken replies: a neural voice from Azure AI Speech (`am-ET-MekdesNeural`, `en-US-JennyNeural`) or Google Cloud Text-to-Speech, through `/api/tts` (signed links, cached by the CDN). Without a key, the device voice is used, then the recorded clips in `public/audio/am/`. The tap on Test or the microphone unlocks sound on phones. The full answer is always written.
- Sign recognition (`src/lib/match.ts`): `translations.keywords` of both languages (edit them on each record in the research area). English matches at word starts; Amharic matches stems with spelling variants folded (ሐ/ኀ→ሀ, ሠ→ሰ, ዐ→አ, ፀ→ጸ). A longer keyword match wins.
- The published library is cached for 60 seconds per server instance; an edit in the research area clears it on that instance at once.

## Seasons

Confirmed by the owner: Belg Mar–May, Kiremt/Meher Jun–Sep, Bega Oct–Feb. Defined in `src/lib/places.ts`. The research covers Wolaita, South Ethiopia only.

## Tests

```bash
npm test                                            # 31 tests: scoring, matching, dictionaries, connection strings, and the full pipeline
npm run typecheck                                   # type-checks the website, scripts and tests
TEST_DATABASE_URL=postgres://... npm test           # the same pipeline tests on a disposable Postgres (it is wiped)
```

Without `TEST_DATABASE_URL` the pipeline tests run on an in-process Postgres (PGlite): migrations and seeds load, the 17 scores and trust counts match the field record, each of the 17 Ask-page examples (English and Amharic) finds its own sign, the built-in library equals the database, no text mentions India, reply wording, follow-ups, unknown signs, private submissions, a full weather test with its data trail, and RLS on every table.

## Project layout

```
src/app/[lang]/…          pages (Ask, signs, results, share, about, research)
src/app/api/…             analyze, unknown, v1/signs, v1/tests, research/tests, media, health
src/components/AskClient  the four-step voice assistant (speech in and out, clips, saving unknown signs)
src/lib/                  scoring, match, analyze, records, weather, auth, db, i18n, places, submissions
src/proxy.ts              language routing
supabase/                 migrations, seeds, maintenance
scripts/                  build_seed.py, migrate, seed, create-admin, extract-audio
tests/                    node:test suites
```

## Open items

- CHIRPS extractor; village-level coordinates (current points are representative).
- The 17 field scores have no data trail yet; re-run them with the test tool once the site is online (Open-Meteo is reachable from Vercel).
