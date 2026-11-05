// The voice assistant's logic as an API. POST JSON { text, lang, loc, last, alt } or GET ?text=&lang=&loc=&last=
import { NextResponse } from "next/server";
import { analyze } from "@/lib/assistant";
import { ttsUrl } from "@/lib/tts";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

function toInput(o: Record<string, unknown>) {
  const last = Number(o.last);
  return {
    text: String(o.text ?? "").slice(0, 500),
    alt: o.alt ? String(o.alt).slice(0, 500) : undefined,
    lang: String(o.lang ?? "en"),
    loc: String(o.loc ?? "wol"),
    last: Number.isInteger(last) && last > 0 ? last : null,
  };
}

async function handle(o: Record<string, unknown>) {
  try {
    const input = toInput(o);
    const a = await analyze(input);
    a.audio = a.reply ? ttsUrl(input.lang === "am" ? "am" : "en", a.reply) : null;
    return NextResponse.json(a, { headers: CORS });
  } catch (e) {
    console.error("analyze failed", e);
    return NextResponse.json({ error: "The assistant is not available right now." }, { status: 503, headers: CORS });
  }
}

export async function GET(req: Request) {
  return handle(Object.fromEntries(new URL(req.url).searchParams));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(body && typeof body === "object" ? body : {});
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
