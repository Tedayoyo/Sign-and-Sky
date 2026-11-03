import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, fmt } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { recordByNumber, tr } from "@/lib/records";
import { availableSources, SOURCE_LABEL } from "@/lib/weather";
import { DEFAULT_WINDOW, TESTABLE, TIMING_WINDOW, trustLevel, type Outcome } from "@/lib/scoring";
import { Flash, ResearchNav } from "@/components/ResearchNav";
import { TrustBadge } from "@/components/Gauge";
import { addNote, recordOutcome, runTest, saveRecord, setPublished } from "../../actions";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

type SP = { ok?: string; e?: string; r?: string; score?: string };

export default async function EditRecord({ params, searchParams }: { params: Promise<{ lang: string; n: string }>; searchParams: Promise<SP> }) {
  const { lang, n } = await params;
  const sp = await searchParams;
  const d = dict(lang);
  const r = d.research;
  const user = await requireUser(lang);
  const rec = await recordByNumber(Number(n), true);
  if (!rec) notFound();
  const [locations, outcomes, notes] = await Promise.all([
    query<{ id: string; name: string; country: string; latitude: number | null; slug: string | null }>(
      "select id, name, country, latitude, slug from locations order by (slug is null), name",
    ),
    query<{ id: string; source_type: string; actual_outcome: string; rainfall_mm: number | null; period_start: string | null; period_end: string | null; data_source: string; conditions_text: string | null; checked_date: string }>(
      "select id, source_type, actual_outcome, rainfall_mm, period_start, period_end, data_source, conditions_text, checked_date from weather_outcomes where record_id = $1 order by created_at desc",
      [rec.id],
    ),
    query<{ body: string; created_at: string; full_name: string | null }>(
      "select n.body, n.created_at, p.full_name from research_notes n left join profiles p on p.id = n.author_id where n.record_id = $1 order by n.created_at",
      [rec.id],
    ),
  ]);
  const name = tr(rec, lang).name;
  const predictedDefault: Outcome = (TESTABLE as string[]).includes(rec.expected_outcome) ? (rec.expected_outcome as Outcome) : "rain";
  const windowDefault = TIMING_WINDOW[rec.expected_timing] ?? DEFAULT_WINDOW[predictedDefault];
  const wol = locations.find((l) => l.slug === "wol");
  const flashOk = sp.ok === "test" ? fmt(r.testDone, { score: sp.score ?? "" }) : sp.ok ? r.saved : null;
  const flashErr = sp.e === "test" ? fmt(r.testFailed, { reason: sp.r ?? "" }) : sp.e ? r.invalid : null;
  const hidden = (
    <>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="id" value={rec.id} />
    </>
  );

  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={user} current="records" />
      <Flash ok={flashOk} error={flashErr} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{fmt(r.editRecord, { n: rec.record_number })}: {name}</h1>
        <form action={setPublished}>
          {hidden}
          <input type="hidden" name="publish" value={rec.is_published ? "0" : "1"} />
          <span className={`pill${rec.is_published ? " pub" : ""}`} style={{ marginRight: ".6rem" }}>
            {r.published}: {rec.is_published ? d.common.yes : d.common.no}
          </span>
          <button className={`btn small${rec.is_published ? " secondary" : ""}`}>{rec.is_published ? r.unpublish : r.publish}</button>
        </form>
      </div>
      {rec.is_published && (
        <p className="small">
          <Link href={`/${lang}/signs/${rec.record_number}`}>{d.signs.ask}</Link>
        </p>
      )}

      <form action={saveRecord}>
        {hidden}
        <fieldset>
          <legend>{r.core}</legend>
          <div className="form-grid">
            <div>
              <label htmlFor="category">{r.category}</label>
              <select id="category" name="category" defaultValue={rec.category}>
                {Object.entries(d.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <span className="label">{r.types}</span>
              <div className="inline-checks">
                {(["rainfall", "dry", "seasonal"] as const).map((t) => (
                  <label key={t}>
                    <input type="checkbox" name="indicator_types" value={t} defaultChecked={rec.indicator_types.includes(t)} /> {d.types[t]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="expected_outcome">{r.expectedOutcome}</label>
              <select id="expected_outcome" name="expected_outcome" defaultValue={rec.expected_outcome}>
                {Object.entries(d.outcomes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="expected_timing">{r.expectedTiming}</label>
              <select id="expected_timing" name="expected_timing" defaultValue={rec.expected_timing}>
                {Object.entries(d.timing).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="observation_date">{r.observationDate}</label>
              <input id="observation_date" name="observation_date" type="date" defaultValue={rec.observation_date ?? ""} />
            </div>
            <div>
              <label htmlFor="observation_date_precision">{r.precision}</label>
              <select id="observation_date_precision" name="observation_date_precision" defaultValue={rec.observation_date_precision ?? "day"}>
                {Object.entries(r.precisions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="observation_period">{r.observationPeriod}</label>
              <input id="observation_period" name="observation_period" type="text" defaultValue={rec.observation_period ?? ""} />
            </div>
            <div>
              <label htmlFor="verification_status">{r.status}</label>
              <select id="verification_status" name="verification_status" defaultValue={rec.verification_status}>
                {Object.entries(d.status).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="location_id">{r.location}</label>
              <select id="location_id" name="location_id" defaultValue={locations.find((l) => l.name === rec.location_name)?.id ?? ""}>
                <option value="">—</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.country}</option>)}
              </select>
            </div>
            <div className="full">
              <label htmlFor="original_text">{r.originalText}</label>
              <textarea id="original_text" name="original_text" defaultValue={rec.original_text ?? ""} style={{ minHeight: 70 }} />
            </div>
            <div className="full">
              <label htmlFor="source_reference">{r.source}</label>
              <input id="source_reference" name="source_reference" type="text" defaultValue={rec.source_reference ?? ""} />
            </div>
          </div>
        </fieldset>

        {(["en", "am"] as const).map((l) => {
          const t = rec.tr[l];
          const f = (k: string) => `${l}_${k}`;
          return (
            <fieldset key={l} lang={l}>
              <legend>{fmt(r.translation, { language: d.langName[l] })}</legend>
              <div className="form-grid">
                <div>
                  <label htmlFor={f("name")}>{r.name}</label>
                  <input id={f("name")} name={f("name")} type="text" defaultValue={t?.name ?? ""} />
                </div>
                <div>
                  <label htmlFor={f("translation_status")}>{r.trStatus}</label>
                  <select id={f("translation_status")} name={f("translation_status")} defaultValue={t?.translation_status ?? "needs_review"}>
                    {Object.entries(r.trStatuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {(
                  [
                    ["description", r.trDescription],
                    ["observation_text", r.observationText],
                    ["interpretation", r.interpretation],
                    ["expected_weather", r.expectedWeather],
                    ["expected_timing_text", r.expectedTimingText],
                    ["agricultural_relevance", r.relevance],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <label htmlFor={f(k)}>{label}</label>
                    <textarea id={f(k)} name={f(k)} defaultValue={(t?.[k] as string) ?? ""} style={{ minHeight: 70 }} />
                  </div>
                ))}
                <div className="full">
                  <label htmlFor={f("voice_advice")}>{r.voiceAdvice}</label>
                  <textarea id={f("voice_advice")} name={f("voice_advice")} maxLength={400} defaultValue={t?.voice_advice ?? ""} style={{ minHeight: 70 }} />
                </div>
                <div className="full">
                  <label htmlFor={f("keywords")}>{r.keywords}</label>
                  <input id={f("keywords")} name={f("keywords")} type="text" defaultValue={(t?.keywords ?? []).join(", ")} />
                </div>
              </div>
            </fieldset>
          );
        })}
        <button className="btn" type="submit">{d.common.save}</button>
      </form>

      <h2>{r.evaluations}</h2>
      {rec.evaluations.length === 0 && <p className="muted">{d.signs.noTests}</p>}
      {rec.evaluations.map((e) => {
        const lv = trustLevel(e.score);
        return (
          <div key={e.id} className="test-item">
            <p style={{ margin: 0 }}>
              <TrustBadge level={lv} text={`${e.score} / 10 · ${d.trust[lv]}`} /> {e.evaluated_on} · {e.location_name} {e.method_version && <code>{e.method_version}</code>}
            </p>
            <p className="small muted" style={{ margin: ".3rem 0 0" }}>{e.method}</p>
            {e.weather_outcome_id && (
              <p className="small" style={{ margin: ".3rem 0 0" }}>
                <a href={`/api/research/tests/${e.weather_outcome_id}`}>{d.signs.viewData}</a>
              </p>
            )}
          </div>
        );
      })}

      <fieldset>
        <legend>{r.runTest}</legend>
        <p className="field-help">{r.runTestHelp}</p>
        {rec.expected_outcome === "seasonal_change" && <p className="notice">{r.seasonalNote}</p>}
        <form action={runTest} className="form-grid">
          {hidden}
          <div>
            <label htmlFor="t_loc">{r.location}</label>
            <select id="t_loc" name="location_id" defaultValue={wol?.id}>
              {locations.filter((l) => l.latitude !== null).map((l) => <option key={l.id} value={l.id}>{l.name}, {l.country}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="t_date">{r.observationDate}</label>
            <input id="t_date" name="observation_date" type="date" required defaultValue={rec.observation_date ?? ""} />
          </div>
          <div>
            <label htmlFor="t_pred">{r.predicted}</label>
            <select id="t_pred" name="predicted" defaultValue={predictedDefault}>
              {TESTABLE.map((o) => <option key={o} value={o}>{d.outcomes[o]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="t_win">{r.windowDays}</label>
            <input id="t_win" name="window_days" type="number" min={1} max={120} required defaultValue={windowDefault} />
          </div>
          <div>
            <label htmlFor="t_ref">{r.referenceYears}</label>
            <input id="t_ref" name="reference_years" type="number" min={5} max={30} required defaultValue={10} />
          </div>
          <div>
            <label htmlFor="t_src">{r.dataSource}</label>
            <select id="t_src" name="source" defaultValue="era5">
              {availableSources().map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="full">
            <label htmlFor="t_notes">{d.share.notes}</label>
            <input id="t_notes" name="notes" type="text" />
          </div>
          <div className="full">
            <button className="btn" type="submit">{r.run}</button>
          </div>
        </form>
      </fieldset>

      <fieldset>
        <legend>{r.recordOutcome}</legend>
        <form action={recordOutcome} className="form-grid">
          {hidden}
          <div>
            <label htmlFor="o_out">{r.actualOutcome}</label>
            <select id="o_out" name="actual_outcome">
              {Object.entries(r.actualOutcomes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="o_src">{r.sourceType}</label>
            <select id="o_src" name="source_type" defaultValue="researcher_observed">
              {Object.entries(r.sourceTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="o_from">{r.periodStart}</label>
            <input id="o_from" name="period_start" type="date" />
          </div>
          <div>
            <label htmlFor="o_to">{r.periodEnd}</label>
            <input id="o_to" name="period_end" type="date" />
          </div>
          <div>
            <label htmlFor="o_mm">{r.rainfall}</label>
            <input id="o_mm" name="rainfall_mm" type="number" min={0} step="0.1" />
          </div>
          <div>
            <label htmlFor="o_ds">{r.source}</label>
            <input id="o_ds" name="data_source" type="text" placeholder="Field observation" />
          </div>
          <div className="full">
            <label htmlFor="o_cond">{r.conditions}</label>
            <textarea id="o_cond" name="conditions_text" style={{ minHeight: 70 }} />
          </div>
          <div className="full">
            <button className="btn secondary" type="submit">{d.common.save}</button>
          </div>
        </form>
        <h3>{r.outcomes}</h3>
        {outcomes.length === 0 && <p className="muted">{r.noOutcomes}</p>}
        <ul>
          {outcomes.map((o) => (
            <li key={o.id}>
              {o.checked_date}: {r.actualOutcomes[o.actual_outcome as keyof typeof r.actualOutcomes]}
              {o.rainfall_mm !== null ? `, ${o.rainfall_mm} mm` : ""}
              {o.period_start ? ` (${o.period_start} – ${o.period_end ?? ""})` : ""} · {r.sourceTypes[o.source_type as keyof typeof r.sourceTypes]} · {o.data_source}
              {o.conditions_text ? ` — ${o.conditions_text}` : ""}
            </li>
          ))}
        </ul>
      </fieldset>

      <h2>{r.notes}</h2>
      {notes.length === 0 && <p className="muted">{r.noNotes}</p>}
      {notes.map((x, i) => (
        <div key={i} className="test-item">
          <p style={{ whiteSpace: "pre-wrap", marginBottom: ".25rem" }}>{x.body}</p>
          <p className="small muted">{x.full_name} · {new Date(x.created_at).toISOString().slice(0, 10)}</p>
        </div>
      ))}
      <form action={addNote} className="stack">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="record_id" value={rec.id} />
        <input type="hidden" name="back" value={`/${lang}/research/records/${rec.record_number}`} />
        <label htmlFor="body" className="sr-only">{r.addNote}</label>
        <textarea id="body" name="body" required placeholder={r.notePlaceholder} />
        <button className="btn secondary" type="submit">{r.addNote}</button>
      </form>
    </main>
  );
}
