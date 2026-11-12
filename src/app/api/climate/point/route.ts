// Rainfall at the study point (centre of Offa Woreda) from 1991 to about a week ago, as monthly and seasonal totals
// with the 1991–2020 normal. Cached by the CDN for a week; the data change only by a few days at the end.
import { NextResponse } from "next/server";
import { ERA5_CREDIT, ERA5_LABEL, NORMAL, OFFA, fetchEra5, isoDaysAgo, monthlyNormal, monthlyTotals, seasonNormal, seasonTotals } from "@/lib/climate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Cached = { at: number; body: unknown };
const g = globalThis as unknown as { __snsClimatePoint?: Cached };

export async function GET() {
  const hit = g.__snsClimatePoint;
  if (hit && Date.now() - hit.at < 12 * 3600e3) return respond(hit.body);
  try {
    const end = isoDaysAgo(6);
    const { url, series } = await fetchEra5([OFFA], `${NORMAL.from}-01-01`, end);
    const years = monthlyTotals(series[0]);
    const seasons = seasonTotals(years);
    const body = {
      source: ERA5_LABEL,
      credit: ERA5_CREDIT,
      request: url,
      retrieved_at: new Date().toISOString(),
      point: OFFA,
      resolution: "0.25° (about 28 km)",
      last_date: series[0].at(-1)?.date ?? null,
      normal_period: `${NORMAL.from}–${NORMAL.to}`,
      normal: monthlyNormal(years),
      years,
      seasons,
      season_normal: seasonNormal(seasons),
    };
    g.__snsClimatePoint = { at: Date.now(), body };
    return respond(body);
  } catch (e) {
    console.error("climate point failed", (e as Error).message);
    return NextResponse.json({ error: "Rainfall data are not available right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function respond(body: unknown) {
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400" } });
}
