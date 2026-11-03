// Loads the knowledge library. Seed 0001 runs only on an empty library; seed 0002 is safe to repeat.
import "./env";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/lib/db";

async function main() {
  const db = pool();
  const dir = path.join(process.cwd(), "supabase", "seed");
  const n = (await db.query("select count(*)::int as n from knowledge_records")).rows[0].n;
  if (n === 0) {
    await db.query(fs.readFileSync(path.join(dir, "0001_initial_records.sql"), "utf8"));
    console.log("✓ 0001_initial_records.sql");
  } else {
    console.log(`- 0001_initial_records.sql skipped: the library already has ${n} records (see README to replace them).`);
  }
  await db.query(fs.readFileSync(path.join(dir, "0002_voice_and_locations.sql"), "utf8"));
  console.log("✓ 0002_voice_and_locations.sql");
  const r = (
    await db.query(
      `select count(*) filter (where is_published)::int as published, count(*) filter (where not is_published)::int as unpublished,
              (select count(*) from sign_evaluations)::int as scores from knowledge_records`,
    )
  ).rows[0];
  console.log(`Library: ${r.published} published, ${r.unpublished} unpublished, ${r.scores} scores.`);
  await db.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
