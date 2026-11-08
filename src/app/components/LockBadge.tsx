import { Lock } from "lucide-react";
import { useTheme, SPACE, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";

/** Marks a locked app tile. Sits in the top corner on the reading-end side,
 *  inset far enough to clear the tile's rounded corner. */
export function LockBadge() {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  return (
    <div
      role="img"
      aria-label={tr("appLock.locked")}
      style={{
        position: "absolute",
        top: SPACE[2],
        insetInlineEnd: SPACE[2],
        width: SPACE[4],
        height: SPACE[4],
        borderRadius: t.radiusFull,
        backgroundColor: t.primary,
        color: t.brandOnPrimary,
        boxShadow: SHADOW.md,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <Lock size={16} strokeWidth={2.5} aria-hidden />
    </div>
  );
}
