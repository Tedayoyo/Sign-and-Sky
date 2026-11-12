import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { siteUrl } from "@/lib/site";

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
  icons: { icon: "/icon.svg" },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = (await headers()).get("x-sns-lang") === "am" ? "am" : "en";
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Noto+Sans+Ethiopic:wght@400..700&family=Noto+Sans:wght@400..700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
