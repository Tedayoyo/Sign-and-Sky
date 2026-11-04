// The research area: Wolaita, South Ethiopia. All signs were recorded and scored here.
// Seasons confirmed by the owner (3 Nov 2026):
//   Belg = March–May; Kiremt / Meher = June–September; Bega (dry) = October–February.

export type PlaceSlug = "wol";
export const PLACE_SLUGS: PlaceSlug[] = ["wol"];

export const PLACES: Record<PlaceSlug, { country: "Ethiopia"; lat: number; lon: number; dbName: string }> = {
  wol: { country: "Ethiopia", lat: 6.855, lon: 37.761, dbName: "Wolaita" },
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
