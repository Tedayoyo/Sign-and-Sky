// GI-AI4AFS (NaLamKI / AgriFoodData) Spatio-Temporal API — server-side client.
// Source: https://nalamki.github.io/docs/concepts/apis/spatio-temporal-api and
//         https://nalamki.github.io/docs/api-reference/spatio-temporal and
//         https://nalamki.github.io/docs/quickstart/fetch-data-rest (read 12 Nov 2026).
//
// Access (Keycloak client credentials, as in the docs' "Fetch data via REST" quickstart):
//   POST {GIAI_TOKEN_URL}  grant_type=client_credentials, client_id, client_secret  →  access_token
// Data (bearer token):
//   GET {GIAI_API_URL}/api/v2/collections                                   list collections (bbox, datetime, filter)
//   GET {GIAI_API_URL}/api/v2/collections/{id}/capabilities                 layers and time coordinates
//   GET {GIAI_API_URL}/api/v2/collections/{id}/aggregate/time-series        bbox, datetime, layers, aggregation, resolution
//   GET {GIAI_API_URL}/api/v2/collections/{id}/tiles/WebMercatorQuad/tilejson.json?layers=NDVI
//
// Settings (Vercel environment variables; nothing here is public):
//   GIAI_TOKEN_URL       e.g. https://<keycloak>/realms/main/protocol/openid-connect/token
//   GIAI_CLIENT_ID, GIAI_CLIENT_SECRET
//   GIAI_API_URL         the Spatio-Temporal API base address given with the credentials
//   GIAI_COLLECTION      the collection that covers Wolaita (e.g. Sentinel-2 indices)
// The docs do not publish a production address, response schemas or Ethiopian coverage, so nothing is assumed:
// every answer is passed on as received, and the website says "awaiting access" until the settings exist.

export type GiaiSettings = { tokenUrl: string; clientId: string; clientSecret: string; apiUrl: string; collection: string };

export function giaiSettings(env: Record<string, string | undefined> = process.env): GiaiSettings | null {
  const s = {
    tokenUrl: (env.GIAI_TOKEN_URL || "").trim(),
    clientId: (env.GIAI_CLIENT_ID || "").trim(),
    clientSecret: (env.GIAI_CLIENT_SECRET || "").trim(),
    apiUrl: (env.GIAI_API_URL || "").trim().replace(/\/+$/, ""),
    collection: (env.GIAI_COLLECTION || "").trim(),
  };
  return Object.values(s).every(Boolean) ? s : null;
}

export function giaiConfigured(): boolean {
  return giaiSettings() !== null;
}

export class GiaiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Cached = { token: string; until: number; key: string };
const g = globalThis as unknown as { __snsGiaiToken?: Cached };

export async function giaiToken(s: GiaiSettings, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = `${s.tokenUrl}|${s.clientId}`;
  const c = g.__snsGiaiToken;
  if (c && c.key === key && c.until > Date.now()) return c.token;
  const r = await fetchImpl(s.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: s.clientId, client_secret: s.clientSecret }).toString(),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new GiaiError(`GI-AI4AFS sign-in answered ${r.status}`, r.status);
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new GiaiError("GI-AI4AFS sign-in returned no access token", 502);
  g.__snsGiaiToken = { token: j.access_token, key, until: Date.now() + Math.max(30, (j.expires_in ?? 300) - 30) * 1000 };
  return j.access_token;
}

async function get(s: GiaiSettings, path: string, params: Record<string, string> = {}, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const token = await giaiToken(s, fetchImpl);
  const u = new URL(s.apiUrl + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetchImpl(u.toString(), { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new GiaiError(`GI-AI4AFS answered ${r.status} for ${path}`, r.status);
  return r.json();
}

/** Layers and time coordinates of the configured collection. */
export function giaiCapabilities(s: GiaiSettings, fetchImpl?: typeof fetch) {
  return get(s, `/api/v2/collections/${encodeURIComponent(s.collection)}/capabilities`, {}, fetchImpl);
}

/**
 * Time series of one layer (e.g. NDVI) averaged over a box, as documented:
 * bbox = minLon,minLat,maxLon,maxLat; resolution P1D | P1W | P1M; aggregation mean | min | max | sum | count.
 * The datetime value uses the OGC API interval form (start/end); the GI-AI4AFS docs list the parameter without an example.
 */
export function giaiTimeSeries(
  s: GiaiSettings,
  q: { bbox: [number, number, number, number]; start: string; end: string; layer: string; aggregation?: string; resolution?: "P1D" | "P1W" | "P1M" },
  fetchImpl?: typeof fetch,
) {
  return get(
    s,
    `/api/v2/collections/${encodeURIComponent(s.collection)}/aggregate/time-series`,
    {
      bbox: q.bbox.join(","),
      datetime: `${q.start}/${q.end}`,
      layers: q.layer,
      aggregation: q.aggregation ?? "mean",
      resolution: q.resolution ?? "P1W",
    },
    fetchImpl,
  );
}

/** Wolaita boxes used across the site (minLon, minLat, maxLon, maxLat). */
export const BOXES = {
  offa: [37.4, 6.61, 37.68, 6.83] as [number, number, number, number],
  wolaita: [37.4, 6.5, 38.2, 7.2] as [number, number, number, number],
};
