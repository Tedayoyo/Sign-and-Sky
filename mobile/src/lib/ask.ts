// Answers on the phone, with no internet: the website's own analysis (analyze.ts) over the app's library.
import { analyzeWith, type Analysis } from "./analyze";
import type { Dict, Locale } from "./i18n";
import type { SignRecord } from "./records";
import { clipKey } from "./voice-keys";

export function analyzeText(records: SignRecord[], text: string, lang: Locale, last: number | null, alt?: string): Analysis {
  return analyzeWith(records, { text, alt, lang, loc: "wol", last });
}

/** The answer for a sign the farmer tapped: analysed against that one record so it cannot be mistaken for another. */
export function analyzeTapped(records: SignRecord[], n: number, lang: Locale, d: Dict): Analysis | null {
  const rec = records.find((r) => r.record_number === n);
  if (!rec) return null;
  const t = rec.tr[lang] ?? rec.tr.en;
  const example: string | undefined = d.ask.examples[n - 1];
  for (const text of [example, t?.name, ...(t?.keywords ?? []), ...(rec.tr.en?.keywords ?? [])]) {
    if (!text) continue;
    const a = analyzeWith([rec], { text, lang, loc: "wol", last: null });
    if (a.kind === "sign") return { ...a, heard: example ?? t?.name ?? text };
  }
  return null;
}

/** Which stored Amharic clip belongs to this answer. */
export function clipKeyFor(a: Analysis): string | null {
  if (a.lang !== "am") return null;
  if (a.kind === "unknown") return clipKey("unknown");
  if ((a.kind === "sign" || a.kind === "followup") && a.record) return clipKey(a.kind, a.record.number);
  return null;
}
