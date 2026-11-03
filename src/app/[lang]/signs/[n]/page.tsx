import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, fmt, LOCALES } from "@/lib/i18n";
import { recordByNumber, tr, evaluationFor } from "@/lib/records";
import { trustLevel } from "@/lib/scoring";
import { isPlace } from "@/lib/places";
import { Gauge, TrustBadge } from "@/components/Gauge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string; n: string }> }): Promise<Metadata> {
  const { lang, n } = await params;
  const r = await recordByNumber(Number(n)).catch(() => null);
  return { title: r ? tr(r, lang).name : dict(lang).signs.title };
}

export default async function SignPage({ params }: { params: Promise<{ lang: string; n: string }> }) {
  const { lang, n } = await params;
  const d = dict(lang);
  const r = await recordByNumber(Number(n));
  if (!r) notFound();
  const t = tr(r, lang);
  const main = evaluationFor(r, "wol");
  const level = main ? trustLevel(main.score) : "untested";
  const placeName = (slug: string | null, name: string | null) => (slug && isPlace(slug) ? d.places[slug].name : name ?? "");

  return (
    <main className="wrap">
      <p style={{ paddingTop: "1.5rem", margin: 0 }}>
        <Link href={`/${lang}/signs`}>{d.signs.back}</Link>
      </p>
      <header className="page-head" style={{ display: "flex", gap: "2rem", justifyContent: "space-between", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ maxWidth: "62ch" }}>
          <p className="muted" style={{ marginBottom: ".3rem" }}>
            {d.categories[r.category as keyof typeof d.categories]} · {r.indicator_types.map((x) => d.types[x as keyof typeof d.types]).join(", ")}
          </p>
          <h1>{t.name}</h1>
          <p>{t.description}</p>
          <p style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
            <TrustBadge level={level} text={d.trust[level]} />
            {lang === "am" && t.translation_status === "needs_review" && <span className="flag">{d.signs.amReview}</span>}
            <Link href={`/${lang}?q=${encodeURIComponent(t.name)}`}>{d.signs.ask}</Link>
          </p>
        </div>
        {main && <Gauge score={main.score} label={fmt(d.ask.gaugeLabel, { score: main.score })} of="/ 10" />}
      </header>

      {r.cover_media_id && <img className="cover" src={`/api/media/${r.cover_media_id}`} alt={t.name} />}

      <div className="record-grid">
        {LOCALES.map((loc) => {
          const x = r.tr[loc];
          if (!x) return null;
          return (
            <section key={loc} lang={loc}>
              <h2>
                {fmt(d.signs.inLanguage, { language: d.langName[loc] })}{" "}
                {x.translation_status === "needs_review" && <span className="flag">{d.signs.amReview}</span>}
              </h2>
              <dl className="facts">
                <dt>{d.signs.behaviour}</dt>
                <dd>{x.observation_text}</dd>
                <dt>{d.signs.interpretation}</dt>
                <dd>{x.interpretation}</dd>
                <dt>{d.signs.prediction}</dt>
                <dd>{x.expected_weather}</dd>
                <dt>{d.signs.delay}</dt>
                <dd>{x.expected_timing_text}</dd>
                <dt>{d.signs.relevance}</dt>
                <dd>{x.agricultural_relevance}</dd>
                {x.voice_advice && (
                  <>
                    <dt>{d.signs.advice}</dt>
                    <dd>{x.voice_advice}</dd>
                  </>
                )}
              </dl>
            </section>
          );
        })}
      </div>

      <h2>{d.signs.recorded}</h2>
      <dl className="facts">
        <dt>{d.signs.recorded}</dt>
        <dd>{r.observation_period ?? r.observation_date ?? "—"}</dd>
        <dt>{d.signs.place}</dt>
        <dd>{placeName(r.location_slug, r.location_name)}</dd>
        <dt>{d.signs.source}</dt>
        <dd>{r.source_reference}</dd>
      </dl>

      <h2>{d.signs.tests}</h2>
      {r.evaluations.length === 0 && <p>{d.signs.noTests}</p>}
      {r.evaluations.map((e) => {
        const lv = trustLevel(e.score);
        return (
          <article key={e.id} className="test-item">
            <h3 style={{ display: "flex", gap: ".75rem", alignItems: "center", flexWrap: "wrap" }}>
              {fmt(d.signs.testOf, { date: e.evaluated_on ?? "" })} <TrustBadge level={lv} text={`${d.trust[lv]} · ${e.score} / 10`} />
            </h3>
            <dl className="facts">
              <dt>{d.signs.place}</dt>
              <dd>{placeName(e.location_slug, e.location_name)}</dd>
              {e.predicted_outcome && (
                <>
                  <dt>{d.signs.predictedOutcome}</dt>
                  <dd>{d.outcomes[e.predicted_outcome as keyof typeof d.outcomes]}</dd>
                </>
              )}
              {e.window_start && (
                <>
                  <dt>{d.signs.window}</dt>
                  <dd>
                    {e.window_start} – {e.window_end}
                  </dd>
                </>
              )}
              <dt>{d.signs.method}</dt>
              <dd>
                {e.method} {e.method_version && <code>{e.method_version}</code>}
              </dd>
              <dt>{d.signs.source}</dt>
              <dd>{e.source}</dd>
              <dt>{d.signs.data}</dt>
              <dd>{e.weather_outcome_id ? <a href={`/api/v1/tests/${e.weather_outcome_id}`}>{d.signs.viewData}</a> : <span className="muted">{d.signs.noData}</span>}</dd>
            </dl>
          </article>
        );
      })}
    </main>
  );
}
