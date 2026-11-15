// Answers a farmer's sign on the phone itself when there is no connection.
// Uses the library cached by the service worker (/api/library), or the copy built into the app.
import { analyzeWith, type Analysis } from "./analyze";
import type { SignRecord } from "./record-types";
import builtin from "@/data/library.json";

let cached: SignRecord[] | null = null;

async function library(): Promise<SignRecord[]> {
  if (cached) return cached;
  try {
    const r = await fetch("/api/library");
    if (r.ok) {
      const j = (await r.json()) as { signs: SignRecord[] };
      if (j.signs?.length) return (cached = j.signs);
    }
  } catch {
    /* no network and no cached copy */
  }
  return (cached = (builtin as unknown as { signs: SignRecord[] }).signs);
}

export async function analyzeOffline(input: { text: string; alt?: string; lang?: string; loc?: string; last?: number | null }): Promise<Analysis> {
  return analyzeWith(await library(), input);
}
