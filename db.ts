// Database access. All data goes through the server; the browser never talks to Supabase directly.
import { Pool, types, type PoolClient } from "pg";

// Return DATE columns as "yyyy-mm-dd" strings and NUMERIC as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

const g = globalThis as unknown as { __snsPool?: Pool };

function makePool(): Pool {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const useSsl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL !== "false" : !local;
  url.searchParams.delete("sslmode"); // we set SSL ourselves (Supabase pooler certificates are not in the default store)
  return new Pool({
    connectionString: url.toString(),
    max: Number(process.env.DB_POOL_MAX || 5),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    idleTimeoutMillis: 20_000,
  });
}

export function pool(): Pool {
  if (!g.__snsPool) g.__snsPool = makePool();
  return g.__snsPool;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query(text, params as unknown[]);
  return res.rows as T[];
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** For tests: replace the pool. */
export function setPoolForTests(p: Pool | undefined) {
  g.__snsPool = p;
}
