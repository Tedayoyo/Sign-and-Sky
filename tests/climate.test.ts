import { test } from "node:test";
import assert from "node:assert/strict";
import { era5Url, fetchEra5, monthlyNormal, monthlyTotals, parseSeries, seasonNormal, seasonTotals } from "../src/lib/climate";
import type { Day } from "../src/lib/scoring";

function days(from: string, to: string, mm: (d: string) => number | null): Day[] {
  const out: Day[] = [];
  for (let t = Date.parse(from + "T00:00:00Z"); t <= Date.parse(to + "T00:00:00Z"); t += 864e5) {
    const d = new Date(t).toISOString().slice(0, 10);
    out.push({ date: d, mm: mm(d) });
  }
  return out;
}

test("the request follows the documented Open-Meteo archive form, several points in one call", () => {
  const u = new URL(era5Url([{ lat: 6.75, lon: 37.5 }, { lat: 7, lon: 38 }], "2025-01-01", "2025-12-31"));
  assert.equal(u.origin + u.pathname, "https://archive-api.open-meteo.com/v1/archive");
  assert.equal(u.searchParams.get("latitude"), "6.7500,7.0000");
  assert.equal(u.searchParams.get("longitude"), "37.5000,38.0000");
  assert.equal(u.searchParams.get("daily"), "precipitation_sum");
  assert.equal(u.searchParams.get("models"), "era5");
});

test("one location (object) and several (list) are both read", async () => {
  const one = { daily: { time: ["2025-01-01", "2025-01-02"], precipitation_sum: [1.5, null] } };
  assert.deepEqual(parseSeries(one), [[{ date: "2025-01-01", mm: 1.5 }, { date: "2025-01-02", mm: null }]]);
  assert.equal(parseSeries([one, one]).length, 2);
  const f = (async () => new Response(JSON.stringify([one]), { status: 200 })) as unknown as typeof fetch;
  await assert.rejects(fetchEra5([{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }], "2025-01-01", "2025-01-02", f), /different number of locations/);
});

test("months are summed only when every day is present", () => {
  const d = days("2024-01-01", "2024-03-31", (x) => (x === "2024-02-10" ? null : 2));
  const y = monthlyTotals(d)[2024];
  assert.equal(y[0], 62); // 31 days × 2 mm
  assert.equal(y[1], null); // one missing day in February
  assert.equal(y[2], 62);
  assert.equal(y[3], null); // not in the data
  const partial = monthlyTotals(days("2024-04-01", "2024-04-15", () => 1))[2024];
  assert.equal(partial[3], null, "a month that is not finished has no total");
});

test("seasons follow Belg Mar–May, Kiremt Jun–Sep, Bega Oct–Feb, and the normal needs every year", () => {
  const d = days("1991-01-01", "2021-02-28", (x) => (Number(x.slice(5, 7)) >= 6 && Number(x.slice(5, 7)) <= 9 ? 5 : 1));
  const years = monthlyTotals(d);
  const s = seasonTotals(years);
  const y2000 = s.find((r) => r.year === 2000)!;
  assert.equal(y2000.belg, 92); // 31+30+31 days × 1
  assert.equal(y2000.kiremt, 610); // 122 days × 5
  assert.equal(y2000.bega, 151); // Oct–Dec 2000 (92) + Jan–Feb 2001 (59)
  assert.equal(s.find((r) => r.year === 2021)!.bega, null);
  const n = monthlyNormal(years);
  assert.equal(n[6], 155); // July: 31 × 5
  assert.equal(seasonNormal(s).kiremt, 610);
  assert.equal(monthlyNormal(years, 1990, 2020)[0], null, "1990 is missing, so no normal is claimed");
});
