"use client";
import { useEffect, useState } from "react";
import { parseTimeSeries as points } from "@/lib/series";

// NDVI over Offa Woreda from GI-AI4AFS. Its response format is not published, so the panel looks for a list of
// {date, value} pairs and draws them; if it cannot find one, it says data arrived and links the raw answer.
type T = { title: string; help: string; loading: string; failed: string; unreadable: string; raw: string };

export function VegetationPanel({ t }: { t: T }) {
  const [state, setState] = useState<"loading" | "off" | "ok" | "error">("loading");
  const [pts, setPts] = useState<{ d: string; v: number }[]>([]);
  useEffect(() => {
    fetch("/api/giai/ndvi")
      .then((r) => r.json())
      .then((j) => {
        if (j.configured === false) return setState("off");
        if (j.error) return setState("error");
        setPts(points(j.data));
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);
  if (state === "off") return null;
  const W = 680, H = 180, L = 36, T = 12, B = 22, PW = W - L - 10, PH = H - T - B;
  const lo = Math.min(...pts.map((p) => p.v), 0), hi = Math.max(...pts.map((p) => p.v), 1);
  const x = (i: number) => L + (i / Math.max(1, pts.length - 1)) * PW;
  const y = (v: number) => T + PH - ((v - lo) / (hi - lo || 1)) * PH;
  return (
    <section className="envx__panel" aria-labelledby="ndvi-title">
      <h2 id="ndvi-title">{t.title}</h2>
      <p className="muted">{t.help}</p>
      {state === "loading" && <p className="envx__state static">{t.loading}</p>}
      {state === "error" && <p className="envx__state static is-error">{t.failed}</p>}
      {state === "ok" && pts.length < 2 && (
        <p>
          {t.unreadable} <a href="/api/giai/ndvi">{t.raw}</a>
        </p>
      )}
      {state === "ok" && pts.length >= 2 && (
        <figure className="envx__chart">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.title}>
            {[lo, (lo + hi) / 2, hi].map((v) => (
              <g key={v}>
                <line className="ev-grid" x1={L} x2={L + PW} y1={y(v)} y2={y(v)} />
                <text className="ev-axis" x={L - 6} y={y(v) + 4} textAnchor="end">
                  {v.toFixed(2)}
                </text>
              </g>
            ))}
            <polyline className="envx__ndvi" points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />
            {pts.map((p, i) => (
              <circle key={p.d} cx={x(i)} cy={y(p.v)} r={4} className="envx__ndvi-dot">
                <title>{`${p.d}: ${p.v.toFixed(3)}`}</title>
              </circle>
            ))}
            <text className="ev-axis" x={L} y={H - 4}>
              {pts[0].d}
            </text>
            <text className="ev-axis" x={L + PW} y={H - 4} textAnchor="end">
              {pts.at(-1)!.d}
            </text>
          </svg>
          <p className="small muted">
            GI-AI4AFS Spatio-Temporal API · <a href="/api/giai/ndvi">{t.raw}</a>
          </p>
        </figure>
      )}
    </section>
  );
}
