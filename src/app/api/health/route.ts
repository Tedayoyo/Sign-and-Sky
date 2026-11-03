import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [r] = await query<{ n: number }>("select count(*)::int as n from knowledge_records where is_published");
    return NextResponse.json({ ok: true, published: r.n });
  } catch {
    return NextResponse.json({ ok: false, error: "Database not reachable" }, { status: 503 });
  }
}
