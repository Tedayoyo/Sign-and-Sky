import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { Flash, ResearchNav } from "@/components/ResearchNav";
import { addNote, reviewSubmission } from "../../actions";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

type Sub = Record<string, string | null> & { id: string; record_number: number | null };

export default async function SubmissionPage({ params, searchParams }: { params: Promise<{ lang: string; id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { lang, id } = await params;
  const { ok } = await searchParams;
  const d = dict(lang);
  const r = d.research;
  const user = await requireUser(lang);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await one<Sub>(
    `select s.*, k.record_number from farmer_submissions s left join knowledge_records k on k.id = s.converted_record_id where s.id = $1`,
    [id],
  );
  if (!s) notFound();
  const [photos, notes] = await Promise.all([
    query<{ id: string; mime_type: string }>("select id, mime_type from uploaded_media where submission_id = $1 order by created_at", [id]),
    query<{ body: string; created_at: string; full_name: string | null }>(
      "select n.body, n.created_at, p.full_name from research_notes n left join profiles p on p.id = n.author_id where n.submission_id = $1 order by n.created_at",
      [id],
    ),
  ]);
  const row = (label: string, v: string | null | undefined) =>
    v ? (
      <>
        <dt>{label}</dt>
        <dd>{v}</dd>
      </>
    ) : null;
  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={user} current="submissions" />
      <Flash ok={ok ? r.saved : null} />
      <h1>{s.indicator}</h1>
      <p className="muted">
        {s.reference_code} · {r.submissionStatus[s.status as keyof typeof r.submissionStatus]}
        {s.record_number && (
          <>
            {" · "}
            <Link href={`/${lang}/research/records/${s.record_number}`}>{r.converted.replace("{n}", String(s.record_number))}</Link>
          </>
        )}
      </p>
      <div className="record-grid">
        <section>
          <dl className="facts">
            {row(d.share.description, s.description)}
            {row(d.share.date, s.observation_date)}
            {row(d.share.language, d.share.languages[s.original_language as keyof typeof d.share.languages])}
            {row(d.share.interpretation, s.interpretation)}
            {row(d.share.expected, s.expected_event)}
            {row(d.share.timing, d.share.timings[s.expected_timing as keyof typeof d.share.timings])}
            {row(d.share.activity, d.share.activities[s.agricultural_activity as keyof typeof d.share.activities])}
            {row(d.share.crop, s.crop_type)}
            {row(d.share.notes, s.notes)}
            {row(r.message, s.review_message)}
          </dl>
        </section>
        <section>
          <fieldset style={{ marginTop: 0 }}>
            <legend>{r.private}</legend>
            <dl className="facts">
              {row(r.farmer, s.farmer_name)}
              {row(d.share.region, s.region)}
              {row(d.share.location, s.location_text)}
              {row(d.share.village, s.village)}
              {row(r.submitted, s.created_at ? new Date(s.created_at).toISOString().slice(0, 16).replace("T", " ") : null)}
            </dl>
          </fieldset>
          {photos.length > 0 && (
            <>
              <h3>{r.photos}</h3>
              {photos.map((p) =>
                p.mime_type.startsWith("audio/") ? (
                  <audio key={p.id} controls preload="none" src={`/api/media/${p.id}`} style={{ width: "100%", marginBottom: 8 }} />
                ) : (
                  <img key={p.id} src={`/api/media/${p.id}`} alt="" style={{ borderRadius: 8, marginBottom: 8 }} />
                ),
              )}
            </>
          )}
        </section>
      </div>

      {!s.record_number && (
        <fieldset>
          <legend>{r.approve}</legend>
          <form action={reviewSubmission} className="stack">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={s.id} />
            <p className="field-help">{r.approveHelp}</p>
            <div className="form-grid">
              <div>
                <label htmlFor="category">{r.category}</label>
                <select id="category" name="category" defaultValue="other">
                  {Object.entries(d.categories).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="expected_outcome">{r.expectedOutcome}</label>
                <select id="expected_outcome" name="expected_outcome" defaultValue="unknown">
                  {Object.entries(d.outcomes).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="full">
                <label htmlFor="message">{r.message}</label>
                <textarea id="message" name="message" style={{ minHeight: 70 }} />
              </div>
            </div>
            <div className="actions">
              <button className="btn" name="decision" value="approve">{r.approve}</button>
              <button className="btn secondary" name="decision" value="needs_info">{r.askInfo}</button>
              <button className="btn danger" name="decision" value="reject">{r.reject}</button>
            </div>
          </form>
        </fieldset>
      )}

      <h2>{r.notes}</h2>
      {notes.length === 0 && <p className="muted">{r.noNotes}</p>}
      {notes.map((n, i) => (
        <div key={i} className="test-item">
          <p style={{ whiteSpace: "pre-wrap", marginBottom: ".25rem" }}>{n.body}</p>
          <p className="small muted">{n.full_name} · {new Date(n.created_at).toISOString().slice(0, 10)}</p>
        </div>
      ))}
      <form action={addNote} className="stack">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="submission_id" value={s.id} />
        <input type="hidden" name="back" value={`/${lang}/research/submissions/${s.id}`} />
        <label htmlFor="body" className="sr-only">{r.addNote}</label>
        <textarea id="body" name="body" required placeholder={r.notePlaceholder} />
        <button className="btn secondary" type="submit">{r.addNote}</button>
      </form>
    </main>
  );
}
