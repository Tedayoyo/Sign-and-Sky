import type { Metadata } from "next";
import Link from "next/link";
import { dict, fmt } from "@/lib/i18n";
import { publishedSigns, tr } from "@/lib/records";
import { trustLevel } from "@/lib/scoring";
import { TrustBadge } from "@/components/Gauge";
import { ScoreRing } from "@/components/ScoreRing";
import { Reveal } from "@/components/Reveal";
import { ScoreCalculator } from "./ScoreCalculator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).results.title };
}

export default async function Results({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const rows = (await publishedSigns())
    .map((s) => ({ s, ev: s.evaluations.find((e) => e.method_version === "field-ai-2025") }))
    .filter((x) => x.ev);
  const count = { very_strong: 0, strong: 0, fair: 0, weak: 0 };
  rows.forEach(({ ev }) => count[trustLevel(ev!.score)]++);
  const signs = await publishedSigns();
  const retested = signs.flatMap((s) => s.evaluations.filter((e) => e.weather_outcome_id).map((e) => ({ s, e })));
  const mean = rows.length ? Math.round((rows.reduce((a, { ev }) => a + ev!.score, 0) / rows.length) * 10) / 10 : 0;
  const R = d.dashboard;
  const bands = ["very_strong", "strong", "fair", "weak"] as const;
  const maxBand = Math.max(1, ...bands.map((b) => count[b]));

  return (
    <main className="wrap">
      <header className="page-head">
        <h1>{d.results.title}</h1>
        <p>{d.results.intro}</p>
        <p style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", color: "inherit" }}>
          <TrustBadge level="very_strong" text={`${d.trust.very_strong}: ${count.very_strong}`} />
          <TrustBadge level="strong" text={`${d.trust.strong}: ${count.strong}`} />
          <TrustBadge level="fair" text={`${d.trust.fair}: ${count.fair}`} />
          <TrustBadge level="weak" text={`${d.trust.weak}: ${count.weak}`} />
        </p>
      </header>

      <ul className="evidence-cards">
        <Reveal as="li" className="evidence-card evidence-card--preliminary">
          <strong>{rows.length}</strong>
          <span className="evidence-card__title">{R.cards.preliminary[0]}</span>
          <span>{R.cards.preliminary[1]}</span>
        </Reveal>
        <Reveal as="li" delay={100} className="evidence-card evidence-card--retested">
          <strong>{retested.length}</strong>
          <span className="evidence-card__title">{R.cards.retested[0]}</span>
          <span>{R.cards.retested[1]}</span>
        </Reveal>
        <Reveal as="li" delay={200} className="evidence-card evidence-card--validated">
          <strong>0</strong>
          <span className="evidence-card__title">{R.cards.validated[0]}</span>
          <span>{R.cards.validated[1]}</span>
        </Reveal>
      </ul>

      <section className="overview" aria-labelledby="overview-title">
        <h2 id="overview-title" className="sr-only">
          {R.overview}
        </h2>
        <div className="overview__ring">
          <ScoreRing score={mean} size={170} caption="/10" label={`${R.average}: ${mean} / 10`} />
          <span className="overview__label">{R.average}</span>
          <span className="muted small">{R.averageNote}</span>
        </div>
        <div className="overview__bands">
          <h3>{R.distribution}</h3>
          <ul>
            {bands.map((b) => (
              <li key={b}>
                <span className="overview__band-name">
                  <TrustBadge level={b} text={d.trust[b]} />
                </span>
                <span className="overview__track" aria-hidden="true">
                  <span className={`overview__fill ${b}`} style={{ ["--w" as string]: `${(count[b] / maxBand) * 100}%` }} />
                </span>
                <span className="num">{count[b]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <h2>{R.perSign}</h2>
      <figure className="chart" style={{ margin: "0 0 2rem" }}>
        <div className="bars" role="img" aria-label={fmt(d.results.summary, count)}>
          <div className="line8" style={{ bottom: "calc(1.6rem + 0.8 * (170px - 1.6rem))" }} />
          <div className="line6" style={{ bottom: "calc(1.6rem + 0.7 * (170px - 1.6rem))" }} />
          {rows.map(({ s, ev }) => (
            <div
              key={s.id}
              className={`b ${trustLevel(ev!.score)}`}
              style={{ height: `${ev!.score * 10}%` }}
              title={`${s.record_number}. ${tr(s, lang).name}: ${ev!.score}`}
            >
              <span>{s.record_number}</span>
            </div>
          ))}
        </div>
        <figcaption className="small muted">{d.results.trustRule}</figcaption>
      </figure>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{d.results.table.sign}</th>
              <th scope="col">{d.results.table.behaviour}</th>
              <th scope="col">{d.results.table.meaning}</th>
              <th scope="col">{d.results.table.date}</th>
              <th scope="col">{d.results.table.score}</th>
              <th scope="col">{d.results.table.trust}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, ev }) => {
              const t = tr(s, lang);
              const lv = trustLevel(ev!.score);
              return (
                <tr key={s.id}>
                  <td>{s.record_number}</td>
                  <td>
                    <Link href={`/${lang}/signs/${s.record_number}`}>{t.name}</Link>
                  </td>
                  <td>{t.observation_text}</td>
                  <td>{t.interpretation}</td>
                  <td>{s.observation_period}</td>
                  <td className="num">{ev!.score}</td>
                  <td>
                    <TrustBadge level={lv} text={d.trust[lv]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section id="method" className="narrow" style={{ marginLeft: 0 }}>
        <h2>{d.results.methodTitle}</h2>
        <p>{d.results.methodField}</p>
        <p>{d.results.methodNew}</p>
        <p className="formula" lang="en">{d.results.formula}</p>
        <ul>
          <li>{d.results.formulaH}</li>
          <li>{d.results.formulaP}</li>
        </ul>
        <ScoreCalculator t={R.calc} trust={d.trust} scoreLabel={d.ask.gaugeLabel} />
        <p>{d.results.thresholds}</p>
        <p>{d.results.datasets}</p>
      </section>

      <section aria-labelledby="retested-title" className="retested">
        <h2 id="retested-title">{R.retestedTitle}</h2>
        {retested.length === 0 ? (
          <p className="notice">{R.retestedEmpty}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{d.results.table.sign}</th>
                  <th scope="col">{R.cols.date}</th>
                  <th scope="col">{R.cols.window}</th>
                  <th scope="col">{R.cols.source}</th>
                  <th scope="col">{d.results.table.score}</th>
                </tr>
              </thead>
              <tbody>
                {retested.map(({ s, e }) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/${lang}/signs/${s.record_number}`}>{tr(s, lang).name}</Link>
                    </td>
                    <td>{e.evaluated_on}</td>
                    <td>
                      {e.window_start} – {e.window_end}
                    </td>
                    <td>{e.source}</td>
                    <td className="num">{e.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
