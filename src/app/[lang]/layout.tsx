import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = dict(lang);
  const items = [
    { href: `/${lang}`, label: d.nav.ask },
    { href: `/${lang}/signs`, label: d.nav.signs },
    { href: `/${lang}/environment`, label: d.nav.environment },
    { href: `/${lang}/calendar`, label: d.nav.calendar },
    { href: `/${lang}/results`, label: d.nav.results },
    { href: `/${lang}/share`, label: d.nav.share },
  ];
  const more = [
    { href: `/${lang}/about`, label: d.nav.about },
    { href: `/${lang}/science`, label: d.nav.science },
    { href: `/${lang}/team`, label: d.nav.team },
    { href: `/${lang}/stories`, label: d.nav.stories },
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
          <Nav
            items={items}
            more={more}
            moreLabel={d.nav.more}
            lang={lang}
            langNames={d.langName}
            label={d.nav.menu}
            themeToggle={<ThemeToggle toLight={d.theme.toLight} toDark={d.theme.toDark} />}
          />
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
