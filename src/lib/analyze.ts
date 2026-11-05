// The voice assistant's logic, following the simulator:
// 1 Listen → 2 Understand (sign, place, season, prediction, usual delay) → 3 Test (score, trust) → 4 Voice advice.
// Reply pattern: "Thank you for sharing." + test sentence + advice. "When should I sow?" follows up on the last sign.
import { dict, fmt, isLocale, type Locale } from "./i18n";
import { findSign, isAsking } from "./match";
import { isPlace, seasonFor, type PlaceSlug } from "./places";
import { evaluationFor, tr, type SignRecord } from "./records";
import { trustLevel, type TrustLevel } from "./scoring";

/** A piece of the spoken reply. clips: recorded Amharic clips that say exactly this text (all must exist to be played). */
// Everyday words farmers use for the 17 field signs, added to the keywords stored with each record.
const EXTRA_KEYWORDS: Record<number, string[]> = {
  2: ["feathers", "ላባቸው"],
  4: ["star", "ከዋክብት", "ኮከቦች"],
  5: ["ring", "ቀለበቱ"],
  6: ["haze"],
  7: ["walking in line", "one behind the other"],
  10: ["ants everywhere"],
  12: ["east wind"],
  13: ["red sky", "ፀሐይ ቀይ"],
  14: ["trees bloom"],
  16: ["birds came", "birds arrived"],
  17: ["rain clouds"],
};

export type Segment = { text: string; clips?: string[] };

export type Analysis = {
  kind: "sign" | "followup" | "unknown" | "empty";
  /** Link to the reply read aloud by the speech service, when one is configured (added by /api/analyze). */
  audio?: string | null;
  /** "close" when the sign was recognised from words that were heard slightly wrong. */
  match?: "exact" | "close";
  lang: Locale;
  heard: string;
  place: { slug: PlaceSlug; name: string };
  season: string;
  record?: {
    number: number;
    name: string;
    prediction: string;
    delay: string;
    advice: string;
    translationNeedsReview: boolean;
  };
  test?: {
    score: number | null;
    trust: TrustLevel | "untested";
    testedIn: string | null;
    testedHere: boolean;
    method: string | null;
  };
  reply: string;
  segments: Segment[];
  last: number | null;
};

function lowerFirst(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

function fmtScore(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function analyzeWith(
  records: SignRecord[],
  input: { text: string; alt?: string; lang?: string; loc?: string; last?: number | null; month?: number },
): Analysis {
  const lang: Locale = isLocale(input.lang) ? input.lang : "en";
  const d = dict(lang);
  const slug: PlaceSlug = isPlace(input.loc) ? input.loc : "wol";
  const heard = (input.text || "").trim().slice(0, 500);
  const month = input.month ?? new Date().getMonth() + 1;
  const place = { slug, name: d.places[slug].name };
  const season = d.seasons[seasonFor(slug, month)];
  const base = { lang, heard, place, season };

  if (!heard) return { ...base, kind: "empty", reply: "", segments: [], last: input.last ?? null };

  const items = records.map((r) => ({
    id: r.record_number,
    rec: r,
    keywords: [...(r.tr.en?.keywords ?? []), ...(r.tr.am?.keywords ?? []), ...(EXTRA_KEYWORDS[r.record_number] ?? [])],
  }));
  // Alternative transcripts from speech recognition help matching but are not shown as "heard".
  const found = findSign(`${heard} ${(input.alt || "").slice(0, 500)}`, items);
  const asking = isAsking(heard);
  const lastRec = input.last ? records.find((r) => r.record_number === input.last) : undefined;
  const use = found?.item.rec ?? (asking ? lastRec : undefined);

  if (!use) {
    return {
      ...base,
      kind: "unknown",
      reply: d.reply.unknown,
      segments: [{ text: d.reply.unknown, clips: ["unk"] }],
      last: input.last ?? null,
    };
  }

  const t = tr(use, lang);
  const advice = t.voice_advice || t.expected_weather || "";
  const ev = evaluationFor(use, slug);
  const testedHere = !!ev && ev.location_slug === slug;
  const record = {
    number: use.record_number,
    name: t.name,
    prediction: t.expected_weather ?? "",
    delay: t.expected_timing_text ?? "",
    advice,
    translationNeedsReview: t.translation_status === "needs_review",
  };
  const test = {
    score: ev ? ev.score : null,
    trust: (ev ? trustLevel(ev.score) : "untested") as TrustLevel | "untested",
    testedIn: ev?.location_name ? (ev.location_slug && isPlace(ev.location_slug) ? d.places[ev.location_slug].name : ev.location_name) : null,
    testedHere,
    method: ev?.method ?? null,
  };

  if (!found && asking) {
    const p = d.places[slug];
    const name = lang === "en" ? lowerFirst(t.name) : t.name;
    const adv = lang === "en" ? lowerFirst(advice) : advice;
    const reply = fmt(d.reply.follow, { name, advice: adv, rain: p.rain, crops: p.crops });
    return {
      ...base,
      kind: "followup",
      record,
      test,
      reply,
      segments: [{ text: reply, clips: ["fu-pre", `name-${use.record_number}`, `adv-${use.record_number}`, `fu-${slug}`] }],
      last: use.record_number,
    };
  }

  let testSentence: string;
  if (!ev) testSentence = d.reply.untested;
  else {
    const s = fmtScore(ev.score);
    testSentence = fmt(d.reply[trustLevel(ev.score)], { score: s });
  }
  const segments: Segment[] = [
    { text: d.reply.thanks, clips: ["thanks"] },
    { text: testSentence },
    { text: advice, clips: [`adv-${use.record_number}`] },
  ];
  return {
    ...base,
    kind: "sign",
    match: found?.kind,
    record,
    test,
    reply: segments.map((s) => s.text).filter(Boolean).join(" "),
    segments,
    last: use.record_number,
  };
}

