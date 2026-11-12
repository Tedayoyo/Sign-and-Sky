import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { giaiConfigured } from "@/lib/giai";
import { publishedSigns, tr } from "@/lib/records";
import { parseObservations } from "@/lib/observations";
import { EnvironmentExplorer, type ObsMarker } from "./EnvironmentExplorer";
import { VegetationPanel } from "./VegetationPanel";
import { KnowledgeMap, type MapArea, type MapObs } from "./KnowledgeMap";
import { groupFor } from "@/lib/explorer";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

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
  const signs = await publishedSigns();
  const observations: ObsMarker[] = signs.flatMap((sg) =>
    parseObservations(sg.observation_period || "")
      .filter((o) => o.year === 2025)
      .map((o) => ({ month: o.month, name: tr(sg, lang).name })),
  );
  // Community knowledge map: areas come from the locations table (public study points only).
  const slugs = Array.from(new Set(signs.map((sg) => sg.location_slug).filter((x): x is string => !!x)));
  let rows: { slug: string; name: string; latitude: number; longitude: number }[] = [];
  try {
    rows = await query("select slug, name, latitude::float8 as latitude, longitude::float8 as longitude from locations where slug = any($1) and latitude is not null and longitude is not null", [slugs]);
  } catch {
    rows = [];
  }
  if (!rows.length && slugs.includes("wol")) rows = [{ slug: "wol", name: "Wolaita", latitude: 6.75, longitude: 37.5 }];
  const areas: MapArea[] = rows.map((r) => ({ slug: r.slug, label: r.slug === "wol" ? e.kmap.offaLabel : r.name, lat: r.latitude, lon: r.longitude }));
  const mapObs: MapObs[] = signs.flatMap((sg) =>
    parseObservations(sg.observation_period || "").map((o) => ({
      n: sg.record_number,
      name: tr(sg, lang).name,
      group: groupFor(sg.record_number, sg.category),
      season: o.season,
      month: o.month,
      day: o.day,
      year: o.year,
      area: sg.location_slug || "",
    })),
  );
  const seasonNames = { belg: d.calendar.seasons.belg[0], kiremt: d.calendar.seasons.kiremt[0], bega: d.calendar.seasons.bega[0] };
  const status = (key: string, s: string) => (key === "giai" && giaiConfigured() ? "connected" : s) as keyof typeof e.status;
  return (
    <main>
      <PageHero image="environment" alt={d.media.environment} eyebrow={e.eyebrow} title={e.title} lead={e.lead} illustrativeLabel={d.media.illustrative} />
      <div className="wrap">
        <EnvironmentExplorer t={{ ...e.explorer, months: d.calendar.months }} observations={observations} initialYear={2025} />
        <KnowledgeMap t={{ ...e.kmap, all: d.explorer.all, groups: d.explorer.groups, seasons: seasonNames, months: d.calendar.months }} areas={areas} obs={mapObs} lang={lang} />
        <VegetationPanel t={e.vegetation} />
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
        <p className="muted small">{e.honesty}</p>
      </div>
    </main>
  );
}
