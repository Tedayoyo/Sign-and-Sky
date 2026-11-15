import { forecastUrl, parseForecast } from "@/lib/forecast";

// Rendered on request (never baked in at build time); the CDN keeps each answer for an hour.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await fetch(forecastUrl(), { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`forecast ${r.status}`);
    const f = parseForecast(await r.json());
    return Response.json(f, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" } });
  } catch (e) {
    console.error("forecast failed", (e as Error).message);
    return Response.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
