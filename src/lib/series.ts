// Reads a time series out of a JSON answer whose exact format is not published (GI-AI4AFS aggregations):
// finds the first list of items that each carry a date-like field and a number, and returns them sorted by date.
export type Point = { d: string; v: number };

const DATE_KEYS = ["datetime", "time", "date", "t", "start", "start_datetime"];
const VALUE_KEYS = ["value", "mean", "sum", "NDVI", "ndvi", "precipitation", "precip", "rain", "v"];

export function parseTimeSeries(x: unknown): Point[] {
  const lists: unknown[][] = [];
  const walk = (o: unknown, depth: number) => {
    if (depth > 5 || !o) return;
    if (Array.isArray(o)) lists.push(o);
    if (typeof o === "object") for (const v of Object.values(o as Record<string, unknown>)) walk(v, depth + 1);
  };
  walk(x, 0);
  for (const l of lists) {
    const pts = l
      .map((it) => {
        if (!it || typeof it !== "object" || Array.isArray(it)) return null;
        const o = it as Record<string, unknown>;
        const d = DATE_KEYS.map((k) => o[k]).find((v) => typeof v === "string") as string | undefined;
        let v = VALUE_KEYS.map((k) => o[k]).find((v) => typeof v === "number") as number | undefined;
        if (v === undefined && o.values && typeof o.values === "object") {
          v = Object.values(o.values as Record<string, unknown>).find((x) => typeof x === "number") as number | undefined;
        }
        return d && v !== undefined && Number.isFinite(v) && /^\d{4}-\d{2}-\d{2}/.test(d) ? { d: d.slice(0, 10), v } : null;
      })
      .filter((p): p is Point => p !== null);
    if (pts.length >= 2) return pts.sort((a, b) => a.d.localeCompare(b.d));
  }
  return [];
}
