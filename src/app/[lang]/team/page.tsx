import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";

// Portraits in the order the team asked for (supplied photographs, only resized; never altered).
const PHOTOS = ["tewodros-birhanu-lera", "tesfaye-latebo", "ermias-gosaye"];

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: d.team.title, description: d.team.lead };
}

export default async function Team({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const t = d.team;
  return (
    <main className="team-page">
      <PageHero image="team" alt={d.media.team} eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <section className="team-section team-section--page" aria-label={t.title}>
        <div className="wrap">
          <ul className="team-grid">
            {t.members.map((m, i) => (
              <Reveal as="li" key={PHOTOS[i]} delay={i * 140} className="team-card">
                <picture>
                  <source type="image/webp" srcSet={`/team/${PHOTOS[i]}-480.webp 480w, /team/${PHOTOS[i]}-800.webp 800w`} sizes="(max-width: 700px) 92vw, 360px" />
                  <img
                    src={`/team/${PHOTOS[i]}-480.jpg`}
                    srcSet={`/team/${PHOTOS[i]}-480.jpg 480w, /team/${PHOTOS[i]}-800.jpg 800w`}
                    sizes="(max-width: 700px) 92vw, 360px"
                    width={480}
                    height={600}
                    alt={m.name}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </picture>
                <div className="team-info">
                  <h2 className="team-name">{m.name}</h2>
                  <p className="team-role">{m.role}</p>
                  {m.meta && <p className="team-meta">{m.meta}</p>}
                  <p className="team-label">{t.expertise}</p>
                  <ul className="chips">
                    {m.expertise.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <p className="team-label">{t.contribution}</p>
                  <p className="team-bio">{m.bio}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
