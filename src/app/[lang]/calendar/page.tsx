import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { publishedSigns, tr } from "@/lib/records";
import { parseObservations, yearFraction } from "@/lib/observations";
import { PageHero } from "@/components/PageHero";
import { CalendarClient, type CalendarItem } from "./CalendarClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: d.calendar.title, description: d.calendar.lead };
}

export default async function Calendar({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const c = d.calendar;
  const signs = await publishedSigns();
  const items: CalendarItem[] = signs.flatMap((s) =>
    parseObservations(s.observation_period || "").map((o, k) => ({
      id: `${s.record_number}-${k}`,
      n: s.record_number,
      name: tr(s, lang).name,
      category: s.category,
      month: o.month,
      day: o.day,
      season: o.season,
      x: yearFraction(o),
    })),
  );
  items.sort((a, b) => a.x - b.x);
  return (
    <main>
      <PageHero image="calendar" alt={d.media.calendar} eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <div className="wrap">
        <CalendarClient lang={lang} items={items} t={c} categories={d.categories} />
        <p className="muted small">{c.activitiesNote}</p>
      </div>
    </main>
  );
}
