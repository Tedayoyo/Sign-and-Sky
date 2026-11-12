import { trustLevel } from "@/lib/scoring";

/** A circular score gauge (0–10) that fills when it appears. Colour follows the trust band. */
export function ScoreRing({ score, size = 120, label, caption }: { score: number; size?: number; label: string; caption?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(10, score)) / 10);
  const shown = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return (
    <span className={`ring ring--${trustLevel(score)}`} role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring__track" cx="50" cy="50" r={r} />
        <circle
          className="ring__value"
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={c.toFixed(2)}
          style={{ ["--ring-c" as string]: c.toFixed(2), ["--ring-off" as string]: off.toFixed(2), strokeDashoffset: off.toFixed(2) }}
        />
      </svg>
      <span className="ring__num" aria-hidden="true" style={{ fontSize: size * 0.27 }}>
        {shown}
        {caption && <small>{caption}</small>}
      </span>
    </span>
  );
}
