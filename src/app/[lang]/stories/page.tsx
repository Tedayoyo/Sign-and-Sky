import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { publishedSigns, tr } from "@/lib/records";
import { parseObservations } from "@/lib/observations";
import type { SeasonKey } from "@/lib/places";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { CategoryIcon } from "@/components/CategoryIcon";

// Served from cache and refreshed every 5 minutes, or at once when researchers change a record (revalidatePath).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: d.stories.title, description: d.stories.lead };
}

const ORDER: SeasonKey[] = ["belg", "kiremt", "bega"];

// "Wisdom Written in Nature": only what farmers shared in the 2025 field record, with their meanings.
// Farmers' own stories, photos and recordings are added only with their consent.
export default async function Stories({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const s = d.stories;
  const signs = await publishedSigns();
  const bySeason = new Map<SeasonKey, typeof signs>();
  for (const sign of signs) {
    const first = parseObservations(sign.observation_period || "")[0];
    const k = first?.season ?? "bega";
    bySeason.set(k, [...(bySeason.get(k) ?? []), sign]);
  }
  return (
    <main className="stories">
      <PageHero image="stories" alt={d.media.stories} eyebrow={s.eyebrow} title={s.title} lead={s.lead} illustrativeLabel={d.media.illustrative} />
      <div className="wrap">
        <Reveal as="section" className="story-method">
          <h2 id="documented-title">{s.documentedTitle}</h2>
          <ul className="story-method__facts">
            {s.documented.map(([n, text]) => (
              <li key={n}>
                <strong>{n}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="muted">{s.documentedText}</p>
          <p>
            <Link href={`/${lang}/science#methodology`}>{s.scienceLink}</Link>
          </p>
        </Reveal>
        {ORDER.map((k) => {
          const list = bySeason.get(k) ?? [];
          if (!list.length) return null;
          const [name, months, text] = d.calendar.seasons[k];
          return (
            <section key={k} className={`story-season story-season--${k}`} aria-labelledby={`season-${k}`}>
              <Reveal className="story-season__head">
                <p className="eyebrow">{months}</p>
                <h2 id={`season-${k}`}>{name}</h2>
                <p className="muted">{text}</p>
              </Reveal>
              <ul className="story-grid">
                {list.map((sign, i) => {
                  const t = tr(sign, lang);
                  return (
                    <Reveal as="li" key={sign.id} delay={(i % 3) * 90} className="story-card">
                      <CategoryIcon category={sign.category} />
                      <h3>
                        <Link href={`/${lang}/signs/${sign.record_number}`}>{t.name}</Link>
                      </h3>
                      {t.observation_text && <p>{t.observation_text}</p>}
                      {t.interpretation && (
                        <blockquote>
                          <span className="story-card__label">{s.meaning}</span>
                          {t.interpretation}
                        </blockquote>
                      )}
                      <p className="story-card__seen">
                        {s.seen}:{" "}
                        {parseObservations(sign.observation_period || "")
                          .map((o) => (o.day ? `${o.day} ${d.calendar.months[o.month - 1]} ${o.year}` : `${d.calendar.months[o.month - 1]} ${o.year}`))
                          .join(" · ") || sign.observation_period}
                      </p>
                    </Reveal>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <Reveal as="section" className="story-consent">
          <h2>{s.consentTitle}</h2>
          <p>{s.consentText}</p>
          <Link className="btn" href={`/${lang}/share`}>
            {s.shareCta}
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
