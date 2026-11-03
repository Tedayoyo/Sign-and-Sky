// Places served by the voice assistant, and their rain seasons.
// Seasons confirmed by the owner (3 Nov 2026):
//   Ethiopia: Belg = March–May; Kiremt / Meher = June–September; Bega (dry) = October–February.
//   India:    pre-monsoon = March–May; monsoon = June–September; post-monsoon = October–February.
// Coordinates are representative points; the database (locations table) is the source used for weather tests.

export type PlaceSlug = "wol" | "tel" | "har";
export const PLACE_SLUGS: PlaceSlug[] = ["wol", "tel", "har"];

export const PLACES: Record<PlaceSlug, { country: "Ethiopia" | "India"; lat: number; lon: number; dbName: string }> = {
  wol: { country: "Ethiopia", lat: 6.855, lon: 37.761, dbName: "Wolaita" },
  tel: { country: "India", lat: 17.9, lon: 79.1, dbName: "Telangana" },
  har: { country: "India", lat: 29.149, lon: 75.721, dbName: "Haryana" },
};

export type SeasonKey = "belg" | "kiremt" | "bega" | "pre" | "monsoon" | "post";

/** month: 1–12 */
export function seasonFor(place: PlaceSlug, month: number): SeasonKey {
  const ethiopia = PLACES[place].country === "Ethiopia";
  if (month >= 3 && month <= 5) return ethiopia ? "belg" : "pre";
  if (month >= 6 && month <= 9) return ethiopia ? "kiremt" : "monsoon";
  return ethiopia ? "bega" : "post";
}

export function isPlace(x: unknown): x is PlaceSlug {
  return typeof x === "string" && (PLACE_SLUGS as string[]).includes(x);
}
