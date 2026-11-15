import { test } from "node:test";
import assert from "node:assert/strict";
import { forecastUrl, parseForecast, sky } from "../src/lib/forecast";

test("forecast request asks Open-Meteo for 7 days at the Offa study point", () => {
  const u = new URL(forecastUrl());
  assert.equal(u.hostname, "api.open-meteo.com");
  assert.equal(u.searchParams.get("latitude"), "6.75");
  assert.equal(u.searchParams.get("longitude"), "37.5");
  assert.equal(u.searchParams.get("forecast_days"), "7");
  assert.match(u.searchParams.get("daily") || "", /precipitation_sum/);
});

test("forecast answers are read as they are; missing values stay missing", () => {
  const f = parseForecast({ daily: { time: ["2026-11-15", "2026-11-16"], precipitation_sum: [2.4, null], precipitation_probability_max: [60, 10], temperature_2m_max: [24.1, 25], temperature_2m_min: [13, 12.5], weather_code: [61, 2] } }, "2026-11-15T06:00:00Z");
  assert.deepEqual(f.days[0], { date: "2026-11-15", rain: 2.4, chance: 60, tmax: 24.1, tmin: 13, code: 61 });
  assert.equal(f.days[1].rain, null);
  assert.equal(sky(61), "rain");
  assert.equal(sky(2), "partly");
  assert.equal(sky(95), "storm");
  assert.throws(() => parseForecast({}));
});
