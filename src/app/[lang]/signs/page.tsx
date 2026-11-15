import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { dict } from "@/lib/i18n";
import { publishedSigns, evaluationFor, tr } from "@/lib/records";
import { normalize } from "@/lib/match";
import { trustLevel } from "@/lib/scoring";
import { parseObservations } from "@/lib/observations";
import { GROUPS, groupFor, type GroupKey } from "@/lib/explorer";
import { SignsExplorer, type ExplorerItem } from "./SignsExplorer";

// Served from cache and refreshed every 5 minutes, or at once when researchers change a record (revalidatePath).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).signs.title };
}

export default async function Signs({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const all = await publishedSigns();
  const items: ExplorerItem[] = all.map((s) => {
    const t = tr(s, lang);
    const ev = evaluationFor(s, "wol");
    const retested = s.evaluations.some((e) => e.weather_outcome_id);
    const seen = parseObservations(s.observation_period || "")
      .map((o) => (o.day ? `${o.day} ${d.calendar.months[o.month - 1]} ${o.year}` : `${d.calendar.months[o.month - 1]} ${o.year}`))
      .join(" · ");
    return {
      n: s.record_number,
      name: t.name,
      expected: t.expected_weather ?? "",
      seen: seen || (s.observation_period ?? ""),
      category: s.category,
      group: groupFor(s.record_number, s.category),
      level: ev ? trustLevel(ev.score) : "untested",
      score: ev ? ev.score : null,
      status: retested ? "retested" : ev ? "preliminary" : "untested",
      hay: normalize(
        Object.values(s.tr)
          .flatMap((x) => [x.name, x.description, x.observation_text, x.interpretation, x.expected_weather, ...(x.keywords || [])])
          .filter(Boolean)
          .join(" "),
      ),
    };
  });
  const x = d.explorer;
  return (
    <main>
      <PageHero image="signs" alt={d.media.signs} eyebrow={d.pageHeads.signsEyebrow} title={d.signs.title} lead={d.signs.intro} />
      <div className="wrap">
        <SignsExplorer
          lang={lang}
          items={items}
          groups={GROUPS}
          t={{
            search: d.signs.search,
            placeholder: d.signs.searchPlaceholder,
            all: x.all,
            groups: x.groups,
            trustAll: d.signs.allTrust,
            trust: d.trust,
            status: x.status,
            count: d.signs.count,
            none: d.signs.none,
            clear: d.signs.clear,
            scoreLabel: d.ask.gaugeLabel,
          }}
        />
      </div>
    </main>
  );
}
