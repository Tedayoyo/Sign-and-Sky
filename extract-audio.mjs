// Copies the recorded Amharic voice clips out of the voice simulator HTML into public/audio/am/,
// keeping ONLY clips whose words still match the current texts (the simulator's score sentences said
// "X out of 10 years" and several sign texts have changed, so those clips are left out on purpose).
// Usage: npm run extract-audio -- "path/to/Sign & Sky – Voice Simulator (1).html"
import fs from "node:fs";
import path from "node:path";

// simulator key → website clip key (see src/lib/analyze.ts for where each key is used)
const KEEP = {
  thanks: "thanks", // "ስላካፈሉን እናመሰግናለን።"
  unk: "unk", // unknown-sign reply (same words as dictionaries/am.json reply.unknown)
  adv_ants: "adv-1", // record 1, Ants carrying eggs uphill — spoken advice unchanged
  adv_birds: "adv-16", // record 16, Birds migrating from far away — spoken advice unchanged
  name_ants: "name-1", // record 1 name, used in "When should I sow?" follow-ups
  fu_pre: "fu-pre",
  fu_wol: "fu-wol",
  fu_tel: "fu-tel",
  fu_har: "fu-har",
};

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Usage: npm run extract-audio -- "path/to/Sign & Sky – Voice Simulator (1).html"');
  process.exit(1);
}
const html = fs.readFileSync(file, "utf8");
const m = html.match(/const AUDIO=(\{[\s\S]*?\});\s*\n/);
if (!m) {
  console.error("Could not find the AUDIO clips in that file.");
  process.exit(1);
}
const audio = JSON.parse(m[1]);
const out = path.join(process.cwd(), "public", "audio", "am");
fs.mkdirSync(out, { recursive: true });
const manifest = {};
for (const [simKey, key] of Object.entries(KEEP)) {
  const uri = audio[simKey];
  if (typeof uri !== "string" || !uri.startsWith("data:audio/mpeg;base64,")) {
    console.log(`- ${simKey}: not in the simulator, skipped`);
    continue;
  }
  const name = `${key}.mp3`;
  fs.writeFileSync(path.join(out, name), Buffer.from(uri.split(",")[1], "base64"));
  manifest[key] = name;
  console.log(`✓ ${simKey} → public/audio/am/${name}`);
}
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`${Object.keys(manifest).length} clips written. The full answer is always shown in writing.`);
