// What the app refreshes when the phone is online. Everything here is optional: with no connection
// the app keeps using what it already has (at worst, the built-in library shipped inside it).
import { getJson } from "./config";
import { fromOpenLibrary, type SignRecord } from "./records";
import { parseClimate, type StoredClimate } from "./climate-parse";
import { KEYS, load, save } from "./storage";

export { parseClimate, type StoredClimate } from "./climate-parse";

export type StoredLibrary = { at: string; signs: SignRecord[] };

export async function storedLibrary(): Promise<StoredLibrary | null> {
  const s = await load<StoredLibrary>(KEYS.library);
  return s && Array.isArray(s.signs) && s.signs.length ? s : null;
}

/** Fetches the published library. Returns null (and keeps the old copy) if the download is incomplete. */
export async function refreshLibrary(): Promise<StoredLibrary | null> {
  const body = await getJson<unknown>("/api/v1/signs");
  const signs = fromOpenLibrary(body);
  if (!signs) return null;
  const stored = { at: new Date().toISOString(), signs };
  await save(KEYS.library, stored);
  return stored;
}

export async function storedClimate(): Promise<StoredClimate | null> {
  const c = await load<StoredClimate>(KEYS.climate);
  return c && Array.isArray(c.normal) && c.normal.length === 12 ? c : null;
}

export async function refreshClimate(): Promise<StoredClimate | null> {
  const c = parseClimate(await getJson<unknown>("/api/climate/point", undefined, 60000));
  if (c) await save(KEYS.climate, c);
  return c;
}
