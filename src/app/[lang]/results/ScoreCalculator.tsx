"use client";
import { useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { trustLevel } from "@/lib/scoring";

type T = { title: string; intro: string; h: string; yes: string; no: string; p: string; pLow: string; pHigh: string; result: string; note: string };

/** Lets anyone see how H and P make the published score: 10 × (0.5 × H + 0.5 × P). */
export function ScoreCalculator({ t, trust, scoreLabel }: { t: T; trust: Record<string, string>; scoreLabel: string }) {
  const [h, setH] = useState(1);
  const [p, setP] = useState(0.5);
  const score = Math.round(10 * (0.5 * h + 0.5 * p) * 10) / 10;
  const level = trustLevel(score);
  return (
    <section className="calc" aria-labelledby="calc-title">
      <h3 id="calc-title">{t.title}</h3>
      <p className="muted">{t.intro}</p>
      <div className="calc__body">
        <div className="calc__controls">
          <fieldset>
            <legend>{t.h}</legend>
            <div className="calc__seg">
              <button type="button" aria-pressed={h === 1} onClick={() => setH(1)}>
                {t.yes} (H = 1)
              </button>
              <button type="button" aria-pressed={h === 0} onClick={() => setH(0)}>
                {t.no} (H = 0)
              </button>
            </div>
          </fieldset>
          <label className="calc__slider">
            <span>
              {t.p}: <strong>{p.toFixed(2)}</strong>
            </span>
            <input type="range" min={0} max={1} step={0.05} value={p} onChange={(e) => setP(Number(e.target.value))} />
            <span className="calc__ends muted small">
              <span>{t.pLow}</span>
              <span>{t.pHigh}</span>
            </span>
          </label>
          <p className="formula calc__formula" lang="en" aria-live="polite">
            10 × (0.5 × {h} + 0.5 × {p.toFixed(2)}) = {score}
          </p>
        </div>
        <div className="calc__out">
          <ScoreRing key={score} score={score} size={130} caption="/10" label={scoreLabel.replace("{score}", String(score))} />
          <span className={`badge ${level}`}>{trust[level]}</span>
          <span className="muted small">{t.result}</span>
        </div>
      </div>
      <p className="muted small">{t.note}</p>
    </section>
  );
}
