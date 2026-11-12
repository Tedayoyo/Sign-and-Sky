"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { mx, my, EXT, OFFA, WOLAITA, rectOf, tileUrl, viewOf } from "@/lib/mapgeo";
import { GROUPS, type GroupKey } from "@/lib/explorer";
import type { SeasonKey } from "@/lib/places";

// Community knowledge map: every published sign, placed at the area where it was documented.
// Markers sit on the area's public study point (for Wolaita: the centre of Offa Woreda), never on a farm or village.
// Shared signs appear here only after researchers review and publish them.

export type MapArea = { slug: string; label: string; lat: number; lon: number };
export type MapObs = { n: number; name: string; group: GroupKey; season: SeasonKey; month: number; day: number | null; year: number; area: string };

type T = {
  title: string;
  help: string;
  privacy: string;
  group: string;
  season: string;
  month: string;
  all: string;
  any: string;
  groups: Record<GroupKey, string>;
  seasons: Record<SeasonKey, string>;
  months: string[];
  summary: string;
  signsCount: string;
  obsCount: string;
  byGroup: string;
  bySeason: string;
  details: string;
  none: string;
  reset: string;
  credit: string;
};

const SEASONS: SeasonKey[] = ["belg", "kiremt", "bega"];

export function KnowledgeMap({ t, areas, obs, lang }: { t: T; areas: MapArea[]; obs: MapObs[]; lang: string }) {
  const [group, setGroup] = useState<GroupKey | "">("");
  const [season, setSeason] = useState<SeasonKey | "">("");
  const [month, setMonth] = useState(0);
  const [picked, setPicked] = useState(areas[0]?.slug ?? "");
  const v = useMemo(() => viewOf(EXT), []);

  const shown = obs.filter((o) => (!group || o.group === group) && (!season || o.season === season) && (!month || o.month === month));
  const area = areas.find((a) => a.slug === picked) ?? areas[0];
  const here = shown.filter((o) => o.area === area?.slug);
  const allHere = obs.filter((o) => o.area === area?.slug);
  const signsHere = new Set(here.map((o) => o.n)).size;
  const count = <K extends string>(list: MapObs[], key: (o: MapObs) => K, keys: K[]) => keys.map((k) => [k, list.filter((o) => key(o) === k).length] as const);
  const maxR = Math.max(1, ...areas.map((a) => shown.filter((o) => o.area === a.slug).length));
  const fmt = (o: MapObs) => `${o.day ? o.day + " " : ""}${t.months[o.month - 1]} ${o.year}`;

  return (
    <section className="kmap envx__panel" aria-labelledby="kmap-title">
      <h2 id="kmap-title">{t.title}</h2>
      <p className="muted">{t.help}</p>

      <div className="kmap__filters">
        <div className="kmap__chips" role="group" aria-label={t.group}>
          <button type="button" aria-pressed={!group} onClick={() => setGroup("")}>
            {t.all}
          </button>
          {GROUPS.map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {t.groups[g]} <span className="kmap__n">{obs.filter((o) => o.group === g).length}</span>
            </button>
          ))}
        </div>
        <label>
          <span>{t.season}</span>
          <select value={season} onChange={(e) => setSeason(e.target.value as SeasonKey | "")}>
            <option value="">{t.any}</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {t.seasons[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.month}</span>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            <option value={0}>{t.any}</option>
            {t.months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {(group || season || month > 0) && (
          <button type="button" className="linklike" onClick={() => (setGroup(""), setSeason(""), setMonth(0))}>
            {t.reset}
          </button>
        )}
      </div>

      <div className="kmap__body">
        <figure className="kmap__map">
          <svg viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="group" aria-label={t.title}>
            <rect x={v.x} y={v.y} width={v.w} height={v.h} className="envx__bg" />
            {v.tiles.map(({ x, y }) => (
              <image key={`${x}-${y}`} href={tileUrl(x, y)} x={x * 256} y={y * 256} width={256} height={256} preserveAspectRatio="none" />
            ))}
            <rect {...rectOf(WOLAITA)} className="envx__box envx__box--zone" />
            <rect {...rectOf(OFFA)} className="envx__box envx__box--offa" />
            {areas.map((a) => {
              const n = shown.filter((o) => o.area === a.slug).length;
              const r = 16 + 26 * Math.sqrt(n / maxR);
              return (
                <g
                  key={a.slug}
                  className={`kmap__marker${a.slug === area?.slug ? " is-picked" : ""}${n === 0 ? " is-empty" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.label}: ${t.obsCount.replace("{n}", String(n))}`}
                  onClick={() => setPicked(a.slug)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPicked(a.slug))}
                >
                  <circle cx={mx(a.lon)} cy={my(a.lat)} r={r + 10} className="kmap__halo" />
                  <circle cx={mx(a.lon)} cy={my(a.lat)} r={r} className="kmap__dot" />
                  <text x={mx(a.lon)} y={my(a.lat)} textAnchor="middle" dominantBaseline="central" className="kmap__count">
                    {n}
                  </text>
                  <text x={mx(a.lon)} y={my(a.lat) + r + 22} textAnchor="middle" className="envx__label">
                    {a.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption className="small muted">{t.credit}</figcaption>
        </figure>

        <div className="kmap__side" aria-live="polite">
          {area && (
            <>
              <p className="eyebrow">{t.summary}</p>
              <h3>{area.label}</h3>
              <p className="kmap__totals">
                <strong>{signsHere}</strong> {t.signsCount}
                <span aria-hidden="true"> · </span>
                <strong>{here.length}</strong> {t.obsCount.replace("{n}", "").trim()}
              </p>
              <h4>{t.byGroup}</h4>
              <ul className="kmap__bars">
                {count(allHere, (o) => o.group, GROUPS).map(([g, n]) => (
                  <li key={g} className={group && group !== g ? "is-dim" : undefined}>
                    <span>{t.groups[g]}</span>
                    <span className="kmap__track">
                      <i style={{ width: `${(n / Math.max(1, allHere.length)) * 100}%` }} />
                    </span>
                    <span className="num">{n}</span>
                  </li>
                ))}
              </ul>
              <h4>{t.bySeason}</h4>
              <ul className="kmap__bars">
                {count(allHere, (o) => o.season, SEASONS).map(([s, n]) => (
                  <li key={s} className={season && season !== s ? "is-dim" : undefined}>
                    <span>{t.seasons[s]}</span>
                    <span className="kmap__track kmap__track--season">
                      <i style={{ width: `${(n / Math.max(1, allHere.length)) * 100}%` }} />
                    </span>
                    <span className="num">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <h3 className="kmap__list-title">{t.details}</h3>
      {here.length === 0 ? (
        <p className="muted">{t.none}</p>
      ) : (
        <ul className="kmap__list">
          {[...here]
            .sort((a, b) => a.year - b.year || a.month - b.month || (a.day ?? 0) - (b.day ?? 0))
            .map((o, i) => (
              <li key={`${o.n}-${i}`}>
                <span className="kmap__date">{fmt(o)}</span>
                <Link href={`/${lang}/signs/${o.n}`}>{o.name}</Link>
                <span className="kmap__tags">
                  <span>{t.groups[o.group]}</span>
                  <span>{t.seasons[o.season]}</span>
                </span>
              </li>
            ))}
        </ul>
      )}
      <p className="small muted kmap__privacy">{t.privacy}</p>
    </section>
  );
}
