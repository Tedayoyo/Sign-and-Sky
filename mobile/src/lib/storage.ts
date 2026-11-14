// Small typed wrapper over on-phone storage. Every call fails quietly: the app must keep working
// from its built-in library even if storage is full or blocked.
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function save(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function remove(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

export const KEYS = {
  lang: "sns.lang",
  muted: "sns.muted",
  library: "sns.library.v1",
  climate: "sns.climate.v1",
  voice: "sns.voice.v1",
  outbox: "sns.outbox.v1",
  sent: "sns.sent.v1",
  draft: "sns.draft.v1",
};
