import { useEffect, useMemo, useState } from "react";
import { ApiImage } from "./ApiImage";
import { Settings, Globe, Bell, Cast, AlertTriangle, Moon, Sun, Cloud, CloudSun, CloudMoon,
         CloudDrizzle, CloudRain, CloudLightning, CloudSnow, CloudFog, Haze, Wind } from "lucide-react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW, TEXT_STYLE, SPACE, WEATHER_TINT } from "./ThemeContext";
import { useLocale } from "./i18n";
import { getPrayerTimes, PRAYER_KEYS, PRAYER_NAMES, formatPrayerTime, getPrayerStatus } from "../utils/prayerUtils";
import { Prayer } from "adhan";
import { ConnectionStatus } from "./ConnectionStatus";
import { useLongPress } from "../lib/useLongPress";
import { useNurseStore, nurseActions } from "./NurseDataStore";
import { fetchPatientForDevice } from "../lib/hospitalApi";
import { getDeviceInfo } from "../utils/androidBridge";
import { AdminGate, useAdminGateTap } from "./AdminGate";

// Removed hardcoded prayerTimes

// Removed getNextPrayerIndex helper as we use prayerUtils now

/* ── WEATHER ICON ──────────────────────────────────────────────────────────
 * The pill used to be a sun in every weather. OpenWeatherMap already tells us
 * what the sky is doing, so this reads its condition code and picks the glyph
 * and the colour to match — see WEATHER_TINT in ThemeContext.
 *
 * Codes: https://openweathermap.org/weather-conditions. The API's own icon
 * string ends in "d" or "n", which is how we know it is night there — the
 * kiosk's clock can't tell us, the hospital's city might be elsewhere. */
type WeatherKind = keyof typeof WEATHER_TINT;

const WEATHER_GLYPH: Record<WeatherKind, typeof Sun> = {
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

function weatherKind(code: number, isNight: boolean): WeatherKind {
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

/* ── WEATHER_DEMO ──────────────────────────────────────────────────────────
 * Jeddah is clear most days, so the other eleven skies would never show up in
 * a demo. Two URL switches stand in for the weather:
 *
 *   ?weather=demo   cycle all twelve, ~2.2s each, name shown beside the temp
 *   ?weather=rain   hold one sky (any key of WEATHER_TINT)
 *
 * Either one only overrides the icon and the tint — the temperature stays the
 * real reading. Drop the query string and the pill goes back to the live sky.
 * Nothing persists, so a demo can't be left switched on by accident. */
const WEATHER_KINDS = Object.keys(WEATHER_TINT) as WeatherKind[];

function WeatherIcon({ kind }: { kind: WeatherKind }) {
  const Glyph = WEATHER_GLYPH[kind];
  return <Glyph size={22} strokeWidth={1.8} style={{ color: WEATHER_TINT[kind].icon, flexShrink: 0 }} />;
}

/* ── CONNECTION_INDICATORS ─────────────────────────────────────────────────
 * The "● Connected" line under the hospital logo and the red warning triangle
 * beside the clock. Both are hidden for now at the ward's request — on a demo
 * screen they read as something being wrong with the kiosk rather than as
 * status. The components, their wiring and their strings are all still here
 * and still compile; this flag is the whole of the removal.
 *
 * Ask for "the connection indicators" and this goes back to true.
 * Hidden 20 Sep 2026. */
const SHOW_CONNECTION_INDICATORS = false;

export function TopBar({ showPrayer = true, onFajrTap, onDhuhrTap, onAsrTap, onMaghribTap, onIshaTap, onWeatherTap, onSettingsTap, onBellTap, unreadCount = 3, logoUrl, hideSettings = false, greeting }: { showPrayer?: boolean; onFajrTap?: () => void; onDhuhrTap?: () => void; onAsrTap?: () => void; onMaghribTap?: () => void; onIshaTap?: () => void; onWeatherTap?: () => void; onSettingsTap?: () => void; onBellTap?: () => void; unreadCount?: number; logoUrl?: string; hideSettings?: boolean; greeting?: string }) {
  const { theme, castDevice, setLocale, locale: currentLocale, darkMode, setDarkMode } = useTheme();
  const { t, locale, isRTL, fontFamily } = useLocale();
  const [time, setTime] = useState(new Date());
  const [prayerData, setPrayerData] = useState(() => getPrayerStatus(new Date()));
  const [temperature, setTemperature] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherKind>("clearDay");

  const nurseStore = useNurseStore();
  const [showConnDetails, setShowConnDetails] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  const handleRetryConnection = () => {
    setRetryLoading(true);
    const info = getDeviceInfo();
    const serial = info?.serial || "";
    if (serial) {
      fetchPatientForDevice(serial)
        .then((result) => {
          if (result) {
            const p = result.patient;
            nurseActions.updatePatientFromApi({
              name: p.name || undefined,
              nameAr: p.nameAr || undefined,
              mrn: p.mrn || undefined,
              room: p.room || undefined,
              bed: p.bed || undefined,
              sex: p.sex || undefined,
              dob: p.dob || undefined,
              admissionDate: p.admissionDate || undefined,
              dischargeDate: p.dischargeDate || undefined,
            });
            nurseActions.setHisConnected(true);
            setShowConnDetails(false);
          }
        })
        .finally(() => setRetryLoading(false));
    } else {
      setRetryLoading(false);
    }
  };

  const weatherDemo = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get("weather");
    if (!p) return null;
    if (p === "demo") return "cycle" as const;
    return (WEATHER_KINDS as string[]).includes(p) ? (p as WeatherKind) : null;
  }, []);

  useEffect(() => {
    if (!weatherDemo) return;
    if (weatherDemo !== "cycle") {
      setWeather(weatherDemo);
      return;
    }
    let i = 0;
    setWeather(WEATHER_KINDS[0]);
    const id = setInterval(() => {
      i = (i + 1) % WEATHER_KINDS.length;
      setWeather(WEATHER_KINDS[i]);
    }, 2200);
    return () => clearInterval(id);
  }, [weatherDemo]);

  const weatherLongPress = useLongPress(() => {
    window.location.reload();
  }, 1000);

  // Hidden admin gate: tap anywhere on the top bar 4x within 2s.
  const adminGate = useAdminGateTap();

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const city = theme.location || "Jeddah";
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=01a477912e47daf2010808cc62015829`
        );
        const data = await response.json();
        if (data.main && data.main.temp !== undefined) {
          setTemperature(Math.round(data.main.temp));
        }
        const sky = data.weather?.[0];
        if (!weatherDemo && sky && typeof sky.id === "number") {
          setWeather(weatherKind(sky.id, typeof sky.icon === "string" && sky.icon.endsWith("n")));
        }
      } catch (error) {
        console.error("Weather fetch error:", error);
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, [theme.location, weatherDemo]);


  useEffect(() => {
    // Display only shows HH:MM (see `displayHours`/`minutes` below), so
    // there's no need to trigger a React re-render every second — that was
    // forcing a full repaint of the whole top bar (logo, connection status,
    // 5 prayer cells) 60x more often than the visible output ever changes,
    // which is enough to blow the tile-raster budget on low-end kiosk
    // hardware. Still poll every second (cheap, no re-render), but only
    // commit state — and only recompute prayer status — when the minute
    // actually rolls over.
    const interval = setInterval(() => {
      const now = new Date();
      setTime((prev) =>
        prev.getMinutes() !== now.getMinutes() || prev.getHours() !== now.getHours()
          ? now
          : prev
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPrayerData(getPrayerStatus(time, theme.location));
  }, [time, theme.location]);



  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? t("topbar.pm") : t("topbar.am");
  const displayHours = hours % 12 || 12;

  const dateStr = time.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="grid shrink-0 w-full items-center"
      onClickCapture={adminGate.registerTap}
      style={{
        height: "104px",
        backgroundColor: theme.surface,
        padding: `${SPACE[2]} ${SPACE[4]}`,
        boxShadow: SHADOW.lg,
        borderBottom: theme.cardBorder !== "none" ? theme.cardBorder : undefined,
        gridTemplateColumns: "1fr auto 1fr",
      }}
    >
      <AdminGate open={adminGate.armed} onClose={() => adminGate.setArmed(false)} />

      {/* Left: Logo — always left-aligned within its column */}
      <div className="flex items-center gap-4 h-full">
        <a 
          href={theme.id === "imc" ? `https://www.imc.med.sa/${locale}` : theme.hospitalWebsiteUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-start h-full transition-opacity hover:opacity-80 active:opacity-60"
        >
          <ApiImage
            alt={theme.hospitalName}
            src={logoUrl || theme.logoUrl}
            style={{ height: SPACE[10], width: "auto", maxWidth: "300px", objectFit: "contain" }}
          />
        </a>
        {SHOW_CONNECTION_INDICATORS && <ConnectionStatus />}
      </div>

      {/* Center: Prayer Times — always dead-center on screen */}
      {showPrayer ? (
        <div className="flex items-center justify-center gap-1">
          {PRAYER_KEYS.map((pKey) => {
            const isNext = pKey === prayerData.next;
            const prayerName = t(PRAYER_NAMES[pKey]);
            const prayerTime = formatPrayerTime(prayerData.times.timeForPrayer(pKey), locale);
            
            let onTap = undefined;
            if (pKey === Prayer.Fajr) onTap = onFajrTap;
            else if (pKey === Prayer.Dhuhr) onTap = onDhuhrTap;
            else if (pKey === Prayer.Asr) onTap = onAsrTap;
            else if (pKey === Prayer.Maghrib) onTap = onMaghribTap;
            else if (pKey === Prayer.Isha) onTap = onIshaTap;

            return (
              <div key={pKey} className="flex items-center">
                <div
                  className={`flex flex-col items-center px-4 py-1.5 rounded-xl${onTap ? " cursor-pointer" : ""}`}
                  style={{ backgroundColor: "transparent" }}
                  onClick={onTap}
                >
                  <span
                    style={{
                      fontFamily: fontFamily,
                      ...TEXT_STYLE.micro,
                      letterSpacing: isRTL ? "0px" : "0.5px",
                      color: isNext ? theme.accentOn : theme.textMuted,
                      lineHeight: "15px",
                    }}
                  >
                    {prayerName}
                  </span>
                  <span
                    style={{
                      fontFamily: fontFamily,
                      ...TEXT_STYLE.bodyEmphasis,
                      fontWeight: WEIGHT.bold,
                      color: isNext ? theme.accentOn : theme.textHeading,
                      lineHeight: "20px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {prayerTime}
                  </span>
                </div>
                {pKey !== PRAYER_KEYS[PRAYER_KEYS.length - 1] && (
                  <div style={{ width: "1px", height: "26px", backgroundColor: "rgba(0,0,0,0.12)", borderRadius: "1px", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div />
      )}

      {/* Right: Clock/Date + Weather + Lang + Settings — always right-aligned */}
      <div className="flex items-center justify-end gap-4">
        {/* Optional friendly greeting (kids layout) — renders only when provided */}
        {greeting && (
          <span
            style={{
              fontFamily: fontFamily,
              ...TEXT_STYLE.bodyEmphasis,
              fontWeight: WEIGHT.bold,
              color: theme.textHeading,
              whiteSpace: "nowrap",
            }}
          >
            {greeting}
          </span>
        )}

        {/* Clock + Date stacked (with connection warning icon beside clock) */}
        <div className="relative flex items-center gap-2.5">
          {SHOW_CONNECTION_INDICATORS && (!nurseStore.isHisConnected || nurseStore.isLocalFallback) && (
            <div className="relative">
              <button
                onClick={() => setShowConnDetails(!showConnDetails)}
                className="flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: nurseStore.isLocalFallback
                    ? "rgba(245, 158, 11, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                  border: nurseStore.isLocalFallback
                    ? "1px solid rgba(245, 158, 11, 0.3)"
                    : "1px solid rgba(239, 68, 68, 0.3)",
                  color: nurseStore.isLocalFallback ? "#F59E0B" : "#EF4444",
                }}
                title={
                  nurseStore.isLocalFallback
                    ? t("connection.localNotReachable")
                    : t("connection.failed")
                }
                aria-label={
                  nurseStore.isLocalFallback
                    ? t("connection.localNotReachable")
                    : t("connection.failed")
                }
              >
                <AlertTriangle size={17} className="animate-pulse" />
              </button>

              {showConnDetails && (
                <div
                  className="absolute right-0 top-full mt-2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-left"
                  style={{
                    backgroundColor: nurseStore.isLocalFallback
                      ? "rgba(217, 119, 6, 0.95)"
                      : "rgba(239, 68, 68, 0.95)",
                    color: "#fff",
                    borderColor: "rgba(255, 255, 255, 0.25)",
                    backdropFilter: "blur(12px)",
                    minWidth: "280px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <AlertTriangle size={18} className="shrink-0 animate-pulse" />
                  <div className="flex flex-col text-xs flex-1">
                    <span className="font-bold">
                      {nurseStore.isLocalFallback
                        ? t("connection.localNotReachable")
                        : t("connection.failed")}
                    </span>
                    {!nurseStore.isLocalFallback && (
                      <span className="opacity-90">{t("connection.showingDemo")}</span>
                    )}
                  </div>
                  <button
                    onClick={handleRetryConnection}
                    disabled={retryLoading}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {retryLoading ? "..." : t("connection.retry")}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-end">
            <span
              style={{
                fontFamily: fontFamily,
                ...TEXT_STYLE.pageTitle,
                color: theme.textHeading,
                lineHeight: "25px",
                textAlign: "end",
              }}
            >
              {displayHours}:{minutes} {ampm}
            </span>
            <span
              style={{
                fontFamily: fontFamily,
                ...TEXT_STYLE.caption,
                fontWeight: WEIGHT.normal,
                color: theme.textMuted,
                lineHeight: "16px",
                textAlign: "end",
              }}
            >
              {dateStr}
            </span>
          </div>
        </div>

        {/* Weather */}
        <div
          data-nav="true"
          tabIndex={0}
          className="flex items-center gap-2 cursor-pointer rounded-full"
          style={{
            backgroundColor: WEATHER_TINT[weather].tint,
            height: theme.touchTargetMin,
            padding: `0 ${SPACE[2]}`,
            transition: "background-color 600ms ease",
          }}
          {...weatherLongPress.handlers}
          onClick={() => weatherLongPress.handleClick(onWeatherTap || (() => {}))}
        >
          <WeatherIcon kind={weather} />
          <span
            style={{
              fontFamily: fontFamily,
              ...TEXT_STYLE.bodyEmphasis,
              color: theme.textHeading,
            }}
          >
            {temperature !== null ? `${temperature}°C` : "38°C"}

          </span>
          {weatherDemo && (
            <span
              style={{
                fontFamily: fontFamily,
                ...TEXT_STYLE.micro,
                color: WEATHER_TINT[weather].icon,
                opacity: 0.85,
              }}
            >
              {weather}
            </span>
          )}
        </div>

        {/* Lang */}
        <div className="relative">
          <button
            data-nav="true"
            onClick={() => {
              if (currentLocale === "en") setLocale("ar");
              else setLocale("en");
            }}
            className="rounded-full cursor-pointer flex items-center justify-center transition-transform active:scale-90"
            style={{ 
              backgroundColor: theme.primarySubtle, 
              width: theme.touchTargetMin, 
              height: theme.touchTargetMin,
              outline: 'none',
              border: 'none',
            }}
            aria-label="Language"
          >
            <Globe size={20} style={{ color: theme.primaryOn }} />
          </button>
        </div>

        {/* Dark mode — beside the language switch, the same pairing the
            internal screens use: what the screen says, then how it looks.
            It was reachable only from Settings, two taps away from the one
            place a patient actually notices the room is dark. */}
        <div className="relative">
          <button
            data-nav="true"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full cursor-pointer flex items-center justify-center transition-transform active:scale-90"
            style={{
              backgroundColor: theme.primarySubtle,
              width: theme.touchTargetMin,
              height: theme.touchTargetMin,
              outline: 'none',
              border: 'none',
            }}
            aria-label={darkMode ? "Light mode" : "Dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode
              ? <Sun size={20} style={{ color: theme.primaryOn }} />
              : <Moon size={20} style={{ color: theme.primaryOn }} />}
          </button>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            data-nav="true"
            className="rounded-full cursor-pointer flex items-center justify-center transition-transform active:scale-90"
            style={{ 
              backgroundColor: theme.primarySubtle, 
              width: theme.touchTargetMin, 
              height: theme.touchTargetMin,
              outline: 'none',
              border: 'none',
            }}
            aria-label="Notifications"
            onClick={onBellTap}
          >
            <Bell size={20} style={{ color: theme.primaryOn }} />
            {unreadCount > 0 && (
              <div
                className="absolute flex items-center justify-center"
                style={{
                  top: "-2px",
                  right: "-2px",
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: theme.radiusFull,
                  backgroundColor: "#D10044",
                  border: `2px solid ${theme.surface}`,
                  padding: "0 4px",
                }}
              >
                <span
                  style={{
                    fontFamily: theme.fontFamily,
                    ...TEXT_STYLE.micro,
                    fontWeight: WEIGHT.bold,
                    color: theme.textInverse,
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Cast indicator — pulsing when actively casting */}
        {castDevice && (
          <button
            data-nav="true"
            className="rounded-full cursor-pointer flex items-center justify-center relative"
            style={{
              backgroundColor: theme.primarySubtle,
              width: theme.touchTargetMin,
              height: theme.touchTargetMin,
              animation: "castPulse 2s ease-in-out infinite",
            }}
            aria-label="Casting"
            onClick={onSettingsTap}
          >
            <Cast size={20} style={{ color: theme.primaryOn }} />
            {/* Active dot */}
            <div
              className="absolute"
              style={{
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: theme.primary,
                border: `2px solid ${theme.surface}`,
              }}
            />
          </button>
        )}

        {/* Settings — hidden in the kids layout (hideSettings) */}
        {!hideSettings && (
          <div className="relative">
            <button
              data-nav="true"
              className="rounded-full cursor-pointer flex items-center justify-center transition-transform active:scale-90"
              style={{
                backgroundColor: theme.primarySubtle,
                width: theme.touchTargetMin,
                height: theme.touchTargetMin,
                outline: 'none',
                border: 'none',
              }}
              aria-label="Settings"
              onClick={onSettingsTap}
            >
              <Settings size={20} style={{ color: theme.primaryOn }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}