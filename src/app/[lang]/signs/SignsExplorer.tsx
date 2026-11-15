"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalize } from "@/lib/match";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ScoreRing } from "@/components/ScoreRing";
import { groupFor, type GroupKey } from "@/lib/explorer";

type Level = "very_strong" | "strong" | "fair" | "weak" | "untested";

export type ExplorerItem = {
  n: number;
  name: string;
  expected: string;
  seen: string;
  category: string;
  group: GroupKey;
  level: Level;
  score: number | null;
  status: "preliminary" | "retested" | "untested";
  hay: string;
};

type T = {
  search: string;
  placeholder: string;
  all: string;
  groups: Record<GroupKey, string>;
  trustAll: string;
  trust: Record<Level, string>;
  status: Record<"preliminary" | "retested" | "untested", string>;
  count: string;
  none: string;
  clear: string;
  scoreLabel: string;
};

const LEVELS: Level[] = ["very_strong", "strong", "fair", "weak"];

export function SignsExplorer({
  lang,
  items,
  groups,
  t,
}: {
  lang: string;
  items: ExplorerItem[];
  groups: GroupKey[];
  t: T;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<GroupKey | "">("");
  const [trust, setTrust] = useState<Level | "">("");
  const [ready, setReady] = useState(false);

  // Filters come from the address in the browser (/signs?q=ants&group=insects&trust=strong),
  // so the page itself can be served instantly from cache. Old links with ?cat= still work.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get("group") || (sp.get("cat") ? groupFor(0, sp.get("cat")!) : "");
    setQ((sp.get("q") || "").slice(0, 100));
    if ((groups as string[]).includes(g)) setGroup(g as GroupKey);
    const tr = sp.get("trust") || "";
    if (["very_strong", "strong", "fair", "weak"].includes(tr)) setTrust(tr as Level);
    setReady(true);
  }, [groups]);

  // Keep the address shareable
  useEffect(() => {
    if (!ready) return;
    const u = new URL(window.location.href);
    for (const [k, v] of [["q", q.trim()], ["group", group], ["trust", trust]] as const) {
      if (v) u.searchParams.set(k, v);
      else u.searchParams.delete(k);
    }
    u.searchParams.delete("cat");
    u.searchParams.delete("type");
    window.history.replaceState(null, "", u.toString());
  }, [q, group, trust, ready]);

  const shown = useMemo(() => {
    const words = normalize(q).split(" ").filter(Boolean);
    return items.filter(
      (i) => (!group || i.group === group) && (!trust || i.level === trust) && words.every((w) => i.hay.includes(w)),
    );
  }, [items, q, group, trust]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.group] = (c[i.group] ?? 0) + 1;
    return c;
  }, [items]);
  const filtered = !!(q || group || trust);

  return (
    <div className="explorer">
      <div className="explorer__tabs" role="group" aria-label={t.all}>
        <button type="button" className="tab" aria-pressed={!group} onClick={() => setGroup("")}>
          {t.all} <span className="tab__n">{items.length}</span>
        </button>
        {groups.map((g) => (
          <button key={g} type="button" className={`tab tab--${g}`} aria-pressed={group === g} onClick={() => setGroup(group === g ? "" : g)}>
            <GroupIcon group={g} />
            {t.groups[g]} <span className="tab__n">{counts[g] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="explorer__bar" role="search">
        <label className="explorer__search">
          <span className="sr-only">{t.search}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.placeholder} aria-label={t.search} />
        </label>
        <label>
          <span className="sr-only">{t.trustAll}</span>
          <select value={trust} onChange={(e) => setTrust(e.target.value as Level | "")} aria-label={t.trustAll}>
            <option value="">{t.trustAll}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t.trust[l]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="muted" aria-live="polite">
        {t.count.replace("{n}", String(shown.length))}
        {filtered && (
          <>
            {" · "}
            <button
              type="button"
              className="linklike"
              onClick={() => {
                setQ("");
                setGroup("");
                setTrust("");
              }}
            >
              {t.clear}
            </button>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <p className="notice">{t.none}</p>
      ) : (
        <ul className="explorer__grid">
          {shown.map((i, k) => (
            <li key={i.n} className={`sign-card sign-card--${i.group}`} style={{ animationDelay: `${Math.min(k, 12) * 40}ms` }}>
              <Link href={`/${lang}/signs/${i.n}`} className="sign-card__link">
                <span className="sign-card__top">
                  <span className="sign-card__icon">
                    <CategoryIcon category={i.category} />
                  </span>
                  <span className="sign-card__num">#{i.n}</span>
                </span>
                <strong className="sign-card__name">{i.name}</strong>
                <span className="sign-card__expected">{i.expected}</span>
                <span className="sign-card__foot">
                  <span>
                    <span className={`badge ${i.level}`}>{t.trust[i.level]}</span>
                    <span className="sign-card__status">{t.status[i.status]}</span>
                    <span className="sign-card__seen">{i.seen}</span>
                  </span>
                  {i.score !== null && <ScoreRing score={i.score} size={58} label={t.scoreLabel.replace("{score}", String(i.score))} />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupIcon({ group }: { group: GroupKey }) {
  const p: Record<GroupKey, string[]> = {
    sky: ["M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"],
    animals: ["M4 14c3-1 5-4 9-4 3 0 5 2 7 2-1 2-3 3-5 3", "M9 14l-2 5M14 15l1 4", "M16 9l2-3"],
    insects: ["M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M12 8v12", "M9 12h6M8 16h8M9 12l-4-2M15 12l4-2M8 16l-4 2M16 16l4 2"],
    wind: ["M3 9h12a3 3 0 1 0-3-3", "M3 14h16a3 3 0 1 1-3 3", "M3 19h7"],
    plants: ["M12 21V10", "M12 13c-4 0-6-3-6-6 4 0 6 3 6 6z", "M12 10c0-4 3-6 6-6 0 4-3 6-6 6z"],
  };
  return (
    <svg className="tab__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {p[group].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
