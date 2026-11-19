const METHOD_VERSION = "sns-score-v1";
const TESTABLE = ["rain", "heavy_rain", "normal_rain", "rain_onset", "dry", "drought"];
const THRESHOLDS = {
  wetDayMm: 1,
  // a day with at least 1 mm is a wet day
  heavyDayMm: 20,
  // a day with at least 20 mm is a heavy-rain day
  rainTotalMm: 10,
  // "rain" happened if the window total is at least 10 mm
  onset3DayMm: 20,
  // "rain onset": a 3-day total of at least 20 mm with at least 2 wet days
  dryTotalMm: 5,
  // "dry" happened if the total is under 5 mm, or under half the reference median
  droughtPct: 0.2,
  // "drought" happened if the total is at or below the 20th percentile of reference years
  normalBand: [0.25, 0.75],
  // "normal rain": total between the 25th and 75th percentile
  minReferenceYears: 5
};
const DEFAULT_WINDOW = {
  rain: 7,
  heavy_rain: 7,
  rain_onset: 21,
  normal_rain: 30,
  dry: 30,
  drought: 30
};
const TIMING_WINDOW = {
  within_1_week: 7,
  within_3_weeks: 21,
  within_1_month: 30,
  season: 90,
  other_unknown: null
};
function addDays(iso, n) {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function shiftYears(iso, years) {
  const [y, m, d] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y + years, m, 0)).getUTCDate();
  return `${y + years}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
function windowFor(observationDate, windowDays) {
  return { start: addDays(observationDate, 1), end: addDays(observationDate, windowDays) };
}
const TRUST_LEVELS = ["very_strong", "strong", "fair", "weak"];
function trustLevel(score) {
  return score >= 9 ? "very_strong" : score >= 8 ? "strong" : score >= 7 ? "fair" : "weak";
}
function statsFor(days, start, end, year) {
  let total = 0, max = 0, wet = 0, complete = true;
  const vals = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const v = days.get(d);
    if (v === void 0 || v === null || Number.isNaN(v)) {
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
  const r = (x) => Math.round(x * 10) / 10;
  return { year, start, end, totalMm: r(total), maxDayMm: r(max), wetDays: wet, max3DayMm: r(max3), complete };
}
function percentileOf(x, ref) {
  if (!ref.length) return 0.5;
  let below = 0, equal = 0;
  for (const v of ref) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  return (below + 0.5 * equal) / ref.length;
}
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function classifyActual(s) {
  if (s.maxDayMm >= THRESHOLDS.heavyDayMm) return "heavy_rain";
  if (s.totalMm >= THRESHOLDS.rainTotalMm) return "rain";
  if (s.totalMm >= THRESHOLDS.wetDayMm) return "light_rain";
  return "dry";
}
function scoreSign(input) {
  const { observationDate, windowDays, predicted, referenceYears } = input;
  if (!TESTABLE.includes(predicted)) throw new Error(`"${predicted}" cannot be tested automatically.`);
  if (!(windowDays >= 1 && windowDays <= 120)) throw new Error("The window must be between 1 and 120 days.");
  const map = new Map(input.days.map((d) => [d.date, d.mm]));
  const w = windowFor(observationDate, windowDays);
  const targetYear = Number(w.start.slice(0, 4));
  const target = statsFor(map, w.start, w.end, targetYear);
  if (!target.complete) throw new Error("The weather data for the prediction window is incomplete, so the sign cannot be scored yet.");
  const reference = [];
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
  let happened = false, percentile = pTotal, oriented = pTotal, why = "";
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
  const explanation = `${happened ? "The predicted outcome happened" : "The predicted outcome did not happen"} in ${w.start} to ${w.end} (${target.totalMm} mm total, wettest day ${target.maxDayMm} mm; ${why}). Compared with the same window in ${used.length} earlier years, the result ranks at ${Math.round(percentile * 100)}%${predicted === "dry" || predicted === "drought" ? " (lower is drier)" : ""}. Score = 10 \xD7 (0.5 \xD7 ${happened ? 1 : 0} + 0.5 \xD7 ${oriented.toFixed(2)}) = ${score}.`;
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
    explanation
  };
}
export {
  DEFAULT_WINDOW,
  METHOD_VERSION,
  TESTABLE,
  THRESHOLDS,
  TIMING_WINDOW,
  TRUST_LEVELS,
  addDays,
  classifyActual,
  percentileOf,
  scoreSign,
  shiftYears,
  statsFor,
  trustLevel,
  windowFor
};
