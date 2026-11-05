// Deployment check: /api/health tells you what is missing, without revealing any secret.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { dbProblem } from "@/lib/dbstatus";
import { ttsVoices } from "@/lib/tts";
import { addisKey, addisSelfTest, addisUsage } from "@/lib/addis";

export const maxDuration = 60;

async function ttsState() {
  const voices = ttsVoices();
  const out: Record<string, unknown> = { ...voices };
  if (voices.am === "phone's own voice") out.hint_tts = "Add ADDIS_API_KEY in Vercel so every phone hears Amharic replies.";
  if (addisKey()) {
    const u = await addisUsage();
    out.addis = u.ok ? { reachable: true, usage: u.detail } : { reachable: false, problem: u.detail };
  }
  return out;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // /api/health?voice=test speaks one short Amharic sentence through Addis AI and reports the result.
  if (new URL(req.url).searchParams.get("voice") === "test") {
    const r = await addisSelfTest();
    return NextResponse.json(r, { status: r.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  }
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
        tts: await ttsState(),
        ...(r.n === 0 ? { hint: "No published signs. Run SQL files 3 and 4 in Supabase." } : {}),
        ...(r.admins === 0 ? { hint_admin: "No admin account yet. Run SQL file 5 in Supabase." } : {}),
      },
      { status: ok ? 200 : 503 },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: dbProblem(e), note: "The public pages still work from the built-in library; the research area, sharing signs and saving new signs need the database.", session_secret: session ? "set" : "missing or shorter than 32 characters", tts: await ttsState() }, { status: 503 });
  }
}
