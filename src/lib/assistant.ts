// Server wrapper around the voice assistant: loads the published library (cached briefly) and analyses a sentence.
import { analyzeWith } from "./analyze";
import { publishedSigns, type SignRecord } from "./records";

// Kept on globalThis: Next.js bundles server actions and API routes separately, and a module-level
// variable would give each bundle its own copy (so clearing it after an edit would not reach the assistant).
const g = globalThis as unknown as { __snsLibrary?: { at: number; rows: SignRecord[] } | null };
const TTL = 60_000;

export async function librarySigns(): Promise<SignRecord[]> {
  const c = g.__snsLibrary;
  if (c && Date.now() - c.at < TTL) return c.rows;
  const rows = await publishedSigns();
  g.__snsLibrary = { at: Date.now(), rows };
  return rows;
}

export function clearLibraryCache() {
  g.__snsLibrary = null;
}

export async function analyze(input: { text: string; alt?: string; lang?: string; loc?: string; last?: number | null }) {
  return analyzeWith(await librarySigns(), input);
}
