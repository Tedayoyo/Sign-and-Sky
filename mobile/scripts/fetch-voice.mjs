// Run when the app is built: downloads the website's Amharic recording of every answer the app can give
// and writes src/data/voice-bundled.ts, so Amharic voice works from first install with no internet.
// If the website or its voice service cannot be reached, the bundle is left empty and the build goes on;
// the app then downloads the recordings itself when it is first online.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.SNS_API_BASE || JSON.parse(readFileSync(join(app, "app.json"), "utf8")).expo.extra.apiBase).replace(/\/+$/, "");
const dir = join(app, "assets", "voice");
const outFile = join(app, "src", "data", "voice-bundled.ts");
const HEAD = `// Amharic answers shipped inside the app. Written by scripts/fetch-voice.mjs; do not edit by hand.\n`;

const write = (entries) =>
  writeFileSync(
    outFile,
    `${HEAD}export const BUNDLED_VOICE: Record<string, { text: string; file: number }> = {\n${entries
      .map((e) => `  ${JSON.stringify(e.key)}: { text: ${JSON.stringify(e.text)}, file: require("../../assets/voice/${e.key}.mp3") },\n`)
      .join("")}};\n`,
  );

async function ask(body) {
  const r = await fetch(`${BASE}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: "am", loc: "wol", ...body }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`analyze answered ${r.status}`);
  return r.json();
}

async function keep(entries, key, a) {
  if (!a?.reply || !a.audio) return console.log(`- ${key}: no recording offered`);
  const url = a.audio.startsWith("http") ? a.audio : BASE + a.audio;
  const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const bytes = Buffer.from(await r.arrayBuffer());
  const mp3 = bytes.length > 2000 && (bytes.subarray(0, 3).toString("latin1") === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  if (!r.ok || !mp3) return console.log(`- ${key}: recording not available (${r.status})`);
  writeFileSync(join(dir, `${key}.mp3`), bytes);
  entries.push({ key, text: a.reply });
  console.log(`+ ${key} (${Math.round(bytes.length / 1024)} KB)`);
}

const entries = [];
try {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const lib = await (await fetch(`${BASE}/api/v1/signs`, { signal: AbortSignal.timeout(30000) })).json();
  if (!Array.isArray(lib.signs) || !lib.signs.length) throw new Error("library not available");
  await keep(entries, "am-unknown", await ask({ text: "qqqq" })).catch((e) => console.log(`- am-unknown: ${e.message}`));
  for (const s of lib.signs) {
    const n = s.number;
    try {
      let sign = null;
      for (const text of [s.text?.am?.name, s.text?.en?.name, ...(s.text?.am?.keywords ?? []), ...(s.text?.en?.keywords ?? [])].filter(Boolean)) {
        const a = await ask({ text });
        if (a.kind === "sign" && a.record?.number === n) {
          sign = a;
          break;
        }
      }
      if (sign) await keep(entries, `am-sign-${n}`, sign);
      const f = await ask({ text: "መቼ ልዝራ?", last: n });
      if (f.kind === "followup" && f.record?.number === n) await keep(entries, `am-followup-${n}`, f);
    } catch (e) {
      console.log(`- sign ${n}: ${e.message}`);
    }
  }
} catch (e) {
  console.log(`Voice bundle skipped: ${e.message}`);
}
write(entries);
console.log(`${entries.length} Amharic recordings bundled.`);
