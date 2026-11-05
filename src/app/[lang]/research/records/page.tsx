import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { allRecords, tr } from "@/lib/records";
import { ResearchNav } from "@/components/ResearchNav";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Records({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ show?: string }> }) {
  const { lang } = await params;
  const { show } = await searchParams;
  const d = dict(lang);
  const r = d.research;
  const user = await requireUser(lang);
  let rows = await allRecords();
  if (show === "unpublished") rows = rows.filter((x) => !x.is_published);
  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={user} current="records" />
      <h1>{r.records}</h1>
      <p className="inline-checks">
        <Link href={`/${lang}/research/records`}>{r.all}</Link>
        <Link href={`/${lang}/research/records?show=unpublished`}>{r.unpublishedCount.replace("{n} ", "")}</Link>
      </p>
      <p className="small muted">{r.unpublishedNote}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{r.name}</th>
              <th>{r.status}</th>
              <th>{r.evaluations}</th>
              <th>{r.published}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>{x.record_number}</td>
                <td>
                  <Link href={`/${lang}/research/records/${x.record_number}`}>{tr(x, lang).name}</Link>
                </td>
                <td>{d.status[x.verification_status as keyof typeof d.status]}</td>
                <td>{x.evaluations.map((e) => e.score).join(", ") || "—"}</td>
                <td>
                  <span className={`pill${x.is_published ? " pub" : ""}`}>{x.is_published ? d.common.yes : d.common.no}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
