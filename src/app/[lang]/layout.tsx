import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "../globals.css";

// Fonts are self-hosted (SIL Open Font License, src/fonts/OFL.txt): no request to Google, no render-blocking CSS.
const fontHead = localFont({ src: "../../fonts/bricolage-grotesque.woff2", weight: "200 800", variable: "--font-head-src", display: "swap" });
const fontSans = localFont({ src: "../../fonts/noto-sans.woff2", weight: "100 900", variable: "--font-sans-src", display: "swap" });
const fontEthiopic = localFont({ src: "../../fonts/noto-sans-ethiopic.woff2", weight: "100 900", variable: "--font-eth-src", display: "swap", preload: false });
import { siteUrl } from "@/lib/site";
import { notFound } from "next/navigation";
import { dict, isLocale } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavProgress } from "@/components/NavProgress";
import { Pwa } from "@/components/Pwa";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "am" }];
}
export const dynamicParams = false;

const DESCRIPTION = "Indigenous weather signs from 283 farming households in Offa Woreda, Wolaita, South Ethiopia, scored against recorded rainfall and returned to farmers by voice in English and Amharic.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Sign & Sky", template: "%s · Sign & Sky" },
  description: DESCRIPTION,
  applicationName: "Sign & Sky",
  openGraph: {
    type: "website",
    siteName: "Sign & Sky",
    title: "Sign & Sky",
    description: DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["am_ET"],
    images: [{ url: "/media/hero-landscape-1106.jpg", width: 1106, height: 736 }],
  },
  twitter: { card: "summary_large_image", title: "Sign & Sky", description: DESCRIPTION, images: ["/media/hero-landscape-1106.jpg"] },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Sign & Sky", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1B2A4A" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1A2E" },
  ],
};

// Applies the visitor's saved light/dark choice before the first paint, so the page never flashes.
const THEME_SCRIPT = `try{var t=localStorage.getItem("sns-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

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
    { href: `/${lang}/research/login`, label: d.nav.research }, // signed-in researchers are sent on to their dashboard
  ];
  return (
    <html lang={lang} suppressHydrationWarning className={`${fontHead.variable} ${fontSans.variable} ${fontEthiopic.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
      <NavProgress />
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
            themeToggle={
              <>
                <ThemeToggle toLight={d.theme.toLight} toDark={d.theme.toDark} />
                <Pwa t={d.pwa} />
              </>
            }
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
      </body>
    </html>
  );
}
