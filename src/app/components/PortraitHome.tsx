import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Bell, Settings } from "lucide-react";
import { NewsTicker } from "./NewsTicker";
import { ApiImage } from "./ApiImage";
import { Pressable } from "./SpotlightHomescreen";
import { PatientGreeting } from "./PatientGreeting";
import { ServicesGrid, ShortcutsColumn, type SectionVisibility } from "./ServicesGrid";
import { useTheme, CompactRadii, WEIGHT, SHADOW, SPACE, TEXT_STYLE, WEATHER_TINT } from "./ThemeContext";
import { useLocale } from "./i18n";
import { localizeDigits } from "../utils/prayerUtils";
import { useLongPress } from "../lib/useLongPress";
import { ConnectionStatus } from "./ConnectionStatus";
import { useCurrentWeather, WEATHER_GLYPH } from "../lib/weather";

/**
 * Layout 1 in portrait. The same cards as landscape, in the same groups,
 * stacked down the screen instead of across it:
 *
 *   Top     logo, connection status, clock and date, weather, bell,
 *           settings (prayer times and languages live there).
 *   Then    greeting and CareMe side by side (stacked on phones).
 *   Then    the 4×2 apps and the service cards — landscape's centre column.
 *   Bottom  the shortcuts in one row with Feedback at its end — landscape's
 *           right rail laid down.
 *
 * The weights stay as landscape's: greeting/CareMe and the apps are the two
 * big blocks; services, shortcuts and Feedback are the lighter strips.
 *
 * Nothing is restyled for portrait — every card is the landscape component.
 */

interface PortraitHomeProps {
  width: number;
  height: number;
  visibility: SectionVisibility;
  onOpenCategory: (key: string) => void;
  onLaunchTool: (id: string) => void;
  /** Long-press lock on a shortcut needs a PIN first: opens My Account. */
  onRequestPinSetup: () => void;
  /** "Continue as Guest": the greeting and CareMe show their guest forms. */
  guestSession: boolean;
  /** The CareMe card exactly as landscape shows it (full, PIN-locked or guest). */
  careMeCard: ReactNode;
  onOpenAboutUs: () => void;
  showAboutUs: boolean;
  onOpenTour: () => void;
  onImageTap?: (url: string, images: string[], index: number, origin?: { x: number; y: number }) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenWeather: () => void;
  onOpenSurvey: () => void;
  onDhuhrTap: () => void;
  unreadCount: number;
  tickerPaused?: boolean;
}

export default function PortraitHome({
  width,
  height,
  visibility,
  onOpenCategory,
  onLaunchTool,
  onRequestPinSetup,
  guestSession,
  careMeCard,
  onOpenAboutUs,
  showAboutUs,
  onOpenTour,
  onImageTap,
  onOpenSettings,
  onOpenNotifications,
  onOpenWeather,
  onOpenSurvey,
  onDhuhrTap,
  unreadCount,
  tickerPaused,
}: PortraitHomeProps) {
  const { theme, locale } = useTheme();
  const { t, fontFamily } = useLocale();
  const compact = width < 700;
  /* The 1080×1920 bedside screen has far more height than the summary card
     needs, so there CareMe shows in full — the same card as landscape. */
  const roomy = !compact && height >= 1600;
  const pad = compact ? SPACE[2] : SPACE[4];
  const gap = compact ? SPACE[2] : SPACE[3];

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    // The clock shows HH:MM — poll each second, re-render only when the minute turns.
    const id = setInterval(() => {
      const d = new Date();
      setNow((prev) => (prev.getMinutes() !== d.getMinutes() || prev.getHours() !== d.getHours() ? d : prev));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const weather = useCurrentWeather(theme.location || "Jeddah");

  const [lockMenu, setLockMenu] = useState<string | null>(null);

  const roundButton = (pressed: boolean): CSSProperties => ({
    width: theme.touchTargetMin,
    height: theme.touchTargetMin,
    borderRadius: "50%",
    backgroundColor: pressed ? theme.primary : theme.primarySubtle,
    color: pressed ? theme.textInverse : theme.primaryOn,
  });

  const grid = {
    onOpenCategory,
    onLaunchTool,
    visibility,
    onRequestPinSetup,
    lockMenu,
    onLockMenuChange: setLockMenu,
    guestMode: guestSession,
    onOpenSurvey,
    compact,
  };

  const Radii = compact ? CompactRadii : Fragment;

  /* Connection status: by the logo, as landscape (beside it; under it on
     phones, which have no room beside). Fakeeh keeps it under the clock —
     landscape's rule. */
  const connUnderClock = theme.id === "dsfh";
  const dateStr = now.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", compact
    ? { weekday: "short", month: "short", day: "numeric" }
    : { weekday: "long", month: "short", day: "numeric" });

  const WeatherGlyph = weather ? WEATHER_GLYPH[weather.kind] : null;
  /* Demo: holding the clock opens the hospital configurator — portrait's
     stand-in for landscape's Dhuhr tile, which has no place here. */
  const clockHold = useLongPress(onDhuhrTap, 1500);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: theme.gradientCanvas, fontFamily }}>
      {/* ── Header ── */}
      <div className="shrink-0 relative" style={{ backgroundColor: theme.surface, boxShadow: SHADOW.lg, padding: `${compact ? SPACE[1] : SPACE[2]} ${pad}`, zIndex: 2 }}>
        <div className="flex items-center" style={{ gap: compact ? SPACE[1] : SPACE[2] }}>
          <div className={compact ? "flex flex-col items-start min-w-0" : "flex items-center min-w-0"} style={{ gap: compact ? 4 : SPACE[2] }}>
            <ApiImage
              alt={theme.hospitalName}
              src={theme.logoUrl}
              style={{ height: compact ? SPACE[6] : SPACE[10], width: "auto", maxWidth: compact ? "160px" : "300px", objectFit: "contain" }}
            />
            {!connUnderClock && <ConnectionStatus />}
          </div>
          <div className="flex-1" />
          {/* Clock and date — as landscape's top bar (Fakeeh: status under them). */}
          <div data-tour="controls" className="flex items-center shrink-0" style={{ gap: compact ? SPACE[1] : SPACE[2] }}>
          <div className="flex flex-col items-end shrink-0 select-none" style={{ marginInlineEnd: compact ? 0 : SPACE[1] }} {...clockHold.handlers}>
            <span className="flex items-baseline" style={{ gap: 4 }}>
              <span style={{ ...(compact ? TEXT_STYLE.bodyEmphasis : TEXT_STYLE.pageTitle), color: theme.textHeading, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {localizeDigits(`${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")}`, locale)}
              </span>
              <span style={{ ...TEXT_STYLE.caption, color: theme.textMuted, lineHeight: 1 }}>
                {now.getHours() >= 12 ? t("topbar.pm") : t("topbar.am")}
              </span>
            </span>
            <span style={{ ...TEXT_STYLE.caption, fontWeight: WEIGHT.normal, color: theme.textMuted, lineHeight: "16px", whiteSpace: "nowrap" }}>
              {dateStr}
            </span>
            {connUnderClock && <div style={{ marginTop: 2 }}><ConnectionStatus /></div>}
          </div>
          {weather && WeatherGlyph && (
            <Pressable
              onClick={onOpenWeather}
              className="flex items-center shrink-0"
              style={(p) => ({
                height: theme.touchTargetMin,
                padding: `0 ${compact ? "10px" : SPACE[2]}`,
                gap: compact ? 6 : SPACE[1],
                borderRadius: theme.radiusFull,
                backgroundColor: p ? theme.primarySubtle : WEATHER_TINT[weather.kind].tint,
              })}
            >
              {() => (
                <>
                  <WeatherGlyph size={compact ? 20 : 22} strokeWidth={1.8} style={{ color: WEATHER_TINT[weather.kind].icon }} />
                  <span style={{ ...TEXT_STYLE.bodyEmphasis, color: theme.textHeading }}>{weather.temp}°C</span>
                </>
              )}
            </Pressable>
          )}
          <Pressable onClick={onOpenNotifications} className="flex items-center justify-center shrink-0" style={(p) => ({ ...roundButton(p), overflow: "visible" })}>
            {() => (
              <>
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span
                    className="absolute flex items-center justify-center"
                    style={{ top: -2, insetInlineEnd: -2, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10, backgroundColor: theme.error, color: theme.textInverse, fontSize: 11, fontWeight: WEIGHT.bold }}
                  >
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </Pressable>
          {/* Settings holds prayer times and the language list — the list,
              not tabs, so a hospital with five or six languages still fits. */}
          <Pressable onClick={onOpenSettings} className="flex items-center justify-center shrink-0" style={roundButton}>
            {() => <Settings size={22} />}
          </Pressable>
          </div>
        </div>
      </div>

      <div data-tour="ticker" className="shrink-0"><NewsTicker paused={tickerPaused} /></div>

      {/* ── Body ── (phones: the same cards on a smaller radius scale) */}
      <Radii>
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden" style={{ padding: pad, gap }}>
        {/* Greeting and CareMe — the same two cards as landscape's left
            column, side by side (stacked on phones). */}
        <div
          className={`shrink-0 flex ${compact ? "flex-col" : "flex-row"}`}
          style={{ gap, height: compact ? undefined : roomy ? 560 : 380 }}
        >
          <div data-tour="greeting" className="flex-1 min-w-0 min-h-0 flex flex-col" style={compact ? { flex: "0 0 auto", height: 380 } : undefined}>
            <PatientGreeting
              guest={guestSession}
              onOpenAboutUs={onOpenAboutUs}
              onOpenTour={onOpenTour}
              fillImage
              showAboutUs={showAboutUs}
              onImageTap={onImageTap}
            />
          </div>
          <div data-tour="careme" className="flex-1 min-w-0 min-h-0 flex flex-col" style={compact ? { flex: "0 0 auto", height: 400 } : undefined}>
            {careMeCard}
          </div>
        </div>

        {/* Engagement — landscape's centre column as it is: the 4×2 apps and
            the four service cards under them. Like landscape, it is the
            largest block on the screen (on the bedside screen it takes all
            the spare height). */}
        <div
          className="flex flex-col"
          style={roomy ? { flex: "1 1 0", minHeight: 700 } : { flex: "0 0 auto", height: compact ? 400 : 560 }}
        >
          <ServicesGrid {...grid} />
        </div>

        {/* Landscape's right rail laid down: the shortcuts in one row, with
            Feedback at its end — on the same four columns as the cards above,
            so Feedback lines up with Call (the grid's own gap: 12 / 24). */}
        <div
          className="shrink-0 grid grid-cols-4"
          style={{
            gap: compact ? 12 : 24,
            height: roomy ? 160 : compact ? 104 : 124,
          }}
        >
          <div data-tour="shortcuts" className="col-span-3 flex flex-col min-w-0 min-h-0">
            <ShortcutsColumn
              portrait={{ part: "shortcuts", iconSize: roomy ? 64 : compact ? 40 : 48, small: compact, maxTiles: compact ? 3 : 4, moreColumns: compact ? 2 : 4 }}
              onOpenSurvey={onOpenSurvey}
              onLaunchTool={onLaunchTool}
              onRequestPinSetup={onRequestPinSetup}
              guestMode={guestSession}
            />
          </div>
          <div data-tour="survey" className="min-w-0 min-h-0">
            <ShortcutsColumn
              portrait={{ part: "feedback", compact: !roomy, small: compact }}
              onOpenSurvey={onOpenSurvey}
              onLaunchTool={onLaunchTool}
              onRequestPinSetup={onRequestPinSetup}
              guestMode={guestSession}
            />
          </div>
        </div>
      </div>
      </Radii>

    </div>
  );
}
