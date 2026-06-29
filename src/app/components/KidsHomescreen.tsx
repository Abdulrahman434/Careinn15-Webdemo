import { CSSProperties, useEffect, useRef, useState } from "react";
import { TopBar } from "./TopBar";
import { NewsTicker } from "./NewsTicker";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useNurseStore } from "./NurseDataStore";
import { brightness } from "../utils/androidBridge";

/**
 * Layout 3 — Kids Mode.
 *
 * A playful, child-friendly bedside experience for pediatric patients (3–12).
 * Like Layout 1 / Layout 2 it inherits the active hospital's brand colour and
 * logo automatically (via useTheme + TopBar). A "kids filter" lightens and
 * desaturates the brand colour by ~40% for the page background and tile fills,
 * while the full brand colour is kept for borders, the header bar and accents.
 *
 * All clinical data (patient, nurse, vitals) is read live from the same stores
 * the clinical layouts use — only the presentation changes. Clinical details
 * (MRN, room) are intentionally hidden from this layout.
 */

/* External quick-access links (shared with the standard ShortcutsColumn). */
const QURAN_URL = "https://app.quranflash.com/book/Medina1?ar#/reader/chapter/3";
const PODCAST_URL = "https://www.youtube.com/watch?v=1WKyerFH34U&list=PL_JVZV-KlG7oFe-fUAMnbYsWyTU9k8ljF";

/* ── Colour helpers — derive the "kids filter" from the brand colour ── */
function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4; break;
    }
    hue /= 6;
  }
  return [hue * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

interface KidsHomescreenProps {
  onOpenCategory: (categoryKey: string) => void;
  onLaunchTool: (toolId: string) => void;
  onShowCareMeExpanded: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

/* 12 nav tiles — exact app modules, in the requested order. `key` matches the
   keys App.handleOpenCategory routes (so Order Food / Call / Housekeeping /
   Consultation reach their real screens). */
const TILES: { key: string; emoji: string; label: string }[] = [
  { key: "Media", emoji: "📺", label: "kids.tile.media" },
  { key: "Reading", emoji: "📚", label: "kids.tile.reading" },
  { key: "Social", emoji: "💬", label: "kids.tile.social" },
  { key: "Games", emoji: "🎮", label: "kids.tile.games" },
  { key: "Meeting", emoji: "📹", label: "kids.tile.meeting" },
  { key: "Internet", emoji: "🌐", label: "kids.tile.internet" },
  { key: "Tools", emoji: "🧰", label: "kids.tile.tools" },
  { key: "Education", emoji: "🔬", label: "kids.tile.education" },
  { key: "Consultation", emoji: "👩‍⚕️", label: "kids.tile.consultation" },
  { key: "Housekeeping", emoji: "🛏️", label: "kids.tile.housekeeping" },
  { key: "Order Food", emoji: "🍕", label: "kids.tile.food" },
  { key: "Call", emoji: "📞", label: "kids.tile.call" },
];

const AVATARS = ["🦁", "🐻", "🐰", "🦊", "🐨", "🐼", "🐯", "🐵"];

export default function KidsHomescreen({
  onOpenCategory,
  onLaunchTool,
  onShowCareMeExpanded,
  onOpenSettings,
  onOpenNotifications,
  unreadCount,
}: KidsHomescreenProps) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily: localeFont } = useLocale();
  const nurseStore = useNurseStore();
  const [sleeping, setSleeping] = useState(false);

  /* Nunito for Latin; fall back to the Arabic/Urdu brand font for RTL glyphs. */
  const fontFamily = isRTL ? `'Nunito', ${localeFont}` : "'Nunito', sans-serif";

  /* ── Kids filter derived from the active hospital brand colour ── */
  const [bh, bs] = hexToHsl(theme.primary);
  const kidsSat = bs * 0.6; // desaturate ~40%
  const pageBg = hslToHex(bh, Math.min(kidsSat, 55), 94);
  const pageBg2 = hslToHex(bh + 18, Math.min(kidsSat, 55), 90);

  /* ── Live clinical data (presentation-only transform) ── */
  const p = nurseStore.patient;
  const displayName = isRTL && p.nameAr ? p.nameAr : (p.nameKey ? t(p.nameKey) : p.name);
  const firstName = (displayName || "").trim().split(/\s+/)[0] || displayName;

  const nurse = nurseStore.careTeam.find((m) => m.visible && m.roleKey === "care.team.primaryNurse")
    || nurseStore.careTeam.find((m) => m.visible);
  const nurseName = nurse ? t(nurse.nameKey) : "";

  const latestObs = nurseStore.observations[nurseStore.observations.length - 1];
  const heartRate = latestObs?.vitals.hr || "—";
  const temperature = latestObs?.vitals.temp || "—";

  const avatar = AVATARS[(firstName ? firstName.length : 0) % AVATARS.length];

  /* Time-of-day greeting */
  const hour = new Date().getHours();
  const greetingKey = hour >= 5 && hour < 12
    ? "kids.greeting.morning"
    : hour >= 12 && hour < 17
      ? "kids.greeting.afternoon"
      : "kids.greeting.evening";
  const greetingEmoji = hour >= 5 && hour < 12 ? "☀️" : hour >= 12 && hour < 17 ? "🌤️" : "🌙";

  /* ── Sleep mode dims the physical screen via the Android bridge ── */
  const prevBrightness = useRef<number | null>(null);
  useEffect(() => {
    if (sleeping) {
      prevBrightness.current = brightness.get();
      brightness.set(0.04);
    } else if (prevBrightness.current !== null) {
      brightness.set(prevBrightness.current);
      prevBrightness.current = null;
    }
  }, [sleeping]);

  const sideItems: { emoji: string; label: string; onClick: () => void }[] = [
    { emoji: "🛋️", label: "kids.side.roomControl", onClick: () => onLaunchTool("roomcontrol") },
    { emoji: "📖", label: "kids.side.quran", onClick: () => window.open(QURAN_URL, "_blank", "noopener,noreferrer") },
    { emoji: "🪞", label: "kids.side.mirror", onClick: () => onLaunchTool("mirror") },
    { emoji: "🎧", label: "kids.side.podcast", onClick: () => window.open(PODCAST_URL, "_blank", "noopener,noreferrer") },
  ];

  const bottomActions: { emoji: string; label: string; bg: string; fg: string; border: string; onClick: () => void }[] = [
    { emoji: "📞", label: "kids.action.callNurse", bg: "#FFE2E2", fg: "#C2362F", border: "#F4A3A0", onClick: () => onOpenCategory("Call") },
    { emoji: "⭐", label: "kids.action.needSomething", bg: "#FFF1D6", fg: "#9A6B11", border: "#F2C879", onClick: () => onOpenCategory("Housekeeping") },
    { emoji: "🌙", label: "kids.action.sleep", bg: "#DDE4FB", fg: "#2A3A86", border: "#A9B6EE", onClick: () => setSleeping(true) },
  ];

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${pageBg} 0%, ${pageBg2} 100%)`,
        fontFamily,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes kidsFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes kidsBounce {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
          50% { transform: translateY(0); }
        }
        @keyframes kidsHeart {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.25); }
          30% { transform: scale(1); }
          45% { transform: scale(1.18); }
          60% { transform: scale(1); }
        }
        @keyframes kidsTwinkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.3) rotate(20deg); }
        }
        @keyframes kidsDrift {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(18px) translateY(-14px); }
          100% { transform: translateX(0) translateY(0); }
        }
        .kids-tile { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .kids-tile:hover { transform: translateY(-6px) scale(1.03); }
        .kids-tile:active { transform: scale(0.96); }
      `}</style>

      {/* Floating decorative elements — pure CSS animation, no libraries */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none" aria-hidden="true">
        <span style={{ position: "absolute", top: "16%", left: "8%", fontSize: 56, opacity: 0.5, animation: "kidsDrift 9s ease-in-out infinite" }}>☁️</span>
        <span style={{ position: "absolute", top: "30%", right: "6%", fontSize: 44, opacity: 0.55, animation: "kidsFloat 6s ease-in-out infinite" }}>🎈</span>
        <span style={{ position: "absolute", bottom: "12%", left: "14%", fontSize: 40, opacity: 0.5, animation: "kidsTwinkle 4s ease-in-out infinite" }}>⭐</span>
        <span style={{ position: "absolute", bottom: "22%", right: "12%", fontSize: 50, opacity: 0.45, animation: "kidsDrift 11s ease-in-out infinite" }}>☁️</span>
      </div>

      {/* Header — inherits hospital logo, prayer times, date/time. Settings gear
          hidden; staff escape hatch = tap the Dhuhr prayer tile. */}
      <div className="relative z-20 shrink-0">
        <TopBar
          hideSettings
          onDhuhrTap={onOpenSettings}
          onBellTap={onOpenNotifications}
          unreadCount={unreadCount}
        />
      </div>
      <div className="relative z-10 shrink-0">
        <NewsTicker />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 px-8 pt-4 pb-4">
        {/* Friendly time-of-day greeting strip */}
        <div
          className="shrink-0 flex items-center gap-4 px-7"
          style={{
            height: 72,
            backgroundColor: "rgba(255,255,255,0.6)",
            borderRadius: 28,
            border: `3px solid ${theme.primary}`,
          }}
        >
          <span style={{ fontSize: 40, animation: "kidsFloat 5s ease-in-out infinite" }}>{greetingEmoji}</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: theme.primary }}>{t(greetingKey)}</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: hslToHex(bh, Math.min(bs, 70), 30) }}>
            {t("kids.hi", firstName)}
          </span>
        </div>

        {/* Body row */}
        <div className={`flex-1 min-h-0 flex gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Left column — greeting card + kids CareMe panel */}
          <div className="shrink-0 flex flex-col gap-5 min-h-0" style={{ width: 440 }}>
            {/* Greeting card with cartoon avatar */}
            <div
              className="shrink-0 flex flex-col items-center text-center gap-2 px-6 py-5"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 32,
                border: `3px solid ${theme.primary}`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 9999,
                  backgroundColor: pageBg,
                  border: `3px solid ${theme.primary}`,
                  fontSize: 54,
                  animation: "kidsBounce 3.2s ease-in-out infinite",
                }}
              >
                {avatar}
              </div>
              <p style={{ fontSize: 30, fontWeight: 900, color: hslToHex(bh, Math.min(bs, 70), 28) }}>
                {t("kids.hi", firstName)} <span style={{ animation: "kidsTwinkle 3s ease-in-out infinite", display: "inline-block" }}>🌟</span>
              </p>
              <p style={{ fontSize: 19, fontWeight: 700, color: theme.primary, lineHeight: 1.35 }}>
                {t("kids.dailyMessage")}
              </p>
            </div>

            {/* Kids CareMe panel */}
            <button
              onClick={onShowCareMeExpanded}
              className="flex-1 min-h-0 flex flex-col gap-4 px-6 py-5 text-start cursor-pointer active:scale-[0.99] transition-transform"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 32,
                border: `3px solid ${theme.primary}`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                outline: "none",
              }}
            >
              <p style={{ fontSize: 22, fontWeight: 900, color: hslToHex(bh, Math.min(bs, 70), 28) }}>
                {t("kids.careTitle")}
              </p>

              {/* Nurse with smiley badge */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 56, height: 56, borderRadius: 9999, backgroundColor: pageBg, border: `3px solid ${theme.primary}`, fontSize: 30 }}
                >
                  😊
                </div>
                <div className="min-w-0">
                  <p style={{ fontSize: 18, fontWeight: 700, color: theme.primary }}>{t("kids.nurseLabel")}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: hslToHex(bh, Math.min(bs, 70), 28) }}>{nurseName}</p>
                </div>
              </div>

              {/* Friendly vitals */}
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
                {/* Temperature — cartoon thermometer */}
                <div
                  className="flex flex-col items-center justify-center gap-1"
                  style={{ borderRadius: 24, backgroundColor: "#FFF1D6", border: "3px solid #F2C879" }}
                >
                  <span style={{ fontSize: 44, animation: "kidsFloat 4s ease-in-out infinite" }}>🌡️</span>
                  <span style={{ fontSize: 30, fontWeight: 900, color: "#9A6B11" }}>{temperature}°</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#9A6B11" }}>{t("kids.temperature")}</span>
                </div>
                {/* Heartbeat — pulsing heart */}
                <div
                  className="flex flex-col items-center justify-center gap-1"
                  style={{ borderRadius: 24, backgroundColor: "#FFE2E2", border: "3px solid #F4A3A0" }}
                >
                  <span style={{ fontSize: 44, animation: "kidsHeart 1.4s ease-in-out infinite" }}>❤️</span>
                  <span style={{ fontSize: 30, fontWeight: 900, color: "#C2362F" }}>{heartRate}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#C2362F" }}>{t("kids.bpm")}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Center — 12 cartoon nav tiles (4 × 3) */}
          <div
            className="flex-1 min-w-0 grid gap-4"
            style={{ gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(3, 1fr)" }}
          >
            {TILES.map((tile, i) => {
              const hue = bh + i * 30;
              const fill = hslToHex(hue, Math.min(Math.max(kidsSat, 45), 68), 88);
              const ink = hslToHex(hue, Math.min(Math.max(bs, 50), 75), 32);
              return (
                <button
                  key={tile.key}
                  onClick={() => onOpenCategory(tile.key)}
                  className="kids-tile flex flex-col items-center justify-center gap-2 cursor-pointer"
                  style={{
                    minWidth: 60,
                    minHeight: 60,
                    backgroundColor: fill,
                    borderRadius: 28,
                    border: `3px solid ${theme.primary}`,
                    outline: "none",
                  } as CSSProperties}
                >
                  <span style={{ fontSize: 56, lineHeight: 1, animation: `kidsFloat ${4 + (i % 4) * 0.6}s ease-in-out infinite`, animationDelay: `${(i % 5) * 0.3}s` }}>
                    {tile.emoji}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: ink, textAlign: "center", padding: "0 8px" }}>
                    {t(tile.label)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right sidebar — quick access as rounded pastel cards */}
          <div className="shrink-0 flex flex-col gap-4 min-h-0" style={{ width: 200 }}>
            {sideItems.map((item, i) => {
              const hue = bh + 200 + i * 24;
              const fill = hslToHex(hue, Math.min(Math.max(kidsSat, 45), 64), 89);
              const ink = hslToHex(hue, Math.min(Math.max(bs, 50), 72), 32);
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="kids-tile flex-1 min-h-0 flex flex-col items-center justify-center gap-2 cursor-pointer"
                  style={{
                    minWidth: 60,
                    minHeight: 60,
                    backgroundColor: fill,
                    borderRadius: 28,
                    border: `3px solid ${theme.primary}`,
                    outline: "none",
                  }}
                >
                  <span style={{ fontSize: 46, lineHeight: 1, animation: `kidsFloat ${5 + i * 0.4}s ease-in-out infinite` }}>{item.emoji}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: ink, textAlign: "center", padding: "0 6px" }}>{t(item.label)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom action bar — three large finger-friendly buttons */}
        <div className="shrink-0 flex gap-4" style={{ height: 80 }}>
          {bottomActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex-1 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.97] transition-transform"
              style={{
                minHeight: 64,
                backgroundColor: a.bg,
                color: a.fg,
                borderRadius: 28,
                border: `3px solid ${a.border}`,
                outline: "none",
              }}
            >
              <span style={{ fontSize: 34 }}>{a.emoji}</span>
              <span style={{ fontSize: 24, fontWeight: 900 }}>{t(a.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleep mode overlay — dims the UI; tap anywhere to wake */}
      {sleeping && (
        <div
          onClick={() => setSleeping(false)}
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer"
          style={{ background: "#0a1733" }}
        >
          <span style={{ fontSize: 120, animation: "kidsFloat 3s ease-in-out infinite" }}>🌙</span>
          <p style={{ marginTop: 24, fontSize: 28, fontWeight: 800, color: "#cdd9ff", fontFamily }}>
            {t("kids.sleep.tapWake")}
          </p>
        </div>
      )}
    </div>
  );
}
