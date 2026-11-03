import type { Metadata } from "next";
import Link from "next/link";
import { dict, fmt } from "@/lib/i18n";
import { publishedSigns, tr } from "@/lib/records";
import { trustLevel } from "@/lib/scoring";
import { TrustBadge } from "@/components/Gauge";

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
  const count = { strong: 0, fair: 0, weak: 0 };
  rows.forEach(({ ev }) => count[trustLevel(ev!.score)]++);

  return (
    <main className="wrap">
      <header className="page-head">
        <h1>{d.results.title}</h1>
        <p>{d.results.intro}</p>
        <p style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", color: "inherit" }}>
          <TrustBadge level="strong" text={`${d.trust.strong}: ${count.strong}`} />
          <TrustBadge level="fair" text={`${d.trust.fair}: ${count.fair}`} />
          <TrustBadge level="weak" text={`${d.trust.weak}: ${count.weak}`} />
        </p>
      </header>

      <figure style={{ margin: "0 0 2rem" }}>
        <div className="bars" role="img" aria-label={fmt(d.results.summary, count)}>
          <div className="line8" style={{ bottom: "calc(1.6rem + 0.8 * (170px - 1.6rem))" }} />
          <div className="line6" style={{ bottom: "calc(1.6rem + 0.6 * (170px - 1.6rem))" }} />
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

      <section className="narrow" style={{ marginLeft: 0 }}>
        <h2>{d.results.methodTitle}</h2>
        <p>{d.results.methodField}</p>
        <p>{d.results.methodNew}</p>
        <p className="formula" lang="en">{d.results.formula}</p>
        <ul>
          <li>{d.results.formulaH}</li>
          <li>{d.results.formulaP}</li>
        </ul>
        <p>{d.results.thresholds}</p>
        <p>{d.results.datasets}</p>
      </section>
    </main>
  );
}
