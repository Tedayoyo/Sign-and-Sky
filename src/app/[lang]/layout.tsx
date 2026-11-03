import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { Logo } from "@/components/Logo";

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = dict(lang);
  const items = [
    { href: `/${lang}`, label: d.nav.ask },
    { href: `/${lang}/signs`, label: d.nav.signs },
    { href: `/${lang}/results`, label: d.nav.results },
    { href: `/${lang}/share`, label: d.nav.share },
    { href: `/${lang}/about`, label: d.nav.about },
    { href: `/${lang}/research`, label: d.nav.research },
  ];
  return (
    <>
      <a className="skip" href="#main">{d.nav.skip}</a>
      <header className="site-head">
        <div className="wrap">
          <Link className="brand" href={`/${lang}`}>
            <Logo />
            Sign &amp; Sky
          </Link>
          <Nav items={items} lang={lang} langNames={d.langName} label={d.nav.menu} />
        </div>
      </header>
      <div id="main">{children}</div>
      <footer className="site-foot">
        <div className="wrap">
          <p>{d.footer.line}</p>
          <p>{d.footer.note}</p>
        </div>
      </footer>
    </>
  );
}
