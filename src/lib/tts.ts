// Spoken replies made on the server, so every phone can hear the answer — including Amharic,
// which almost no phone or browser can speak by itself.
//
// Providers (the first one configured is used):
//   Azure AI Speech   AZURE_SPEECH_KEY + AZURE_SPEECH_REGION   Amharic: am-ET-MekdesNeural (female) / am-ET-AmehaNeural (male)
//   Google Cloud TTS  GOOGLE_TTS_API_KEY                        Amharic: am-ET (Standard / Wavenet voices)
// Optional: TTS_VOICE_AM, TTS_VOICE_EN to choose another voice name.
//
// The assistant only gives out signed audio links for replies it wrote itself, so the endpoint
// cannot be used to read out arbitrary text and spend the speech quota.
import crypto from "node:crypto";

export type TtsLang = "en" | "am";
export const TTS_MAX_CHARS = 700;

export function ttsProvider(): "azure" | "google" | null {
  if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) return "azure";
  if (process.env.GOOGLE_TTS_API_KEY) return "google";
  return null;
}

function signingKey(): string | null {
  const s = process.env.SESSION_SECRET || "";
  return s.length >= 32 ? s : null;
}

export function ttsAvailable(): boolean {
  return ttsProvider() !== null && signingKey() !== null;
}

function sign(lang: string, text: string): string {
  return crypto.createHmac("sha256", signingKey()!).update(`tts:${lang}:${text}`).digest("base64url").slice(0, 22);
}

/** A link that plays `text` read aloud, or null when no speech service is configured. */
export function ttsUrl(lang: TtsLang, text: string): string | null {
  if (!ttsAvailable() || !text || text.length > TTS_MAX_CHARS) return null;
  const t = Buffer.from(text, "utf8").toString("base64url");
  return `/api/tts?lang=${lang}&t=${t}&s=${sign(lang, text)}`;
}

/** Checks a link made by ttsUrl and returns the text it stands for. */
export function verifyTts(lang: string, t: string, s: string): string | null {
  if (!ttsAvailable() || (lang !== "en" && lang !== "am") || !t || !s) return null;
  let text: string;
  try {
    text = Buffer.from(t, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!text || text.length > TTS_MAX_CHARS) return null;
  const want = Buffer.from(sign(lang, text));
  const got = Buffer.from(s);
  return want.length === got.length && crypto.timingSafeEqual(want, got) ? text : null;
}

function xml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function azure(lang: TtsLang, text: string): Promise<ArrayBuffer> {
  const region = process.env.AZURE_SPEECH_REGION!.trim();
  const voice = lang === "am" ? process.env.TTS_VOICE_AM || "am-ET-MekdesNeural" : process.env.TTS_VOICE_EN || "en-US-JennyNeural";
  const locale = lang === "am" ? "am-ET" : "en-US";
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${xml(voice)}"><prosody rate="-8%">${xml(text)}</prosody></voice></speak>`;
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!.trim(),
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "sign-and-sky",
    },
    body: ssml,
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`Azure speech answered ${r.status}`);
  return r.arrayBuffer();
}

async function google(lang: TtsLang, text: string): Promise<ArrayBuffer> {
  const name = lang === "am" ? process.env.TTS_VOICE_AM : process.env.TTS_VOICE_EN;
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY!.trim())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: lang === "am" ? "am-ET" : "en-US", ...(name ? { name } : { ssmlGender: "FEMALE" }) },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.92 },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`Google speech answered ${r.status}`);
  const j = (await r.json()) as { audioContent?: string };
  if (!j.audioContent) throw new Error("Google speech returned no audio");
  const b = Buffer.from(j.audioContent, "base64");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export async function synthesize(lang: TtsLang, text: string): Promise<ArrayBuffer> {
  const p = ttsProvider();
  if (p === "azure") return azure(lang, text);
  if (p === "google") return google(lang, text);
  throw new Error("No speech service is configured.");
}
