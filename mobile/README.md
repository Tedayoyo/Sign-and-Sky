# Sign & Sky mobile app

The Sign & Sky app for Android and iPhone, in English and Amharic. It gives the same answers as the
website with no internet: the 17 Wolaita signs, sign recognition, scores, trust levels, advice and the
seasonal calendar all work offline. One codebase (Expo / React Native, SDK 58).

Live website the app syncs with: https://sign-and-sky-wolaita.vercel.app

## What works offline, and what needs a connection

| Always works (no internet) | Needs a connection once | Needs a connection each time |
|---|---|---|
| Ask by typing or tapping a sign; the score, trust level and advice | Amharic voice (35 answers are downloaded and kept on the phone) | Sending shared signs (they wait on the phone until then) |
| Sign library with search and filters; every sign page | Average monthly rainfall on the calendar | Refreshing the library after researchers publish changes |
| Seasonal calendar (Belg, Kiremt/Meher, Bega) and the 2025 observation dates | | Opening the website |
| Filling in the Share form, with photo and voice note; drafts are kept | | |
| English voice (the phone's own voice) | | |

Speaking instead of typing uses the phone's own speech recognition. It differs from phone to phone,
and for Amharic it may need internet or may not exist at all; typing and tapping a sign always work.

Nothing is invented in the app. Rainfall is shown only as downloaded from the website (with its source
and date); if it has never been downloaded the calendar says so. An Amharic recording is played only
when its text is exactly the answer on screen. Scores are labelled as preliminary field scores.

## How it reuses the website

These files are copied unchanged from the website (repo root) by `npm run sync-shared`, and `npm test`
fails if any copy differs:

`src/lib/match.ts`, `scoring.ts` (SNS-Score v1, not to be changed without approval), `analyze.ts`,
`places.ts`, `explorer.ts`, `observations.ts`, `i18n.ts`, `src/data/library.json`,
`src/dictionaries/en.json`, `am.json`.

After changing any of them in the website, run `npm run sync-shared` here and commit.

App-only code: `src/lib/records.ts` (record model and reader for `GET /api/v1/signs`), `sync.ts`,
`voicepack.ts`, `outbox.ts`, `speak.ts`, `listen.ts`, `app.tsx`, `app-strings.ts` (words that exist only
in the app), and the screens in `src/app`.

No API key or database password is in the app. Amharic voice comes from the website's `/api/tts`
through signed links returned by `/api/analyze`.

## Commands

```bash
cd mobile
npm install
npm run typecheck        # types
npm test                 # 14 checks: shared files, all 17 signs in both languages, offline rules
npx expo start           # development (needs a development build, not Expo Go: the app uses native modules)
npm run export:android   # checks that the Android bundle compiles
```

## Getting an installable Android app

Every push that touches `mobile/` runs **Android app (test build)** in GitHub Actions
(`.github/workflows/android-apk.yml`). Open the run under the repository's *Actions* tab and download
`sign-and-sky-android-test`: it contains an `.apk` to copy to a phone and install. This build is for
testing only (test signing key).

## Publishing (team steps)

1. Accounts: a Google Play developer account and the Apple Developer Program (check the current fees
   on their sites). The app is `org.signandsky.app` on both; change it in `app.json` before the first
   upload if the team prefers another identifier, because it cannot be changed afterwards.
2. Create a free Expo account and run `npx eas-cli@latest build --platform android` (then `ios`) from
   `mobile/`. EAS creates and keeps the signing keys and produces the `.aab` for Google Play and the
   iPhone build for App Store Connect. `eas.json` is already set up.
3. Store listing: name "Sign & Sky", the icon in `assets/images/icon.png`, screenshots, and a privacy
   policy address. The policy text is in `docs/PRIVACY.md`; publish it on the website and use that link.
4. Data safety form (Google) and privacy labels (Apple): see the table in `docs/PRIVACY.md`.

## Not yet done

- The Android build has not been run on a phone yet: confirm on a real device that Speak, voice notes,
  photos, the Amharic voice download and offline sending behave as described.
- Amharic app-only words (`app-strings.ts`) were not checked by a native speaker.
- Wolaytta: add `wal.json` to the website dictionaries and one line in `i18n.ts`, then sync.
- iPhone build: needs the Apple Developer account.
