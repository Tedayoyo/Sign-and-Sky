// Applies supabase/migrations/*.sql in order, once each. Safe to run again.
import "./env";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/lib/db";

async function main() {
  const db = pool();
  await db.query(`create table if not exists _sns_migrations (name text primary key, applied_at timestamptz not null default now());
                  alter table _sns_migrations enable row level security;`);
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await db.query("select name from _sns_migrations")).rows.map((r) => r.name));
  // A database set up by hand in the Supabase SQL editor already has the tables: record that instead of failing.
  const hasSchema = (await db.query("select to_regclass('public.knowledge_records') is not null as ok")).rows[0].ok;
  for (const f of files) {
    if (done.has(f)) continue;
    if (f.startsWith("0001") && hasSchema) {
      console.log(`- ${f}: tables already exist, marking as applied`);
      await db.query("insert into _sns_migrations (name) values ($1)", [f]);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const c = await db.connect();
    try {
      await c.query("begin");
      await c.query(sql);
      await c.query("insert into _sns_migrations (name) values ($1)", [f]);
      await c.query("commit");
      console.log(`✓ ${f}`);
    } catch (e) {
      await c.query("rollback");
      throw new Error(`${f} failed: ${(e as Error).message}`);
    } finally {
      c.release();
    }
  }
  console.log("Migrations up to date.");
  await db.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
