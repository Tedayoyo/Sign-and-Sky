// Open JSON of the published library, in both languages, with every test result.
// Used by the offline Sign & Sky Android app to refresh its local copy.
import { NextResponse } from "next/server";
import { publishedSigns } from "@/lib/records";
import { query } from "@/lib/db";
import { trustLevel, METHOD_VERSION } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const [signs, locations] = await Promise.all([
      publishedSigns(),
      query<{ slug: string; name: string; country: string; latitude: number; longitude: number }>(
        "select slug, name, country, latitude, longitude from locations where slug = 'wol'",
      ),
    ]);
    const origin = new URL(req.url).origin;
    const body = {
      name: "Sign & Sky open library",
      version: 1,
      generated_at: new Date().toISOString(),
      languages: ["en", "am"],
      trust_levels: { strong: "score >= 8", fair: "6 <= score < 8", weak: "score < 6" },
      scoring_method: METHOD_VERSION,
      locations,
      signs: signs.map((s) => ({
        number: s.record_number,
        category: s.category,
        indicator_types: s.indicator_types,
        expected_outcome: s.expected_outcome,
        expected_timing: s.expected_timing,
        observation_date: s.observation_date,
        observation_period: s.observation_period,
        verification_status: s.verification_status,
        location: s.location_name,
        source: s.source_reference,
        text: Object.fromEntries(
          Object.entries(s.tr).map(([loc, t]) => [
            loc,
            {
              name: t.name,
              description: t.description,
              behaviour: t.observation_text,
              interpretation: t.interpretation,
              prediction: t.expected_weather,
              usual_delay: t.expected_timing_text,
              farm_decisions: t.agricultural_relevance,
              voice_advice: t.voice_advice,
              keywords: t.keywords,
              translation_status: t.translation_status,
            },
          ]),
        ),
        tests: s.evaluations.map((e) => ({
          score: e.score,
          trust: trustLevel(e.score),
          method: e.method,
          method_version: e.method_version,
          evaluated_on: e.evaluated_on,
          location: e.location_slug,
          predicted_outcome: e.predicted_outcome,
          window: e.window_start ? { start: e.window_start, end: e.window_end } : null,
          data_url: e.weather_outcome_id ? `${origin}/api/v1/tests/${e.weather_outcome_id}` : null,
        })),
      })),
    };
    return NextResponse.json(body, {
      headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Library not available right now." }, { status: 503 });
  }
}
