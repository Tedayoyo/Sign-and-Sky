import { ScoreRing } from "./ScoreRing";

// The evidence of one stored weather test (sns-score-v1 data trail): the score, its two parts H and P,
// the forecast window, and the predicted window against the same window in each reference year.
// Only real stored payloads are drawn; nothing is drawn for scores without data.

type Stats = { year: number; start: string; end: string; totalMm: number; maxDayMm: number; wetDays: number; max3DayMm: number; complete?: boolean };
export type TestPayload = {
  method_version?: string;
  source_label?: string;
  request_url?: string;
  retrieved_at?: string;
  observation_date: string;
  predicted: string;
  window_days: number;
  reference_years: number;
  target: Stats;
  reference: Stats[];
  happened: boolean;
  percentile: number;
  oriented: number;
  score: number;
};

export type EvidenceText = {
  title: string;
  h: string;
  hYes: string;
  hNo: string;
  p: string;
  pHelp: string;
  window: string;
  observed: string;
  chartTitle: string;
  chartHelp: string;
  metric: { total: string; maxDay: string; max3: string };
  median: string;
  thisYear: string;
  refYears: string;
  table: string;
  year: string;
  source: string;
  retrieved: string;
  download: string;
  scoreLabel: string;
};

function metricOf(predicted: string): "totalMm" | "maxDayMm" | "max3DayMm" {
  return predicted === "heavy_rain" ? "maxDayMm" : predicted === "rain_onset" ? "max3DayMm" : "totalMm";
}

export function TestEvidence({ p, t, downloadHref }: { p: TestPayload; t: EvidenceText; downloadHref: string }) {
  const key = metricOf(p.predicted);
  const metricName = key === "maxDayMm" ? t.metric.maxDay : key === "max3DayMm" ? t.metric.max3 : t.metric.total;
  const years = [...p.reference, p.target].sort((a, b) => a.year - b.year);
  const values = years.map((y) => y[key]);
  const max = Math.max(1, ...values) * 1.1;
  const ref = p.reference.map((r) => r[key]).sort((a, b) => a - b);
  const median = ref.length ? (ref.length % 2 ? ref[(ref.length - 1) / 2] : (ref[ref.length / 2 - 1] + ref[ref.length / 2]) / 2) : 0;

  // Chart geometry (viewBox units)
  const W = 680;
  const H = 220;
  const padL = 40;
  const padB = 26;
  const padT = 12;
  const plotW = W - padL - 44;
  const plotH = H - padB - padT;
  const step = plotW / years.length;
  const barW = Math.max(3, Math.min(22, step - 2));
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <section className="evidence" aria-label={t.title}>
      <div className="evidence__head">
        <ScoreRing score={p.score} size={112} label={t.scoreLabel.replace("{score}", String(p.score))} caption="/10" />
        <div className="evidence__parts">
          <div className="evidence__part">
            <span className="evidence__label">{t.h}</span>
            <span className={`evidence__h evidence__h--${p.happened ? "yes" : "no"}`}>{p.happened ? t.hYes : t.hNo}</span>
            <span className="muted small">H = {p.happened ? 1 : 0}</span>
          </div>
          <div className="evidence__part">
            <span className="evidence__label">{t.p}</span>
            <span className="pbar" role="img" aria-label={`P = ${p.oriented.toFixed(2)}`}>
              <span style={{ width: `${Math.round(p.oriented * 100)}%` }} />
            </span>
            <span className="muted small">
              P = {p.oriented.toFixed(2)} · {t.pHelp}
            </span>
          </div>
        </div>
      </div>

      <div className="evidence__timeline" aria-label={t.window}>
        <span className="evidence__tl-dot" />
        <span>
          {t.observed}: <strong>{p.observation_date}</strong>
        </span>
        <span className="evidence__tl-line" />
        <span>
          {t.window}: <strong>{p.target.start}</strong> – <strong>{p.target.end}</strong> ({p.window_days} d)
        </span>
      </div>

      <figure className="evidence__chart">
        <figcaption>
          <strong>{t.chartTitle}</strong> <span className="muted">· {metricName}</span>
          <span className="muted small evidence__help">{t.chartHelp}</span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.chartTitle}: ${metricName}`}>
          {ticks.map((v) => (
            <g key={v}>
              <line className="ev-grid" x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} />
              <text className="ev-axis" x={padL - 6} y={y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <line className="ev-median" x1={padL} x2={padL + plotW} y1={y(median)} y2={y(median)} />
          <text className="ev-median-label" x={padL + plotW + 4} y={y(median) + 4} textAnchor="start">
            {t.median}
          </text>
          <text className="ev-median-label" x={padL + plotW + 4} y={y(median) + 16} textAnchor="start">
            {median.toFixed(1)}
          </text>
          {years.map((yr, i) => {
            const v = yr[key];
            const isT = yr.year === p.target.year;
            const x = padL + i * step + (step - barW) / 2;
            const top = y(v);
            const h = Math.max(0, padT + plotH - top);
            return (
              <g key={yr.year} className={`ev-bar${isT ? " ev-bar--target" : ""}`}>
                <title>{`${yr.year}: ${v} mm (${yr.start} – ${yr.end})`}</title>
                <rect className="ev-hit" x={padL + i * step} y={padT} width={step} height={plotH} />
                <path d={`M${x},${padT + plotH} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${Math.max(0, h - 4)} z`} />
                {isT && (
                  <text className="ev-target-label" x={x + barW / 2} y={top - 6} textAnchor={i > years.length - 4 ? "end" : "middle"}>
                    {yr.year}: {v}
                  </text>
                )}
              </g>
            );
          })}
          {[years[0], years[years.length - 1]].map((yr, k) => (
            <text key={k} className="ev-axis" x={padL + (k ? years.length - 0.5 : 0.5) * step} y={H - 6} textAnchor="middle">
              {yr.year}
            </text>
          ))}
        </svg>
        <p className="ev-legend small">
          <span className="ev-key ev-key--ref" /> {t.refYears.replace("{n}", String(p.reference.length))} · <span className="ev-key ev-key--target" />{" "}
          {t.thisYear}
        </p>
      </figure>

      <details className="evidence__table">
        <summary>{t.table}</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.year}</th>
                <th scope="col">{t.metric.total}</th>
                <th scope="col">{t.metric.maxDay}</th>
                <th scope="col">{t.metric.max3}</th>
              </tr>
            </thead>
            <tbody>
              {years.map((yr) => (
                <tr key={yr.year} className={yr.year === p.target.year ? "is-target" : undefined}>
                  <td>{yr.year}</td>
                  <td className="num">{yr.totalMm}</td>
                  <td className="num">{yr.maxDayMm}</td>
                  <td className="num">{yr.max3DayMm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="small muted evidence__source">
        {t.source}: {p.source_label ?? "—"} · {p.method_version ?? ""}
        {p.retrieved_at && (
          <>
            {" "}
            · {t.retrieved} {p.retrieved_at.slice(0, 10)}
          </>
        )}{" "}
        · <a href={downloadHref}>{t.download}</a>
      </p>
    </section>
  );
}
