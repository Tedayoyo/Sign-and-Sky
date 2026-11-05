// Deployment check: /api/health tells you what is missing, without revealing any secret.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { dbProblem } from "@/lib/dbstatus";
import { ttsAvailable, ttsProvider } from "@/lib/tts";

function ttsState() {
  const p = ttsProvider();
  if (!p) return "not set: add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (or GOOGLE_TTS_API_KEY) so every phone hears Amharic replies";
  return ttsAvailable() ? p : `${p} key set, but SESSION_SECRET is missing`;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const session = (process.env.SESSION_SECRET || "").length >= 32;
  try {
    const [r] = await query<{ n: number; admins: number }>(
      "select (select count(*) from knowledge_records where is_published)::int as n, (select count(*) from profiles where role = 'admin' and is_active)::int as admins",
    );
    const ok = session && r.n > 0;
    return NextResponse.json(
      {
        ok,
        published: r.n,
        admins: r.admins,
        session_secret: session ? "set" : "missing or shorter than 32 characters",
        tts: ttsState(),
        ...(r.n === 0 ? { hint: "No published signs. Run SQL files 3 and 4 in Supabase." } : {}),
        ...(r.admins === 0 ? { hint_admin: "No admin account yet. Run SQL file 5 in Supabase." } : {}),
      },
      { status: ok ? 200 : 503 },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: dbProblem(e), note: "The public pages still work from the built-in library; the research area, sharing signs and saving new signs need the database.", session_secret: session ? "set" : "missing or shorter than 32 characters", tts: ttsState() }, { status: 503 });
  }
}
