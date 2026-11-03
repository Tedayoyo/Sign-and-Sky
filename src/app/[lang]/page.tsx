import type { Metadata } from "next";
import { dict, fmt, SPEECH, type Locale } from "@/lib/i18n";
import { librarySigns } from "@/lib/assistant";
import { evaluationFor } from "@/lib/records";
import AskClient from "@/components/AskClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: { absolute: `Sign & Sky — ${d.nav.ask}` }, description: d.meta.description };
}

export default async function Home({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ q?: string }> }) {
  const { lang } = await params;
  const { q } = await searchParams;
  const d = dict(lang);
  let stats = "";
  try {
    const signs = await librarySigns();
    const scored = signs.map((s) => evaluationFor(s, "wol")).filter((e) => e);
    stats = fmt(d.home.stats, { tested: scored.length, strong: scored.filter((e) => e!.score >= 8).length });
  } catch {
    stats = "";
  }
  return (
    <main>
      <section className="hero">
        <div className="wrap narrow">
          <h1>{d.home.title}</h1>
          <p>{d.home.intro}</p>
          {stats && <p className="stats">{stats}</p>}
        </div>
      </section>
      <div className="wrap narrow">
        <AskClient
          lang={lang as Locale}
          speechLang={SPEECH[lang as Locale]}
          t={{ ask: d.ask, trust: d.trust, places: d.places, home: d.home }}
          initialText={typeof q === "string" ? q.slice(0, 300) : undefined}
        />
      </div>
    </main>
  );
}
