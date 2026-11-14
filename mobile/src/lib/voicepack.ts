// The Amharic voice pack. Almost no phone can speak Amharic by itself, so while online the app asks
// the website for each answer it can give (the website reads it with its Amharic voice and returns a
// signed audio link) and keeps the MP3 on the phone. Offline, a clip is played only when its text is
// exactly the answer on screen, so the voice never says something different from what is written.
import { Directory, File, Paths } from "expo-file-system";
import { API_BASE, getJson } from "./config";
import { tr, type SignRecord } from "./records";
import { KEYS, load, save } from "./storage";
import { clipKey, expectedClips, type VoiceManifest } from "./voice-keys";

export { clipFor, clipKey, expectedClips, type Clip, type VoiceManifest } from "./voice-keys";

type Reply = { kind: string; reply: string; audio?: string | null; record?: { number: number } };

export const QUESTION_AM = "መቼ ልዝራ?";
const NOT_A_SIGN = "qqqq";

export async function loadManifest(): Promise<VoiceManifest> {
  return (await load<VoiceManifest>(KEYS.voice)) ?? {};
}

async function ask(body: Record<string, unknown>): Promise<Reply> {
  return getJson<Reply>("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: "am", loc: "wol", ...body }) });
}

async function keep(m: VoiceManifest, key: string, a: Reply): Promise<boolean> {
  if (!a.reply || !a.audio) return false;
  if (m[key]?.text === a.reply) return true;
  const dir = new Directory(Paths.document, "voice");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${key}.mp3`);
  if (dest.exists) dest.delete();
  const url = a.audio.startsWith("http") ? a.audio : API_BASE + a.audio;
  const file = await File.downloadFileAsync(url, dest);
  m[key] = { text: a.reply, uri: file.uri };
  await save(KEYS.voice, m);
  return true;
}

/**
 * Downloads every Amharic answer that is not on the phone yet. Safe to stop and run again.
 * Returns how many clips are stored and whether the website's Amharic voice was available.
 */
export async function downloadVoicePack(records: SignRecord[], onProgress: (done: number, total: number) => void, stop: () => boolean) {
  const m = await loadManifest();
  const total = expectedClips(records);
  let done = 0;
  let voiceMissing = false;
  const step = (ok: boolean) => {
    if (!ok) voiceMissing = true;
    onProgress(++done, total);
  };
  step(await keep(m, clipKey("unknown"), await ask({ text: NOT_A_SIGN })));
  for (const r of records) {
    if (stop()) break;
    const n = r.record_number;
    // Words that should make the website recognise this very sign; the answer is used only if it did.
    const tries = [tr(r, "am").name, tr(r, "en").name, ...(r.tr.am?.keywords ?? []), ...(r.tr.en?.keywords ?? [])];
    let sign: Reply | null = null;
    for (const text of tries) {
      const a = await ask({ text });
      if (a.kind === "sign" && a.record?.number === n) {
        sign = a;
        break;
      }
    }
    step(sign ? await keep(m, clipKey("sign", n), sign) : false);
    const f = await ask({ text: QUESTION_AM, last: n });
    step(f.kind === "followup" && f.record?.number === n ? await keep(m, clipKey("followup", n), f) : false);
  }
  return { stored: Object.keys(m).length, total, voiceMissing, manifest: m };
}

export async function deleteVoicePack() {
  try {
    const dir = new Directory(Paths.document, "voice");
    if (dir.exists) dir.delete();
  } catch {}
  await save(KEYS.voice, {});
}
