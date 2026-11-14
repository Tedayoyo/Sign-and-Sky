// Reading the website's rainfall answer (no phone features here, so it can be unit-tested).
// Average monthly rainfall at the study point, exactly as the website's /api/climate/point reports it.
// Nothing is estimated in the app: if this has never been downloaded, the calendar says so.
export type StoredClimate = {
  at: string;
  source: string;
  credit: string;
  normal_period: string;
  normal: (number | null)[];
  last_date: string | null;
};

export function parseClimate(body: unknown): StoredClimate | null {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b.source !== "string" || !Array.isArray(b.normal) || b.normal.length !== 12) return null;
  const normal = (b.normal as unknown[]).map((v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null));
  return {
    at: typeof b.retrieved_at === "string" ? b.retrieved_at : new Date().toISOString(),
    source: b.source,
    credit: typeof b.credit === "string" ? b.credit : "",
    normal_period: typeof b.normal_period === "string" ? b.normal_period : "",
    normal,
    last_date: typeof b.last_date === "string" ? b.last_date : null,
  };
}
