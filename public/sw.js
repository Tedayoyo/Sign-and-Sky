/* Sign & Sky service worker: makes the site installable and usable without a connection.
   - Pages: network first (3 s), then the saved copy, then the offline page.
   - Built files, photos, fonts and recorded Amharic answers: saved on first use.
   - The library (/api/library) and rainfall averages: last good copy, refreshed when online.
   - Research pages, sign-in and sharing are never cached. */
const VERSION = "sns-v1";
const CORE = `${VERSION}-core`;
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const DATA = `${VERSION}-data`;
const PRECACHE = ["/en/offline", "/am/offline", "/icon.svg", "/icons/icon-192.png", "/manifest.webmanifest", "/api/library"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CORE)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
}

async function networkFirst(req, cacheName, ms) {
  const c = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(req), timeout(ms)]);
    if (res && res.ok && res.type === "basic") {
      c.put(req, res.clone());
      trim(cacheName, 120);
    }
    return res;
  } catch (err) {
    const hit = (await c.match(req)) || (await caches.match(req));
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) {
    const c = await caches.open(cacheName);
    c.put(req, res.clone());
    trim(cacheName, 400);
  }
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res && res.ok) c.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await fresh) || new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "content-type": "application/json" } });
}

const NEVER = /^\/(en|am)\/research|^\/api\/(share|unknown|analyze|health|giai)|^\/api\/v1\/tests/;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (NEVER.test(p)) return;

  if (p.startsWith("/_next/static/") || p.startsWith("/media/") || p.startsWith("/team/") || p.startsWith("/icons/") || p.startsWith("/audio/") || p.startsWith("/api/tts")) {
    e.respondWith(cacheFirst(req, ASSETS));
    return;
  }
  if (p === "/api/library" || p.startsWith("/api/climate/") || p === "/api/v1/signs" || p === "/api/forecast") {
    e.respondWith(staleWhileRevalidate(req, DATA));
    return;
  }
  if (req.mode === "navigate") {
    const lang = p.startsWith("/am") ? "am" : "en";
    e.respondWith(networkFirst(req, PAGES, 3000).catch(async () => (await caches.match(`/${lang}/offline`)) || Response.error()));
    return;
  }
  // In-app page changes (React Server Component data) and everything else from this site.
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) {
    e.respondWith(networkFirst(req, PAGES, 3000));
    return;
  }
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
