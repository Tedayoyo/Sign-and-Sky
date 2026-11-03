"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

export function Nav({ items, lang, langNames, label }: { items: Item[]; lang: string; langNames: { en: string; am: string }; label: string }) {
  const path = usePathname() || "/";
  const rest = path.replace(/^\/(en|am)(?=\/|$)/, "");
  const active = (href: string) => (href === `/${lang}` ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav className="nav" aria-label={label}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
      <span className="langswitch">
        <a href={`/en${rest}`} aria-current={lang === "en" ? "true" : undefined} lang="en">
          {langNames.en}
        </a>
        <a href={`/am${rest}`} aria-current={lang === "am" ? "true" : undefined} lang="am">
          {langNames.am}
        </a>
      </span>
    </nav>
  );
}
