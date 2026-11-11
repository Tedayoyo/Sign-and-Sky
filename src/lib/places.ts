// The research area: Offa Woreda, Wolaita Zone, South Ethiopia. The 2025 survey (283 households in the kebeles
// W/Dekeya, Wareza and Yakima) took place here. Weather tests use the centre of Offa Woreda (6.75° N, 37.50° E),
// the paper's primary analysis point; the earlier point was Wolaita Sodo (6.855, 37.761).
// Seasons confirmed by the owner (3 Nov 2026):
//   Belg = March–May; Kiremt / Meher = June–September; Bega (dry) = October–February.

export type PlaceSlug = "wol";
export const PLACE_SLUGS: PlaceSlug[] = ["wol"];

export const PLACES: Record<PlaceSlug, { country: "Ethiopia"; lat: number; lon: number; dbName: string }> = {
  wol: { country: "Ethiopia", lat: 6.75, lon: 37.5, dbName: "Wolaita" },
};

export type SeasonKey = "belg" | "kiremt" | "bega";

/** month: 1–12 */
export function seasonFor(_place: PlaceSlug, month: number): SeasonKey {
  if (month >= 3 && month <= 5) return "belg";
  if (month >= 6 && month <= 9) return "kiremt";
  return "bega";
}

export function isPlace(x: unknown): x is PlaceSlug {
  return typeof x === "string" && (PLACE_SLUGS as string[]).includes(x);
}
