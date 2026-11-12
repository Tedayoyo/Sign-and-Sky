// Local end-to-end test stack. Never used in production.
// Starts a throw-away in-memory Postgres (PGlite) with the real migrations and seed, a test admin account,
// and stand-ins for the two outside services the sandbox cannot reach (Open-Meteo ERA5 and Addis AI).
// The stand-in rainfall is synthetic and exists only so the pages can be exercised; it is never stored or shown publicly.
// Usage: npx tsx tests/e2e/stack.ts   (prints the env to start `next start` with, then keeps running)
import http from "node:http";
import bcrypt from "bcryptjs";
import { startDb } from "../helpers";
import { pool } from "../../src/lib/db";

const DB_PORT_FILE = process.env.E2E_ENV_FILE || "/tmp/sns-e2e.env";

function syntheticDays(start: string, end: string, seed: number) {
  const out: { t: string[]; p: number[] } = { t: [], p: [] };
  for (let d = new Date(start + "T00:00:00Z"); d <= new Date(end + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const m = d.getUTCMonth() + 1;
    const wet = [3, 4, 5, 6, 7, 8, 9].includes(m) ? 0.55 : 0.12;
    const x = Math.abs(Math.sin(d.getTime() / 8.64e7 + seed * 7.7)) % 1;
    out.t.push(iso);
    out.p.push(x < wet ? Math.round((x * 30 + (m >= 6 && m <= 9 ? 4 : 1)) * 10) / 10 : 0);
  }
  return out;
}

async function main() {
  const db = await startDb();
  const hash = await bcrypt.hash("e2e-password-123", 10);
  await db.query(
    `insert into profiles (email, full_name, role, password_hash) values ('e2e@example.org', 'E2E Admin', 'admin', $1)
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin', is_active = true`,
    [hash],
  );
  await pool().end(); // PGlite serves one connection at a time: hand it to the web server

  const stub = http.createServer((req, res) => {
    const u = new URL(req.url || "/", "http://x");
    if (u.pathname.startsWith("/archive")) {
      const lats = (u.searchParams.get("latitude") || "").split(",");
      const lons = (u.searchParams.get("longitude") || "").split(",");
      const start = u.searchParams.get("start_date")!, end = u.searchParams.get("end_date")!;
      const list = lats.map((lat, i) => {
        const s = syntheticDays(start, end, i);
        return { latitude: Number(lat), longitude: Number(lons[i]), daily: { time: s.t, precipitation_sum: s.p } };
      });
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify(list.length === 1 ? list[0] : list));
    }
    if (u.pathname.startsWith("/api/v1/voice/usage")) {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ balance: 100, currency: "ETB" }));
    }
    if (u.pathname === "/api/v1/voice/generations") {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ data: { audio_url: "/clip.mp3" } }));
    }
    if (u.pathname === "/clip.mp3") {
      res.setHeader("content-type", "audio/mpeg");
      return res.end(Buffer.from([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 0]));
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => stub.listen(0, "127.0.0.1", () => r()));
  const port = (stub.address() as { port: number }).port;
  const env = [
    `DATABASE_URL=${process.env.DATABASE_URL}`,
    "DATABASE_SSL=false",
    "DB_POOL_MAX=1",
    `SESSION_SECRET=e2e-only-${"x".repeat(40)}`,
    `OPEN_METEO_ARCHIVE_URL_TEST_ONLY=http://127.0.0.1:${port}/archive`,
    `ADDIS_API_BASE_TEST_ONLY=http://127.0.0.1:${port}`,
    "ADDIS_API_KEY=e2e-dummy",
  ].join("\n");
  (await import("node:fs")).writeFileSync(DB_PORT_FILE, env + "\n");
  console.log("E2E stack ready\n" + env);
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
