"use client";
// The voice simulator, made real: 1 Listen → 2 Understand → 3 Test → 4 Voice advice.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/analyze";
import type { Dict } from "@/lib/i18n";
import { Gauge, TrustBadge } from "./Gauge";
import { CategoryIcon } from "./CategoryIcon";

type Props = {
  lang: "en" | "am";
  t: Pick<Dict, "ask" | "trust" | "places" | "home">;
  initialText?: string;
  speechLang: string;
  /** Category of each of the 17 signs, in the same order as the examples. */
  categories: string[];
};

// A silent sound played on the first tap, so the phone lets the spoken reply play later.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};


export default function AskClient({ lang, t, initialText, speechLang, categories }: Props) {
  const loc = "wol"; // all signs were recorded in Wolaita, South Ethiopia
  const [text, setText] = useState(initialText ?? "");
  const [res, setRes] = useState<Analysis | null>(null);
  const [stage, setStage] = useState(0);
  const [hint, setHint] = useState(t.ask.hint);
  const [voiceNote, setVoiceNote] = useState("");
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "saved" | "failed"; code?: string }>({ status: "idle" });

  const lastRef = useRef<number | null>(null);
  const altRef = useRef("");
  const recRef = useRef<SR | null>(null);
  const finalsRef = useRef("");
  const shownRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartsRef = useRef(0);
  const listeningRef = useRef(false);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const blobsRef = useRef(new Map<string, string>());
  const seqRef = useRef(0);
  const clipsRef = useRef<Record<string, string> | null>(null);
  const resultRef = useRef<HTMLOListElement | null>(null);
  const mutedRef = useRef(false);

  // Remember the place and the last sign between visits.
  useEffect(() => {
    try {
      const last = Number(sessionStorage.getItem("sns_last"));
      if (last > 0) lastRef.current = last;
    } catch {}
    fetch("/audio/am/manifest.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => (clipsRef.current = m && typeof m === "object" ? (m as Record<string, string>) : {}))
      .catch(() => (clipsRef.current = {}));
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);


  // ---------- speaking ----------
  // Phones only allow sound that starts from a tap. The reply is ready about two seconds after the
  // tap, so the tap itself "unlocks" one audio player and the speech engine, and the reply reuses them.
  const unlock = useCallback(() => {
    try {
      if (!playerRef.current) {
        const p = new Audio();
        p.preload = "auto";
        playerRef.current = p;
      }
      if (!unlockedRef.current) {
        unlockedRef.current = true;
        const p = playerRef.current;
        p.src = SILENCE;
        p.play()?.catch(() => {});
        if ("speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(" ");
          u.volume = 0;
          window.speechSynthesis.speak(u);
        }
      }
    } catch {}
  }, []);

  const stopAudio = useCallback(() => {
    seqRef.current++;
    setSpeaking(false);
    setPreparing(false);
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    const p = playerRef.current;
    if (p) {
      try {
        p.pause();
      } catch {}
      p.onended = p.onerror = null;
    }
  }, []);

  const voiceFor = useCallback(() => {
    if (!("speechSynthesis" in window)) return null;
    const want = speechLang.toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang?.toLowerCase().replace("_", "-") === want) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(want.slice(0, 2))) ||
      null
    );
  }, [speechLang]);

  /** Browser voice, sentence by sentence (Chrome stops long utterances after about 15 seconds). */
  const speakBrowser = useCallback(
    (text: string, id: number) => {
      if (!("speechSynthesis" in window)) return false;
      const v = voiceFor();
      if (!v && lang === "am") return false;
      const parts = text.split(/(?<=[.!?።])\s+/).filter(Boolean);
      // Give a just-cancelled engine a moment, or some phones drop the next utterance.
      setTimeout(() => {
        if (id !== seqRef.current) return;
        try {
          window.speechSynthesis.cancel();
          parts.forEach((part, k) => {
            const u = new SpeechSynthesisUtterance(part);
            u.lang = speechLang;
            if (v) u.voice = v;
            u.rate = 0.95;
            if (k === 0) u.onstart = () => id === seqRef.current && setSpeaking(true);
            if (k === parts.length - 1) u.onend = u.onerror = () => id === seqRef.current && setSpeaking(false);
            window.speechSynthesis.speak(u);
          });
          window.speechSynthesis.resume();
        } catch {}
      }, 80);
      return true;
    },
    [lang, speechLang, voiceFor],
  );

  /** Recorded Amharic clips, when the reply is made only of recorded sentences. */
  const playClips = useCallback((r: Analysis, id: number) => {
    const manifest = clipsRef.current || {};
    const files: string[] = [];
    for (const seg of r.segments) {
      const keys = seg.clips ?? [];
      if (!keys.length || !keys.every((k) => manifest[k])) return false;
      files.push(...keys.map((k) => manifest[k]));
    }
    if (!files.length) return false;
    let i = 0;
    const p = playerRef.current ?? (playerRef.current = new Audio());
    const next = () => {
      if (id !== seqRef.current) return;
      if (i >= files.length) return setSpeaking(false);
      p.src = `/audio/am/${files[i++]}`;
      p.onended = () => setTimeout(next, 150);
      p.onerror = next;
      p.play()?.then(() => setSpeaking(true)).catch(() => setHint(t.ask.tapToHear));
    };
    next();
    return true;
  }, [t.ask.tapToHear]);

  const fallback = useCallback(
    (r: Analysis, id: number, serverFailed = false) => {
      if (id !== seqRef.current) return;
      setPreparing(false);
      if (speakBrowser(r.reply, id)) {
        if (serverFailed) setVoiceNote(t.ask.voiceFallback);
        return;
      }
      if (lang === "am" && playClips(r, id)) return;
      setSpeaking(false);
      setVoiceNote(t.ask.noVoice);
    },
    [lang, playClips, speakBrowser, t.ask.noVoice, t.ask.voiceFallback],
  );

  /** Natural voice from the speech service (Addis AI for Amharic). New clips can take several seconds. */
  const playServer = useCallback(
    async (r: Analysis, id: number) => {
      const url = r.audio!;
      let blobUrl = blobsRef.current.get(url);
      if (!blobUrl) {
        setPreparing(true);
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 25000);
        try {
          const res = await fetch(url, { signal: ctl.signal });
          if (!res.ok || !(res.headers.get("content-type") || "").startsWith("audio/")) throw new Error(String(res.status));
          blobUrl = URL.createObjectURL(await res.blob());
          blobsRef.current.set(url, blobUrl);
        } catch {
          clearTimeout(timer);
          return fallback(r, id, true);
        }
        clearTimeout(timer);
      }
      if (id !== seqRef.current) return;
      setPreparing(false);
      const p = playerRef.current ?? (playerRef.current = new Audio());
      p.onended = () => id === seqRef.current && setSpeaking(false);
      p.onerror = () => fallback(r, id, true);
      p.src = blobUrl;
      try {
        await p.play();
        if (id === seqRef.current) setSpeaking(true);
      } catch (e) {
        if (id !== seqRef.current) return;
        if (e instanceof DOMException && e.name === "NotAllowedError") setHint(t.ask.tapToHear);
        else fallback(r, id, true);
      }
    },
    [fallback, t.ask.tapToHear],
  );

  const speak = useCallback(
    (r: Analysis, force = false) => {
      if ((mutedRef.current && !force) || !r.reply) return;
      stopAudio();
      setVoiceNote("");
      const id = seqRef.current;
      if (r.audio) playServer(r, id);
      else fallback(r, id);
    },
    [fallback, playServer, stopAudio],
  );

  // ---------- analysing ----------
  const run = useCallback(
    async (raw: string) => {
      const said = raw.trim();
      if (!said || busy) return;
      stageTimers.current.forEach(clearTimeout);
      stopAudio();
      setBusy(true);
      setStage(0);
      setSaveState({ status: "idle" });
      setConsent(false);
      try {
        const r = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: said, alt: altRef.current, lang, loc, last: lastRef.current }),
        });
        if (!r.ok) throw new Error();
        const a: Analysis = await r.json();
        altRef.current = "";
        if (a.last) {
          lastRef.current = a.last;
          try {
            sessionStorage.setItem("sns_last", String(a.last));
          } catch {}
        }
        setRes(a);
        setStage(1);
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const d = reduce ? [0, 0, 0] : [500, 1200, 1900];
        stageTimers.current = [
          setTimeout(() => setStage(2), d[0]),
          setTimeout(() => setStage(3), d[1]),
          setTimeout(() => {
            setStage(4);
            speak(a);
            resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
          }, d[2]),
        ];
      } catch {
        setHint(t.ask.error);
      } finally {
        setBusy(false);
      }
    },
    [busy, lang, speak, stopAudio, t.ask.error],
  );

  // Run once when opened with ?q=
  const ranInitial = useRef(false);
  useEffect(() => {
    if (initialText && !ranInitial.current) {
      ranInitial.current = true;
      run(initialText);
    }
  }, [initialText, run]);

  // ---------- listening ----------
  const endListening = useCallback(
    (submit = true) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const was = listeningRef.current;
      listeningRef.current = false;
      setListening(false);
      try {
        recRef.current?.stop();
      } catch {}
      // Everything heard, including the last words not yet marked final.
      const said = (shownRef.current || finalsRef.current || "").trim();
      if (was && submit) {
        if (said) {
          setHint(t.ask.hint);
          run(said);
        } else setHint(t.ask.nohear);
      }
    },
    [run, t.ask.hint, t.ask.nohear],
  );

  const armTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => endListening(), lang === "am" ? 2600 : 2000);
  }, [endListening, lang]);

  const startListening = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) {
      setHint(t.ask.nosr);
      return;
    }
    unlock();
    if (listeningRef.current) {
      endListening();
      return;
    }
    stopAudio();
    const rec = new Ctor();
    rec.lang = speechLang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    finalsRef.current = "";
    shownRef.current = "";
    altRef.current = "";
    restartsRef.current = 0;
    setText("");
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalsRef.current += " " + r[0].transcript;
          for (let k = 1; k < r.length; k++) altRef.current += " " + r[k].transcript;
        } else interim += r[0].transcript;
      }
      shownRef.current = (finalsRef.current + " " + interim).trim();
      setText(shownRef.current);
      armTimer();
    };
    rec.onend = () => {
      if (!listeningRef.current) return;
      if (!shownRef.current && restartsRef.current < 4) {
        restartsRef.current++;
        try {
          rec.start();
        } catch {
          endListening();
        }
        return;
      }
      endListening();
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      listeningRef.current = false;
      setListening(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setHint(t.ask.blocked);
      else if (e.error === "network") setHint(t.ask.network);
      else if (e.error === "language-not-supported") setHint(t.ask.nosr);
      else setHint(t.ask.nohear);
    };
    recRef.current = rec;
    try {
      rec.start();
      listeningRef.current = true;
      setListening(true);
      setHint(t.ask.listening);
    } catch {
      setHint(t.ask.nostart);
    }
  };

  useEffect(() => {
    return () => {
      stageTimers.current.forEach(clearTimeout);
      stopAudio();
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, [stopAudio]);

  const save = async () => {
    if (!res || !consent) return;
    setSaveState({ status: "saving" });
    try {
      const r = await fetch("/api/unknown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: res.heard, lang, loc, consent: true }),
      });
      const j = await r.json();
      if (!r.ok || !j.code) throw new Error();
      setSaveState({ status: "saved", code: j.code });
    } catch {
      setSaveState({ status: "failed" });
    }
  };

  const shareAnswer = async () => {
    if (!res) return;
    const url = `${location.origin}/${lang}?q=${encodeURIComponent(res.heard)}`;
    const body = `“${res.heard}”\n${res.reply}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.ask.shareTitle, text: body, url });
        return;
      }
      await navigator.clipboard.writeText(`${body}\n${url}`);
      setVoiceNote(t.ask.copied);
    } catch {}
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    if (m) stopAudio();
  };

  const trust = res?.test?.trust ?? "untested";
  const a = t.ask;

  return (
    <>
      <div className="ask-card">
        <p className="place-line">
          <span className="muted">{t.home.place}:</span> <strong>{t.places.wol.label}</strong>
        </p>
        <form
          className="ask-row"
          onSubmit={(e) => {
            e.preventDefault();
            unlock();
            altRef.current = "";
            if (!text.trim()) {
              setHint(t.ask.empty);
              document.getElementById("said")?.focus();
              return;
            }
            run(text);
          }}
        >
          <button
            type="button"
            className={`mic${listening ? " on" : ""}`}
            onClick={startListening}
            aria-label={listening ? a.micStop : a.mic}
            aria-pressed={listening}
            title={listening ? a.micStop : a.mic}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
          <label htmlFor="said" className="sr-only">
            {a.label}
          </label>
          <input id="said" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={a.placeholder} autoComplete="off" />
          <button className="btn" type="submit" disabled={busy}>
            {a.go}
          </button>
        </form>
        <h2 className="examples-title">{a.examplesTitle}</h2>
        <ol className="sign-examples">
          {a.examples.map((x, i) => (
            <li key={x}>
              <button
                type="button"
                className="example"
                onClick={() => {
                  unlock();
                  altRef.current = "";
                  setText(x);
                  run(x);
                }}
              >
                <CategoryIcon category={categories[i] ?? "other"} />
                <span>{x}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="question-line">
          <span className="muted">{a.questionTitle}:</span>{" "}
          <button
            type="button"
            className="chip"
            onClick={() => {
              unlock();
              altRef.current = "";
              setText(a.question);
              run(a.question);
            }}
          >
            {a.question}
          </button>
        </p>
        <p className="hint" aria-live="polite">
          {hint}
        </p>
      </div>

      {res && res.kind !== "empty" && (
        <ol className="steps" ref={resultRef} aria-live="polite">
          {stage >= 1 && (
            <li className="step-enter">
              <h3>{a.steps.listen}</h3>
              <p className="heard">“{res.heard}”</p>
            </li>
          )}
          {stage >= 2 && (
            <li className="step-enter">
              <h3>{a.steps.understand}</h3>
              <dl className="kv">
                <dt>{a.kv.sign}</dt>
                <dd>{res.record ? res.record.name : a.notRecognised}</dd>
                <dt>{a.kv.place}</dt>
                <dd>{res.place.name}</dd>
                {res.record && (
                  <>
                    <dt>{a.kv.season}</dt>
                    <dd>{res.season}</dd>
                    <dt>{a.kv.predicts}</dt>
                    <dd>{res.record.prediction}</dd>
                    <dt>{a.kv.delay}</dt>
                    <dd>{res.record.delay}</dd>
                  </>
                )}
              </dl>
            </li>
          )}
          {stage >= 3 && (
            <li className="step-enter">
              <h3>{a.steps.test}</h3>
              {!res.record ? (
                <p>{a.unknownTest}</p>
              ) : res.test && res.test.score !== null ? (
                <div className="test-panel">
                  <Gauge score={res.test.score} label={a.gaugeLabel.replace("{score}", String(res.test.score))} of="/ 10" />
                  <div>
                    <p style={{ margin: 0 }}>
                      <TrustBadge level={trust} text={t.trust[trust]} />
                    </p>
                    {res.test.testedIn && <p className="small muted" style={{ margin: ".4rem 0 0" }}>{a.testedIn.replace("{place}", res.test.testedIn)}</p>}
                    <p className="small" style={{ margin: ".4rem 0 0" }}>
                      <Link href={`/${lang}/signs/${res.record.number}`}>{a.openRecord}</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <p>
                  <TrustBadge level="untested" text={t.trust.untested} /> {a.notTested}
                </p>
              )}
            </li>
          )}
          {stage >= 4 && (
            <li className="step-enter">
              <h3>{a.steps.advice}</h3>
              <p className={`advice${speaking ? " speaking" : ""}`}>
                {speaking && <span className="wave" aria-hidden="true"><i /><i /><i /><i /></span>}
                {res.reply}
              </p>
              {preparing && (
                <p className="hint preparing" role="status">
                  <span className="spinner" aria-hidden="true" /> {a.preparingVoice}
                </p>
              )}
              {voiceNote && <p className="hint warn">{voiceNote}</p>}
              <div className="actions">
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() => {
                    unlock();
                    if (speaking || preparing) stopAudio();
                    else speak(res, true);
                  }}
                  aria-pressed={speaking || preparing}
                >
                  {speaking || preparing ? a.stopVoice : a.playAgain}
                </button>
                <button type="button" className="btn secondary small" onClick={toggleMute} aria-pressed={muted}>
                  {muted ? a.unmute : a.mute}
                </button>
                <button type="button" className="btn secondary small" onClick={shareAnswer}>
                  {a.shareAnswer}
                </button>
              </div>
              {res.kind === "unknown" && (
                <div className="save-box">
                  {saveState.status === "saved" ? (
                    <p style={{ margin: 0 }}>{a.saved.replace("{code}", saveState.code || "")}</p>
                  ) : (
                    <>
                      <p style={{ fontWeight: 700, marginBottom: ".5rem" }}>{a.saveTitle}</p>
                      <label className="check">
                        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                        <span>{a.saveConsent}</span>
                      </label>
                      <div className="actions">
                        <button type="button" className="btn small" disabled={!consent || saveState.status === "saving"} onClick={save}>
                          {saveState.status === "saving" ? a.saving : a.saveButton}
                        </button>
                      </div>
                      {saveState.status === "failed" && <p className="hint warn">{a.saveFailed}</p>}
                    </>
                  )}
                </div>
              )}
            </li>
          )}
        </ol>
      )}
    </>
  );
}
