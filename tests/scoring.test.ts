import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreSign, shiftYears, addDays, trustLevel, percentileOf, type Day } from "../src/lib/scoring";

// Build daily rainfall: `base` mm every day, with an override for the target year window.
function series(from: string, to: string, f: (date: string) => number): Day[] {
  const out: Day[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, mm: f(d) });
  return out;
}

test("trust levels follow the simulator", () => {
  assert.equal(trustLevel(9), "strong");
  assert.equal(trustLevel(8), "strong");
  assert.equal(trustLevel(7.9), "fair");
  assert.equal(trustLevel(6), "fair");
  assert.equal(trustLevel(5.9), "weak");
});

test("29 Feb shifts to 28 Feb in non-leap years", () => {
  assert.equal(shiftYears("2024-02-29", -1), "2023-02-28");
  assert.equal(shiftYears("2025-06-10", -10), "2015-06-10");
});

test("percentile counts ties as half", () => {
  assert.equal(percentileOf(5, [1, 5, 9, 10]), 0.375);
});

test("rain that came and was wetter than every earlier year scores 10", () => {
  const days = series("2014-01-01", "2025-12-31", (d) => (d >= "2025-06-11" && d <= "2025-06-17" ? 6 : 1));
  const r = scoreSign({ days, observationDate: "2025-06-10", windowDays: 7, predicted: "rain", referenceYears: 10 });
  assert.equal(r.happened, true);
  assert.equal(r.target.totalMm, 42);
  assert.equal(r.score, 10);
  assert.equal(r.trust, "strong");
  assert.equal(r.referenceUsed, 10);
});

test("rain that did not come scores 5 or less", () => {
  const days = series("2014-01-01", "2025-12-31", (d) => (d >= "2025-06-11" && d <= "2025-06-17" ? 0 : 3));
  const r = scoreSign({ days, observationDate: "2025-06-10", windowDays: 7, predicted: "rain", referenceYears: 10 });
  assert.equal(r.happened, false);
  assert.ok(r.score <= 5);
  assert.equal(r.trust, "weak");
});

test("drought orientation: drier than all reference years scores 10", () => {
  const days = series("2014-01-01", "2025-12-31", (d) => (d >= "2025-02-20" && d <= "2025-03-21" ? 0 : 2));
  const r = scoreSign({ days, observationDate: "2025-02-19", windowDays: 30, predicted: "drought", referenceYears: 10 });
  assert.equal(r.happened, true);
  assert.equal(r.score, 10);
});

test("heavy rain uses the wettest day", () => {
  const days = series("2014-01-01", "2025-12-31", (d) => (d === "2025-06-13" ? 35 : 2));
  const r = scoreSign({ days, observationDate: "2025-06-10", windowDays: 7, predicted: "heavy_rain", referenceYears: 10 });
  assert.equal(r.happened, true);
  assert.equal(r.actualOutcome, "heavy_rain");
  assert.equal(r.score, 10);
});

test("missing data in the window is refused, not guessed", () => {
  const days = series("2014-01-01", "2025-12-31", (d) => (d === "2025-06-12" ? (NaN as number) : 2));
  assert.throws(() => scoreSign({ days, observationDate: "2025-06-10", windowDays: 7, predicted: "rain", referenceYears: 10 }), /incomplete/);
});

test("too few reference years is refused", () => {
  const days = series("2022-01-01", "2025-12-31", () => 2);
  assert.throws(() => scoreSign({ days, observationDate: "2025-06-10", windowDays: 7, predicted: "rain", referenceYears: 10 }), /at least 5/);
});
