/**
 * /api/environment — real-time atmosphere snapshot around a given point.
 *
 *   GET /api/environment?lat=X&lon=Y
 *
 * Two upstream sources, both free + no API key required:
 *   - Open-Meteo Air Quality:
 *       https://air-quality-api.open-meteo.com/v1/air-quality
 *       fields: current.us_aqi, current.pm2_5, current.pm10
 *   - Open-Meteo Weather:
 *       https://api.open-meteo.com/v1/forecast
 *       fields: current.wind_speed_10m (km/h),
 *               current.wind_direction_10m (deg, met. convention),
 *               current.temperature_2m (°C)
 *
 * Response shape consumed by EnvironmentStats on the dashboard:
 *
 *   {
 *     fetched_at: ISO timestamp,
 *     lat, lon,
 *     aqi: { value: number, label: string },     // null if upstream errored
 *     wind: { speed_kmh, direction_deg, direction_compass } | null,
 *     temperature_c: number | null,
 *   }
 *
 * If either upstream fails (rate limit, network, garbage payload), the
 * corresponding object is null and the dashboard gracefully renders
 * '—' for that card.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WX_URL = "https://api.open-meteo.com/v1/forecast";

// Default location when no lat/lon is provided. Central Jakarta — the
// Scenario A center point.
const DEFAULT_LAT = -6.243;
const DEFAULT_LON = 106.858;

type AqiPayload = { value: number; label: string };
type WindPayload = {
  speed_kmh: number;
  direction_deg: number;
  direction_compass: string;
};

function aqiLabel(value: number): string {
  if (value >= 300) return "Hazardous";
  if (value >= 200) return "Very unhealthy";
  if (value >= 150) return "Unhealthy";
  if (value >= 100) return "Unhealthy for sensitive groups";
  if (value >= 50) return "Moderate";
  return "Good";
}

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
] as const;

function compassFromDegrees(deg: number): string {
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return COMPASS_POINTS[idx];
}

async function fetchAqi(lat: number, lon: number): Promise<AqiPayload | null> {
  try {
    const url = `${AQI_URL}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { us_aqi?: number };
    };
    const value = data.current?.us_aqi;
    if (typeof value !== "number") return null;
    return { value: Math.round(value), label: aqiLabel(value) };
  } catch {
    return null;
  }
}

async function fetchWind(lat: number, lon: number): Promise<{
  wind: WindPayload | null;
  temperatureC: number | null;
}> {
  try {
    const url =
      `${WX_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=wind_speed_10m,wind_direction_10m,temperature_2m` +
      `&wind_speed_unit=kmh`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return { wind: null, temperatureC: null };
    const data = (await res.json()) as {
      current?: {
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        temperature_2m?: number;
      };
    };
    const speed = data.current?.wind_speed_10m;
    const dir = data.current?.wind_direction_10m;
    const temp = data.current?.temperature_2m;
    const wind: WindPayload | null =
      typeof speed === "number" && typeof dir === "number"
        ? {
            speed_kmh: Math.round(speed),
            direction_deg: Math.round(dir),
            direction_compass: compassFromDegrees(dir),
          }
        : null;
    return {
      wind,
      temperatureC: typeof temp === "number" ? Math.round(temp * 10) / 10 : null,
    };
  } catch {
    return { wind: null, temperatureC: null };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const latParam = parseFloat(url.searchParams.get("lat") ?? "");
  const lonParam = parseFloat(url.searchParams.get("lon") ?? "");

  const lat = Number.isFinite(latParam) ? latParam : DEFAULT_LAT;
  const lon = Number.isFinite(lonParam) ? lonParam : DEFAULT_LON;

  const [aqi, weather] = await Promise.all([
    fetchAqi(lat, lon),
    fetchWind(lat, lon),
  ]);

  return NextResponse.json({
    fetched_at: new Date().toISOString(),
    lat,
    lon,
    aqi,
    wind: weather.wind,
    temperature_c: weather.temperatureC,
  });
}
