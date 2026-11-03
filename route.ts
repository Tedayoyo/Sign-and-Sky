// The full data trail of one weather test (request, daily values, thresholds, calculation). Published records only.
import { NextResponse } from "next/server";
import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await one<{ payload: unknown; record_number: number }>(
    `select w.dataset_payload as payload, k.record_number from weather_outcomes w
     join knowledge_records k on k.id = w.record_id where w.id = $1 and k.is_published`,
    [id],
  );
  if (!row?.payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    { record_number: row.record_number, ...(row.payload as object) },
    { headers: { "Access-Control-Allow-Origin": "*", "Content-Disposition": `inline; filename="sign-${row.record_number}-test-${id.slice(0, 8)}.json"` } },
  );
}
