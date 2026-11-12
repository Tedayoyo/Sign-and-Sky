"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Z, mx, my, EXT, WOLAITA, OFFA } from "@/lib/mapgeo";

// Rainfall map and charts for Wolaita, drawn only from /api/climate (ERA5 via Open-Meteo). Nothing is drawn for missing data.

type Cell = { lat: number; lon: number; monthly: (number | null)[] };
type Grid = { year: number; cells: Cell[]; cell_degrees: number; last_date: string | null; source: string; credit: string; retrieved_at: string };
type SeasonRow = { year: number; belg: number | null; kiremt: number | null; bega: number | null };
type Point = {
  point: { lat: number; lon: number };
  normal: (number | null)[];
  normal_period: string;
  years: Record<string, (number | null)[]>;
  seasons: SeasonRow[];
  season_normal: { belg: number | null; kiremt: number | null; bega: number | null };
  last_date: string | null;
  source: string;
  credit: string;
  retrieved_at: string;
  resolution: string;
  fallback?: string | null;
};
export type ObsMarker = { month: number; name: string };

export type EnvText = {
  mapTitle: string;
  mapHelp: string;
  year: string;
  month: string;
  play: string;
  pause: string;
  loading: string;
  failed: string;
  noData: string;
  legend: string;
  legendNoData: string;
  wolaitaBox: string;
  offaBox: string;
  studyPoint: string;
  signsSeen: string;
  fieldRecord: string;
  cellNote: string;
  monthlyTitle: string;
  monthlyHelp: string;
  normal: string;
  seasonsTitle: string;
  seasonsHelp: string;
  seasonNames: { belg: string; kiremt: string; bega: string };
  table: string;
  colMonth: string;
  colYear: string;
  colNormal: string;
  colPct: string;
  sourceLabel: string;
  fallback: string;
  retrieved: string;
  dataUntil: string;
  imagery: string;
  months: string[];
};

// Sequential rainfall scale (one hue, light → dark; lightness checked to fall in even steps).
const RAMP = ["#e3eef7", "#bcd6ec", "#8bb9df", "#5797ca", "#2f74ad", "#1a4f80"];
const BINS = [25, 50, 100, 150, 200];
const colorFor = (v: number | null) => (v === null ? null : RAMP[BINS.findIndex((b) => v < b) === -1 ? 5 : BINS.findIndex((b) => v < b)]);

export function EnvironmentExplorer({ t, observations, initialYear }: { t: EnvText; observations: ObsMarker[]; initialYear: number }) {
  const thisYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [gridState, setGridState] = useState<"loading" | "ok" | "error">("loading");
  const [point, setPoint] = useState<Point | null>(null);
  const [pointState, setPointState] = useState<"loading" | "ok" | "error">("loading");
  const [hover, setHover] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    setGridState("loading");
    fetch(`/api/climate/grid?year=${year}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: Grid) => alive && (setGrid(j), setGridState("ok")))
      .catch(() => alive && setGridState("error"));
    return () => {
      alive = false;
    };
  }, [year]);

  useEffect(() => {
    fetch("/api/climate/point")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: Point) => (setPoint(j), setPointState("ok")))
      .catch(() => setPointState("error"));
  }, []);

  // Play: step through the months to show how the rains move over the year.
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setMonth((m) => {
        if (m >= 12) {
          setPlaying(false);
          return 12;
        }
        return m + 1;
      });
    }, 1100);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const vb = { x: mx(EXT.w), y: my(EXT.n), w: mx(EXT.e) - mx(EXT.w), h: my(EXT.s) - my(EXT.n) };
  const tiles = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let x = Math.floor(vb.x / 256); x <= Math.floor((vb.x + vb.w) / 256); x++)
      for (let y = Math.floor(vb.y / 256); y <= Math.floor((vb.y + vb.h) / 256); y++) out.push({ x, y });
    return out;
  }, [vb.x, vb.y, vb.w, vb.h]);
  const rect = (b: { w: number; e: number; s: number; n: number }) => ({ x: mx(b.w), y: my(b.n), width: mx(b.e) - mx(b.w), height: my(b.s) - my(b.n) });
  const seenThisMonth = observations.filter((o) => o.month === month);
  const half = (grid?.cell_degrees ?? 0.25) / 2;
  const years = Array.from({ length: thisYear - 1991 + 1 }, (_, i) => thisYear - i);

  return (
    <div className="envx">
      <section className="envx__map-wrap" aria-labelledby="map-title">
        <div className="envx__head">
          <div>
            <h2 id="map-title">{t.mapTitle}</h2>
            <p className="muted">{t.mapHelp}</p>
          </div>
          <div className="envx__controls">
            <label>
              <span>{t.year}</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn small" onClick={() => (month >= 12 && !playing ? (setMonth(1), setPlaying(true)) : setPlaying((p) => !p))}>
              {playing ? t.pause : t.play}
            </button>
          </div>
        </div>

        <label className="envx__slider">
          <span>
            {t.month}: <strong>{t.months[month - 1]} {year}</strong>
          </span>
          <input type="range" min={1} max={12} step={1} value={month} onChange={(e) => (setPlaying(false), setMonth(Number(e.target.value)))} aria-valuetext={`${t.months[month - 1]} ${year}`} />
          <span className="envx__ticks" aria-hidden="true">
            {t.months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </span>
        </label>

        <figure className="envx__map">
          <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-label={`${t.mapTitle}: ${t.months[month - 1]} ${year}`}>
            <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} className="envx__bg" />
            {tiles.map(({ x, y }) => (
              <image
                key={`${x}-${y}`}
                href={`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/${Z}/${y}/${x}.jpg`}
                x={x * 256}
                y={y * 256}
                width={256}
                height={256}
                preserveAspectRatio="none"
              />
            ))}
            {grid?.cells.map((c, i) => {
              const v = c.monthly[month - 1];
              const fill = colorFor(v);
              const r = rect({ w: c.lon - half, e: c.lon + half, s: c.lat - half, n: c.lat + half });
              return (
                <g key={i} className={`envx__cell${hover === i ? " is-hot" : ""}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <title>{`${c.lat.toFixed(2)}° N, ${c.lon.toFixed(2)}° E · ${t.months[month - 1]} ${year}: ${v === null ? t.noData : `${v} mm`}`}</title>
                  <rect {...r} fill={fill ?? "url(#nodata)"} className="envx__cell-fill" />
                  <text x={r.x + 12} y={r.y + 12} dominantBaseline="hanging" textAnchor="start" className={`envx__cell-label${v !== null && v >= 100 ? " on-dark" : ""}`}>
                    {v === null ? "–" : `${Math.round(v)}`}
                  </text>
                </g>
              );
            })}
            <defs>
              <pattern id="nodata" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="rgba(120,130,140,0.35)" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
              </pattern>
            </defs>
            <rect {...rect(WOLAITA)} className="envx__box envx__box--zone" />
            <rect {...rect(OFFA)} className="envx__box envx__box--offa" />
            <circle cx={mx(37.5)} cy={my(6.75)} r={9} className="envx__point" />
            <text x={mx(37.5) + 14} y={my(6.75) - 12} className="envx__label">
              {t.studyPoint}
            </text>
            {seenThisMonth.length > 0 && (
              <g className="envx__obs">
                <circle cx={mx(37.5)} cy={my(6.75)} r={22} />
                <text x={mx(37.5) + 14} y={my(6.75) + 30} className="envx__label envx__label--obs">
                  {t.signsSeen.replace("{n}", String(seenThisMonth.length))}
                </text>
              </g>
            )}
          </svg>
          {gridState !== "ok" && <p className={`envx__state${gridState === "error" ? " is-error" : ""}`}>{gridState === "loading" ? t.loading : t.failed}</p>}
          <figcaption className="envx__legend">
            <span className="envx__legend-title">{t.legend}</span>
            {RAMP.map((c, i) => (
              <span key={c} className="envx__key">
                <i style={{ background: c }} />
                {i === 0 ? `< ${BINS[0]}` : i === RAMP.length - 1 ? `≥ ${BINS[BINS.length - 1]}` : `${BINS[i - 1]}–${BINS[i]}`}
              </span>
            ))}
            <span className="envx__key">
              <i className="envx__key-nodata" />
              {t.legendNoData}
            </span>
            <span className="envx__key">
              <i className="envx__key-box envx__key-box--zone" />
              {t.wolaitaBox}
            </span>
            <span className="envx__key">
              <i className="envx__key-box envx__key-box--offa" />
              {t.offaBox}
            </span>
          </figcaption>
        </figure>
        {seenThisMonth.length > 0 && (
          <p className="small">
            <strong>{t.fieldRecord}:</strong> {seenThisMonth.map((o) => o.name).join(" · ")}
          </p>
        )}
        <p className="small muted">{t.cellNote}</p>
        <p className="small muted">{t.imagery}</p>
      </section>

      <section aria-labelledby="monthly-title" className="envx__panel">
        <h2 id="monthly-title">{t.monthlyTitle.replace("{year}", String(year))}</h2>
        <p className="muted">{t.monthlyHelp.replace("{period}", point?.normal_period ?? "1991–2020")}</p>
        {pointState !== "ok" || !point ? (
          <p className={`envx__state static${pointState === "error" ? " is-error" : ""}`}>{pointState === "loading" ? t.loading : t.failed}</p>
        ) : (
          <MonthlyChart values={point.years[String(year)] ?? Array(12).fill(null)} normal={point.normal} months={t.months} t={t} year={year} selected={month} />
        )}
      </section>

      <section aria-labelledby="seasons-title" className="envx__panel">
        <h2 id="seasons-title">{t.seasonsTitle}</h2>
        <p className="muted">{t.seasonsHelp.replace("{year}", String(year))}</p>
        {point && pointState === "ok" && (
          <div className="envx__seasons">
            {(["belg", "kiremt", "bega"] as const).map((k) => (
              <SeasonChart key={k} title={t.seasonNames[k]} rows={point.seasons} k={k} normal={point.season_normal[k]} year={year} t={t} />
            ))}
          </div>
        )}
      </section>

      {point && pointState === "ok" && (
        <details className="envx__table">
          <summary>{t.table}</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t.colMonth}</th>
                  <th scope="col">{t.colYear.replace("{year}", String(year))}</th>
                  <th scope="col">{t.colNormal.replace("{period}", point.normal_period)}</th>
                  <th scope="col">{t.colPct}</th>
                </tr>
              </thead>
              <tbody>
                {t.months.map((m, i) => {
                  const v = point.years[String(year)]?.[i] ?? null;
                  const n = point.normal[i];
                  return (
                    <tr key={m} className={i === month - 1 ? "is-target" : undefined}>
                      <td>{m}</td>
                      <td className="num">{v ?? "–"}</td>
                      <td className="num">{n ?? "–"}</td>
                      <td className="num">{v !== null && n ? `${Math.round((v / n) * 100)}%` : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {point?.fallback && <p className="notice small">{t.fallback}</p>}
      {(point || grid) && (
        <p className="small muted envx__source">
          {t.sourceLabel}: {(point ?? grid)!.source}. {(point ?? grid)!.credit} {t.retrieved} {((point ?? grid)!.retrieved_at ?? "").slice(0, 10)}
          {point?.last_date && (
            <>
              {" "}
              · {t.dataUntil} {point.last_date}
            </>
          )}{" "}
          · <a href="/api/climate/point">JSON</a>
        </p>
      )}
    </div>
  );
}

function MonthlyChart({ values, normal, months, t, year, selected }: { values: (number | null)[]; normal: (number | null)[]; months: string[]; t: EnvText; year: number; selected: number }) {
  const W = 680, H = 230, L = 40, B = 26, T = 14, PW = W - L - 10, PH = H - B - T;
  const max = Math.max(10, ...values.map((v) => v ?? 0), ...normal.map((v) => v ?? 0)) * 1.12;
  const step = PW / 12, bw = Math.min(30, step * 0.62);
  const y = (v: number) => T + PH - (v / max) * PH;
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  return (
    <figure className="envx__chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${year}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="ev-grid" x1={L} x2={L + PW} y1={y(v)} y2={y(v)} />
            <text className="ev-axis" x={L - 6} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const v = values[i];
          const n = normal[i];
          const cx = L + i * step + step / 2;
          return (
            <g key={m} className={`ev-bar${i === selected - 1 ? " ev-bar--target" : ""}`}>
              <title>{`${m} ${year}: ${v ?? t.noData}${v !== null ? " mm" : ""} · ${t.normal}: ${n ?? "–"} mm`}</title>
              <rect className="ev-hit" x={L + i * step} y={T} width={step} height={PH} />
              {v !== null && v > 0 && <path d={`M${cx - bw / 2},${T + PH} v${-Math.max(0, PH - (y(v) - T) - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${Math.max(0, PH - (y(v) - T) - 4)} z`} />}
              {n !== null && <line className="envx__normal" x1={cx - bw / 2 - 4} x2={cx + bw / 2 + 4} y1={y(n)} y2={y(n)} />}
              <text className="ev-axis" x={cx} y={H - 8} textAnchor="middle">
                {m}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="ev-legend small">
        <span className="ev-key ev-key--ref" /> {year} · <span className="ev-key ev-key--target" /> {months[selected - 1]} · <span className="envx__key-normal" /> {t.normal}
      </p>
    </figure>
  );
}

function SeasonChart({ title, rows, k, normal, year, t }: { title: string; rows: SeasonRow[]; k: "belg" | "kiremt" | "bega"; normal: number | null; year: number; t: EnvText }) {
  const W = 320, H = 170, L = 34, B = 20, T = 18, PW = W - L - 6, PH = H - B - T;
  const vals = rows.map((r) => r[k]);
  const max = Math.max(10, ...vals.map((v) => v ?? 0)) * 1.12;
  const step = PW / Math.max(1, rows.length);
  const bw = Math.max(2, step - 1.5);
  const y = (v: number) => T + PH - (v / max) * PH;
  const sel = rows.find((r) => r.year === year)?.[k] ?? null;
  return (
    <figure className="envx__season">
      <figcaption>
        <strong>{title}</strong>{" "}
        <span className="muted small">
          {year}: {sel ?? "–"} mm · {t.normal}: {normal ?? "–"} mm
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${year} ${sel ?? "–"} mm`}>
        <line className="ev-grid" x1={L} x2={L + PW} y1={T + PH} y2={T + PH} />
        <text className="ev-axis" x={L - 4} y={y(Math.round(max)) + 4} textAnchor="end">
          {Math.round(max)}
        </text>
        {rows.map((r, i) => {
          const v = r[k];
          if (v === null) return null;
          const h = PH - (y(v) - T);
          return (
            <g key={r.year} className={`ev-bar${r.year === year ? " ev-bar--target" : ""}`}>
              <title>{`${r.year}: ${v} mm`}</title>
              <rect x={L + i * step} y={y(v)} width={bw} height={Math.max(0, h)} rx={Math.min(2, bw / 2)} className="envx__sbar" />
            </g>
          );
        })}
        {normal !== null && <line className="ev-median" x1={L} x2={L + PW} y1={y(normal)} y2={y(normal)} />}
        <text className="ev-axis" x={L} y={H - 4}>
          {rows[0]?.year}
        </text>
        <text className="ev-axis" x={L + PW} y={H - 4} textAnchor="end">
          {rows.at(-1)?.year}
        </text>
      </svg>
    </figure>
  );
}
