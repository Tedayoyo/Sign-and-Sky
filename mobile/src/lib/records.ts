// The sign library as the app holds it: the same record shape as the website (src/lib/records.ts there),
// without the database. The built-in copy ships inside the app; a newer copy is fetched from the
// website's open API when the phone is online (see sync.ts).
import builtin from "@/data/library.json";

export type Tr = {
  locale: string;
  name: string;
  description: string | null;
  observation_text: string | null;
  interpretation: string | null;
  expected_weather: string | null;
  expected_timing_text: string | null;
  agricultural_relevance: string | null;
  translation_status: "original" | "reviewed" | "needs_review";
  keywords: string[];
  voice_advice: string | null;
};

export type Evaluation = {
  id: string;
  score: number;
  method: string | null;
  method_version: string | null;
  evaluated_on: string | null;
  source: string;
  notes: string | null;
  tested_with: string;
  predicted_outcome: string | null;
  observation_date: string | null;
  window_start: string | null;
  window_end: string | null;
  weather_outcome_id: string | null;
  location_slug: string | null;
  location_name: string | null;
  created_at: string;
};

export type SignRecord = {
  id: string;
  record_number: number;
  category: string;
  indicator_types: string[];
  original_language: string;
  original_text: string | null;
  observation_date: string | null;
  observation_date_precision: string | null;
  observation_period: string | null;
  expected_outcome: string;
  expected_timing: string;
  verification_status: string;
  is_published: boolean;
  source_reference: string | null;
  location_name: string | null;
  location_slug: string | null;
  cover_media_id: string | null;
  tr: Record<string, Tr>;
  evaluations: Evaluation[];
};

/** The 17 published signs shipped inside the app. */
export const BUILTIN: SignRecord[] = (builtin as unknown as { signs: SignRecord[] }).signs;

/** The evaluation used for a place: one tested at that place if any, else the latest one. */
export function evaluationFor(r: SignRecord, place?: string | null): Evaluation | null {
  if (!r.evaluations.length) return null;
  return (place && r.evaluations.find((e) => e.location_slug === place)) || r.evaluations[0];
}

export function tr(r: SignRecord, lang: string): Tr {
  return r.tr[lang] ?? r.tr.en ?? Object.values(r.tr)[0];
}

const str = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x : null);

/**
 * Turns the website's open library (GET /api/v1/signs) into app records.
 * Returns null when the answer does not look like a complete library, so a bad download never replaces good data.
 */
export function fromOpenLibrary(body: unknown): SignRecord[] | null {
  const signs = (body as { signs?: unknown })?.signs;
  if (!Array.isArray(signs) || signs.length === 0) return null;
  const out: SignRecord[] = [];
  for (const raw of signs as Record<string, any>[]) {
    const n = Number(raw?.number);
    const text = raw?.text;
    if (!Number.isInteger(n) || n < 1 || !text || typeof text !== "object" || !str(text.en?.name)) return null;
    const trs: Record<string, Tr> = {};
    for (const [loc, t] of Object.entries(text as Record<string, any>)) {
      if (!t || !str(t.name)) continue;
      trs[loc] = {
        locale: loc,
        name: t.name,
        description: str(t.description),
        observation_text: str(t.behaviour),
        interpretation: str(t.interpretation),
        expected_weather: str(t.prediction),
        expected_timing_text: str(t.usual_delay),
        agricultural_relevance: str(t.farm_decisions),
        translation_status: t.translation_status === "original" || t.translation_status === "reviewed" ? t.translation_status : "needs_review",
        keywords: Array.isArray(t.keywords) ? t.keywords.filter((k: unknown) => typeof k === "string") : [],
        voice_advice: str(t.voice_advice),
      };
    }
    const tests = Array.isArray(raw.tests) ? raw.tests : [];
    const evaluations: Evaluation[] = [];
    for (const [i, e] of (tests as Record<string, any>[]).entries()) {
      const score = Number(e?.score);
      if (!Number.isFinite(score) || score < 0 || score > 10) return null;
      const slug = str(e.location);
      evaluations.push({
        id: `api-${n}-${i}`,
        score,
        method: str(e.method),
        method_version: str(e.method_version),
        evaluated_on: str(e.evaluated_on),
        source: str(raw.source) ?? "",
        notes: null,
        tested_with: "Sign & Sky platform",
        predicted_outcome: str(e.predicted_outcome),
        observation_date: str(raw.observation_date),
        window_start: str(e.window?.start),
        window_end: str(e.window?.end),
        weather_outcome_id: str(e.data_url),
        location_slug: slug,
        location_name: slug === "wol" ? "Wolaita" : slug,
        created_at: str(e.evaluated_on) ?? "",
      });
    }
    out.push({
      id: `api-${n}`,
      record_number: n,
      category: str(raw.category) ?? "other",
      indicator_types: Array.isArray(raw.indicator_types) ? raw.indicator_types : [],
      original_language: "en",
      original_text: null,
      observation_date: str(raw.observation_date),
      observation_date_precision: null,
      observation_period: str(raw.observation_period),
      expected_outcome: str(raw.expected_outcome) ?? "unknown",
      expected_timing: str(raw.expected_timing) ?? "other_unknown",
      verification_status: str(raw.verification_status) ?? "tested",
      is_published: true,
      source_reference: str(raw.source),
      location_name: str(raw.location),
      location_slug: "wol",
      cover_media_id: null,
      tr: trs,
      evaluations,
    });
  }
  return out.sort((a, b) => a.record_number - b.record_number);
}
