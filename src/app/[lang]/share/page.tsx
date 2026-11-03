import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import ShareForm from "./ShareForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).share.title };
}

export default async function Share({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang).share;
  return (
    <main className="wrap narrow">
      <header className="page-head">
        <h1>{d.title}</h1>
        <p>{d.intro}</p>
      </header>
      <ShareForm lang={lang} d={d} />
    </main>
  );
}
