import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import builtin from "@/data/library.json";
import { CategoryIcon } from "@/components/CategoryIcon";
import { TrustBadge } from "@/components/Gauge";

// Portraits in the order the team asked for. Files are the supplied photographs, only resized.
const PHOTOS = ["tewodros-birhanu-lera", "tesfaye-latebo", "ermias-gosaye"];
type Level = "very_strong" | "strong" | "fair" | "weak";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).about.title };
}

export default async function About({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const a = d.about;
  const src = a.source;
  const team = a.team;
  const kinds = new Map<string, number>();
  for (const r of builtin.signs) kinds.set(r.category, (kinds.get(r.category) ?? 0) + 1);
  const parts = a.apiText.split("{url}");
  return (
    <main>
    <div className="wrap narrow about-body">
      <header className="page-head">
        <h1>{a.title}</h1>
        <p>{a.lead}</p>
      </header>
      <h2>{a.howTitle}</h2>
      <ol>
        {a.how.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
      <h2>{a.promisesTitle}</h2>
      <ul>
        {a.promises.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h2>{a.seasonsTitle}</h2>
      <p>{a.seasonsEthiopia}</p>
      <h2>{a.placesTitle}</h2>
      <p>{a.placesText}</p>
      <h2>{a.dataTitle}</h2>
      <p>{a.dataText}</p>
      <h2>{a.apiTitle}</h2>
      <p>
        {parts[0]}
        <a href="/api/v1/signs">
          <code>/api/v1/signs</code>
        </a>
        {parts[1]}
      </p>
    </div>

      <section className="wrap source-section" aria-labelledby="source-title">
        <h2 id="source-title">{src.title}</h2>
        <p className="source-lead">{src.lead}</p>
        <figure className="source-doc">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
          <figcaption lang="en">{src.doc}</figcaption>
        </figure>
        <ul className="source-facts">
          {src.facts.map(([n, label]) => (
            <li key={label}>
              <strong>{n}</strong>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <ol className="source-steps">
          {src.steps.map(([title, text], i) => (
            <li key={title}>
              <span className="source-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <div className="source-grid">
          <div>
            <h3>{src.kindsTitle}</h3>
            <ul className="source-kinds">
              {[...kinds.entries()]
                .sort((x, y) => y[1] - x[1])
                .map(([cat, n]) => (
                  <li key={cat}>
                    <CategoryIcon category={cat} />
                    <span>{src.kinds[cat as keyof typeof src.kinds] ?? cat}</span>
                    <strong>{n}</strong>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h3>{src.scaleTitle}</h3>
            <ul className="source-scale">
              {src.scale.map(([level, range]) => (
                <li key={level}>
                  <TrustBadge level={level as Level} text={d.trust[level as Level]} />
                  <span>{range}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p>
          <Link className="btn secondary" href={`/${lang}/signs`}>
            {src.cta}
          </Link>
        </p>
      </section>

      <section className="team-section" aria-labelledby="team-title">
        <div className="wrap">
          <p className="team-eyebrow">{team.eyebrow}</p>
          <h2 id="team-title">{team.title}</h2>
          <p className="team-lead">{team.lead}</p>
          <ul className="team-grid">
            {team.members.map((m, i) => (
              <li key={PHOTOS[i]} className="team-card">
                <picture>
                  <source type="image/webp" srcSet={`/team/${PHOTOS[i]}-480.webp 480w, /team/${PHOTOS[i]}-800.webp 800w`} sizes="(max-width: 700px) 92vw, 360px" />
                  <img
                    src={`/team/${PHOTOS[i]}-480.jpg`}
                    srcSet={`/team/${PHOTOS[i]}-480.jpg 480w, /team/${PHOTOS[i]}-800.jpg 800w`}
                    sizes="(max-width: 700px) 92vw, 360px"
                    width={480}
                    height={600}
                    alt={m.name}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <div className="team-info">
                  <h3>{m.name}</h3>
                  <p className="team-role">{m.role}</p>
                  {m.meta && <p className="team-meta">{m.meta}</p>}
                  <p className="team-bio">{m.bio}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
