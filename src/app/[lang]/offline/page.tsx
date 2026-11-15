import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false } };

// Shown by the service worker when a page has never been opened on this phone and there is no connection.
export default async function Offline({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const o = dict(lang).pwa.offline;
  return (
    <main className="wrap offline-page">
      <div className="offline-page__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="72" height="72">
          <path d="M18 44h28a10 10 0 0 0 0-20 14 14 0 0 0-27-3A10 10 0 0 0 18 44z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="M14 14l36 36" stroke="var(--gold)" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
      <h1>{o.title}</h1>
      <p className="lead">{o.text}</p>
      <ul className="offline-page__list">
        {o.works.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p>
        <Link className="btn" href={`/${lang}`}>
          {o.ask}
        </Link>{" "}
        <Link className="btn secondary" href={`/${lang}/signs`}>
          {o.signs}
        </Link>
      </p>
    </main>
  );
}
