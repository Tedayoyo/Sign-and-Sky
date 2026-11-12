// Weather tests: fetch historical daily rainfall, score the sign with sns-score-v1, and keep the full data trail.
// ERA5 via the Open-Meteo Historical Weather API (free, no key, about 6 days behind real time).
// CHIRPS via a small extractor you run yourself (see README): GET ?lat=&lon=&start=&end= → { dates: [...], precipitation: [...] }.
import { tx } from "./db";
import { giaiDailyRain, giaiRain } from "./giai";
import { era5Url } from "./climate";
import { addDays, scoreSign, shiftYears, windowFor, METHOD_VERSION, THRESHOLDS, type Day, type Outcome, TESTABLE } from "./scoring";

export type Source = "era5" | "chirps" | "giai";

export const SOURCE_LABEL: Record<Source, string> = {
  era5: "ERA5 reanalysis (ECMWF) via the Open-Meteo Historical Weather API",
  chirps: "CHIRPS v2.0 daily rainfall (UCSB Climate Hazards Center) via the Sign & Sky CHIRPS extractor",
  giai: "Rainfall extracted by Sign & Sky's AI from the GI-AI4AFS Spatio-Temporal API",
};

export function availableSources(): Source[] {
  const list: Source[] = [];
  if (giaiRain()) list.push("giai");
  list.push("era5");
  if (process.env.CHIRPS_ENDPOINT) list.push("chirps");
  return list;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export async function fetchDaily(
  source: Source,
  lat: number,
  lon: number,
  start: string,
  end: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<{ url: string; days: Day[] }> {
  let url: string;
  if (source === "giai") {
    const r = await giaiDailyRain(lat, lon, start, end);
    return { url: r.label, days: r.days };
  }
  if (source === "era5") {
    url = era5Url([{ lat, lon }], start, end); // same request as the Environment page
  } else {
    const base = process.env.CHIRPS_ENDPOINT;
    if (!base) throw new Error("CHIRPS is not connected yet (CHIRPS_ENDPOINT is empty).");
    const u = new URL(base);
    u.searchParams.set("lat", String(lat));
    u.searchParams.set("lon", String(lon));
    u.searchParams.set("start", start);
    u.searchParams.set("end", end);
    url = u.toString();
  }
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(url);
  } catch {
    throw new Error(`Could not reach the weather service (${new URL(url).host}). Check the server's internet access and try again.`);
  }
  if (!res.ok) throw new Error(`The weather service answered with status ${res.status}.`);
  const body = (await res.json()) as Record<string, unknown>;
  let dates: unknown, values: unknown;
  if (source === "era5") {
    const daily = (body.daily ?? {}) as Record<string, unknown>;
    dates = daily.time;
    values = daily.precipitation_sum;
  } else {
    dates = body.dates;
    values = body.precipitation;
  }
  if (!Array.isArray(dates) || !Array.isArray(values) || dates.length !== values.length)
    throw new Error("The weather service returned data in an unexpected shape.");
  const days: Day[] = dates.map((d, i) => {
    const v = values[i];
    return { date: String(d).slice(0, 10), mm: typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : null };
  });
  return { url, days };
}

export type TestInput = {
  recordId: string;
  location: { id: string; name: string; latitude: number; longitude: number };
  observationDate: string;
  predicted: Outcome;
  windowDays: number;
  referenceYears: number;
  source: Source;
  userId: string | null;
  notes?: string;
  today?: string;
};

export async function runWeatherTest(input: TestInput, fetchImpl?: FetchLike) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.observationDate)) throw new Error("The observation date must be a full date (yyyy-mm-dd).");
  if (!TESTABLE.includes(input.predicted)) throw new Error("Choose the outcome the sign predicts.");
  const refYears = Math.round(input.referenceYears);
  if (!(refYears >= THRESHOLDS.minReferenceYears && refYears <= 30)) throw new Error("Reference years must be between 5 and 30.");
  const w = windowFor(input.observationDate, input.windowDays);
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const lag = input.source === "chirps" ? 1 : 6;
  if (w.end > addDays(today, -lag))
    throw new Error(`The prediction window ends on ${w.end}; recorded data is only available up to about ${addDays(today, -lag)}. Try again after that date.`);
  const start = shiftYears(w.start, -refYears);
  const { url, days } = await fetchDaily(input.source, input.location.latitude, input.location.longitude, start, w.end, fetchImpl);
  const result = scoreSign({
    days,
    observationDate: input.observationDate,
    windowDays: input.windowDays,
    predicted: input.predicted,
    referenceYears: refYears,
  });
  const used = new Set<string>();
  for (const s of [result.target, ...result.reference])
    for (let d = s.start; d <= s.end; d = addDays(d, 1)) used.add(d);
  const payload = {
    method_version: METHOD_VERSION,
    source: input.source,
    source_label: SOURCE_LABEL[input.source],
    request_url: url,
    retrieved_at: new Date().toISOString(),
    location: input.location,
    observation_date: input.observationDate,
    predicted: input.predicted,
    window_days: input.windowDays,
    reference_years: refYears,
    thresholds: THRESHOLDS,
    target: result.target,
    reference: result.reference,
    happened: result.happened,
    percentile: result.percentile,
    oriented: result.oriented,
    score: result.score,
    calculation: result.explanation,
    daily: days.filter((d) => used.has(d.date)),
  };
  const ids = await tx(async (c) => {
    const wo = await c.query(
      `insert into weather_outcomes (record_id, source_type, actual_outcome, conditions_text, rainfall_mm, period_start, period_end,
         data_source, dataset_payload, latitude, longitude, notes, created_by)
       values ($1,'external_dataset',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
      [
        input.recordId,
        result.actualOutcome,
        `${result.target.totalMm} mm in ${input.windowDays} days; wettest day ${result.target.maxDayMm} mm; ${result.target.wetDays} wet days.`,
        result.target.totalMm,
        result.target.start,
        result.target.end,
        SOURCE_LABEL[input.source],
        JSON.stringify(payload),
        input.location.latitude,
        input.location.longitude,
        input.notes || null,
        input.userId,
      ],
    );
    const ev = await c.query(
      `insert into sign_evaluations (record_id, score, tested_with, method, evaluated_on, source, notes, created_by,
         location_id, weather_outcome_id, predicted_outcome, observation_date, window_start, window_end, method_version)
       values ($1,$2,'Sign & Sky test tool',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
      [
        input.recordId,
        result.score,
        result.explanation,
        today,
        SOURCE_LABEL[input.source],
        input.notes || null,
        input.userId,
        input.location.id,
        wo.rows[0].id,
        input.predicted,
        input.observationDate,
        result.target.start,
        result.target.end,
        METHOD_VERSION,
      ],
    );
    return { outcomeId: wo.rows[0].id as string, evaluationId: ev.rows[0].id as string };
  });
  return { ...ids, result };
}
