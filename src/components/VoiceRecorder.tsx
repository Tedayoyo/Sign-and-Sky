"use client";
import { useEffect, useRef, useState } from "react";

export type VoiceText = {
  title: string;
  help: string;
  start: string;
  stop: string;
  again: string;
  remove: string;
  recording: string;
  notSupported: string;
  denied: string;
};

const LIMIT_S = 120;

function pickType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) ?? "";
}

/** Records a short voice note (up to 2 minutes) with a live waveform, then plays it back. */
export function VoiceRecorder({ t, value, onChange }: { t: VoiceText; value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!value) return setUrl(null);
    const u = URL.createObjectURL(value);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  const cleanup = () => {
    cancelAnimationFrame(raf.current);
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    ctx.current?.close().catch(() => {});
    stream.current = null;
    ctx.current = null;
  };
  useEffect(() => cleanup, []);

  const draw = (analyser: AnalyserNode) => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const color = getComputedStyle(c).color || "#3e7b4f";
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      const w = (c.width = c.clientWidth * devicePixelRatio);
      const h = (c.height = c.clientHeight * devicePixelRatio);
      g.clearRect(0, 0, w, h);
      const bars = 48;
      const step = Math.floor(data.length / bars);
      const bw = w / bars;
      g.fillStyle = color;
      for (let i = 0; i < bars; i++) {
        let peak = 0;
        for (let k = 0; k < step; k++) peak = Math.max(peak, Math.abs(data[i * step + k] - 128));
        const bh = Math.max(3 * devicePixelRatio, (peak / 128) * h * 0.95);
        g.beginPath();
        g.roundRect(i * bw + bw * 0.2, (h - bh) / 2, bw * 0.6, bh, bw * 0.3);
        g.fill();
      }
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const start = async () => {
    setMsg("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      return setMsg(t.notSupported);
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const type = pickType();
      const r = new MediaRecorder(s, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        cleanup();
        setState("idle");
        onChange(new Blob(chunks, { type: (r.mimeType || type || "audio/webm").split(";")[0] }));
      };
      rec.current = r;
      try {
        ctx.current = new AudioContext();
        const an = ctx.current.createAnalyser();
        an.fftSize = 1024;
        ctx.current.createMediaStreamSource(s).connect(an);
        draw(an);
      } catch {}
      r.start(250);
      setSecs(0);
      setState("recording");
      timer.current = setInterval(() => {
        setSecs((x) => {
          if (x + 1 >= LIMIT_S) rec.current?.state === "recording" && rec.current.stop();
          return x + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      setState("error");
      setMsg(t.denied);
    }
  };

  const stop = () => rec.current?.state === "recording" && rec.current.stop();
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

  return (
    <div className={`voice voice--${state}`}>
      <p className="voice__title">{t.title}</p>
      <p className="field-help">{t.help}</p>
      <div className="voice__row">
        {state === "recording" ? (
          <button type="button" className="voice__btn voice__btn--stop" onClick={stop}>
            <span className="voice__rec" aria-hidden="true" /> {t.stop}
          </button>
        ) : (
          <button type="button" className="voice__btn" onClick={start}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
            {value ? t.again : t.start}
          </button>
        )}
        {state === "recording" && (
          <span className="voice__time" role="status">
            {t.recording.replace("{t}", `${mmss(secs)} / ${mmss(LIMIT_S)}`)}
          </span>
        )}
      </div>
      <canvas ref={canvas} className="voice__wave" aria-hidden="true" hidden={state !== "recording"} />
      {url && state !== "recording" && (
        <div className="voice__play">
          <audio controls src={url} preload="metadata" />
          <button type="button" className="btn secondary small" onClick={() => onChange(null)}>
            {t.remove}
          </button>
        </div>
      )}
      {msg && (
        <p className="hint warn" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
