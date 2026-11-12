// Monthly rainfall for one year on the 3 × 3 ERA5 grid (0.25°) covering Wolaita Zone, for the rainfall map.
import { NextResponse } from "next/server";
import { CELL, ERA5_CREDIT, ERA5_LABEL, GRID_LATS, GRID_LONS, fetchRain, isoDaysAgo, monthlyTotals } from "@/lib/climate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const g = globalThis as unknown as { __snsClimateGrid?: Map<number, { at: number; body: unknown }> };

export async function GET(req: Request) {
  const now = new Date();
  const year = Number(new URL(req.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 1991 || year > now.getUTCFullYear()) return NextResponse.json({ error: "Choose a year from 1991." }, { status: 400 });
  const cache = (g.__snsClimateGrid ??= new Map());
  const hit = cache.get(year);
  const current = year === now.getUTCFullYear();
  if (hit && Date.now() - hit.at < (current ? 12 : 24 * 7) * 3600e3) return respond(hit.body, current);
  try {
    const points = GRID_LATS.flatMap((lat) => GRID_LONS.map((lon) => ({ lat, lon })));
    const end = current ? isoDaysAgo(6, now) : `${year}-12-31`;
    const { source, request, series, fallback } = await fetchRain(points, `${year}-01-01`, end);
    const body = {
      source,
      credit: source === ERA5_LABEL ? ERA5_CREDIT : "Extracted by Sign & Sky's AI through the GI-AI4AFS Spatio-Temporal API.",
      request,
      fallback,
      retrieved_at: new Date().toISOString(),
      year,
      cell_degrees: CELL,
      last_date: series[0].at(-1)?.date ?? null,
      cells: points.map((p, i) => ({ ...p, monthly: monthlyTotals(series[i])[year] ?? Array(12).fill(null) })),
    };
    cache.set(year, { at: Date.now(), body });
    return respond(body, current);
  } catch (e) {
    console.error("climate grid failed", (e as Error).message);
    return NextResponse.json({ error: "Rainfall data are not available right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function respond(body: unknown, current: boolean) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": `public, max-age=3600, s-maxage=${current ? 86400 : 2592000}, stale-while-revalidate=86400` },
  });
}
