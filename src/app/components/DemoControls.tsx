import { useEffect, useState } from "react";
import { Globe, Moon, Sun, Maximize, Minimize } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { type Locale } from "./i18n";

/**
 * DemoControls — language, dark mode and fullscreen, on any internal screen.
 *
 * These three are what a demo is driven with, and they used to live only in
 * the Settings panel (fullscreen) or on one screen (the meal-ordering globe).
 * Reaching Settings to switch language mid-demo means leaving the screen you
 * are showing, so the trio travels with the screen instead.
 *
 * Styled for the translucent dark headers the internal pages use, which is
 * also what the meal-ordering top bar wears — one look, one component.
 */

/* Two languages, one tap. The switch is a toggle everywhere in the system —
   the home top bar has always worked this way — so it flips between English
   and Arabic and never lands the demo in a third language nobody asked for.
   Urdu is still chosen deliberately, from Settings. */
const LOCALE_NAME: Record<Locale, string> = { en: "English", ar: "العربية", ur: "اردو" };

export function DemoControls({
  compact = false,
  variant = "onBrand",
}: {
  compact?: boolean;
  /** "onBrand" for the translucent dark headers, "onSurface" for the light
   *  toolbars the browser and the TV channel list use — the same three
   *  buttons either way, only the skin changes. */
  variant?: "onBrand" | "onSurface";
}) {
  const { theme, locale, setLocale, darkMode, setDarkMode } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement,
  );

  /* The browser can leave fullscreen without us — Escape, or the OS — so the
     icon follows the document rather than our own last click. */
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        /* Never throws into the UI: the kiosk browser and some desktop
           browsers refuse this outside a user gesture or in an iframe, and a
           demo control must not take the screen down with it. */
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    } catch {
      /* Nothing to do — the button simply does not apply here. */
    }
  };

  const size = compact ? 38 : 44;
  const glyph = compact ? 18 : 20;
  const onBrand = variant === "onBrand";
  const btn: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "12px",
    backgroundColor: onBrand ? "rgba(255,255,255,0.12)" : theme.surfaceInset,
    border: `1px solid ${onBrand ? "rgba(255,255,255,0.15)" : theme.borderCardColor}`,
    color: onBrand ? "#fff" : theme.textHeading,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };

  const next: Locale = locale === "en" ? "ar" : "en";

  return (
    <div className="flex items-center gap-2 shrink-0" dir="ltr" data-demo-controls>
      <button
        onClick={() => setLocale(next)}
        title={`Switch to ${LOCALE_NAME[next]}`}
        aria-label={`Switch to ${LOCALE_NAME[next]}`}
        className="cursor-pointer active:scale-95 transition-transform"
        style={btn}
      >
        <Globe size={glyph} />
      </button>

      <button
        onClick={() => setDarkMode(!darkMode)}
        title={darkMode ? "Light mode" : "Dark mode"}
        aria-label={darkMode ? "Light mode" : "Dark mode"}
        className="cursor-pointer active:scale-95 transition-transform"
        style={btn}
      >
        {darkMode ? <Sun size={glyph} /> : <Moon size={glyph} />}
      </button>

      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="cursor-pointer active:scale-95 transition-transform"
        style={btn}
      >
        {isFullscreen ? <Minimize size={glyph} /> : <Maximize size={glyph} />}
      </button>
    </div>
  );
}
