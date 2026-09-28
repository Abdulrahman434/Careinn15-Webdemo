import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useTheme, TEXT_STYLE, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { applyPendingUpdate, checkForUpdate, useUpdateAvailable } from "../lib/updateCheck";

/**
 * The notice that says a newer build is waiting.
 *
 * It sits at the top of the 1920×1080 canvas, not the browser window: pinned
 * to the window it landed in the letterbox beside the app on any screen
 * wider than 16:9, where nobody looks.
 *
 * Refresh takes the update now. Closing it is "not now", not "never" — the
 * update is taken the next time the patient moves to another screen, since
 * that is a moment they have already left what they were looking at. A screen
 * nobody is using takes it when the screensaver comes on.
 */
export function UpdateBanner({ screenKey, idle }: { screenKey: string; idle: boolean }) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const { available, reload } = useUpdateAvailable();
  const [dismissed, setDismissed] = useState(false);

  const lastScreen = useRef(screenKey);
  useEffect(() => {
    if (screenKey === lastScreen.current) return;
    lastScreen.current = screenKey;
    if (dismissed) applyPendingUpdate();
  }, [screenKey, dismissed]);

  /* The screensaver coming on or going off is a moment to ask: on, because
     nobody is watching and a newer build can be taken quietly; off, because
     somebody has just come back to the screen. */
  const wasIdle = useRef(idle);
  useEffect(() => {
    if (idle !== wasIdle.current) checkForUpdate();
    wasIdle.current = idle;
  }, [idle]);

  useEffect(() => {
    if (idle && available) applyPendingUpdate();
  }, [idle, available]);

  if (!available || dismissed) return null;

  return (
    <div
      role="status"
      className="absolute flex items-start"
      style={{
        top: SPACE[3],
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9997,
        gap: SPACE[2],
        padding: SPACE[3],
        borderRadius: theme.radiusLg,
        /* Elevated, not plain surface: in dark mode the plain surface is the
           same tone as the header it floats over, and the card vanishes. */
        backgroundColor: theme.surfaceElevated,
        border: theme.cardBorder,
        boxShadow: SHADOW.xl,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      <RefreshCw size={28} strokeWidth={2.2} style={{ color: theme.primary, flexShrink: 0 }} />
      <div className="flex flex-col" style={{ gap: SPACE[1] }}>
        <div className="flex items-center justify-between" style={{ gap: SPACE[3] }}>
          <span style={{ ...TEXT_STYLE.subtitle, fontFamily, color: theme.textHeading, whiteSpace: "nowrap" }}>
            {t("update.available")}
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label={t("general.close")}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              /* Drawn small, touched big: the negative margin keeps the full
                 target without pushing the heading down. */
              width: theme.touchTargetMin,
              height: theme.touchTargetMin,
              margin: `-${SPACE[2]}`,
              borderRadius: theme.radiusFull,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
            }}
          >
            <X size={20} strokeWidth={2.5} style={{ color: theme.textMuted }} />
          </button>
        </div>
        <div className="flex items-center" style={{ gap: SPACE[4] }}>
          <span style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textMuted, whiteSpace: "nowrap" }}>
            {t("update.body")}
          </span>
          <button
            onClick={reload}
            className="flex items-center cursor-pointer active:scale-95 transition-transform"
            style={{
              height: theme.touchTargetMin,
              padding: `0 ${SPACE[3]}`,
              borderRadius: theme.radiusFull,
              backgroundColor: theme.primary,
              border: "none",
              outline: "none",
              flexShrink: 0,
            }}
          >
            <span style={{ ...TEXT_STYLE.bodyEmphasis, fontFamily, color: theme.brandOnPrimary, whiteSpace: "nowrap" }}>
              {t("update.reload")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
