import { test } from "node:test";
import assert from "node:assert/strict";
import { giaiSettings, giaiTimeSeries, giaiCapabilities, BOXES } from "../src/lib/giai";

const env = {
  GIAI_TOKEN_URL: "https://auth.example/realms/main/protocol/openid-connect/token",
  GIAI_CLIENT_ID: "sign-and-sky",
  GIAI_CLIENT_SECRET: "s3cret",
  GIAI_API_URL: "https://st.example/",
  GIAI_COLLECTION: "wolaita-s2-2025",
};

test("GI-AI4AFS stays off until every setting exists", () => {
  assert.equal(giaiSettings({}), null);
  assert.equal(giaiSettings({ ...env, GIAI_CLIENT_SECRET: "" }), null);
  assert.equal(giaiSettings(env)?.apiUrl, "https://st.example");
});

test("requests follow the documented token and time-series endpoints", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 300 }), { status: 200 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
  const s = giaiSettings(env)!;
  await giaiTimeSeries(s, { bbox: BOXES.offa, start: "2025-06-01T00:00:00Z", end: "2025-06-30T23:59:59Z", layer: "NDVI" }, f);
  await giaiCapabilities(s, f);
  assert.equal(calls[0].url, env.GIAI_TOKEN_URL);
  assert.equal(calls[0].init?.method, "POST");
  assert.match(String(calls[0].init?.body), /grant_type=client_credentials/);
  const u = new URL(calls[1].url);
  assert.equal(u.origin + u.pathname, "https://st.example/api/v2/collections/wolaita-s2-2025/aggregate/time-series");
  assert.equal(u.searchParams.get("bbox"), "37.4,6.61,37.68,6.83");
  assert.equal(u.searchParams.get("layers"), "NDVI");
  assert.equal(u.searchParams.get("resolution"), "P1W");
  assert.equal((calls[1].init?.headers as Record<string, string>).authorization, "Bearer tok");
  assert.equal(calls.filter((c) => c.url.includes("/token")).length, 1, "token is reused while valid");
  assert.equal(new URL(calls[2].url).pathname, "/api/v2/collections/wolaita-s2-2025/capabilities");
});

test("time series are read from common answer shapes", async () => {
  const { parseTimeSeries } = await import("../src/lib/series");
  assert.deepEqual(parseTimeSeries({ data: [{ datetime: "2025-06-02T00:00:00Z", mean: 2 }, { datetime: "2025-06-01T00:00:00Z", mean: 1 }] }), [
    { d: "2025-06-01", v: 1 },
    { d: "2025-06-02", v: 2 },
  ]);
  assert.deepEqual(parseTimeSeries({ series: [{ time: "2025-01-01", values: { precipitation: 3.5 } }, { time: "2025-01-02", values: { precipitation: 0 } }] }).length, 2);
  assert.deepEqual(parseTimeSeries({ nothing: "here" }), []);
});

test("rainfall comes from GI-AI4AFS when configured, days it does not return stay missing", async () => {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  process.env.GIAI_RAIN_COLLECTION = "wolaita-chirps";
  const { giaiDailyRain } = await import("../src/lib/giai");
  const f = (async (url: string | URL) => {
    if (String(url).includes("/token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 300 }), { status: 200 });
    const u = new URL(String(url));
    assert.match(u.pathname, /collections\/wolaita-chirps\/aggregate\/time-series$/);
    assert.equal(u.searchParams.get("layers"), "precipitation");
    assert.equal(u.searchParams.get("resolution"), "P1D");
    return new Response(JSON.stringify({ data: [{ datetime: "2025-06-01", value: 4.2 }, { datetime: "2025-06-03", value: 0 }] }), { status: 200 });
  }) as typeof fetch;
  const r = await giaiDailyRain(6.75, 37.5, "2025-06-01", "2025-06-03", f);
  assert.deepEqual(r.days, [{ date: "2025-06-01", mm: 4.2 }, { date: "2025-06-02", mm: null }, { date: "2025-06-03", mm: 0 }]);
  assert.match(r.label, /GI-AI4AFS/);
});

test("if GI-AI4AFS fails, rainfall falls back to ERA5 and says why", async () => {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  process.env.GIAI_RAIN_COLLECTION = "wolaita-chirps";
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const s = String(url);
    if (s.includes("/token")) return new Response("no", { status: 401 });
    return new Response(JSON.stringify({ daily: { time: ["2025-06-01"], precipitation_sum: [3] } }), { status: 200 });
  }) as typeof fetch;
  try {
    const g = globalThis as unknown as { __snsGiaiToken?: unknown };
    delete g.__snsGiaiToken;
    const { fetchRain, ERA5_LABEL } = await import("../src/lib/climate");
    const r = await fetchRain([{ lat: 6.75, lon: 37.5 }], "2025-06-01", "2025-06-01");
    assert.equal(r.source, ERA5_LABEL);
    assert.match(String(r.fallback), /GI-AI4AFS/);
    assert.deepEqual(r.series[0], [{ date: "2025-06-01", mm: 3 }]);
  } finally {
    globalThis.fetch = real;
    delete process.env.GIAI_RAIN_COLLECTION;
  }
});
