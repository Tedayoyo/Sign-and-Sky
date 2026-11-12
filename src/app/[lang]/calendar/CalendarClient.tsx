"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { SeasonKey } from "@/lib/places";

export type CalendarItem = {
  id: string;
  n: number;
  name: string;
  category: string;
  month: number;
  day: number | null;
  season: SeasonKey;
  x: number;
};

type T = {
  months: string[];
  seasons: Record<SeasonKey, string[]>;
  all: string;
  filterLabel: string;
  observationsTitle: string;
  count: string;
  dayUnknown: string;
  rainTitle: string;
  rainNote: string;
  rainFailed: string;
};

// Season bands as fractions of the year: Bega Jan–Feb, Belg Mar–May, Kiremt Jun–Sep, Bega Oct–Dec.
const BANDS: { season: SeasonKey; from: number; to: number }[] = [
  { season: "bega", from: 0, to: 59 / 365 },
  { season: "belg", from: 59 / 365, to: 151 / 365 },
  { season: "kiremt", from: 151 / 365, to: 273 / 365 },
  { season: "bega", from: 273 / 365, to: 1 },
];
const ORDER: SeasonKey[] = ["belg", "kiremt", "bega"];

export function CalendarClient({ lang, items, t, categories }: { lang: string; items: CalendarItem[]; t: T; categories: Record<string, string> }) {
  const [season, setSeason] = useState<SeasonKey | "all">("all");
  const [hover, setHover] = useState<string | null>(null);
  const shown = items.filter((i) => season === "all" || i.season === season);
  // 1991–2020 average monthly rainfall at the study point (ERA5), from /api/climate/point.
  const [normal, setNormal] = useState<(number | null)[] | null>(null);
  const [rainState, setRainState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    fetch("/api/climate/point")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => (setNormal(j.normal), setRainState("ok")))
      .catch(() => setRainState("error"));
  }, []);
  const maxN = Math.max(1, ...(normal ?? []).map((v) => v ?? 0));
  const when = (i: CalendarItem) => (i.day ? `${i.day} ${t.months[i.month - 1]}` : `${t.months[i.month - 1]} (${t.dayUnknown})`);

  return (
    <div className="cal">
      <ul className="cal__seasons">
        {ORDER.map((k) => (
          <li key={k} className={`cal__season cal__season--${k}`}>
            <strong>{t.seasons[k][0]}</strong>
            <span className="cal__months">{t.seasons[k][1]}</span>
            <span>{t.seasons[k][2]}</span>
          </li>
        ))}
      </ul>

      <div className="cal__filter" role="group" aria-label={t.filterLabel}>
        {(["all", ...ORDER] as const).map((k) => (
          <button key={k} type="button" aria-pressed={season === k} onClick={() => setSeason(k)} className={`chip-btn chip-btn--${k}`}>
            {k === "all" ? t.all : t.seasons[k][0]}
          </button>
        ))}
      </div>

      <div className="cal__strip" aria-hidden="true">
        <div className="cal__bands">
          {BANDS.map((b, i) => (
            <span
              key={i}
              className={`cal__band cal__band--${b.season}${season !== "all" && season !== b.season ? " is-dim" : ""}`}
              style={{ left: `${b.from * 100}%`, width: `${(b.to - b.from) * 100}%` }}
            />
          ))}
          {items.map((i) => (
            <span
              key={i.id}
              className={`cal__dot cal__dot--${i.season}${shown.includes(i) ? "" : " is-dim"}${hover === i.id ? " is-hot" : ""}`}
              style={{ left: `${i.x * 100}%` }}
            />
          ))}
        </div>
        <div className="cal__ticks">
          {t.months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      <figure className="cal__rain">
        <figcaption>
          <strong>{t.rainTitle}</strong> <span className="muted small">{t.rainNote}</span>
        </figcaption>
        {rainState === "ok" && normal ? (
          <div className="cal__rain-bars" role="img" aria-label={`${t.rainTitle}: ${normal.map((v, i) => `${t.months[i]} ${v ?? "–"} mm`).join(", ")}`}>
            {normal.map((v, i) => {
              const m = i + 1;
              const s: SeasonKey = m >= 3 && m <= 5 ? "belg" : m >= 6 && m <= 9 ? "kiremt" : "bega";
              return (
                <span key={i} className={`cal__rain-col cal__rain-col--${s}${season !== "all" && season !== s ? " is-dim" : ""}`} title={`${t.months[i]}: ${v ?? "–"} mm`}>
                  <span className="cal__rain-val">{v === null ? "–" : Math.round(v)}</span>
                  <span className="cal__rain-bar" style={{ height: `${((v ?? 0) / maxN) * 100}%` }} />
                </span>
              );
            })}
          </div>
        ) : (
          <p className={`envx__state static${rainState === "error" ? " is-error" : ""}`}>{rainState === "loading" ? "…" : t.rainFailed}</p>
        )}
      </figure>

      <h2>{t.observationsTitle}</h2>
      <p className="muted">{t.count.replace("{n}", String(shown.length))}</p>
      <ol className="cal__list">
        {shown.map((i) => (
          <li
            key={i.id}
            className={`cal__item cal__item--${i.season}`}
            onMouseEnter={() => setHover(i.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i.id)}
            onBlur={() => setHover(null)}
          >
            <span className="cal__date">{when(i)}</span>
            <Link href={`/${lang}/signs/${i.n}`}>
              <CategoryIcon category={i.category} />
              {i.name}
            </Link>
            <span className="cal__tag">
              {t.seasons[i.season][0]} · {categories[i.category] ?? i.category}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
