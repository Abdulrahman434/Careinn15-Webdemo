import { useEffect, useState } from "react";
import { X, CloudSun, Thermometer, Droplets, Wind, MapPin } from "lucide-react";
import { useTheme, TEXT_STYLE, TYPE_SCALE, WEIGHT, SHADOW, WEATHER_TINT } from "./ThemeContext";
import { useLocale } from "./i18n";
import { CityWeather, WEATHER_GLYPH, fetchCityWeather, panelCitiesFor } from "../lib/weather";

/* ═══════════════════════════════════════════════════════════════════════════
 * WeatherPanel — opened by tapping the weather pill in the top bar.
 *
 * Three cities side by side (the hospital's own city first, marked), each a
 * card in the house style: the sky's own tint washes the top, a big glyph and
 * temperature, three readings, and the next few hours in the city's local
 * time. Everything comes from OpenWeatherMap; a city that fails says so
 * instead of showing stale or made-up numbers.
 * ═══════════════════════════════════════════════════════════════════════════ */

const CITY_KEY: Record<string, string> = {
  "Abu Dhabi": "abuDhabi", Dubai: "dubai", Riyadh: "riyadh", Jeddah: "jeddah",
  Makkah: "makkah", Beirut: "beirut",
};

export function WeatherPanel({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily, locale } = useLocale();
  const cities = panelCitiesFor(theme.id, theme.location);
  const [data, setData] = useState<Record<string, CityWeather | null | undefined>>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    let alive = true;
    cities.forEach((c) => {
      fetchCityWeather(c).then((w) => { if (alive) setData((d) => ({ ...d, [c]: w })); });
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { alive = false; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id, theme.location]);

  const bcp47 = locale === "ar" ? "ar" : locale === "ur" ? "ur-PK" : "en-US";
  const hourLabel = (h: string) =>
    new Date(Date.UTC(2000, 0, 1, Number(h))).toLocaleTimeString(bcp47, { hour: "numeric", timeZone: "UTC" });
  const cityName = (c: string) => (CITY_KEY[c] ? t(`weather.city.${CITY_KEY[c]}`) : c);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
      style={{
        backgroundColor: theme.overlay,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 1480,
          backgroundColor: theme.surface,
          borderRadius: theme.radiusXl,
          boxShadow: SHADOW.xl,
          border: theme.cardBorder,
          overflow: "hidden",
          transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
          transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4"
          style={{ padding: "26px 32px", borderBottom: `1px solid ${theme.borderSubtle}` }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 56, height: 56, borderRadius: theme.radiusMd, backgroundColor: theme.primarySubtle }}
          >
            <CloudSun size={28} color={theme.primaryOn} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 style={{ ...TEXT_STYLE.sectionTitle, fontFamily, color: theme.textHeading, margin: 0 }}>
              {t("weather.title")}
            </h2>
            <p style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textMuted, margin: "2px 0 0" }}>
              {t("weather.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("general.close")}
            className="flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
            style={{
              width: 56, height: 56, borderRadius: theme.radiusFull,
              backgroundColor: theme.tileInactiveBg, border: "none", outline: "none",
            }}
          >
            <X size={26} color={theme.textHeading} strokeWidth={2.2} />
          </button>
        </div>

        {/* Cities */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 24, padding: 32 }}>
          {cities.map((c, i) => {
            const w = data[c];
            const isOwn = i === 0;
            const tint = w ? WEATHER_TINT[w.kind] : null;
            const Glyph = w ? WEATHER_GLYPH[w.kind] : null;
            return (
              <div
                key={c}
                className="flex flex-col"
                style={{
                  borderRadius: theme.radiusLg,
                  border: isOwn ? `2px solid ${theme.borderCardSelected}` : `1.5px solid ${theme.borderCardColor}`,
                  overflow: "hidden",
                  backgroundColor: theme.surface,
                }}
              >
                {/* Sky — the condition's own tint washes the top of the card */}
                <div
                  style={{
                    padding: "24px 26px 22px",
                    background: tint
                      ? `linear-gradient(180deg, ${tint.tint} 0%, ${tint.tint} 55%, transparent 100%)`
                      : theme.surfaceInset,
                  }}
                >
                  <div className="flex items-center justify-between gap-3" style={{ minHeight: 34 }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={20} color={theme.primaryOn} strokeWidth={2.2} />
                      <span style={{ ...TEXT_STYLE.cardTitle, fontFamily, color: theme.textHeading }}>
                        {cityName(c)}
                      </span>
                    </div>
                    {isOwn && (
                      <span
                        className="shrink-0"
                        style={{
                          ...TEXT_STYLE.pill,
                          fontFamily,
                          padding: "5px 12px",
                          borderRadius: theme.radiusFull,
                          backgroundColor: theme.primary,
                          color: theme.textInverse,
                        }}
                      >
                        {t("weather.yourCity")}
                      </span>
                    )}
                  </div>

                  {w === undefined ? (
                    <div className="animate-pulse" style={{ height: 150, marginTop: 18, borderRadius: theme.radiusMd, backgroundColor: theme.tileInactiveBg }} />
                  ) : w === null ? (
                    <p style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textMuted, marginTop: 40, minHeight: 110 }}>
                      {t("weather.unavailable")}
                    </p>
                  ) : (
                    <div className="flex items-center gap-5" style={{ marginTop: 18 }}>
                      {Glyph && <Glyph size={84} strokeWidth={1.6} color={tint!.icon} style={{ flexShrink: 0 }} />}
                      <div className="flex flex-col">
                        <span
                          dir="ltr"
                          style={{
                            fontFamily, fontSize: 76, lineHeight: 1, fontWeight: WEIGHT.bold,
                            color: theme.textHeading, letterSpacing: "-1px",
                          }}
                        >
                          {w.temp}°
                        </span>
                        <span style={{ ...TEXT_STYLE.bodyEmphasis, fontFamily, color: theme.textMuted, marginTop: 6 }}>
                          {t(`weather.kind.${w.kind}`)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {w && (
                  <>
                    {/* Readings */}
                    <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "6px 22px 0" }}>
                      {[
                        { Icon: Thermometer, label: t("weather.feelsLike"), value: `${w.feelsLike}°` },
                        { Icon: Droplets, label: t("weather.humidity"), value: `${w.humidity}%` },
                        { Icon: Wind, label: t("weather.wind"), value: `${w.windKmh} ${t("weather.kmh")}` },
                      ].map(({ Icon, label, value }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center text-center"
                          style={{ padding: "14px 6px", borderRadius: theme.radiusMd, backgroundColor: theme.surfaceInset }}
                        >
                          <Icon size={22} color={theme.primaryOn} strokeWidth={2} />
                          <span dir="ltr" style={{ ...TEXT_STYLE.bodyEmphasis, fontFamily, color: theme.textHeading, marginTop: 6 }}>
                            {value}
                          </span>
                          <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted, marginTop: 2 }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Next hours */}
                    <div style={{ padding: "22px 22px 24px", marginTop: "auto" }}>
                      <span
                        style={{
                          fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold, color: theme.textMuted,
                          letterSpacing: "0.6px", textTransform: "uppercase",
                        }}
                      >
                        {t("weather.nextHours")}
                      </span>
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(w.hours.length, 1)}, 1fr)`,
                          marginTop: 10,
                          borderTop: `1px solid ${theme.borderSubtle}`,
                          paddingTop: 12,
                        }}
                      >
                        {w.hours.map((h, k) => {
                          const HG = WEATHER_GLYPH[h.kind];
                          return (
                            <div key={k} className="flex flex-col items-center gap-2">
                              <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted }}>
                                {hourLabel(h.label)}
                              </span>
                              <HG size={26} strokeWidth={1.8} color={WEATHER_TINT[h.kind].icon} />
                              <span dir="ltr" style={{ ...TEXT_STYLE.bodyEmphasis, fontFamily, color: theme.textHeading }}>
                                {h.temp}°
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
