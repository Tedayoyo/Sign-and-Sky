import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sign & Sky", template: "%s · Sign & Sky" },
  description: "Farmers' weather signs, tested against recorded rainfall, and returned by voice in English and Amharic.",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = (await headers()).get("x-sns-lang") === "am" ? "am" : "en";
  return (
    <html lang={lang}>
      <head>
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
