import { test } from "node:test";
import assert from "node:assert/strict";
import { addisSpeak, addisUsage, requestId, AddisError } from "../src/lib/addis";
import { amharicForSpeech, amharicNumber } from "../src/lib/amharic-speech";

type Call = { url: string; init?: RequestInit };

function mockFetch(responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const f = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses.shift();
    if (!r) throw new Error("no more responses");
    if (r instanceof Error) throw r;
    return r;
  }) as typeof fetch;
  return { f, calls };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const mp3 = () => new Response(new Uint8Array([0x49, 0x44, 0x33]), { status: 200, headers: { "content-type": "audio/mpeg" } });

test("Amharic numbers are written out as spoken", () => {
  assert.equal(amharicNumber(10), "አስር");
  assert.equal(amharicNumber(17), "አስራ ሰባት");
  assert.equal(amharicNumber(25), "ሃያ አምስት");
  assert.equal(amharicNumber(100), "መቶ");
  assert.equal(amharicNumber(2025), "ሁለት ሺህ ሃያ አምስት");
});

test("Amharic replies are prepared for the voice without English or digits", () => {
  assert.equal(amharicForSpeech("ምልክቱና የተመዘገበው የአየር ሁኔታ ይስማማሉ (ከ10 ነጥብ 8.5)።"), "ምልክቱና የተመዘገበው የአየር ሁኔታ ይስማማሉ፣ ከአስር ነጥብ ስምንት ተኩል።");
  assert.equal(amharicForSpeech("ይጠንቀቁ፤ ይህ ምልክት ያገኘው ከ10 ነጥብ 6 ብቻ ነው።"), "ይጠንቀቁ፤ ይህ ምልክት ያገኘው ከአስር ነጥብ ስድስት ብቻ ነው።");
  assert.equal(amharicForSpeech("የSign & Sky AI"), "የሳይን ኤንድ ስካይ ኤ አይ");
  assert.doesNotMatch(amharicForSpeech("ከ10 ነጥብ 7.25 (CHIRPS)"), /[0-9A-Za-z()]/);
});

test("generation request matches the documented Addis AI API", async () => {
  process.env.ADDIS_API_KEY = "test-key";
  delete process.env.ADDIS_TTS_VOICE_AM;
  const { f, calls } = mockFetch([json(200, { data: { id: "clip_1", audio_url: "https://cdn.example/clip.mp3?sig=1" } }), mp3()]);
  const audio = await addisSpeak("ሰላም።", { fetchImpl: f });
  assert.equal(audio.byteLength, 3);
  assert.equal(calls[0].url, "https://api.addisassistant.com/api/v1/voice/generations");
  assert.equal(calls[0].init?.method, "POST");
  const h = calls[0].init?.headers as Record<string, string>;
  assert.equal(h["x-api-key"], "test-key");
  assert.equal(h["content-type"], "application/json");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    text: "ሰላም።",
    language: "am",
    voice_id: "am-hamen",
    output_format: "mp3_44100",
    stream: false,
    client_request_id: requestId("am-hamen", "am", "ሰላም።"),
  });
  assert.equal(calls[1].url, "https://cdn.example/clip.mp3?sig=1");
});

test("the same reply always uses the same request id, so Addis AI replays it without a second charge", () => {
  assert.equal(requestId("am-hamen", "am", "ሀ"), requestId("am-hamen", "am", "ሀ"));
  assert.notEqual(requestId("am-hamen", "am", "ሀ"), requestId("am-hamen", "am", "ለ"));
  assert.notEqual(requestId("am-hamen", "am", "ሀ"), requestId("am-nejat", "am", "ሀ"));
});

test("generation in progress and busy answers are retried; low balance is not", async () => {
  process.env.ADDIS_API_KEY = "test-key";
  const busy = mockFetch([
    json(409, { status: "error", error: { code: "GENERATION_IN_PROGRESS", message: "wait" } }, { "retry-after": "0.01" }),
    json(429, { status: "error", error: { code: "rate_limited", message: "slow down" } }, { "retry-after": "0.01" }),
    json(200, { data: { audio_url: "https://cdn.example/a.mp3" } }),
    mp3(),
  ]);
  await addisSpeak("ሰላም።", { fetchImpl: busy.f });
  assert.equal(busy.calls.length, 4);

  const poor = mockFetch([json(402, { status: "error", error: { code: "insufficient_balance", message: "Top up" } })]);
  await assert.rejects(addisSpeak("ሰላም።", { fetchImpl: poor.f }), (e: unknown) => e instanceof AddisError && e.status === 402 && e.code === "insufficient_balance");
  assert.equal(poor.calls.length, 1);
});

test("a chosen voice is used and missing keys fail clearly", async () => {
  process.env.ADDIS_API_KEY = "test-key";
  process.env.ADDIS_TTS_VOICE_AM = "am-yohanes-calm";
  const { f, calls } = mockFetch([json(200, { data: { audio_url: "https://cdn.example/a.mp3" } }), mp3()]);
  await addisSpeak("ሰላም።", { fetchImpl: f });
  assert.equal(JSON.parse(String(calls[0].init?.body)).voice_id, "am-yohanes-calm");
  delete process.env.ADDIS_TTS_VOICE_AM;
  delete process.env.ADDIS_API_KEY;
  await assert.rejects(addisSpeak("ሰላም።", { fetchImpl: f }), (e: unknown) => e instanceof AddisError && e.code === "not_configured");
  assert.equal((await addisUsage(f)).ok, false);
});

test("Amharic uses Addis AI while English keeps the phone's own voice", async () => {
  process.env.SESSION_SECRET = "x".repeat(40);
  process.env.ADDIS_API_KEY = "test-key";
  delete process.env.AZURE_SPEECH_KEY;
  delete process.env.GOOGLE_TTS_API_KEY;
  const { ttsProviderFor, ttsUrl, ttsVoices } = await import("../src/lib/tts");
  assert.equal(ttsProviderFor("am"), "addis");
  assert.equal(ttsProviderFor("en"), null);
  assert.ok(ttsUrl("am", "ሰላም።"));
  assert.equal(ttsUrl("en", "Hello."), null);
  assert.deepEqual(ttsVoices(), { am: "addis (am-hamen)", en: "phone's own voice" });
  delete process.env.ADDIS_API_KEY;
  assert.equal(ttsUrl("am", "ሰላም።"), null);
});

test("inline audio and relative links are handled; the self-test explains a refused key", async () => {
  process.env.ADDIS_API_KEY = "test-key";
  const inline = mockFetch([json(200, { data: { id: "c", audio: "data:audio/mpeg;base64,SUQz" } })]);
  assert.equal((await addisSpeak("ሰላም።", { fetchImpl: inline.f })).byteLength, 3);
  const rel = mockFetch([json(200, { data: { audio_url: "/files/c.mp3" } }), mp3()]);
  await addisSpeak("ሰላም።", { fetchImpl: rel.f });
  assert.equal(rel.calls[1].url, "https://api.addisassistant.com/files/c.mp3");
  const { addisSelfTest } = await import("../src/lib/addis");
  const refused = mockFetch([json(401, { status: "error", error: { code: "invalid_api_key", message: "Invalid or expired API key." } })]);
  const r = await addisSelfTest(refused.f);
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
  assert.match(String(r.hint), /key was refused/);
  assert.ok(!JSON.stringify(r).includes("test-key"));
});
