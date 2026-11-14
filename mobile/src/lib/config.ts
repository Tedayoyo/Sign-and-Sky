// Where the app talks to when it is online: the Sign & Sky website. No keys live in the app;
// the Amharic voice and the database stay behind the website's own API.
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBase?: string };
export const API_BASE = (extra.apiBase || "https://sign-and-sky-wolaita.vercel.app").replace(/\/+$/, "");
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export async function getJson<T>(path: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(path.startsWith("http") ? path : API_BASE + path, { ...init, signal: ctl.signal });
    if (!r.ok) throw new Error(`The server answered ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
