// Reads an assistant reply aloud as MP3. Only links made by the assistant (signed) are accepted.
// Answers are cached by the CDN, so each reply is made by the speech service only once.
import { synthesize, verifyTts, type TtsLang } from "@/lib/tts";
import { AddisError } from "@/lib/addis";

export const dynamic = "force-dynamic";
// Addis AI can take several seconds for a new clip; later plays come from the CDN cache.
export const maxDuration = 60;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lang = q.get("lang") || "";
  const text = verifyTts(lang, q.get("t") || "", q.get("s") || "");
  if (!text) return new Response("Not found", { status: 404 });
  try {
    const audio = await synthesize(lang as TtsLang, text);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    const status = e instanceof AddisError ? e.status : 0;
    const code = e instanceof AddisError ? e.code : undefined;
    console.error("tts failed", lang, status, code, (e as Error).message);
    // 402 = Addis AI balance too low: tell the page so it falls back at once.
    const reason = status === 402 ? "balance" : status === 429 ? "busy" : status === 401 || status === 403 ? "key" : "unavailable";
    return new Response(JSON.stringify({ error: "Speech is not available right now.", reason }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
