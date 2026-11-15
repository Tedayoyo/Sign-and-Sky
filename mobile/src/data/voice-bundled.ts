// Amharic answers shipped inside the app. This file is rewritten by scripts/fetch-voice.mjs when the
// app is built (it downloads the recordings from the Sign & Sky website). In the repository it is empty:
// the app then downloads the recordings itself the first time it is online.
export const BUNDLED_VOICE: Record<string, { text: string; file: number }> = {};
