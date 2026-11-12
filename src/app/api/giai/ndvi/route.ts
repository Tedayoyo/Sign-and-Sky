// Vegetation index (NDVI) over Offa Woreda from the GI-AI4AFS Spatio-Temporal API, weekly for the last 12 months.
// Answers {configured:false} until the GI-AI4AFS access settings exist; the answer is passed on as received.
import { NextResponse } from "next/server";
import { BOXES, giaiSettings, giaiTimeSeries } from "@/lib/giai";
import { isoDaysAgo } from "@/lib/climate";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = giaiSettings();
  if (!s) return NextResponse.json({ configured: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    const data = await giaiTimeSeries(s, { bbox: BOXES.offa, start: `${isoDaysAgo(365)}T00:00:00Z`, end: `${isoDaysAgo(0)}T23:59:59Z`, layer: "NDVI" });
    return NextResponse.json(
      { configured: true, collection: s.collection, bbox: BOXES.offa, layer: "NDVI", retrieved_at: new Date().toISOString(), data },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
    );
  } catch (e) {
    console.error("giai ndvi failed", (e as Error).message);
    return NextResponse.json({ configured: true, error: "GI-AI4AFS did not answer." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
