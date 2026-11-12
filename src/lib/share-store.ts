// On-phone storage for the Share form (browser only): one unfinished draft, and an outbox of signs
// that were completed while offline. Uses IndexedDB so photos and voice notes survive a reload.
// Every call fails quietly (private windows can block storage); the form then simply works online only.

export type DraftFields = Record<string, string>;
export type StoredSign = { id: string; fields: DraftFields; voice?: Blob | null; photo?: Blob | null; photoName?: string; savedAt: number };

const DB = "sns-share";
const STORE = "items";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export const saveDraft = (d: StoredSign) => run("readwrite", (s) => s.put(d, "draft"));
export const loadDraft = () => run<StoredSign | undefined>("readonly", (s) => s.get("draft") as IDBRequest<StoredSign | undefined>);
export const clearDraft = () => run("readwrite", (s) => s.delete("draft"));

export async function loadOutbox(): Promise<StoredSign[]> {
  return ((await run<StoredSign[] | undefined>("readonly", (s) => s.get("outbox") as IDBRequest<StoredSign[] | undefined>)) ?? []).filter(Boolean);
}
export async function addToOutbox(item: StoredSign) {
  const list = await loadOutbox();
  await run("readwrite", (s) => s.put([...list.filter((x) => x.id !== item.id), item], "outbox"));
}
export async function removeFromOutbox(id: string) {
  const list = await loadOutbox();
  await run("readwrite", (s) => s.put(list.filter((x) => x.id !== id), "outbox"));
}

/** Rebuilds the multipart form the server expects. */
export function toFormData(item: StoredSign): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(item.fields)) f.set(k, v);
  if (item.photo) f.set("photo", item.photo, item.photoName || "photo.jpg");
  if (item.voice) f.set("voice", item.voice, `voice.${item.voice.type.includes("mp4") ? "m4a" : item.voice.type.includes("ogg") ? "ogg" : "webm"}`);
  return f;
}

/** Shrinks a photo to at most 1600 px (JPEG) so photo + voice stay within the upload limit. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}
