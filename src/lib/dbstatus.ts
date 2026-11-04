// Plain-language reasons why the database cannot be used. Never includes secrets.
import { query } from "./db";

export function dbProblem(e: unknown): string {
  const err = e as { message?: string; code?: string };
  const msg = err?.message || "";
  const code = err?.code || "";
  if (msg.includes("DATABASE_URL")) return msg;
  if (code === "28P01" || /password authentication failed/i.test(msg)) return "The database password in DATABASE_URL is wrong.";
  if (/Tenant or user not found/i.test(msg)) return "The user name in DATABASE_URL does not match the pooler. It should look like postgres.yourprojectref.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "The database address in DATABASE_URL cannot be found. Copy the Transaction pooler string again from Supabase → Connect.";
  if (code === "ENETUNREACH" || code === "EHOSTUNREACH" || /ENETUNREACH|EHOSTUNREACH/.test(msg))
    return "Cannot reach the database. Use the Supabase Transaction pooler string (port 6543), not the Direct connection.";
  if (/timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(msg + code)) return "Cannot reach the database. Use the Supabase Transaction pooler string (port 6543).";
  if (code === "42P01") return "The database tables are missing. Run the SQL files 1 to 4 in the Supabase SQL Editor.";
  if (code === "42703") return "The database is missing columns. Run SQL file 2 in the Supabase SQL Editor.";
  return "Database error: " + msg.slice(0, 200);
}

/** null when the database works, otherwise the reason. */
export async function dbStatus(): Promise<string | null> {
  try {
    await query("select 1 from knowledge_records limit 1");
    return null;
  } catch (e) {
    return dbProblem(e);
  }
}
