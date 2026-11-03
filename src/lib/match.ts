// Sign recognition from what the farmer said.
// English keywords match at the start of a word ("migrat" matches "migrating", "ant" does not match "want").
// Amharic keywords are stems matched anywhere, after folding spelling variants that sound the same:
//   ሐ/ኀ → ሀ, ሠ → ሰ, ዐ → አ, ፀ → ጸ (each with all its vowel orders).
// The longest matching keyword wins; on a tie the earlier record wins.

const FOLD_ROWS: [number, number][] = [
  [0x1210, 0x1200], // ሐ → ሀ
  [0x1280, 0x1200], // ኀ → ሀ
  [0x1220, 0x1230], // ሠ → ሰ
  [0x12d0, 0x12a0], // ዐ → አ
  [0x1340, 0x1338], // ፀ → ጸ
];

export function foldAmharic(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    let mapped = c;
    for (const [from, to] of FOLD_ROWS) {
      if (c >= from && c < from + 8) {
        mapped = to + (c - from);
        break;
      }
    }
    out += String.fromCodePoint(mapped);
  }
  return out;
}

const ETHIOPIC = /[ሀ-፿]/;

export function normalize(s: string): string {
  return foldAmharic(s.toLowerCase().normalize("NFC"))
    .replace(/[’'`]/g, "'")
    .replace(/[፡።፣፤፥፦፧?!.,;:()"“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Does keyword kw occur in normalized text t? */
export function keywordMatches(t: string, kw: string): boolean {
  const k = normalize(kw);
  if (!k) return false;
  if (ETHIOPIC.test(k)) return t.includes(k);
  return new RegExp(`(^|[^a-z0-9])${escapeRe(k)}`).test(t);
}

export type Matchable = { id: string | number; keywords: string[] };

export function findSign<T extends Matchable>(text: string, items: T[]): { item: T; keyword: string } | null {
  const t = normalize(text);
  if (!t) return null;
  let best: { item: T; keyword: string; len: number } | null = null;
  for (const item of items) {
    for (const kw of item.keywords) {
      if (!kw || !keywordMatches(t, kw)) continue;
      const len = normalize(kw).length;
      if (!best || len > best.len) best = { item, keyword: kw, len };
    }
  }
  return best ? { item: best.item, keyword: best.keyword } : null;
}

const ASK_EN = /\b(when|should i sow|sow|sowing|plant|planting|will it rain|advice|advise)\b/i;
const ASK_AM = /(መቼ|ልዝራ|መዝራት|ልተክል|ዝናብ ይዘንባል|ምክር)/;

/** Is the farmer asking a question ("When should I sow?") rather than reporting a sign? */
export function isAsking(text: string): boolean {
  return ASK_EN.test(text) || ASK_AM.test(text);
}
