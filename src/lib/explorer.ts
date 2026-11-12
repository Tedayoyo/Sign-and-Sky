// Explorer groups for the sign library, as the team named them (12 Nov 2026).
// The 17 field records are placed by number; signs added later fall back to their stored category.
export type GroupKey = "sky" | "animals" | "insects" | "wind" | "plants";
export const GROUPS: GroupKey[] = ["sky", "animals", "insects", "wind", "plants"];

const BY_NUMBER: Record<number, GroupKey> = {
  1: "insects", 7: "insects", 10: "insects",
  2: "animals", 9: "animals", 15: "animals", 16: "animals",
  3: "wind", 11: "wind", 12: "wind",
  4: "sky", 5: "sky", 6: "sky", 8: "sky", 13: "sky", 17: "sky",
  14: "plants",
};

const BY_CATEGORY: Record<string, GroupKey> = {
  animal: "animals",
  plant: "plants",
  cloud_wind: "wind",
  atmospheric: "sky",
  celestial: "sky",
};

export function groupFor(recordNumber: number, category: string): GroupKey {
  return BY_NUMBER[recordNumber] ?? BY_CATEGORY[category] ?? "sky";
}
