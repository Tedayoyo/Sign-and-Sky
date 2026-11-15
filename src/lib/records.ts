// Read model for the knowledge library (public side).
import { query, one } from "./db";
import { dbProblem } from "./dbstatus";
import builtin from "@/data/library.json";

export type { Tr, Evaluation, SignRecord } from "./record-types";
export { evaluationFor, tr } from "./record-types";
import type { SignRecord } from "./record-types";

const SELECT = `
select k.id, k.record_number, k.category, k.indicator_types, k.original_language, k.original_text,
  k.observation_date, k.observation_date_precision, k.observation_period, k.expected_outcome, k.expected_timing,
  k.verification_status, k.is_published, k.source_reference, k.cover_media_id,
  l.name as location_name, l.slug as location_slug,
  coalesce((select json_object_agg(t.locale, json_build_object(
      'locale', t.locale, 'name', t.name, 'description', t.description, 'observation_text', t.observation_text,
      'interpretation', t.interpretation, 'expected_weather', t.expected_weather, 'expected_timing_text', t.expected_timing_text,
      'agricultural_relevance', t.agricultural_relevance, 'translation_status', t.translation_status,
      'keywords', t.keywords, 'voice_advice', t.voice_advice))
    from translations t where t.record_id = k.id), '{}'::json) as tr,
  coalesce((select json_agg(json_build_object(
      'id', e.id, 'score', e.score, 'method', e.method, 'method_version', e.method_version, 'evaluated_on', e.evaluated_on,
      'source', e.source, 'notes', e.notes, 'tested_with', e.tested_with, 'predicted_outcome', e.predicted_outcome,
      'observation_date', e.observation_date, 'window_start', e.window_start, 'window_end', e.window_end,
      'weather_outcome_id', e.weather_outcome_id, 'location_slug', el.slug, 'location_name', el.name, 'created_at', e.created_at)
      order by e.evaluated_on desc nulls last, e.created_at desc)
    from sign_evaluations e left join locations el on el.id = e.location_id where e.record_id = k.id), '[]'::json) as evaluations
from knowledge_records k
left join locations l on l.id = k.location_id`;

/** The 17 published signs as stored in the seed SQL (src/data/library.json). */
export const BUILTIN: SignRecord[] = (builtin as unknown as { signs: SignRecord[] }).signs;

// After a failure, skip the database for 30 seconds so pages stay fast instead of waiting for timeouts.
const g = globalThis as unknown as { __snsDbDownUntil?: number };
function dbLooksDown() {
  return (g.__snsDbDownUntil ?? 0) > Date.now();
}
function logFallback(e: unknown) {
  g.__snsDbDownUntil = Date.now() + 30_000;
  console.error(`[sign-and-sky] Database not reachable, using the built-in library: ${dbProblem(e)}`);
}

/** Published signs from the database; the built-in library when the database cannot be reached. */
export async function publishedSigns(): Promise<SignRecord[]> {
  if (dbLooksDown()) return BUILTIN;
  try {
    return await query<SignRecord>(`${SELECT} where k.is_published order by k.record_number`);
  } catch (e) {
    logFallback(e);
    return BUILTIN;
  }
}

export async function allRecords(): Promise<SignRecord[]> {
  return query<SignRecord>(`${SELECT} order by k.record_number`);
}

export async function recordByNumber(n: number, includeUnpublished = false): Promise<SignRecord | null> {
  if (!Number.isInteger(n) || n < 1) return null;
  if (includeUnpublished) return one<SignRecord>(`${SELECT} where k.record_number = $1`, [n]);
  if (dbLooksDown()) return BUILTIN.find((r) => r.record_number === n) ?? null;
  try {
    return await one<SignRecord>(`${SELECT} where k.record_number = $1 and k.is_published`, [n]);
  } catch (e) {
    logFallback(e);
    return BUILTIN.find((r) => r.record_number === n) ?? null;
  }
}
