import { RefreshCw } from "lucide-react";
import { useTheme, TEXT_STYLE, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useUpdateAvailable } from "../lib/updateCheck";

/**
 * The one pill that says a newer build is waiting.
 *
 * Compact on purpose. This sits over a patient's screen for as long as it
 * takes somebody to notice it, so it asks for a corner rather than a strip:
 * an icon, two words, one tap target. It was a sentence and a separate button
 * before, wide enough to read as part of the app rather than a notice about
 * it.
 *
 * The whole pill is the button — at a bedside a small target beside a large
 * label is a way to miss twice.
 */
export function UpdateBanner() {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const { available, reload } = useUpdateAvailable();
  if (!available) return null;

  return (
    <button
      onClick={reload}
      aria-label={t("update.available")}
      className="fixed flex items-center cursor-pointer active:scale-95 transition-transform"
      style={{
        bottom: SPACE[2],
        /* Follows the reading direction: it belongs to the side a hand rests
           on, and on the other side it would cover the screen's own corner. */
        ...(isRTL ? { left: SPACE[2] } : { right: SPACE[2] }),
        zIndex: 9997,
        gap: SPACE[1],
        height: theme.touchTargetMin,
        padding: `0 ${SPACE[2]}`,
        borderRadius: theme.radiusFull,
        backgroundColor: theme.primary,
        color: theme.brandOnPrimary,
        border: "none",
        outline: "none",
        boxShadow: SHADOW.xl,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      <RefreshCw size={18} strokeWidth={2.4} style={{ color: theme.brandOnPrimary }} />
      <span style={{ ...TEXT_STYLE.pill, fontFamily, color: theme.brandOnPrimary }}>
        {t("update.reload")}
      </span>
    </button>
  );
}
