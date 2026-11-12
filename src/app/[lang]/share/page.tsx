import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import ShareForm from "./ShareForm";
import { PageHero } from "@/components/PageHero";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict(lang).share.title };
}

export default async function Share({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const all = dict(lang);
  const d = all.share;
  return (
    <main>
      <PageHero
        image="community"
        alt={all.media.community}
        eyebrow={all.pageHeads.shareEyebrow}
        title={d.title}
        lead={d.intro}
        illustrativeLabel={all.media.illustrative}
      />
      <div className="wrap narrow">
        <ShareForm lang={lang} d={d} />
      </div>
    </main>
  );
}
