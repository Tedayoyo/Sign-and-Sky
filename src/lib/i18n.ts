// Interface languages. A new language = a new dictionary file + one line here.
import en from "@/dictionaries/en.json";
import am from "@/dictionaries/am.json";

export const LOCALES = ["en", "am"] as const;
export type Locale = (typeof LOCALES)[number];
export type Dict = typeof en;

const DICTS: Record<Locale, Dict> = { en, am: am as Dict };

// Browser speech codes (recognition and synthesis).
export const SPEECH: Record<Locale, string> = { en: "en-US", am: "am-ET" };

export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (LOCALES as readonly string[]).includes(x);
}

export function dict(lang: string): Dict {
  return DICTS[isLocale(lang) ? lang : "en"];
}

/** Replace {name} placeholders. */
export function fmt(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function otherLocale(l: Locale): Locale {
  return l === "en" ? "am" : "en";
}
