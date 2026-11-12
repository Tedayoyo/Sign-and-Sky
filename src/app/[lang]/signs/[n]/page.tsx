import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, fmt, LOCALES } from "@/lib/i18n";
import { recordByNumber, tr, evaluationFor } from "@/lib/records";
import { trustLevel } from "@/lib/scoring";
import { isPlace } from "@/lib/places";
import { TrustBadge } from "@/components/Gauge";
import { ScoreRing } from "@/components/ScoreRing";
import { TestEvidence, type TestPayload } from "@/components/TestEvidence";
import { parseObservations } from "@/lib/observations";
import { groupFor } from "@/lib/explorer";
import { query } from "@/lib/db";
import { PLACES } from "@/lib/places";

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
  const e = d.evidence;
  const dated = r.evaluations.filter((x) => x.weather_outcome_id);
  const status: "preliminary" | "retested" | "untested" = dated.length ? "retested" : main ? "preliminary" : "untested";
  // Stored data trails of tests run with the test tool (none for the 2025 field scores).
  let payloads: Record<string, TestPayload> = {};
  if (dated.length) {
    try {
      const rows = await query<{ id: string; payload: TestPayload }>(
        "select id, dataset_payload as payload from weather_outcomes where id = any($1::uuid[])",
        [dated.map((x) => x.weather_outcome_id)],
      );
      payloads = Object.fromEntries(rows.filter((x) => x.payload?.target).map((x) => [x.id, x.payload]));
    } catch {
      payloads = {};
    }
  }
  const months = d.calendar.months;
  const obs = parseObservations(r.observation_period || "");
  const fmtObs = (o: (typeof obs)[number]) => (o.day ? `${o.day} ${months[o.month - 1]} ${o.year}` : `${months[o.month - 1]} ${o.year}`);
  const fmtIso = (iso: string | null) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso ?? "—";
    const [yy, mm, dd] = iso.slice(0, 10).split("-").map(Number);
    return `${dd} ${months[mm - 1]} ${yy}`;
  };
  const history = [
    ...obs.map((o) => ({ key: `o${o.month}-${o.day}`, sort: `${o.year}-${String(o.month).padStart(2, "0")}-${String(o.day ?? 15).padStart(2, "0")}`, when: fmtObs(o), what: e.histObserved })),
    ...r.evaluations.map((x) => ({
      key: x.id,
      sort: x.evaluated_on ?? "9999",
      when: fmtIso(x.evaluated_on),
      what: x.weather_outcome_id ? `${e.histTest} · ${x.score} / 10` : `${e.histField} · ${x.score} / 10`,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));
  const pl = PLACES.wol;
  const evText = {
    ...e.chart,
    scoreLabel: d.ask.gaugeLabel,
  };

  return (
    <main className="wrap">
      <p style={{ paddingTop: "1.5rem", margin: 0 }}>
        <Link href={`/${lang}/signs`}>{d.signs.back}</Link>
      </p>
      <header className="page-head" style={{ display: "flex", gap: "2rem", justifyContent: "space-between", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ maxWidth: "62ch" }}>
          <p className="muted" style={{ marginBottom: ".3rem" }}>
            {d.explorer.groups[groupFor(r.record_number, r.category)]} · {r.indicator_types.map((x) => d.types[x as keyof typeof d.types]).join(", ")}
          </p>
          <h1>{t.name}</h1>
          <p>{t.description}</p>
          <p style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
            <TrustBadge level={level} text={d.trust[level]} />
            <span className={`status-pill status-pill--${status}`}>{d.explorer.status[status]}</span>
            <Link href={`/${lang}?q=${encodeURIComponent(t.name)}`}>{d.signs.ask}</Link>
          </p>
        </div>
        {main && <ScoreRing score={main.score} size={150} caption="/10" label={fmt(d.ask.gaugeLabel, { score: main.score })} />}
      </header>

      {r.cover_media_id && <img className="cover" src={`/api/media/${r.cover_media_id}`} alt={t.name} />}

      <div className="sign-facts">
        <div className="sign-fact">
          <span className="sign-fact__label">{e.where}</span>
          <strong>{placeName(r.location_slug, r.location_name) || d.places.wol.name}</strong>
          <span className="muted small">
            {e.studyPoint} {pl.lat.toFixed(2)}° N, {pl.lon.toFixed(2)}° E
          </span>
        </div>
        <div className="sign-fact">
          <span className="sign-fact__label">{e.observed}</span>
          <strong>{obs.length ? obs.map(fmtObs).join(" · ") : r.observation_period}</strong>
        </div>
        <div className="sign-fact">
          <span className="sign-fact__label">{e.forecastWindow}</span>
          <strong>{t.expected_timing_text || "—"}</strong>
          {main?.window_start && (
            <span className="muted small">
              {main.window_start} – {main.window_end}
            </span>
          )}
        </div>
        <div className="sign-fact">
          <span className="sign-fact__label">{d.signs.prediction}</span>
          <strong>{t.expected_weather || "—"}</strong>
        </div>
      </div>

      <section className={`eval-status eval-status--${status}`} aria-labelledby="eval-title">
        <h2 id="eval-title">{e.statusTitle}</h2>
        <ol className="eval-steps">
          {(["preliminary", "retested", "validated"] as const).map((k, i) => {
            const reached = k === "preliminary" ? status !== "untested" : k === "retested" ? status === "retested" : false;
            return (
              <li key={k} className={reached ? "is-reached" : undefined} aria-current={(k === status) || undefined}>
                <span className="eval-steps__dot">{i + 1}</span>
                {e.steps[k]}
              </li>
            );
          })}
        </ol>
        <p>{e.statusText[status]}</p>
        <p className="muted small">{e.validatedNote}</p>
      </section>

      {dated.map((x) =>
        x.weather_outcome_id && payloads[x.weather_outcome_id] ? (
          <TestEvidence key={x.id} p={payloads[x.weather_outcome_id]} t={evText} downloadHref={`/api/v1/tests/${x.weather_outcome_id}`} />
        ) : null,
      )}

      <section aria-labelledby="hist-title">
        <h2 id="hist-title">{e.history}</h2>
        <ol className="history">
          {history.map((h) => (
            <li key={h.key}>
              <span className="history__when">{h.when}</span>
              <span>{h.what}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="record-grid">
        {LOCALES.map((loc) => {
          const x = r.tr[loc];
          if (!x) return null;
          return (
            <section key={loc} lang={loc}>
              <h2>
                {fmt(d.signs.inLanguage, { language: d.langName[loc] })}
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
