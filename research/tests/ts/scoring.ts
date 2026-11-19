// Sign & Sky test score, version sns-score-v1.
// Pure functions only (no network, no database) so the method can be unit-tested and cited.
//
// A farmer sees a sign on day D and predicts an outcome (rain, heavy rain, normal rain,
// rain onset, dry, drought) within W days. We take daily rainfall for the window D+1 … D+W,
// and the same calendar window in each of the N previous years (the reference years).
//
//   H = 1 if the predicted outcome happened in the window, else 0        (did it come true?)
//   P = where the window sits among the reference years, 0–1,           (was it unusual in the
//       oriented toward the prediction                                   direction the sign said?)
//   score = 10 × (0.5·H + 0.5·P), rounded to one decimal
//
// So a prediction that came true and was wetter (or drier) than every reference year scores 10;
// one that came true in an ordinary way scores about 7.5; one that did not come true scores 5 or less.
// Trust levels (owner, 5 Nov 2026): Very strong ≥ 9, Strong 8–8.9, Fair 7–7.9, Weak < 7.

export const METHOD_VERSION = "sns-score-v1";

export type Outcome = "rain" | "heavy_rain" | "normal_rain" | "rain_onset" | "dry" | "drought";
export const TESTABLE: Outcome[] = ["rain", "heavy_rain", "normal_rain", "rain_onset", "dry", "drought"];

export const THRESHOLDS = {
  wetDayMm: 1, // a day with at least 1 mm is a wet day
  heavyDayMm: 20, // a day with at least 20 mm is a heavy-rain day
  rainTotalMm: 10, // "rain" happened if the window total is at least 10 mm
  onset3DayMm: 20, // "rain onset": a 3-day total of at least 20 mm with at least 2 wet days
  dryTotalMm: 5, // "dry" happened if the total is under 5 mm, or under half the reference median
  droughtPct: 0.2, // "drought" happened if the total is at or below the 20th percentile of reference years
  normalBand: [0.25, 0.75] as [number, number], // "normal rain": total between the 25th and 75th percentile
  minReferenceYears: 5,
};

// Default window length (days) when the record does not say how soon the outcome should come.
export const DEFAULT_WINDOW: Record<Outcome, number> = {
  rain: 7,
  heavy_rain: 7,
  rain_onset: 21,
  normal_rain: 30,
  dry: 30,
  drought: 30,
};

export const TIMING_WINDOW: Record<string, number | null> = {
  within_1_week: 7,
  within_3_weeks: 21,
  within_1_month: 30,
  season: 90,
  other_unknown: null,
};

export type Day = { date: string; mm: number | null };

export type WindowStats = {
  year: number;
  start: string;
  end: string;
  totalMm: number;
  maxDayMm: number;
  wetDays: number;
  max3DayMm: number;
  complete: boolean;
};

export type ScoreResult = {
  version: string;
  predicted: Outcome;
  windowDays: number;
  target: WindowStats;
  reference: WindowStats[];
  referenceUsed: number;
  happened: boolean;
  percentile: number; // raw percentile of the target among reference years (wetter = higher)
  oriented: number; // P
  score: number;
  trust: TrustLevel;
  actualOutcome: "heavy_rain" | "rain" | "light_rain" | "dry";
  explanation: string;
};

// ---------- dates (UTC, ISO yyyy-mm-dd) ----------
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function shiftYears(iso: string, years: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  // 29 Feb in a non-leap year becomes 28 Feb
  const last = new Date(Date.UTC(y + years, m, 0)).getUTCDate();
  return `${y + years}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function windowFor(observationDate: string, windowDays: number) {
  return { start: addDays(observationDate, 1), end: addDays(observationDate, windowDays) };
}

export type TrustLevel = "very_strong" | "strong" | "fair" | "weak";
export const TRUST_LEVELS: TrustLevel[] = ["very_strong", "strong", "fair", "weak"];

export function trustLevel(score: number): TrustLevel {
  return score >= 9 ? "very_strong" : score >= 8 ? "strong" : score >= 7 ? "fair" : "weak";
}

export function statsFor(days: Map<string, number | null>, start: string, end: string, year: number): WindowStats {
  let total = 0,
    max = 0,
    wet = 0,
    complete = true;
  const vals: number[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const v = days.get(d);
    if (v === undefined || v === null || Number.isNaN(v)) {
      complete = false;
      vals.push(0);
      continue;
    }
    total += v;
    max = Math.max(max, v);
    if (v >= THRESHOLDS.wetDayMm) wet++;
    vals.push(v);
  }
  let max3 = 0;
  for (let i = 0; i + 2 < vals.length; i++) {
    const s = vals[i] + vals[i + 1] + vals[i + 2];
    const wetIn3 = [vals[i], vals[i + 1], vals[i + 2]].filter((v) => v >= THRESHOLDS.wetDayMm).length;
    if (wetIn3 >= 2) max3 = Math.max(max3, s);
  }
  const r = (x: number) => Math.round(x * 10) / 10;
  return { year, start, end, totalMm: r(total), maxDayMm: r(max), wetDays: wet, max3DayMm: r(max3), complete };
}

export function percentileOf(x: number, ref: number[]): number {
  if (!ref.length) return 0.5;
  let below = 0,
    equal = 0;
  for (const v of ref) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  return (below + 0.5 * equal) / ref.length;
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function classifyActual(s: WindowStats): ScoreResult["actualOutcome"] {
  if (s.maxDayMm >= THRESHOLDS.heavyDayMm) return "heavy_rain";
  if (s.totalMm >= THRESHOLDS.rainTotalMm) return "rain";
  if (s.totalMm >= THRESHOLDS.wetDayMm) return "light_rain";
  return "dry";
}

export function scoreSign(input: {
  days: Day[];
  observationDate: string;
  windowDays: number;
  predicted: Outcome;
  referenceYears: number;
}): ScoreResult {
  const { observationDate, windowDays, predicted, referenceYears } = input;
  if (!TESTABLE.includes(predicted)) throw new Error(`"${predicted}" cannot be tested automatically.`);
  if (!(windowDays >= 1 && windowDays <= 120)) throw new Error("The window must be between 1 and 120 days.");
  const map = new Map(input.days.map((d) => [d.date, d.mm]));
  const w = windowFor(observationDate, windowDays);
  const targetYear = Number(w.start.slice(0, 4));
  const target = statsFor(map, w.start, w.end, targetYear);
  if (!target.complete) throw new Error("The weather data for the prediction window is incomplete, so the sign cannot be scored yet.");

  const reference: WindowStats[] = [];
  for (let y = 1; y <= referenceYears; y++) {
    reference.push(statsFor(map, shiftYears(w.start, -y), shiftYears(w.end, -y), targetYear - y));
  }
  const used = reference.filter((r) => r.complete);
  if (used.length < THRESHOLDS.minReferenceYears)
    throw new Error(`Only ${used.length} complete reference years were found; at least ${THRESHOLDS.minReferenceYears} are needed.`);

  const totals = used.map((r) => r.totalMm);
  const maxes = used.map((r) => r.maxDayMm);
  const onsets = used.map((r) => r.max3DayMm);
  const pTotal = percentileOf(target.totalMm, totals);

  let happened = false,
    percentile = pTotal,
    oriented = pTotal,
    why = "";
  const T = THRESHOLDS;
  switch (predicted) {
    case "rain":
      happened = target.totalMm >= T.rainTotalMm;
      why = `rain counts as happened when the window total reaches ${T.rainTotalMm} mm`;
      break;
    case "heavy_rain":
      happened = target.maxDayMm >= T.heavyDayMm;
      percentile = oriented = percentileOf(target.maxDayMm, maxes);
      why = `heavy rain counts as happened when one day reaches ${T.heavyDayMm} mm; the comparison uses the wettest day`;
      break;
    case "rain_onset":
      happened = target.max3DayMm >= T.onset3DayMm;
      percentile = oriented = percentileOf(target.max3DayMm, onsets);
      why = `onset counts as happened when 3 days bring ${T.onset3DayMm} mm with at least 2 wet days`;
      break;
    case "normal_rain":
      happened = pTotal >= T.normalBand[0] && pTotal <= T.normalBand[1];
      oriented = 1 - 2 * Math.abs(pTotal - 0.5);
      why = "normal rain counts as happened when the total falls between the 25th and 75th percentile of the reference years";
      break;
    case "dry":
      happened = target.totalMm < Math.max(T.dryTotalMm, 0.5 * median(totals));
      oriented = 1 - pTotal;
      why = `dry counts as happened when the total is under ${T.dryTotalMm} mm or under half the reference median`;
      break;
    case "drought":
      happened = pTotal <= T.droughtPct || target.totalMm < T.dryTotalMm;
      oriented = 1 - pTotal;
      why = "drought counts as happened when the total is at or below the 20th percentile of the reference years";
      break;
  }
  const score = Math.round(10 * (0.5 * (happened ? 1 : 0) + 0.5 * oriented) * 10) / 10;
  const explanation =
    `${happened ? "The predicted outcome happened" : "The predicted outcome did not happen"} in ${w.start} to ${w.end} ` +
    `(${target.totalMm} mm total, wettest day ${target.maxDayMm} mm; ${why}). ` +
    `Compared with the same window in ${used.length} earlier years, the result ranks at ${Math.round(percentile * 100)}%` +
    `${predicted === "dry" || predicted === "drought" ? " (lower is drier)" : ""}. Score = 10 × (0.5 × ${happened ? 1 : 0} + 0.5 × ${oriented.toFixed(2)}) = ${score}.`;
  return {
    version: METHOD_VERSION,
    predicted,
    windowDays,
    target,
    reference,
    referenceUsed: used.length,
    happened,
    percentile,
    oriented,
    score,
    trust: trustLevel(score),
    actualOutcome: classifyActual(target),
    explanation,
  };
}
