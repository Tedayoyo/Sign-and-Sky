import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { giaiConfigured } from "@/lib/giai";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: d.environment.title, description: d.environment.lead };
}

export default async function Environment({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const e = d.environment;
  // GI-AI4AFS shows "Connected" only once its access settings exist on the server.
  const status = (key: string, s: string) => (key === "giai" && giaiConfigured() ? "connected" : s) as keyof typeof e.status;
  return (
    <main>
      <PageHero image="environment" alt={d.media.environment} eyebrow={e.eyebrow} title={e.title} lead={e.lead} illustrativeLabel={d.media.illustrative} />
      <div className="wrap">
        <h2>{e.sourcesTitle}</h2>
        <ul className="source-cards">
          {e.sources.map((s, i) => {
            const st = status(s.key, s.status);
            return (
              <Reveal as="li" key={s.key} delay={i * 110} className={`source-card source-card--${st}`}>
                <div className="source-card__top">
                  <h3>{s.name}</h3>
                  <span className={`status-pill status-pill--${st}`}>{e.status[st]}</span>
                </div>
                <dl>
                  <dt>{e.whatLabel}</dt>
                  <dd>{s.what}</dd>
                  <dt>{e.useLabel}</dt>
                  <dd>{s.use}</dd>
                </dl>
                <a href={s.link} target="_blank" rel="noopener noreferrer">
                  {e.sourceLink}
                </a>
              </Reveal>
            );
          })}
        </ul>

        <section className="study-area" aria-labelledby="study-title">
          <h2 id="study-title">{e.studyTitle}</h2>
          <ul>
            {e.study.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <p className="notice">{e.next}</p>
        <p className="muted small">{e.honesty}</p>
      </div>
    </main>
  );
}
