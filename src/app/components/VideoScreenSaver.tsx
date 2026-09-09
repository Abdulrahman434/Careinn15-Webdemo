import { useRef } from "react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";

interface VideoScreenSaverProps {
  src: string;
  onClose: () => void;
}

/**
 * Full-bleed looping video screensaver, used when the active hospital supplies
 * `screensaverVideoUrl`. Exit gestures mirror TasbihScreenSaver exactly —
 * long-press (800ms) or swipe (>150px) — so muscle memory carries across
 * brands and a stray tap can't wake the kiosk by accident.
 */
export function VideoScreenSaver({ src, onClose }: VideoScreenSaverProps) {
  const { theme } = useTheme();
  const { t, fontFamily } = useLocale();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const startPress = (e: React.PointerEvent) => {
    touchStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => onClose(), 800);
  };
  const endPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    touchStart.current = null;
  };
  const movePress = (e: React.PointerEvent) => {
    if (!touchStart.current) return;
    if (Math.hypot(e.clientX - touchStart.current.x, e.clientY - touchStart.current.y) > 150) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: "#000" }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerMove={movePress}
    >
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        // object-cover so a 16:9 source still fills the 1920×1080 kiosk with no
        // letterboxing; the poster colour avoids a white flash before first frame.
        className="absolute inset-0 w-full h-full object-cover"
        style={{ backgroundColor: "#000" }}
      />

      {/* Exit hint — same wording and placement as the tasbih screensaver */}
      <div
        className="absolute inset-x-0 flex justify-center pointer-events-none"
        style={{ bottom: "48px" }}
      >
        <span
          style={{
            fontFamily,
            fontSize: "14px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
            background: "rgba(0,0,0,0.35)",
            padding: "8px 18px",
            borderRadius: theme.radiusFull,
            backdropFilter: "blur(6px)",
          }}
        >
          {t("tasbih.exitHint")}
        </span>
      </div>
    </div>
  );
}
