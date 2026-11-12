// The pre-registered tests of the 17 Wolaita signs, copied from research/rescore/specs.yaml
// (fixed 6 Nov 2026 before any 2025 rainfall was examined; amendments 7 and 12 Nov 2026 changed measures and location only).
export type Status = "confirmed" | "timing" | "direction";
export type PreregTest = { n: number; rule: "R1" | "R2" | "R3" | "R4"; status: Status; outcomes: string[]; windows: [string, string][]; note?: "kiremt_belg" };

export const PREREG: PreregTest[] = [
  { n: 1, rule: "R1", status: "confirmed", outcomes: ["heavy_rain"], windows: [["2025-06-11", "2025-06-17"]] },
  { n: 2, rule: "R2", status: "confirmed", outcomes: ["below_normal"], windows: [["2025-03-04", "2025-05-31"]] },
  { n: 3, rule: "R4", status: "direction", outcomes: ["rain_onset", "above_normal", "below_normal"], windows: [["2025-06-06", "2025-09-30"], ["2026-03-01", "2026-05-31"]], note: "kiremt_belg" },
  { n: 4, rule: "R4", status: "direction", outcomes: ["not_below_normal", "drought"], windows: [["2025-03-24", "2025-05-31"]] },
  { n: 5, rule: "R1", status: "confirmed", outcomes: ["rain"], windows: [["2025-07-01", "2025-07-07"]] },
  { n: 6, rule: "R1", status: "confirmed", outcomes: ["rain"], windows: [["2025-07-03", "2025-07-09"]] },
  { n: 7, rule: "R2", status: "timing", outcomes: ["normal_rain"], windows: [["2026-03-01", "2026-05-31"]] },
  { n: 8, rule: "R4", status: "direction", outcomes: ["not_below_normal", "drought"], windows: [["2025-03-01", "2025-05-31"]] },
  { n: 9, rule: "R2", status: "confirmed", outcomes: ["normal_rain"], windows: [["2026-03-01", "2026-05-31"]] },
  { n: 10, rule: "R2", status: "confirmed", outcomes: ["drought"], windows: [["2025-03-01", "2025-05-31"]] },
  { n: 11, rule: "R2", status: "timing", outcomes: ["normal_rain"], windows: [["2025-07-04", "2025-09-30"]] },
  { n: 12, rule: "R2", status: "confirmed", outcomes: ["drought"], windows: [["2025-03-02", "2025-05-31"]] },
  { n: 13, rule: "R2", status: "timing", outcomes: ["normal_rain"], windows: [["2025-06-08", "2025-09-30"]] },
  { n: 14, rule: "R3", status: "timing", outcomes: ["rain_onset"], windows: [["2025-03-01", "2025-03-31"]] },
  { n: 15, rule: "R2", status: "confirmed", outcomes: ["not_below_normal"], windows: [["2025-07-05", "2025-09-30"]] },
  { n: 16, rule: "R1", status: "confirmed", outcomes: ["rain"], windows: [["2025-11-26", "2025-12-16"]] },
  { n: 17, rule: "R1", status: "confirmed", outcomes: ["rain"], windows: [["2025-07-09", "2025-07-11"], ["2025-12-04", "2025-12-06"]] },
];

/** Exact expected SNS-Score of a sign with no skill (manuscript Table 8), for 30 and 10 reference years. */
export const BENCHMARKS: { outcome: string; chance30: string; s30: string; s10: string }[] = [
  { outcome: "normal_rain", chance30: "0.48", s30: "4.84", s10: "4.55" },
  { outcome: "below_normal", chance30: "0.35", s30: "4.27", s10: "4.32" },
  { outcome: "not_below_normal", chance30: "0.65", s30: "5.73", s10: "5.68" },
  { outcome: "drought", chance30: "0.23", s30: "3.63", s10: "3.86" },
  { outcome: "rain", chance30: "b", s30: "10 (0.5 b + 0.25)", s10: "10 (0.5 b + 0.25)" },
];
