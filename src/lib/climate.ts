// Environmental intelligence: real rainfall for Wolaita from ERA5 (Copernicus) via the Open-Meteo Historical Weather API.
// Docs (read 12 Nov 2026): https://open-meteo.com/en/docs/historical-weather-api
//   base https://archive-api.open-meteo.com/v1/archive · daily=precipitation_sum (mm) · ERA5 updated daily with ~5 days delay
//   "Multiple coordinates can be comma separated" → the JSON becomes a list of structures, one per location.
//   Acknowledgement: "Generated using Copernicus Climate Change Service information".
// Nothing is estimated: a month or season with any missing day is reported as null (no value), never filled in.
import type { Day } from "./scoring";

export const ERA5_LABEL = "ERA5 reanalysis (ECMWF / Copernicus Climate Change Service) via the Open-Meteo Historical Weather API";
export const ERA5_CREDIT = "Generated using Copernicus Climate Change Service information. Open-Meteo.com (Zippenfenig, 2023).";

/** Study point (centre of Offa Woreda) and the 0.25° ERA5 grid nodes covering Wolaita Zone. */
export const OFFA = { lat: 6.75, lon: 37.5 };
export const GRID_LATS = [7.0, 6.75, 6.5];
export const GRID_LONS = [37.5, 37.75, 38.0];
export const CELL = 0.25;
export const NORMAL = { from: 1991, to: 2020 };

const base = () => process.env.OPEN_METEO_ARCHIVE_URL_TEST_ONLY || "https://archive-api.open-meteo.com/v1/archive";

export function era5Url(points: { lat: number; lon: number }[], start: string, end: string): string {
  const u = new URL(base());
  u.searchParams.set("latitude", points.map((p) => p.lat.toFixed(4)).join(","));
  u.searchParams.set("longitude", points.map((p) => p.lon.toFixed(4)).join(","));
  u.searchParams.set("start_date", start);
  u.searchParams.set("end_date", end);
  u.searchParams.set("daily", "precipitation_sum");
  u.searchParams.set("models", "era5");
  u.searchParams.set("timezone", "GMT");
  return u.toString();
}

type Raw = { latitude?: number; longitude?: number; daily?: { time?: string[]; precipitation_sum?: (number | null)[] } };

/** One location gives an object, several give a list; both become a list of day series, in request order. */
export function parseSeries(body: unknown): Day[][] {
  const list = (Array.isArray(body) ? body : [body]) as Raw[];
  return list.map((r) => {
    const t = r?.daily?.time ?? [];
    const v = r?.daily?.precipitation_sum ?? [];
    return t.map((date, i) => ({ date: String(date).slice(0, 10), mm: typeof v[i] === "number" && Number.isFinite(v[i]) ? Math.max(0, v[i] as number) : null }));
  });
}

export async function fetchEra5(points: { lat: number; lon: number }[], start: string, end: string, fetchImpl: typeof fetch = fetch) {
  const url = era5Url(points, start, end);
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`Open-Meteo answered ${r.status}`);
  const series = parseSeries(await r.json());
  if (series.length !== points.length) throw new Error("Open-Meteo returned a different number of locations than requested");
  return { url, series };
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Monthly totals by year: years[y][m-1] is the total in mm, or null if any day of that month is missing. */
export function monthlyTotals(days: Day[]): Record<number, (number | null)[]> {
  const acc = new Map<string, { sum: number; n: number; missing: number }>();
  for (const d of days) {
    const k = d.date.slice(0, 7);
    const a = acc.get(k) ?? { sum: 0, n: 0, missing: 0 };
    a.n++;
    if (d.mm === null) a.missing++;
    else a.sum += d.mm;
    acc.set(k, a);
  }
  const out: Record<number, (number | null)[]> = {};
  for (const [k, a] of acc) {
    const y = Number(k.slice(0, 4));
    const m = Number(k.slice(5, 7));
    out[y] ??= Array(12).fill(null);
    out[y][m - 1] = a.missing === 0 && a.n === daysIn(y, m) ? round1(a.sum) : null;
  }
  return out;
}

const sum = (xs: (number | null)[]) => (xs.every((x) => x !== null) ? round1((xs as number[]).reduce((a, b) => a + b, 0)) : null);

export type SeasonRow = { year: number; belg: number | null; kiremt: number | null; bega: number | null };

/** Belg = Mar–May, Kiremt = Jun–Sep, Bega = Oct–Feb (labelled by the year it starts). */
export function seasonTotals(years: Record<number, (number | null)[]>): SeasonRow[] {
  const ys = Object.keys(years).map(Number).sort((a, b) => a - b);
  return ys.map((y) => {
    const m = years[y];
    const next = years[y + 1];
    return {
      year: y,
      belg: sum(m.slice(2, 5)),
      kiremt: sum(m.slice(5, 9)),
      bega: next ? sum([...m.slice(9, 12), ...next.slice(0, 2)]) : null,
    };
  });
}

/** Mean monthly rainfall over the WMO normal period; null for a month if any year in the period is incomplete. */
export function monthlyNormal(years: Record<number, (number | null)[]>, from = NORMAL.from, to = NORMAL.to): (number | null)[] {
  return Array.from({ length: 12 }, (_, i) => {
    const vals: number[] = [];
    for (let y = from; y <= to; y++) {
      const v = years[y]?.[i];
      if (v === null || v === undefined) return null;
      vals.push(v);
    }
    return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
  });
}

export function seasonNormal(rows: SeasonRow[], from = NORMAL.from, to = NORMAL.to) {
  const pick = (k: "belg" | "kiremt" | "bega") => {
    const vals = rows.filter((r) => r.year >= from && r.year <= to).map((r) => r[k]);
    return vals.length === to - from + 1 && vals.every((v) => v !== null) ? round1((vals as number[]).reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  return { belg: pick("belg"), kiremt: pick("kiremt"), bega: pick("bega") };
}

export function isoDaysAgo(n: number, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n));
  return d.toISOString().slice(0, 10);
}
