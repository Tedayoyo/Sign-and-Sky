// Types and pure helpers of a sign record, safe to use in the browser (no database code).

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

/** The evaluation used for a place: one tested at that place if any, else the latest one. */
export function evaluationFor(r: SignRecord, place?: string | null): Evaluation | null {
  if (!r.evaluations.length) return null;
  return (place && r.evaluations.find((e) => e.location_slug === place)) || r.evaluations[0];
}

export function tr(r: SignRecord, lang: string): Tr {
  return r.tr[lang] ?? r.tr.en ?? Object.values(r.tr)[0];
}
