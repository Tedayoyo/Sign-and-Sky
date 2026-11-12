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
