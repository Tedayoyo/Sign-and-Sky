import type { Metadata } from "next";
import Link from "next/link";
import { dict, fmt, SPEECH, type Locale } from "@/lib/i18n";
import { librarySigns } from "@/lib/assistant";
import { evaluationFor, BUILTIN } from "@/lib/records";
import AskClient from "@/components/AskClient";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { StepIcon } from "@/components/StepIcon";
import { MEDIA, type MediaKey } from "@/lib/media";

// Served from cache and refreshed every 5 minutes, or at once when researchers change a record (revalidatePath).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: { absolute: `Sign & Sky — ${d.nav.ask}` }, description: d.meta.description };
}

// Particles drifting up through the hero light (positions fixed so server and browser agree).
const PARTICLES = [
  [6, 72, 0], [14, 40, 3], [22, 85, 6], [31, 58, 1.5], [39, 30, 8], [47, 76, 4], [55, 48, 10], [63, 88, 2],
  [70, 36, 7], [78, 66, 5], [86, 24, 9], [93, 80, 3.5], [10, 18, 11], [58, 14, 12], [82, 52, 6.5], [35, 92, 9.5],
] as const;

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const L = d.landing;
  let stats = "";
  try {
    const signs = await librarySigns();
    const scored = signs.map((s) => evaluationFor(s, "wol")).filter((e) => e);
    stats = fmt(d.home.stats, { tested: scored.length, strong: scored.filter((e) => e!.score >= 8).length });
  } catch {
    stats = "";
  }

  // Sections in the order the team chose for its photographs.
  const explore: { key: MediaKey; href: string; text: string[] }[] = [
    { key: "signs", href: `/${lang}/signs`, text: L.explore.signs },
    { key: "environment", href: `/${lang}/environment`, text: L.explore.environment },
    { key: "community", href: `/${lang}/share`, text: L.explore.community },
    { key: "calendar", href: `/${lang}/calendar`, text: L.explore.calendar },
    { key: "team", href: `/${lang}/team`, text: L.explore.team },
    { key: "stories", href: `/${lang}/stories`, text: L.explore.stories },
  ];

  return (
    <main>
      <section className="hero hero--photo">
        <div className="hero__media">
          <Photo name="hero" alt={d.media.hero} priority sizes="100vw" />
        </div>
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__clouds" aria-hidden="true">
          <span className="cloud cloud--1" />
          <span className="cloud cloud--2" />
          <span className="cloud cloud--3" />
        </div>
        <div className="hero__particles" aria-hidden="true">
          {PARTICLES.map(([x, y, delay], i) => (
            <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
          ))}
        </div>
        <div className="wrap narrow hero__content">
          <p className="hero__tagline rise" style={{ animationDelay: "0.05s" }}>
            {L.tagline}
          </p>
          <h1 className="rise" style={{ animationDelay: "0.15s" }}>
            {d.home.title}
          </h1>
          <p className="hero__lead rise" style={{ animationDelay: "0.3s" }}>
            {L.taglineText}
          </p>
          <div className="hero__ctas rise" style={{ animationDelay: "0.45s" }}>
            <Link className="btn cta cta--gold" href={`/${lang}/signs`}>
              {L.cta.knowledge}
            </Link>
            <Link className="btn cta cta--glass" href={`/${lang}/environment`}>
              {L.cta.data}
            </Link>
            <Link className="btn cta cta--glass" href={`/${lang}/science`}>
              {L.cta.research}
            </Link>
          </div>
          {stats && (
            <p className="stats rise" style={{ animationDelay: "0.6s" }}>
              {stats}
            </p>
          )}
        </div>
      </section>

      <div className="wrap narrow">
        <AskClient
          lang={lang as Locale}
          speechLang={SPEECH[lang as Locale]}
          t={{ ask: d.ask, trust: d.trust, places: d.places, home: d.home }}
          categories={BUILTIN.map((s) => s.category)}
        />
      </div>

      <section className="how" aria-labelledby="how-title">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">{L.how.eyebrow}</p>
            <h2 id="how-title">{L.how.title}</h2>
          </Reveal>
          <ol className="how__steps">
            {L.how.steps.map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 120} className="how__step">
                <span className="how__icon">
                  <StepIcon step={i} />
                </span>
                <span className="how__num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="explore" aria-labelledby="explore-title">
        <div className="wrap">
          <Reveal>
            <h2 id="explore-title">{L.explore.title}</h2>
          </Reveal>
          <ul className="explore__grid">
            {explore.map((x, i) => (
              <Reveal as="li" key={x.key} delay={(i % 3) * 100} className={`explore__card explore__card--${x.key}`}>
                <Link href={x.href}>
                  <Photo name={x.key} alt={d.media[x.key]} sizes="(max-width: 700px) 92vw, 360px" className="explore__img" />
                  <span className="explore__text">
                    <strong>{x.text[0]}</strong>
                    <span>{x.text[1]}</span>
                  </span>
                  {MEDIA[x.key].illustrative && <span className="photo-credit">{d.media.illustrative}</span>}
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
