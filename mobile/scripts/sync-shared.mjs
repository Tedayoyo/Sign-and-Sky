// Copies the logic and data the app shares with the website (repo root) into mobile/src, unchanged.
// The website is the single source: edit there, then run `npm run sync-shared` here.
// `npm test` fails if any copy differs from the website's file.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..", "..");
const app = join(here, "..");

export const SHARED = [
  ["src/lib/match.ts", "src/lib/match.ts"],
  ["src/lib/scoring.ts", "src/lib/scoring.ts"],
  ["src/lib/places.ts", "src/lib/places.ts"],
  ["src/lib/explorer.ts", "src/lib/explorer.ts"],
  ["src/lib/observations.ts", "src/lib/observations.ts"],
  ["src/lib/analyze.ts", "src/lib/analyze.ts"],
  ["src/lib/i18n.ts", "src/lib/i18n.ts"],
  ["src/data/library.json", "src/data/library.json"],
  ["src/dictionaries/en.json", "src/dictionaries/en.json"],
  ["src/dictionaries/am.json", "src/dictionaries/am.json"],
];

export function differences() {
  return SHARED.filter(([from, to]) => {
    try {
      return readFileSync(join(web, from), "utf8") !== readFileSync(join(app, to), "utf8");
    } catch {
      return true;
    }
  }).map(([from]) => from);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [from, to] of SHARED) {
    mkdirSync(dirname(join(app, to)), { recursive: true });
    copyFileSync(join(web, from), join(app, to));
    console.log(`copied ${from}`);
  }
}
