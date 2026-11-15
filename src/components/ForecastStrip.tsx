"use client";
import { useEffect, useState } from "react";
import type { Forecast } from "@/lib/forecast";
import { sky } from "@/lib/forecast";

type T = { title: string; help: string; rain: string; chance: string; max: string; min: string; source: string; loading: string; failed: string; savedAt: string; today: string };

const ICON: Record<ReturnType<typeof sky>, React.ReactNode> = {
  sun: <circle cx="16" cy="16" r="7" className="fx-sun" />,
  partly: (
    <>
      <circle cx="12" cy="12" r="6" className="fx-sun" />
      <path d="M10 25h13a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 0 8z" className="fx-cloud" />
    </>
  ),
  cloud: <path d="M8 24h16a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-1 10z" className="fx-cloud" />,
  fog: (
    <g className="fx-fog">
      <path d="M6 12h20M4 17h24M7 22h18" />
    </g>
  ),
  rain: (
    <>
      <path d="M8 19h16a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-1 10z" className="fx-cloud" />
      <path d="M11 22l-2 5M17 22l-2 5M23 22l-2 5" className="fx-drop" />
    </>
  ),
  storm: (
    <>
      <path d="M8 18h16a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-1 10z" className="fx-cloud fx-cloud--dark" />
      <path d="M17 19l-4 6h4l-2 5" className="fx-bolt" />
    </>
  ),
};

export function ForecastStrip({ t, lang }: { t: T & { weekdays: string[] }; lang: string }) {
  const dayNames = t.weekdays;
  const [f, setF] = useState<Forecast | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    fetch("/api/forecast")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Forecast) => {
        setF(j);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);
  const maxRain = Math.max(10, ...(f?.days.map((d) => d.rain ?? 0) ?? [0]));
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" });
  const fetchedOld = f && Date.now() - new Date(f.fetched).getTime() > 6 * 3600 * 1000;
  const label = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return iso === todayIso ? t.today : `${dayNames[wd]} ${d}`;
  };
  return (
    <section className="forecast" aria-labelledby="fx-title">
      <div className="forecast__head">
        <h2 id="fx-title">{t.title}</h2>
        <p className="muted">{t.help}</p>
      </div>
      {state === "loading" && (
        <ol className="forecast__days" aria-busy="true">
          {Array.from({ length: 7 }, (_, i) => (
            <li key={i} className="forecast__day forecast__day--sk" />
          ))}
        </ol>
      )}
      {state === "error" && <p className="envx__state static is-error">{t.failed}</p>}
      {state === "ok" && f && (
        <>
          <ol className="forecast__days">
            {f.days.map((d, i) => (
              <li key={d.date} className={`forecast__day${d.date === todayIso ? " is-today" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="forecast__name">{label(d.date)}</span>
                <svg viewBox="0 0 32 32" width="40" height="40" className="forecast__icon" aria-hidden="true">
                  {ICON[sky(d.code)]}
                </svg>
                <span className="forecast__temp">
                  <span title={t.max}>{d.tmax !== null ? `${Math.round(d.tmax)}°` : "–"}</span>
                  <span className="muted" title={t.min}>
                    {d.tmin !== null ? `${Math.round(d.tmin)}°` : "–"}
                  </span>
                </span>
                <span className="forecast__bar" aria-hidden="true">
                  <i style={{ height: `${Math.max(3, ((d.rain ?? 0) / maxRain) * 100)}%` }} />
                </span>
                <span className="forecast__rain">
                  {d.rain !== null ? `${d.rain.toFixed(1)} mm` : "–"}
                  {d.chance !== null && <span className="muted"> · {Math.round(d.chance)}%</span>}
                </span>
                <span className="sr-only">
                  {t.rain} {d.rain ?? "–"} mm, {t.chance} {d.chance ?? "–"}%, {t.max} {d.tmax ?? "–"}°, {t.min} {d.tmin ?? "–"}°
                </span>
              </li>
            ))}
          </ol>
          <p className="small muted forecast__src">
            {fetchedOld && (
              <>
                {t.savedAt} {new Date(f.fetched).toLocaleString(lang === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.{" "}
              </>
            )}
            {t.source}{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              open-meteo.com
            </a>
          </p>
        </>
      )}
    </section>
  );
}
