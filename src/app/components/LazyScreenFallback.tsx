import { Loader2 } from "lucide-react";
import { useTheme } from "./ThemeContext";

/**
 * What a screen looks like while its code is still arriving.
 *
 * Games, tools, the configurator and the PDF reader are each their own chunk
 * now, fetched on the tap that opens them. That tap used to produce nothing at
 * all while the chunk came down — so on a slow link somebody pressed the
 * notification three or four times before the reader appeared, which is not
 * patience running out, it is a button that gave no sign of having been
 * pressed.
 *
 * A scrim rather than a solid screen: the thing behind stays visible, so this
 * reads as something opening rather than somewhere new.
 */
export function LazyScreenFallback() {
  const { theme } = useTheme();
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
      role="status"
      aria-busy="true"
    >
      <div
        className="flex items-center justify-center rounded-3xl"
        style={{
          width: "84px",
          height: "84px",
          backgroundColor: theme.surface,
          boxShadow: "0 12px 32px rgba(15, 30, 55, 0.22)",
        }}
      >
        <Loader2 className="animate-spin" size={34} style={{ color: theme.primaryOn }} />
      </div>
    </div>
  );
}
