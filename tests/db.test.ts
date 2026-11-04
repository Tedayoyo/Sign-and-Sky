import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionConfig } from "../src/lib/db";

test("DATABASE_URL with special characters in the password", () => {
  const c = connectionConfig("postgresql://postgres.abcd:my@pa#ss/w?rd@aws-0-eu-central-1.pooler.supabase.com:6543/postgres");
  assert.equal(c.user, "postgres.abcd");
  assert.equal(c.password, "my@pa#ss/w?rd");
  assert.equal(c.host, "aws-0-eu-central-1.pooler.supabase.com");
  assert.equal(c.port, 6543);
  assert.ok(c.ssl);
});

test("URL-encoded passwords and sslmode are handled", () => {
  const c = connectionConfig("postgres://postgres.abcd:my%40pass@db.example.com:5432/postgres?sslmode=require");
  assert.equal(c.password, "my@pass");
  assert.ok(c.ssl);
});

test("a malformed DATABASE_URL gives a clear error", () => {
  assert.throws(() => connectionConfig("not a url"), /not a valid Postgres connection string/);
});
