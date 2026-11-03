// Researcher sign-in: bcrypt passwords, signed httpOnly session cookies, rate-limited sign-in.
import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";

export const COOKIE = "sns_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

export type User = { id: string; email: string; full_name: string; role: "admin" | "researcher" };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  return s;
}

function sign(data: string) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

// The session carries a short fingerprint of the password hash, so changing a password signs out old sessions.
function fingerprint(passwordHash: string) {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 12);
}

export function makeToken(userId: string, passwordHash: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, f: fingerprint(passwordHash), e: now + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): { u: string; f: string; e: number } | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const a = Buffer.from(mac),
    b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof p.e !== "number" || p.e < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const p = readToken(jar.get(COOKIE)?.value);
  if (!p) return null;
  const row = await one<User & { password_hash: string }>(
    "select id, email, full_name, role, password_hash from profiles where id = $1 and is_active",
    [p.u],
  );
  if (!row || fingerprint(row.password_hash) !== p.f) return null;
  return { id: row.id, email: row.email, full_name: row.full_name, role: row.role };
}

export async function requireUser(lang: string): Promise<User> {
  const u = await currentUser();
  if (!u) redirect(`/${lang}/research/login`);
  return u;
}

export async function requireAdmin(lang: string): Promise<User> {
  const u = await requireUser(lang);
  if (u.role !== "admin") redirect(`/${lang}/research`);
  return u;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

const WINDOW_MIN = 15;
export const MAX_FAILS_PER_EMAIL = 5;
export const MAX_FAILS_PER_IP = 20;

export async function tooManyAttempts(email: string, ip: string): Promise<boolean> {
  const rows = await query<{ by_email: number; by_ip: number }>(
    `select count(*) filter (where email = $1)::int as by_email, count(*) filter (where ip = $2)::int as by_ip
     from login_attempts where not succeeded and created_at > now() - ($3 || ' minutes')::interval`,
    [email, ip, String(WINDOW_MIN)],
  );
  return rows[0].by_email >= MAX_FAILS_PER_EMAIL || rows[0].by_ip >= MAX_FAILS_PER_IP;
}

let dummyHash: string | undefined;

export type LoginResult = { ok: true; token: string } | { ok: false; reason: "invalid" | "locked" };

export async function attemptLogin(emailRaw: string, password: string, ip: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase().slice(0, 200);
  if (await tooManyAttempts(email, ip)) return { ok: false, reason: "locked" };
  const row = await one<{ id: string; password_hash: string }>(
    "select id, password_hash from profiles where email = $1 and is_active",
    [email],
  );
  // Compare against a dummy hash when the user does not exist, so timing does not reveal accounts.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(String(password ?? "").slice(0, 200), row?.password_hash ?? dummyHash);
  await query("insert into login_attempts (email, ip, succeeded) values ($1, $2, $3)", [email, ip, !!(row && ok)]);
  if (!row || !ok) return { ok: false, reason: "invalid" };
  await query("update profiles set last_login_at = now() where id = $1", [row.id]);
  return { ok: true, token: makeToken(row.id, row.password_hash) };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export function checkPasswordRules(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 10 && pw.length <= 200;
}

export function randomPassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}
