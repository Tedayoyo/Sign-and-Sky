// Sign recognition from what the farmer said.
// English keywords match at the start of a word ("migrat" matches "migrating", "ant" does not match "want").
// Amharic keywords are stems matched anywhere, after folding spelling variants that sound the same:
//   ሐ/ኀ → ሀ, ሠ → ሰ, ዐ → አ, ፀ → ጸ (each with all its vowel orders).
// Exact matches first, then close matches (see findSign).

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
export type MatchKind = "exact" | "close";

/** Amharic letters without their vowel: each fidel becomes the first form of its row (ቡ ቢ ባ ቤ ብ ቦ → በ). */
export function consonants(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out += c >= 0x1200 && c < 0x1360 ? String.fromCodePoint(c - ((c - 0x1200) % 8)) : ch;
  }
  return out;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Words speech recognition often writes instead of the word the farmer said.
const SOUNDS_LIKE: Record<string, string> = {
  aunt: "ant", aunts: "ants", missed: "mist", flour: "flower", flours: "flowers", flowr: "flower",
  frogg: "frog", cloudes: "clouds", burds: "birds", berd: "bird", birdz: "birds", fogg: "fog",
  squirl: "squirrel", squirrell: "squirrel", squirel: "squirrel", hail: "halo", hallow: "halo",
};

// Ordinary words that are one letter away from a sign word but mean something else ("from" ≠ "frog").
const NEVER_CLOSE = new Set(
  "from must most miss just with will wild wide wine wing what that than then them they this kind find mind bind born band bang bring storm store story start stare stars could would should loud lord land wand want went mint dusk desk rest best fold food good wood word bear beard board hard hold alone along among sale call hall hello crank shallow fight sight right night light flowed follow".split(" "),
);

/** An English word heard with a small mistake ("aunts" for "ants", "clowds" for "cloud"). */
function closeWord(token: string, kw: string): boolean {
  if (!token) return false;
  if (token === kw || token.startsWith(kw)) return true;
  const heard = SOUNDS_LIKE[token];
  if (heard && heard.startsWith(kw)) return true;
  if (kw.length < 4 || NEVER_CLOSE.has(token)) return false;
  if (token[0] !== kw[0]) return false;
  const tol = kw.length >= 7 ? 2 : 1;
  return [token, token.slice(0, kw.length), token.slice(0, kw.length + 1)].some((x) => editDistance(x, kw) <= tol);
}

function closeMatch(t: string, kw: string): boolean {
  const k = normalize(kw);
  if (!k) return false;
  if (ETHIOPIC.test(k)) {
    const ks = consonants(k);
    return [...ks].length >= 3 && consonants(t).includes(ks);
  }
  const words = k.split(" ");
  const tokens = t.split(" ");
  for (let i = 0; i + words.length <= tokens.length; i++) {
    if (words.every((w, j) => closeWord(tokens[i + j], w))) return true;
  }
  return false;
}

/**
 * Finds the sign a farmer talked about. Exact keyword matches win; if there is none, a close match
 * (Amharic with a different vowel form, English with a letter or two wrong) is used.
 * Within a tier the longest keyword wins; on a tie the earlier record wins.
 */
export function findSign<T extends Matchable>(text: string, items: T[]): { item: T; keyword: string; kind: MatchKind } | null {
  const t = normalize(text);
  if (!t) return null;
  for (const kind of ["exact", "close"] as const) {
    let best: { item: T; keyword: string; len: number } | null = null;
    for (const item of items) {
      for (const kw of item.keywords) {
        if (!kw) continue;
        const ok = kind === "exact" ? keywordMatches(t, kw) : closeMatch(t, kw);
        if (!ok) continue;
        const len = normalize(kw).length;
        if (!best || len > best.len) best = { item, keyword: kw, len };
      }
    }
    if (best) return { item: best.item, keyword: best.keyword, kind };
  }
  return null;
}

const ASK_EN = /\b(when|should i sow|sow|sowing|plant|planting|will it rain|advice|advise)\b/i;
const ASK_AM = /(መቼ|ልዝራ|መዝራት|ልተክል|ዝናብ ይዘንባል|ምክር)/;

/** Is the farmer asking a question ("When should I sow?") rather than reporting a sign? */
export function isAsking(text: string): boolean {
  return ASK_EN.test(text) || ASK_AM.test(text);
}
