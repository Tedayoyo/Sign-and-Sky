import type { Metadata } from "next";
import { dict } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).about.title };
}

export default async function About({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const a = dict(lang).about;
  const parts = a.apiText.split("{url}");
  return (
    <main className="wrap narrow">
      <header className="page-head">
        <h1>{a.title}</h1>
        <p>{a.lead}</p>
      </header>
      <h2>{a.howTitle}</h2>
      <ol>
        {a.how.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
      <h2>{a.promisesTitle}</h2>
      <ul>
        {a.promises.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h2>{a.seasonsTitle}</h2>
      <p>{a.seasonsEthiopia}</p>
      <p>{a.seasonsIndia}</p>
      <h2>{a.placesTitle}</h2>
      <p>{a.placesText}</p>
      <h2>{a.dataTitle}</h2>
      <p>{a.dataText}</p>
      <h2>{a.apiTitle}</h2>
      <p>
        {parts[0]}
        <a href="/api/v1/signs">
          <code>/api/v1/signs</code>
        </a>
        {parts[1]}
      </p>
      <h2>{a.teamTitle}</h2>
      <p>{a.teamText}</p>
    </main>
  );
}
