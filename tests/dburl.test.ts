import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionConfig, describeDatabaseUrl } from "../src/lib/db";

const good = "postgresql://postgres.abcd:p@ss#w0rd@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

test("database addresses pasted with extra text still work", () => {
  for (const raw of [good, `DATABASE_URL=${good}`, `"${good}"`, `psql '${good}'`, ` ${good}\n`, good.replace(/\/postgres$/, "")]) {
    const c = connectionConfig(raw);
    assert.equal(c.host, "aws-0-eu-central-1.pooler.supabase.com", raw);
    assert.equal(c.port, 6543);
    assert.equal(c.password, "p@ss#w0rd");
    assert.equal(c.database, "postgres");
  }
});

test("a wrong address is described without showing the password", () => {
  assert.throws(() => connectionConfig("https://abcd.supabase.co"), /starts with https:\/\//);
  const d = describeDatabaseUrl("postgresql://postgres:secret123@db.abcd.supabase.co:5432/postgres");
  assert.ok(!d.includes("secret123"));
  assert.match(d, /db\.abcd\.supabase\.co:5432/);
  assert.ok(!describeDatabaseUrl("secretwithoutat").includes("secretwithoutat"));
});
