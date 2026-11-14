// Dated observations from the 2025 field record (observation_period text of each published sign).
import type { SeasonKey } from "./places";
import { seasonFor } from "./places";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export type Observation = { month: number; day: number | null; year: number; season: SeasonKey };

/** "5 June 2025 and 3 November 2025" → two observations; "February 2025 (…)" → one, day unknown. */
export function parseObservations(period: string): Observation[] {
  const out: Observation[] = [];
  const text = period.toLowerCase();
  const re = /(?:(\d{1,2})\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/g;
  for (const m of text.matchAll(re)) {
    const month = MONTHS.indexOf(m[2]) + 1;
    out.push({ month, day: m[1] ? Number(m[1]) : null, year: Number(m[3]), season: seasonFor("wol", month) });
  }
  return out;
}

/** Position in the year from 0 to 1 (a month-only date sits in the middle of its month). */
export function yearFraction(o: Observation): number {
  const start = Date.UTC(o.year, 0, 1);
  const end = Date.UTC(o.year + 1, 0, 1);
  const days = new Date(Date.UTC(o.year, o.month, 0)).getUTCDate();
  const t = Date.UTC(o.year, o.month - 1, o.day ?? Math.ceil(days / 2));
  return (t - start) / (end - start);
}
