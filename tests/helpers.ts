// Test database: TEST_DATABASE_URL if given (a disposable Postgres), otherwise an in-process Postgres (PGlite).
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/lib/db";

let stop: (() => Promise<void>) | null = null;

export async function startDb() {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
    const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
    const db = await PGlite.create({ extensions: { pgcrypto } });
    const port = 54000 + Math.floor(Math.random() * 1000);
    const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
    await server.start();
    process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    process.env.DB_POOL_MAX = "1";
    stop = async () => {
      await server.stop();
      await db.close();
    };
  }
  process.env.DATABASE_SSL = "false";
  const p = pool();
  const root = path.join(__dirname, "..", "supabase");
  if (process.env.TEST_DATABASE_URL) await p.query("drop schema public cascade; create schema public;");
  for (const f of ["migrations/0001_schema.sql", "migrations/0002_voice_and_testing.sql", "seed/0001_initial_records.sql", "seed/0002_voice_and_locations.sql"])
    await p.query(fs.readFileSync(path.join(root, f), "utf8"));
  return p;
}

export async function stopDb() {
  await pool().end();
  if (stop) await stop();
}
