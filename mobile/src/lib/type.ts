// Typefaces: Bricolage Grotesque for English headings (as on the website) and Noto Sans Ethiopic for
// Amharic, shipped inside the app so Ethiopic letters look right on every phone. If the fonts cannot
// be loaded, the phone's own fonts are used.
import type { TextStyle } from "react-native";
import type { Locale } from "./i18n";

let ready = false;
export const setFontsReady = (ok: boolean) => {
  ready = ok;
};

export type Weight = "head" | "body" | "strong";

export function font(lang: Locale, w: Weight): TextStyle {
  const fallback: TextStyle = { fontWeight: w === "head" ? "700" : w === "strong" ? "600" : "400" };
  if (!ready) return fallback;
  if (lang === "am") return { fontFamily: w === "head" ? "NotoSansEthiopic_700Bold" : w === "strong" ? "NotoSansEthiopic_600SemiBold" : "NotoSansEthiopic_400Regular", fontWeight: "normal" };
  return w === "head" ? { fontFamily: "BricolageGrotesque_700Bold", fontWeight: "normal" } : fallback;
}
