// Prepares an Amharic reply for a voice, without changing the written answer.
// Digits and Latin words are written out in Ge'ez so the voice reads them as Amharic speakers say them:
//   "ከ10 ነጥብ 8.5" → "ከአስር ነጥብ ስምንት ተኩል",  "Sign & Sky" → "ሳይን ኤንድ ስካይ".
// Addis AI's guidance: use Ethiopic punctuation for Amharic and write mixed-language terms out.

const ONES = ["ዜሮ", "አንድ", "ሁለት", "ሦስት", "አራት", "አምስት", "ስድስት", "ሰባት", "ስምንት", "ዘጠኝ"];
const TENS = ["", "አስር", "ሃያ", "ሠላሳ", "አርባ", "ሃምሳ", "ስልሳ", "ሰባ", "ሰማንያ", "ዘጠና"];

/** A whole number (0–999 999) in Amharic words. */
export function amharicNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n);
  if (n < 10) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 0) return TENS[t];
    return t === 1 ? `አስራ ${ONES[o]}` : `${TENS[t]} ${ONES[o]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const head = h === 1 ? "መቶ" : `${ONES[h]} መቶ`;
    return rest ? `${head} ${amharicNumber(rest)}` : head;
  }
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = th === 1 ? "አንድ ሺህ" : `${amharicNumber(th)} ሺህ`;
  return rest ? `${head} ${amharicNumber(rest)}` : head;
}

/** "8.5" → "ስምንት ተኩል", "7.25" → "ሰባት ነጥብ ሁለት አምስት". */
function decimal(whole: string, frac: string): string {
  const w = amharicNumber(Number(whole));
  if (frac === "5") return `${w} ተኩል`;
  return `${w} ነጥብ ${[...frac].map((d) => ONES[Number(d)]).join(" ")}`;
}

// Latin words that can appear in an Amharic reply, as Amharic speakers say them.
const SAY: [RegExp, string][] = [
  [/Sign\s*&\s*Sky/gi, "ሳይን ኤንድ ስካይ"],
  [/\bAI\b/g, "ኤ አይ"],
  [/\bCHIRPS\b/gi, "ቸርፕስ"],
  [/\bERA5\b/gi, "ኢ አር ኤ አምስት"],
  [/\bUN\b/g, "የተባበሩት መንግሥታት"],
  [/\bSMS\b/gi, "ኤስ ኤም ኤስ"],
];

export function amharicForSpeech(text: string): string {
  let s = text.normalize("NFC");
  for (const [re, said] of SAY) s = s.replace(re, said);
  s = s
    .replace(/(\d+)\s*%/g, (_, n) => `${amharicNumber(Number(n))} በመቶ`)
    .replace(/(\d+)[.,](\d+)/g, (_, w, f) => decimal(w, f))
    .replace(/\d+/g, (n) => amharicNumber(Number(n)))
    // Brackets are read flat; a comma gives the natural pause instead.
    .replace(/\s*[(（]\s*/g, "፣ ")
    .replace(/\s*[)）]\s*(?=[።፣፤!?])/g, "")
    .replace(/\s*[)）]\s*/g, "፣ ")
    .replace(/፣\s*፣/g, "፣")
    .replace(/\s*–\s*/g, " እስከ ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}
