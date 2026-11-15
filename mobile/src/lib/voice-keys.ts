// Names and matching of stored Amharic clips (no phone features here, so it can be unit-tested).
/** uri: a file on the phone (downloaded) or a recording shipped inside the app. */
export type Clip = { text: string; uri: string | number };
export type VoiceManifest = Record<string, Clip>;

export const clipKey = (kind: "sign" | "followup" | "unknown", n?: number) => (kind === "unknown" ? "am-unknown" : `am-${kind}-${n}`);

/** The stored clip for this exact answer, if there is one. */
export function clipFor(m: VoiceManifest, key: string, text: string): Clip | null {
  const c = m[key];
  return c && c.text === text ? c : null;
}

export function expectedClips(records: { record_number: number }[]): number {
  return records.length * 2 + 1;
}
