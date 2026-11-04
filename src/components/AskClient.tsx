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
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);


  // ---------- speaking ----------
  const stopAudio = useCallback(() => {
    seqRef.current++;
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      audioRef.current = null;
    }
  }, []);

  const voiceFor = useCallback(() => {
    if (!("speechSynthesis" in window)) return null;
    const want = speechLang.slice(0, 2).toLowerCase();
    return window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(want)) || null;
  }, [speechLang]);

  const playClips = useCallback(
    (files: string[]) => {
      const id = ++seqRef.current;
      let i = 0;
      const next = () => {
        if (id !== seqRef.current || i >= files.length) return;
        const a = new Audio(`/audio/am/${files[i++]}`);
        audioRef.current = a;
        a.onended = () => setTimeout(next, 150);
        a.onerror = next;
        a.play()?.catch(() => setHint(t.ask.tapToHear));
      };
      next();
    },
    [t.ask.tapToHear],
  );

  const speak = useCallback(
    (r: Analysis, force = false) => {
      if ((mutedRef.current && !force) || !r.reply) return;
      stopAudio();
      setVoiceNote("");
      const v = voiceFor();
      if (v || lang === "en") {
        if (!("speechSynthesis" in window)) return;
        try {
          const u = new SpeechSynthesisUtterance(r.reply);
          u.lang = speechLang;
          if (v) u.voice = v;
          u.rate = 0.95;
          window.speechSynthesis.speak(u);
        } catch {}
        return;
      }
      // Amharic without an Amharic voice: play recorded clips whose words still match the text.
      const manifest = clipsRef.current || {};
      const files: string[] = [];
      let missing = false;
      for (const seg of r.segments) {
        const keys = seg.clips ?? [];
        if (keys.length && keys.every((k) => manifest[k])) files.push(...keys.map((k) => manifest[k]));
        else missing = true;
      }
      if (files.length) {
        playClips(files);
        if (missing) setVoiceNote(t.ask.someWritten);
      } else setVoiceNote(t.ask.noVoice);
    },
    [lang, playClips, speechLang, stopAudio, t.ask.noVoice, t.ask.someWritten, voiceFor],
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
              {res.record?.translationNeedsReview && lang === "am" && <p className="small muted" style={{ marginTop: ".6rem" }}>{a.amReview}</p>}
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
              <p className="advice">{res.reply}</p>
              {voiceNote && <p className="hint warn">{voiceNote}</p>}
              <div className="actions">
                <button type="button" className="btn secondary small" onClick={() => speak(res, true)}>
                  {a.playAgain}
                </button>
                <button type="button" className="btn secondary small" onClick={toggleMute} aria-pressed={muted}>
                  {muted ? a.unmute : a.mute}
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
