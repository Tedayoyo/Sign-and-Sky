"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Item = { href: string; label: string };

export function Nav({
  items,
  more,
  moreLabel,
  lang,
  langNames,
  label,
  themeToggle,
}: {
  items: Item[];
  more: Item[];
  moreLabel: string;
  lang: string;
  langNames: { en: string; am: string };
  label: string;
  themeToggle?: React.ReactNode;
}) {
  const path = usePathname() || "/";
  const rest = path.replace(/^\/(en|am)(?=\/|$)/, "");
  const active = (href: string) => (href === `/${lang}` ? path === href : path === href || path.startsWith(href + "/"));
  const moreActive = more.some((i) => active(i.href));
  const details = useRef<HTMLDetailsElement>(null);

  // Close the "More" menu after navigating, on Escape and on a click elsewhere.
  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [path]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = details.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <nav className="nav" aria-label={label}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
      <details className="nav-more" ref={details}>
        <summary aria-current={moreActive ? "page" : undefined}>
          {moreLabel}
          <svg viewBox="0 0 12 12" aria-hidden="true" width="10" height="10">
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </summary>
        <div className="nav-more__menu">
          {more.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>
              {i.label}
            </Link>
          ))}
        </div>
      </details>
      <span className="langswitch">
        <a href={`/en${rest}`} aria-current={lang === "en" ? "true" : undefined} lang="en">
          {langNames.en}
        </a>
        <a href={`/am${rest}`} aria-current={lang === "am" ? "true" : undefined} lang="am">
          {langNames.am}
        </a>
      </span>
      {themeToggle}
    </nav>
  );
}
