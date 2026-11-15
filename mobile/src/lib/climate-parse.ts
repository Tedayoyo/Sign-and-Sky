// Reading the website's rainfall answer (no phone features here, so it can be unit-tested).
// Rainfall at the study point, exactly as the website's /api/climate/point reports it.
// Nothing is estimated in the app: a month or season the website reports as missing stays missing.
export type SeasonRow = { year: number; belg: number | null; kiremt: number | null; bega: number | null };
export type StoredClimate = {
  at: string;
  source: string;
  credit: string;
  normal_period: string;
  normal: (number | null)[];
  last_date: string | null;
  /** Monthly totals by year (12 values each); absent in copies saved by the first app version. */
  years?: Record<string, (number | null)[]>;
  seasons?: SeasonRow[];
  season_normal?: { belg: number | null; kiremt: number | null; bega: number | null };
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

export function parseClimate(body: unknown): StoredClimate | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b.source !== "string" || !Array.isArray(b.normal) || b.normal.length !== 12) return null;
  const out: StoredClimate = {
    at: typeof b.retrieved_at === "string" ? b.retrieved_at : new Date().toISOString(),
    source: b.source,
    credit: typeof b.credit === "string" ? b.credit : "",
    normal_period: typeof b.normal_period === "string" ? b.normal_period : "",
    normal: (b.normal as unknown[]).map(num),
    last_date: typeof b.last_date === "string" ? b.last_date : null,
  };
  if (b.years && typeof b.years === "object") {
    const years: Record<string, (number | null)[]> = {};
    for (const [y, m] of Object.entries(b.years as Record<string, unknown>)) {
      if (/^\d{4}$/.test(y) && Array.isArray(m) && m.length === 12) years[y] = m.map(num);
    }
    if (Object.keys(years).length) out.years = years;
  }
  if (Array.isArray(b.seasons)) {
    out.seasons = (b.seasons as Record<string, unknown>[])
      .filter((r) => r && Number.isInteger(r.year))
      .map((r) => ({ year: r.year as number, belg: num(r.belg), kiremt: num(r.kiremt), bega: num(r.bega) }));
  }
  const sn = b.season_normal as Record<string, unknown> | undefined;
  if (sn && typeof sn === "object") out.season_normal = { belg: num(sn.belg), kiremt: num(sn.kiremt), bega: num(sn.bega) };
  return out;
}
