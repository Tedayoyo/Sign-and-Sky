// Reads an assistant reply aloud as MP3. Only links made by the assistant (signed) are accepted.
// Answers are cached by the CDN, so each reply is made by the speech service only once.
import { synthesize, verifyTts, type TtsLang } from "@/lib/tts";

export const dynamic = "force-dynamic";

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
    console.error("tts failed", e);
    return new Response("Speech is not available right now.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
