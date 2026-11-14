// Colours from the website's design system (src/app/globals.css): midnight navy, forest green,
// nature green, earth gold, sky blue and soft neutrals, with the same trust colours.
import { useColorScheme } from "react-native";

const light = {
  paper: "#f4f6f3", card: "#ffffff", ink: "#17202a", muted: "#56616c", line: "#d8dfdb",
  navy: "#0f1a2e", forest: "#1f4d36", green: "#3e7b4f", gold: "#c8902e", sky: "#2f6fa6",
  onDark: "#ffffff", header: "#0f1a2e", tabBar: "#ffffff", field: "#ffffff",
  very_strong: "#1f6b3a", strong: "#2e7d4a", fair: "#a86f0c", weak: "#b23a2e", untested: "#6b7480",
  primary: "#1f4d36", onPrimary: "#ffffff", soft: "#e7efe9", warnBg: "#fbf3e0",
};
const dark: typeof light = {
  paper: "#0f1a2e", card: "#16243d", ink: "#e8edf2", muted: "#a3afbc", line: "#2a3b58",
  navy: "#0f1a2e", forest: "#1f4d36", green: "#7fbf8f", gold: "#e2a93b", sky: "#6aa8dc",
  onDark: "#ffffff", header: "#0b1424", tabBar: "#16243d", field: "#0f1a2e",
  very_strong: "#7fd69a", strong: "#5fbf7f", fair: "#e2a93b", weak: "#ef7f72", untested: "#9aa4b1",
  primary: "#7fbf8f", onPrimary: "#0f1a2e", soft: "#1c2e4b", warnBg: "#2c2a1f",
};
export type Theme = typeof light;
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
