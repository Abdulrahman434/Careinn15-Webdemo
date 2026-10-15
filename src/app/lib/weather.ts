import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudDrizzle, CloudRain,
  CloudLightning, CloudSnow, CloudFog, Haze, Wind,
} from "lucide-react";
import { WEATHER_TINT } from "../components/ThemeContext";

/* ── Weather, shared by the top-bar pill and the weather panel ─────────────
 * OpenWeatherMap's condition code picks the glyph and the tint (WEATHER_TINT
 * in ThemeContext). The API's own icon string ends in "d" or "n", which is
 * how we know it is night *there* — the kiosk's clock can't tell us.
 * Codes: https://openweathermap.org/weather-conditions */

export type WeatherKind = keyof typeof WEATHER_TINT;

export const WEATHER_GLYPH: Record<WeatherKind, typeof Sun> = {
  clearDay: Sun,
  clearNight: Moon,
  partlyDay: CloudSun,
  partlyNight: CloudMoon,
  cloudy: Cloud,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  thunder: CloudLightning,
  snow: CloudSnow,
  fog: CloudFog,
  dust: Haze,
  wind: Wind,
};

export function weatherKind(code: number, isNight: boolean): WeatherKind {
  if (code >= 200 && code < 300) return "thunder";
  if (code >= 300 && code < 400) return "drizzle";
  if (code >= 500 && code < 600) return code === 511 ? "snow" : "rain";
  if (code >= 600 && code < 700) return "snow";
  if (code === 731 || code === 751 || code === 761 || code === 762) return "dust";
  if (code === 771 || code === 781) return "wind";
  if (code >= 700 && code < 800) return "fog";
  if (code === 800) return isNight ? "clearNight" : "clearDay";
  if (code === 801 || code === 802) return isNight ? "partlyNight" : "partlyDay";
  return "cloudy";
}

const OWM_KEY = "01a477912e47daf2010808cc62015829";
const OWM = "https://api.openweathermap.org/data/2.5";

/* Which cities the weather panel shows. The hospital's own city comes first. */
const PANEL_CITIES: Record<string, string[]> = {
  burjeel: ["Abu Dhabi", "Dubai", "Riyadh"],
  slh: ["Beirut", "Riyadh", "Dubai"],
};
export function panelCitiesFor(hospitalId: string, ownCity: string): string[] {
  if (PANEL_CITIES[hospitalId]) return PANEL_CITIES[hospitalId];
  const own = ownCity && ownCity !== "Saudi Arabia" ? ownCity : "Jeddah";
  return [own, ...["Riyadh", "Jeddah", "Makkah", "Dubai"].filter((c) => c !== own)].slice(0, 3);
}

/* OpenWeatherMap's own spelling where it differs from ours. It answers
   "city not found" for "Makkah" and only knows the city as "Mecca". The
   screen still shows our name; this is only what we ask the API for. */
const OWM_QUERY: Record<string, string> = {
  Makkah: "Mecca,SA",
};

export interface CityWeather {
  city: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windKmh: number;
  kind: WeatherKind;
  /** Next few 3-hourly forecast points, in the city's own local time. */
  hours: { label: string; temp: number; kind: WeatherKind }[];
}

/** Current conditions + the next few forecast points for one city.
 *  Never throws — a failed city comes back as null and the card says so. */
export async function fetchCityWeather(city: string, hourCount = 5): Promise<CityWeather | null> {
  try {
    const q = encodeURIComponent(OWM_QUERY[city] ?? city);
    const [nowRes, fcRes] = await Promise.all([
      fetch(`${OWM}/weather?q=${q}&units=metric&appid=${OWM_KEY}`),
      fetch(`${OWM}/forecast?q=${q}&units=metric&cnt=${hourCount}&appid=${OWM_KEY}`),
    ]);
    const now = await nowRes.json();
    const fc = await fcRes.json();
    if (!now?.main) return null;
    const sky = now.weather?.[0];
    const tz: number = typeof now.timezone === "number" ? now.timezone : 0;
    const hours = Array.isArray(fc?.list)
      ? fc.list.slice(0, hourCount).map((p: any) => {
          // Shift to the city's clock, then read it as UTC so the kiosk's own
          // timezone doesn't leak in.
          const d = new Date((p.dt + tz) * 1000);
          const h = d.getUTCHours();
          const s = p.weather?.[0];
          return {
            label: String(h),
            temp: Math.round(p.main.temp),
            kind: weatherKind(s?.id ?? 800, typeof s?.icon === "string" && s.icon.endsWith("n")),
          };
        })
      : [];
    return {
      city,
      temp: Math.round(now.main.temp),
      feelsLike: Math.round(now.main.feels_like),
      humidity: Math.round(now.main.humidity),
      windKmh: Math.round((now.wind?.speed ?? 0) * 3.6),
      kind: weatherKind(sky?.id ?? 800, typeof sky?.icon === "string" && sky.icon.endsWith("n")),
      hours,
    };
  } catch {
    return null;
  }
}
