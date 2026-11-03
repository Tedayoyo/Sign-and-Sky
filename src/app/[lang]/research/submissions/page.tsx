import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ResearchNav } from "@/components/ResearchNav";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUSES = ["pending", "needs_info", "approved", "rejected"] as const;

export default async function Submissions({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ status?: string }> }) {
  const { lang } = await params;
  const { status } = await searchParams;
  const d = dict(lang);
  const r = d.research;
  const user = await requireUser(lang);
  const st = (STATUSES as readonly string[]).includes(status ?? "") ? status! : null;
  const rows = await query<{ id: string; reference_code: string; indicator: string; region: string; observation_date: string; status: string; created_at: string; photos: number }>(
    `select s.id, s.reference_code, s.indicator, s.region, s.observation_date, s.status, s.created_at,
       (select count(*) from uploaded_media m where m.submission_id = s.id)::int as photos
     from farmer_submissions s ${st ? "where s.status = $1" : ""} order by s.created_at desc limit 300`,
    st ? [st] : [],
  );
  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={user} current="submissions" />
      <h1>{r.submissions}</h1>
      <p className="inline-checks">
        <Link href={`/${lang}/research/submissions`} aria-current={!st ? "page" : undefined}>{r.filterAll}</Link>
        {STATUSES.map((x) => (
          <Link key={x} href={`/${lang}/research/submissions?status=${x}`} aria-current={st === x ? "page" : undefined}>
            {r.submissionStatus[x]}
          </Link>
        ))}
      </p>
      {rows.length === 0 ? (
        <p className="notice">{r.noSubmissions}</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{d.share.indicator}</th>
                <th>{d.share.region}</th>
                <th>{d.share.date}</th>
                <th>{r.submitted}</th>
                <th>{r.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link href={`/${lang}/research/submissions/${x.id}`}>{x.reference_code}</Link>
                  </td>
                  <td>{x.indicator}{x.photos ? " 📷" : ""}</td>
                  <td>{x.region}</td>
                  <td>{x.observation_date}</td>
                  <td>{new Date(x.created_at).toISOString().slice(0, 10)}</td>
                  <td>{r.submissionStatus[x.status as keyof typeof r.submissionStatus]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
