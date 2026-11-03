import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import type { User } from "@/lib/auth";
import { logout } from "@/app/[lang]/research/actions";

export function ResearchNav({ lang, d, user, current }: { lang: string; d: Dict; user: User; current: string }) {
  const r = d.research;
  const items: [string, string][] = [
    ["", r.dashboard],
    ["submissions", r.submissions],
    ["records", r.records],
    ...(user.role === "admin" ? ([["team", r.team]] as [string, string][]) : []),
    ["account", r.account],
  ];
  return (
    <nav className="research-nav" aria-label={r.title}>
      {items.map(([k, label]) => (
        <Link key={k} href={`/${lang}/research${k ? "/" + k : ""}`} aria-current={current === k ? "page" : undefined}>
          {label}
        </Link>
      ))}
      <form action={logout}>
        <input type="hidden" name="lang" value={lang} />
        <span className="small muted" style={{ marginRight: ".6rem" }}>
          {r.hello.replace("{name}", user.full_name)}
        </span>
        <button className="btn secondary small" type="submit">
          {r.signOut}
        </button>
      </form>
    </nav>
  );
}

export function Flash({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (error) return <p className="alert error" role="alert">{error}</p>;
  if (ok) return <p className="alert ok" role="status">{ok}</p>;
  return null;
}
