// Deployment check: /api/health tells you what is missing, without revealing any secret.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function reason(e: unknown): string {
  const err = e as { message?: string; code?: string };
  const msg = err?.message || "";
  if (msg.includes("DATABASE_URL")) return msg;
  if (err?.code === "28P01" || /password authentication failed/i.test(msg)) return "The database password in DATABASE_URL is wrong.";
  if (err?.code === "ENOTFOUND" || err?.code === "EAI_AGAIN") return "The database host in DATABASE_URL cannot be found. Copy the connection string again from Supabase → Connect.";
  if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(msg + (err?.code ?? ""))) return "Cannot reach the database. Use the Supabase pooler connection string (port 6543).";
  if (err?.code === "42P01") return "The database tables are missing. Run the SQL files 1 to 4 in the Supabase SQL Editor.";
  if (/Tenant or user not found/i.test(msg)) return "The user name in DATABASE_URL does not match the pooler. It should look like postgres.yourprojectref.";
  return "Database error: " + msg.slice(0, 200);
}

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
        ...(r.n === 0 ? { hint: "No published signs. Run SQL files 3 and 4 in Supabase." } : {}),
        ...(r.admins === 0 ? { hint_admin: "No admin account yet. Run SQL file 5 in Supabase." } : {}),
      },
      { status: ok ? 200 : 503 },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: reason(e), session_secret: session ? "set" : "missing or shorter than 32 characters" }, { status: 503 });
  }
}
