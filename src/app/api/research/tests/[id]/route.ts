// Full data trail of a weather test, for signed-in researchers (also for unpublished records).
import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await one<{ payload: unknown }>("select dataset_payload as payload from weather_outcomes where id = $1", [id]);
  if (!row?.payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row.payload, { headers: { "Cache-Control": "private, no-store" } });
}
