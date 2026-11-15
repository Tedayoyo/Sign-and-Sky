// 7-day forecast for the Offa study point from the Open-Meteo forecast API (models of national weather services).
// Real forecasts only: if the service cannot be reached the page says so; nothing is invented.
export const FORECAST_POINT = { lat: 6.75, lon: 37.5 };

export type ForecastDay = { date: string; rain: number | null; chance: number | null; tmax: number | null; tmin: number | null; code: number | null };
export type Forecast = { fetched: string; source: string; days: ForecastDay[] };

const base = () => process.env.OPEN_METEO_FORECAST_URL_TEST_ONLY || "https://api.open-meteo.com/v1/forecast";

export function forecastUrl(lat = FORECAST_POINT.lat, lon = FORECAST_POINT.lon) {
  const u = new URL(base());
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("daily", "precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code");
  u.searchParams.set("timezone", "Africa/Addis_Ababa");
  u.searchParams.set("forecast_days", "7");
  return u.toString();
}

export function parseForecast(j: unknown, fetched = new Date().toISOString()): Forecast {
  const d = (j as { daily?: Record<string, (number | string | null)[]> })?.daily;
  if (!d?.time?.length) throw new Error("no daily forecast");
  const num = (k: string, i: number) => {
    const v = d[k]?.[i];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return {
    fetched,
    source: "Open-Meteo forecast API",
    days: d.time.map((t, i) => ({
      date: String(t),
      rain: num("precipitation_sum", i),
      chance: num("precipitation_probability_max", i),
      tmax: num("temperature_2m_max", i),
      tmin: num("temperature_2m_min", i),
      code: num("weather_code", i),
    })),
  };
}

/** WMO weather code → simple picture. */
export function sky(code: number | null): "sun" | "partly" | "cloud" | "fog" | "rain" | "storm" {
  if (code === null) return "cloud";
  if (code <= 1) return "sun";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  return "rain";
}
