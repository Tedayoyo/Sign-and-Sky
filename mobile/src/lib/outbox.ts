// Signs a farmer shared while offline wait here, on the phone, and are sent to the website's
// /api/share when a connection comes back. Photos and voice notes are copied into the app's own
// folder so they survive until they are sent.
import { Directory, File, Paths } from "expo-file-system";
import { API_BASE } from "./config";
import { KEYS, load, save } from "./storage";

import type { ShareFields } from "./outbox-rules";

export { validateShare, type ShareFields } from "./outbox-rules";
export type Queued = { id: string; fields: ShareFields; photoUri?: string | null; voiceUri?: string | null; savedAt: string; lastError?: string };
export type Sent = { id: string; code: string; indicator: string; sentAt: string };

export const loadOutbox = async () => (await load<Queued[]>(KEYS.outbox)) ?? [];
export const loadSent = async () => (await load<Sent[]>(KEYS.sent)) ?? [];

function keepFile(uri: string, name: string): string {
  try {
    const dir = new Directory(Paths.document, "outbox");
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, name);
    if (dest.exists) dest.delete();
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri; // keep the original location rather than lose the attachment
  }
}

export async function enqueue(fields: ShareFields, photoUri?: string | null, voiceUri?: string | null): Promise<Queued> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item: Queued = {
    id,
    fields,
    photoUri: photoUri ? keepFile(photoUri, `${id}-photo.jpg`) : null,
    voiceUri: voiceUri ? keepFile(voiceUri, `${id}-voice.m4a`) : null,
    savedAt: new Date().toISOString(),
  };
  await save(KEYS.outbox, [...(await loadOutbox()), item]);
  return item;
}

function cleanup(item: Queued) {
  for (const uri of [item.photoUri, item.voiceUri]) {
    try {
      if (uri) {
        const f = new File(uri);
        if (f.exists) f.delete();
      }
    } catch {}
  }
}

export function toFormData(item: Queued): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(item.fields)) f.append(k, v);
  f.append("consent", "on");
  // React Native sends a local file when given its address, name and type.
  if (item.photoUri) f.append("photo", { uri: item.photoUri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
  if (item.voiceUri) f.append("voice", { uri: item.voiceUri, name: "voice.m4a", type: "audio/mp4" } as unknown as Blob);
  return f;
}

type ShareAnswer = { ok?: boolean; code?: string; error?: string };

/** Sends one sign. "rejected" means the website refused it (it will never be accepted as it is). */
export async function sendOne(item: Queued): Promise<{ status: "sent"; code: string } | { status: "rejected" | "retry"; error: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch(`${API_BASE}/api/share`, { method: "POST", body: toFormData(item), signal: ctl.signal });
    const j = (await r.json().catch(() => ({}))) as ShareAnswer;
    if (r.ok && j.ok && j.code) return { status: "sent", code: j.code };
    if (r.status === 422 || r.status === 413) return { status: "rejected", error: j.error || `The server answered ${r.status}` };
    return { status: "retry", error: j.error || `The server answered ${r.status}` };
  } catch (e) {
    return { status: "retry", error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

let flushing = false;

/** Sends everything that is waiting. Signs the website refuses stay in the list with the reason, so nothing is lost silently. */
export async function flushOutbox(): Promise<{ sent: Sent[]; left: Queued[] }> {
  if (flushing) return { sent: [], left: await loadOutbox() };
  flushing = true;
  try {
    const sent: Sent[] = [];
    for (const item of await loadOutbox()) {
      const res = await sendOne(item);
      const now = await loadOutbox();
      if (res.status === "sent") {
        cleanup(item);
        const s = { id: item.id, code: res.code, indicator: item.fields.indicator ?? "", sentAt: new Date().toISOString() };
        sent.push(s);
        await save(KEYS.outbox, now.filter((x) => x.id !== item.id));
        await save(KEYS.sent, [s, ...(await loadSent())].slice(0, 30));
      } else {
        await save(KEYS.outbox, now.map((x) => (x.id === item.id ? { ...x, lastError: res.error } : x)));
        if (res.status === "retry") break; // no connection or server trouble: try the rest later
      }
    }
    return { sent, left: await loadOutbox() };
  } finally {
    flushing = false;
  }
}

export async function removeQueued(id: string) {
  const list = await loadOutbox();
  const item = list.find((x) => x.id === id);
  if (item) cleanup(item);
  await save(KEYS.outbox, list.filter((x) => x.id !== id));
}
