import type { Metadata } from "next";
import Link from "next/link";
import { dict, fmt } from "@/lib/i18n";
import { publishedSigns, evaluationFor, tr } from "@/lib/records";
import { normalize } from "@/lib/match";
import { trustLevel } from "@/lib/scoring";
import { Gauge, TrustBadge } from "@/components/Gauge";
import { CategoryIcon } from "@/components/CategoryIcon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).signs.title };
}

type SP = { q?: string; cat?: string; type?: string; trust?: string };

export default async function Signs({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<SP> }) {
  const { lang } = await params;
  const sp = await searchParams;
  const d = dict(lang);
  const all = await publishedSigns();
  const q = normalize(String(sp.q ?? "").slice(0, 100));
  const signs = all.filter((s) => {
    if (sp.cat && s.category !== sp.cat) return false;
    if (sp.type && !s.indicator_types.includes(sp.type)) return false;
    const ev = evaluationFor(s, "wol");
    const level = ev ? trustLevel(ev.score) : "untested";
    if (sp.trust && level !== sp.trust) return false;
    if (q) {
      const hay = normalize(
        Object.values(s.tr)
          .flatMap((t) => [t.name, t.description, t.observation_text, t.interpretation, t.expected_weather, ...(t.keywords || [])])
          .filter(Boolean)
          .join(" "),
      );
      if (!q.split(" ").every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const cats = Array.from(new Set(all.map((s) => s.category)));
  const filtered = !!(sp.q || sp.cat || sp.type || sp.trust);

  return (
    <main className="wrap">
      <header className="page-head">
        <h1>{d.signs.title}</h1>
        <p>{d.signs.intro}</p>
      </header>
      <form className="filters" method="get" role="search">
        <div className="q">
          <label htmlFor="q">{d.signs.search}</label>
          <input id="q" name="q" type="text" defaultValue={sp.q ?? ""} placeholder={d.signs.searchPlaceholder} />
        </div>
        <div>
          <label htmlFor="cat" className="sr-only">{d.signs.allCategories}</label>
          <select id="cat" name="cat" defaultValue={sp.cat ?? ""}>
            <option value="">{d.signs.allCategories}</option>
            {cats.map((c) => (
              <option key={c} value={c}>{d.categories[c as keyof typeof d.categories] ?? c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="type" className="sr-only">{d.signs.allTypes}</label>
          <select id="type" name="type" defaultValue={sp.type ?? ""}>
            <option value="">{d.signs.allTypes}</option>
            {(["rainfall", "dry", "seasonal"] as const).map((t) => (
              <option key={t} value={t}>{d.types[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="trust" className="sr-only">{d.signs.allTrust}</label>
          <select id="trust" name="trust" defaultValue={sp.trust ?? ""}>
            <option value="">{d.signs.allTrust}</option>
            {(["strong", "fair", "weak"] as const).map((t) => (
              <option key={t} value={t}>{d.trust[t]}</option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit">{d.signs.apply}</button>
      </form>
      <p className="muted">
        {fmt(d.signs.count, { n: signs.length })}
        {filtered && (
          <>
            {" · "}
            <Link href={`/${lang}/signs`}>{d.signs.clear}</Link>
          </>
        )}
      </p>
      {signs.length === 0 ? (
        <p className="notice">{d.signs.none}</p>
      ) : (
        <ul className="sign-list">
          {signs.map((s) => {
            const t = tr(s, lang);
            const ev = evaluationFor(s, "wol");
            const level = ev ? trustLevel(ev.score) : "untested";
            return (
              <li key={s.id} className="sign-row">
                <span className="n">{s.record_number}</span>
                <div>
                  <h3>
                    <CategoryIcon category={s.category} />
                    <Link href={`/${lang}/signs/${s.record_number}`}>{t.name}</Link>
                  </h3>
                  <p>{t.expected_weather}</p>
                  <div className="meta">
                    <span>{d.categories[s.category as keyof typeof d.categories]}</span>
                    <span>{s.observation_period}</span>
                    <TrustBadge level={level} text={d.trust[level]} />
                    {lang === "am" && t.translation_status === "needs_review" && <span className="flag">{d.signs.amReview}</span>}
                  </div>
                </div>
                {ev ? <Gauge small score={ev.score} label={fmt(d.ask.gaugeLabel, { score: ev.score })} /> : <span />}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
