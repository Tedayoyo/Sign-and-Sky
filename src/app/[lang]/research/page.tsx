import type { Metadata } from "next";
import Link from "next/link";
import { dict, fmt } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ResearchNav } from "@/components/ResearchNav";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Dashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const user = await requireUser(lang);
  const c = (await one<{ pending: number; pub: number; unpub: number; tests: number }>(
    `select (select count(*) from farmer_submissions where status = 'pending')::int as pending,
            (select count(*) from knowledge_records where is_published)::int as pub,
            (select count(*) from knowledge_records where not is_published)::int as unpub,
            (select count(*) from sign_evaluations)::int as tests`,
  ))!;
  const r = d.research;
  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={user} current="" />
      <h1>{r.title}</h1>
      <div className="tiles">
        <Link className="tile" href={`/${lang}/research/submissions?status=pending`}>
          <strong>{c.pending}</strong>
          {fmt(r.pending, { n: "" }).trim()}
        </Link>
        <Link className="tile" href={`/${lang}/research/records`}>
          <strong>{c.pub}</strong>
          {fmt(r.publishedCount, { n: "" }).trim()}
        </Link>
        <Link className="tile" href={`/${lang}/research/records?show=unpublished`}>
          <strong>{c.unpub}</strong>
          {fmt(r.unpublishedCount, { n: "" }).trim()}
        </Link>
        <div className="tile">
          <strong>{c.tests}</strong>
          {fmt(r.testsCount, { n: "" }).trim()}
        </div>
      </div>
    </main>
  );
}
