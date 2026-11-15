// App-wide state: language, the sign library, connection, and the background jobs that run when
// the phone is online (library and rainfall refresh, sending queued signs, Amharic voice download).
import * as Localization from "expo-localization";
import * as Network from "expo-network";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BUNDLED_VOICE } from "@/data/voice-bundled";
import { APP_STRINGS, type AppStrings } from "./app-strings";
import { addEntry, isDiary, removeEntry, setOutcome, type DiaryEntry, type Outcome } from "./diary-rules";
import { dict, isLocale, type Dict, type Locale } from "./i18n";
import { flushOutbox, loadOutbox, loadSent, type Queued, type Sent } from "./outbox";
import { BUILTIN, type SignRecord } from "./records";
import { KEYS, load, save } from "./storage";
import { refreshClimate, refreshLibrary, storedClimate, storedLibrary, type StoredClimate } from "./sync";
import { deleteVoicePack, downloadVoicePack, expectedClips, loadManifest, type Clip, type VoiceManifest } from "./voicepack";

type VoiceState = { running: boolean; done: number; total: number; problem: boolean };
type UpdateState = "idle" | "running" | "ok" | "failed";

type AppState = {
  ready: boolean;
  lang: Locale;
  setLang: (l: Locale) => void;
  d: Dict;
  s: AppStrings;
  records: SignRecord[];
  libraryAt: string | null;
  climate: StoredClimate | null;
  online: boolean;
  muted: boolean;
  setMuted: (m: boolean) => void;
  outbox: Queued[];
  sent: Sent[];
  reloadOutbox: () => Promise<void>;
  sendNow: () => Promise<void>;
  sending: boolean;
  manifest: VoiceManifest;
  voice: VoiceState;
  startVoiceDownload: () => void;
  stopVoiceDownload: () => void;
  removeVoice: () => Promise<void>;
  update: UpdateState;
  updateNow: () => Promise<void>;
  /** The recording of exactly this answer: shipped inside the app, or downloaded earlier. */
  findClip: (key: string, text: string) => Clip | null;
  /** How many Amharic answers can be spoken offline, and out of how many. */
  voiceReady: { have: number; total: number; bundled: number };
  onboarded: boolean;
  finishWelcome: () => void;
  diary: DiaryEntry[];
  noteSighting: (n: number) => boolean;
  setDiaryOutcome: (id: string, o: Outcome) => void;
  removeSighting: (id: string) => void;
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
};

function deviceLang(): Locale {
  try {
    return Localization.getLocales()[0]?.languageCode === "am" ? "am" : "en";
  } catch {
    return "en";
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Locale>("en");
  const [records, setRecords] = useState<SignRecord[]>(BUILTIN);
  const [libraryAt, setLibraryAt] = useState<string | null>(null);
  const [climate, setClimate] = useState<StoredClimate | null>(null);
  const [muted, setMutedState] = useState(false);
  const [outbox, setOutbox] = useState<Queued[]>([]);
  const [sent, setSent] = useState<Sent[]>([]);
  const [sending, setSending] = useState(false);
  const [manifest, setManifest] = useState<VoiceManifest>({});
  const [voice, setVoice] = useState<VoiceState>({ running: false, done: 0, total: 0, problem: false });
  const [update, setUpdate] = useState<UpdateState>("idle");
  const [onboarded, setOnboarded] = useState(true);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const diaryRef = useRef<DiaryEntry[]>([]);
  const net = Network.useNetworkState();
  const online = net.isConnected !== false && net.isInternetReachable !== false;
  const stopVoice = useRef(false);
  const recordsRef = useRef(records);
  recordsRef.current = records;

  useEffect(() => {
    (async () => {
      const [l, m, lib, cl, man, ob, di] = await Promise.all([load<string>(KEYS.lang), load<boolean>(KEYS.muted), storedLibrary(), storedClimate(), loadManifest(), load<boolean>(KEYS.onboarded), load<unknown>(KEYS.diary)]);
      setOnboarded(ob === true);
      if (isDiary(di)) {
        diaryRef.current = di;
        setDiary(di);
      }
      setLangState(isLocale(l) ? l : deviceLang());
      setMutedState(m === true);
      if (lib) {
        setRecords(lib.signs);
        setLibraryAt(lib.at);
      }
      setClimate(cl);
      setManifest(man);
      setOutbox(await loadOutbox());
      setSent(await loadSent());
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l: Locale) => {
    setLangState(l);
    void save(KEYS.lang, l);
  }, []);
  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    void save(KEYS.muted, m);
  }, []);

  const finishWelcome = useCallback(() => {
    setOnboarded(true);
    void save(KEYS.onboarded, true);
  }, []);
  const putDiary = useCallback((list: DiaryEntry[]) => {
    diaryRef.current = list;
    setDiary(list);
    void save(KEYS.diary, list);
  }, []);
  const noteSighting = useCallback(
    (n: number) => {
      const r = addEntry(diaryRef.current, n, localToday());
      if (r.added) putDiary(r.list);
      return r.added;
    },
    [putDiary],
  );
  const setDiaryOutcome = useCallback((id: string, o: Outcome) => putDiary(setOutcome(diaryRef.current, id, o)), [putDiary]);
  const removeSighting = useCallback((id: string) => putDiary(removeEntry(diaryRef.current, id)), [putDiary]);

  const findClip = useCallback(
    (key: string, text: string): Clip | null => {
      const b = BUNDLED_VOICE[key];
      if (b && b.text === text) return { text, uri: b.file };
      const c = manifest[key];
      return c && c.text === text ? c : null;
    },
    [manifest],
  );
  const voiceReady = useMemo(() => {
    const keys = new Set([...Object.keys(BUNDLED_VOICE), ...Object.keys(manifest)]);
    return { have: keys.size, total: Math.max(expectedClips(records), keys.size), bundled: Object.keys(BUNDLED_VOICE).length };
  }, [manifest, records]);

  const reloadOutbox = useCallback(async () => {
    setOutbox(await loadOutbox());
    setSent(await loadSent());
  }, []);

  const sendNow = useCallback(async () => {
    setSending(true);
    try {
      await flushOutbox();
    } finally {
      await reloadOutbox();
      setSending(false);
    }
  }, [reloadOutbox]);

  const startVoiceDownload = useCallback(() => {
    if (voiceRunning.current) return;
    voiceRunning.current = true;
    stopVoice.current = false;
    const total = expectedClips(recordsRef.current);
    setVoice({ running: true, done: 0, total, problem: false });
    downloadVoicePack(recordsRef.current, (done, t) => setVoice((v) => ({ ...v, done, total: t })), () => stopVoice.current)
      .then((r) => {
        setManifest({ ...r.manifest });
        setVoice({ running: false, done: r.stored, total: r.total, problem: r.voiceMissing });
      })
      .catch(async () => {
        setManifest(await loadManifest());
        setVoice((v) => ({ ...v, running: false, problem: true }));
      })
      .finally(() => {
        voiceRunning.current = false;
      });
  }, []);
  const voiceRunning = useRef(false);
  const stopVoiceDownload = useCallback(() => {
    stopVoice.current = true;
  }, []);
  const removeVoice = useCallback(async () => {
    stopVoice.current = true;
    await deleteVoicePack();
    setManifest({});
    setVoice({ running: false, done: 0, total: 0, problem: false });
  }, []);

  const updateNow = useCallback(async () => {
    setUpdate("running");
    // The library and the rainfall are fetched separately: one failing does not stop the other.
    const lib = await refreshLibrary().catch(() => null);
    if (lib) {
      setRecords(lib.signs);
      recordsRef.current = lib.signs;
      setLibraryAt(lib.at);
    }
    const cl = await refreshClimate().catch(() => null);
    if (cl) setClimate(cl);
    setUpdate(lib ? "ok" : "failed");
  }, []);

  // When a connection appears: refresh the data, send waiting signs, and (in Amharic) fetch the voice.
  const lastAuto = useRef(0);
  useEffect(() => {
    if (!ready || !online) return;
    if (Date.now() - lastAuto.current < 10 * 60_000) return;
    lastAuto.current = Date.now();
    (async () => {
      await updateNow();
      await sendNow();
      const have = new Set([...Object.keys(BUNDLED_VOICE), ...Object.keys(await loadManifest())]).size;
      if (lang === "am" && have < expectedClips(recordsRef.current)) startVoiceDownload();
    })();
  }, [ready, online, lang, updateNow, sendNow, startVoiceDownload]);

  const value = useMemo<AppState>(
    () => ({
      ready, lang, setLang, d: dict(lang), s: APP_STRINGS[lang], records, libraryAt, climate, online, muted, setMuted,
      outbox, sent, reloadOutbox, sendNow, sending, manifest, voice, startVoiceDownload, stopVoiceDownload, removeVoice, update, updateNow,
      findClip, voiceReady, onboarded, finishWelcome, diary, noteSighting, setDiaryOutcome, removeSighting,
    }),
    [ready, lang, setLang, records, libraryAt, climate, online, muted, setMuted, outbox, sent, reloadOutbox, sendNow, sending, manifest, voice, startVoiceDownload, stopVoiceDownload, removeVoice, update, updateNow, findClip, voiceReady, onboarded, finishWelcome, diary, noteSighting, setDiaryOutcome, removeSighting],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
