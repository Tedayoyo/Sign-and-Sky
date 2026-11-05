// Addis AI "Voices 2" text-to-speech, used for Amharic replies.
// Request and response shapes follow the official docs and the official `addisai` SDK (v0.14.0):
//   POST https://api.addisassistant.com/api/v1/voice/generations
//   headers: x-api-key, content-type: application/json
//   body: { text, language, voice_id, output_format: "mp3_44100", stream: false, client_request_id }
//   reply: { data: { id, audio_url (signed, expires), duration_seconds, usage, meta } }
//   errors: 402 balance too low, 409 GENERATION_IN_PROGRESS (+ Retry-After), 429 busy, 5xx provider.
//   GET /api/v1/voice/usage → balance and spend.
// Idempotency: the same client_request_id with the same inputs is replayed without a second charge,
// so the key is derived from the voice, language and text.
import crypto from "node:crypto";

export const ADDIS_BASE = "https://api.addisassistant.com";
// Only for local testing against a stand-in server; production always uses the official address.
const base = () => process.env.ADDIS_API_BASE_TEST_ONLY || ADDIS_BASE;
export const ADDIS_DEFAULT_VOICE_AM = "am-hamen";

export class AddisError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export function addisKey(): string | null {
  const k = (process.env.ADDIS_API_KEY || "").trim();
  return k || null;
}

export function addisVoiceAm(): string {
  return (process.env.ADDIS_TTS_VOICE_AM || "").trim() || ADDIS_DEFAULT_VOICE_AM;
}

export function requestId(voice: string, language: string, text: string): string {
  return "sns-" + crypto.createHash("sha256").update(`${voice}\n${language}\n${text}`).digest("hex").slice(0, 32);
}

function dataUrlBytes(u: string): ArrayBuffer {
  const b = Buffer.from(u.slice(u.indexOf(",") + 1), "base64");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ErrBody = { error?: { code?: string; message?: string } | string; message?: string };

async function errorFrom(r: Response): Promise<AddisError> {
  let code: string | undefined;
  let msg = `Addis AI answered ${r.status}`;
  try {
    const j = (await r.json()) as ErrBody;
    if (typeof j.error === "object" && j.error) {
      code = j.error.code;
      if (j.error.message) msg += `: ${j.error.message}`;
    } else if (typeof j.error === "string") msg += `: ${j.error}`;
    else if (j.message) msg += `: ${j.message}`;
  } catch {}
  return new AddisError(msg, r.status, code);
}

/**
 * Reads Amharic text aloud with an Addis AI voice and returns the MP3 bytes.
 * Retries what the docs say may be retried (409 in progress, 429, 5xx, network) within `budgetMs`.
 */
export async function addisSpeak(
  text: string,
  opts: { voice?: string; language?: string; budgetMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ArrayBuffer> {
  const key = addisKey();
  if (!key) throw new AddisError("ADDIS_API_KEY is not set", 0, "not_configured");
  const f = opts.fetchImpl ?? fetch;
  const voice = opts.voice ?? addisVoiceAm();
  const language = opts.language ?? "am";
  const deadline = Date.now() + (opts.budgetMs ?? 50_000);
  const body = JSON.stringify({
    text,
    language,
    voice_id: voice,
    output_format: "mp3_44100",
    stream: false,
    client_request_id: requestId(voice, language, text),
  });

  let attempt = 0;
  let wait = 1000;
  for (;;) {
    attempt++;
    let r: Response;
    try {
      r = await f(`${base()}/api/v1/voice/generations`, {
        method: "POST",
        headers: { "x-api-key": key, "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
      });
    } catch (e) {
      if (attempt < 3 && Date.now() + wait < deadline) {
        await sleep(wait);
        wait *= 2;
        continue;
      }
      throw new AddisError(`Could not reach Addis AI: ${(e as Error).message}`, 0, "network");
    }

    if (r.ok) {
      const j = (await r.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
      const d = (j && typeof j === "object" && "data" in j ? j.data : j) as Record<string, unknown> | undefined;
      const playback = d?.playback as { url?: string } | undefined;
      const url = (d?.audio_url as string | undefined) ?? playback?.url;
      // The docs say a first response may also carry the audio inline as a data URL.
      const inline = Object.values(d ?? {}).find((v): v is string => typeof v === "string" && v.startsWith("data:audio/"));
      if (!url && inline) return dataUrlBytes(inline);
      if (!url) throw new AddisError(`Addis AI returned no audio link (fields: ${Object.keys(d ?? {}).join(", ")})`, 502, "no_audio");
      const a = await f(new URL(url, base()).toString(), { signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())) });
      if (!a.ok) throw new AddisError(`The Addis AI clip could not be downloaded (${a.status})`, 502, "download");
      return a.arrayBuffer();
    }

    const err = await errorFrom(r);
    const retryAfter = Number(r.headers.get("retry-after"));
    const retryable = r.status === 409 ? (err.code ?? "").toUpperCase() === "GENERATION_IN_PROGRESS" || r.headers.has("retry-after") : r.status === 429 || r.status >= 500;
    const pause = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : wait;
    if (retryable && attempt < 6 && Date.now() + pause < deadline) {
      await sleep(pause);
      wait = Math.min(wait * 2, 8000);
      continue;
    }
    throw err;
  }
}

/** Wallet state for /api/health (GET /api/v1/voice/usage). Never throws. */
export async function addisUsage(fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; detail: unknown }> {
  const key = addisKey();
  if (!key) return { ok: false, detail: "ADDIS_API_KEY is not set" };
  try {
    const r = await fetchImpl(`${base()}/api/v1/voice/usage`, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { ok: false, detail: (await errorFrom(r)).message };
    const j = (await r.json()) as { data?: unknown };
    return { ok: true, detail: j && typeof j === "object" && "data" in j ? j.data : j };
  } catch (e) {
    return { ok: false, detail: `Could not reach Addis AI: ${(e as Error).message}` };
  }
}

/**
 * Self-test for /api/health?voice=test: speaks one short sentence and reports what Addis AI answered,
 * without the key. The fixed request id makes repeats a free replay.
 */
export async function addisSelfTest(fetchImpl: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const started = Date.now();
  const text = "ሰላም፣ እንኳን ወደ ሳይን ኤንድ ስካይ በደህና መጡ።";
  const voice = addisVoiceAm();
  const out: Record<string, unknown> = { voice, text, endpoint: `${base()}/api/v1/voice/generations` };
  if (!addisKey()) return { ...out, ok: false, problem: "ADDIS_API_KEY is not set in this deployment (add it, then Redeploy)." };
  out.key_length = addisKey()!.length;
  try {
    const audio = await addisSpeak(text, { fetchImpl, budgetMs: 50_000 });
    return { ...out, ok: true, audio_bytes: audio.byteLength, ms: Date.now() - started };
  } catch (e) {
    const err = e as AddisError;
    const hint =
      err.status === 401 || err.status === 403
        ? "The key was refused: copy it again from addisassistant.com/apikeys (no spaces), save, Redeploy."
        : err.status === 402
          ? "The Addis AI balance is too low: top up the wallet."
          : err.status === 400 || err.status === 422
            ? "Addis AI did not accept the request (for example the voice name)."
            : err.status === 429
              ? "Addis AI is busy: try again in a minute."
              : undefined;
    return { ...out, ok: false, status: err.status, code: err.code, problem: err.message, hint, ms: Date.now() - started };
  }
}
