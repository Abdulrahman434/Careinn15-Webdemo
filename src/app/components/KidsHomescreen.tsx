import { CSSProperties, useState } from "react";
import { TopBar } from "./TopBar";
import { NewsTicker } from "./NewsTicker";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useNurseStore } from "./NurseDataStore";

/**
 * Layout 3 — Kids Mode (Simple Version).
 *
 * A playful, child-friendly bedside experience for pediatric patients (3–12).
 * Like Layout 1 / Layout 2 it inherits the active hospital's brand colour and
 * logo automatically (via useTheme + TopBar). A "kids filter" lightens and
 * desaturates the brand colour by ~40% for the page background, while the full
 * brand colour is kept for borders, the header bar and accents.
 *
 * The centre is intentionally reduced to two large choices — Watch & Videos and
 * Play Games — with every other module tucked behind a "More" drawer so the
 * first decision a child makes is never overwhelming.
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
  onOpenSurvey?: () => void;
  unreadCount?: number;
}

const AVATARS = ["🦁", "🐻", "🐰", "🦊", "🐨", "🐼", "🐯", "🐵"];

/* Decorative floating stars — fixed positions so they don't jump on re-render.
   Purely cosmetic; the container is pointer-events:none. */
const STARS: { char: string; top: string; left: string; size: number; delay: string }[] = [
  { char: "⭐", top: "9%", left: "22%", size: 26, delay: "0s" },
  { char: "✨", top: "16%", left: "66%", size: 22, delay: "0.6s" },
  { char: "⭐", top: "40%", left: "49%", size: 20, delay: "1.1s" },
  { char: "✨", top: "58%", left: "31%", size: 24, delay: "0.3s" },
  { char: "⭐", top: "70%", left: "73%", size: 22, delay: "0.9s" },
  { char: "✨", top: "84%", left: "47%", size: 20, delay: "1.4s" },
  { char: "⭐", top: "26%", left: "86%", size: 18, delay: "0.5s" },
  { char: "✨", top: "50%", left: "13%", size: 22, delay: "1.2s" },
  { char: "⭐", top: "7%", left: "54%", size: 18, delay: "1.6s" },
  { char: "✨", top: "88%", left: "16%", size: 24, delay: "0.2s" },
];

export default function KidsHomescreen({
  onOpenCategory,
  onLaunchTool,
  onShowCareMeExpanded,
  onOpenSettings,
  onOpenNotifications,
  onOpenSurvey,
  unreadCount,
}: KidsHomescreenProps) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily: localeFont } = useLocale();
  const nurseStore = useNurseStore();
  const [moreOpen, setMoreOpen] = useState(false);

  /* Nunito for Latin; fall back to the Arabic/Urdu brand font for RTL glyphs. */
  const fontFamily = isRTL ? `'Nunito', ${localeFont}` : "'Nunito', sans-serif";

  /* ── Kids filter derived from the active hospital brand colour ── */
  const [bh, bs] = hexToHsl(theme.primary);
  const kidsSat = bs * 0.6; // desaturate ~40%
  const pageBg = hslToHex(bh, Math.min(kidsSat, 55), 94);
  const pageBg2 = hslToHex(bh + 18, Math.min(kidsSat, 55), 90);
  const brandInk = hslToHex(bh, Math.min(bs, 70), 28);

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

  /* Right sidebar — exactly four pastel quick-access cards. */
  const sideItems: { emoji: string; label: string; bg: string; onClick: () => void }[] = [
    { emoji: "📖", label: "kids.side.quran", bg: "#E6F7EC", onClick: () => window.open(QURAN_URL, "_blank", "noopener,noreferrer") },
    { emoji: "📚", label: "kids.tile.reading", bg: "#FFF3DC", onClick: () => onOpenCategory("Reading") },
    { emoji: "💬", label: "kids.tile.social", bg: "#E8F0FF", onClick: () => onOpenCategory("Social") },
    { emoji: "👩‍⚕️", label: "kids.tile.consultation", bg: "#FCE6F0", onClick: () => onOpenCategory("Consultation") },
  ];

  /* Bottom bar — two large finger-friendly actions. */
  const bottomActions: { emoji: string; label: string; bg: string; fg: string; border: string; onClick: () => void }[] = [
    { emoji: "📞", label: "kids.action.callNurse", bg: "#FFDDDD", fg: "#C2362F", border: "#F4A3A0", onClick: () => onOpenCategory("Call") },
    { emoji: "⭐", label: "kids.action.needSomething", bg: "#FFF4CC", fg: "#9A6B11", border: "#F2C879", onClick: () => onOpenCategory("Housekeeping") },
  ];

  /* "Explore More" drawer — every remaining module not on a sidebar. */
  const moreItems: { key: string; emoji: string; label: string; onClick: () => void }[] = [
    { key: "Meeting", emoji: "📹", label: "kids.tile.meeting", onClick: () => onOpenCategory("Meeting") },
    { key: "Internet", emoji: "🌐", label: "kids.tile.internet", onClick: () => onOpenCategory("Internet") },
    { key: "Tools", emoji: "🧰", label: "kids.tile.tools", onClick: () => onOpenCategory("Tools") },
    { key: "Education", emoji: "🔬", label: "kids.tile.education", onClick: () => onOpenCategory("Education") },
    { key: "Housekeeping", emoji: "🛏️", label: "kids.tile.housekeeping", onClick: () => onOpenCategory("Housekeeping") },
    { key: "Order Food", emoji: "🍕", label: "kids.tile.food", onClick: () => onOpenCategory("Order Food") },
    { key: "Call", emoji: "📞", label: "kids.tile.call", onClick: () => onOpenCategory("Call") },
    { key: "roomcontrol", emoji: "🕹️", label: "kids.tile.roomcontrol", onClick: () => onLaunchTool("roomcontrol") },
    { key: "mirror", emoji: "🔮", label: "kids.side.mirror", onClick: () => onLaunchTool("mirror") },
    { key: "podcast", emoji: "🎙️", label: "kids.side.podcast", onClick: () => window.open(PODCAST_URL, "_blank", "noopener,noreferrer") },
  ];

  const runMore = (fn: () => void) => {
    setMoreOpen(false);
    fn();
  };

  /* The two hero buttons. Fixed playful pastels per the design spec; the brand
     colour drives the header + the surrounding accents instead. */
  const heroes: { key: string; emoji: string; label: string; sub: string; bg: string; border: string; ink: string; blob: string }[] = [
    { key: "Media", emoji: "📺", label: "kids.tile.media", sub: "kids.media.sub", bg: "#FFE8F4", border: "#F2A8D2", ink: "#A8266E", blob: "#FBC7E4" },
    { key: "Games", emoji: "🎮", label: "kids.tile.games", sub: "kids.games.sub", bg: "#E8F0FF", border: "#A8C2F2", ink: "#2A4C99", blob: "#C7D8FB" },
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
          50% { transform: translateY(-10px); }
        }
        @keyframes kidsBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes kidsHeart {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.25); }
          30% { transform: scale(1); }
          45% { transform: scale(1.18); }
          60% { transform: scale(1); }
        }
        @keyframes kidsTwinkle {
          0%, 100% { opacity: 0.85; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.3; transform: scale(1.35) rotate(18deg); }
        }
        @keyframes kidsBlob {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.18); opacity: 0.35; }
        }
        @keyframes kidsSheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .kids-tile { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .kids-tile:hover { transform: translateY(-5px) scale(1.03); }
        .kids-tile:active { transform: scale(0.96); }
      `}</style>

      {/* Floating decorative stars — pure CSS, pointer-events:none */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: s.top,
              left: s.left,
              fontSize: s.size,
              animation: "kidsTwinkle 3.4s ease-in-out infinite",
              animationDelay: s.delay,
            }}
          >
            {s.char}
          </span>
        ))}
      </div>

      {/* Header — inherits hospital logo, prayer times, date/time. Settings gear
          hidden; staff escape hatch = tap the Dhuhr prayer tile. */}
      <div className="relative z-20 shrink-0">
        <TopBar
          hideSettings
          greeting={`${greetingEmoji} ${t(greetingKey)}, ${firstName}!`}
          onDhuhrTap={onOpenSettings}
          onBellTap={onOpenNotifications}
          unreadCount={unreadCount}
        />
      </div>
      <div className="relative z-10 shrink-0">
        <NewsTicker />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 px-6 pt-4 pb-4">
        {/* Body row */}
        <div className={`flex-1 min-h-0 flex gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Left sidebar (150px) — one unified pastel card */}
          <div className="shrink-0 min-h-0" style={{ width: 150 }}>
            <div
              className="h-full flex flex-col items-center text-center gap-2 px-3 py-4"
              style={{
                background: `linear-gradient(180deg, #FFE8F4 0%, ${pageBg} 100%)`,
                borderRadius: 26,
                border: `3px solid ${theme.primary}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              }}
            >
              {/* Floating avatar */}
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 9999,
                  backgroundColor: "#ffffff",
                  border: `3px solid ${theme.primary}`,
                  fontSize: 40,
                  animation: "kidsFloat 3.2s ease-in-out infinite",
                }}
              >
                {avatar}
              </div>

              {/* Name greeting */}
              <p style={{ fontSize: 18, fontWeight: 900, color: brandInk, lineHeight: 1.2 }}>
                {t("kids.hi", firstName)}{" "}
                <span style={{ animation: "kidsTwinkle 3s ease-in-out infinite", display: "inline-block" }}>🌟</span>
              </p>
              {/* Cheerful subtitle */}
              <p style={{ fontSize: 11.5, fontWeight: 700, color: theme.primary, lineHeight: 1.3 }}>
                {t("kids.dailyMessage")}
              </p>

              {/* Divider */}
              <div className="shrink-0 w-full" style={{ height: 2, backgroundColor: `${theme.primary}22`, borderRadius: 2 }} />

              {/* Nurse info */}
              <button
                onClick={onShowCareMeExpanded}
                className="flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-[0.97] transition-transform"
                style={{ outline: "none", background: "transparent", border: "none" }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 44, height: 44, borderRadius: 9999, backgroundColor: "#ffffff", border: `3px solid ${theme.primary}`, fontSize: 24 }}
                >
                  😊
                </div>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: theme.primary }}>{t("kids.yourNurse")}</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: brandInk, lineHeight: 1.15 }}>{nurseName}</p>
              </button>

              {/* Divider */}
              <div className="shrink-0 w-full" style={{ height: 2, backgroundColor: `${theme.primary}22`, borderRadius: 2 }} />

              {/* Two friendly vital pills, side by side — no clinical labels */}
              <div className="shrink-0 w-full flex gap-2">
                <div
                  className="flex-1 flex flex-col items-center justify-center gap-0.5"
                  style={{ borderRadius: 16, padding: "8px 4px", backgroundColor: "#FFF4CC", border: "3px solid #F2C879" }}
                >
                  <span style={{ fontSize: 22, animation: "kidsFloat 4s ease-in-out infinite" }}>🌡️</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#9A6B11" }}>{temperature}°</span>
                </div>
                <div
                  className="flex-1 flex flex-col items-center justify-center gap-0.5"
                  style={{ borderRadius: 16, padding: "8px 4px", backgroundColor: "#FFDDDD", border: "3px solid #F4A3A0" }}
                >
                  <span style={{ fontSize: 22, animation: "kidsHeart 1.4s ease-in-out infinite" }}>💓</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#C2362F" }}>{heartRate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center — exactly two hero buttons side by side, then an Explore pill */}
          <div className="relative flex-1 min-w-0 flex flex-col items-center justify-center gap-7">
            <div className={`flex items-center justify-center gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
              {heroes.map((hero, hi) => (
                <button
                  key={hero.key}
                  onClick={() => onOpenCategory(hero.key)}
                  className="kids-tile relative overflow-hidden flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    width: 200,
                    height: 180,
                    backgroundColor: hero.bg,
                    borderRadius: 30,
                    border: `3px solid ${hero.border}`,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.07)",
                    outline: "none",
                  } as CSSProperties}
                >
                  {/* Pastel corner blobs (decorative) */}
                  <span
                    className="pointer-events-none"
                    style={{ position: "absolute", top: -34, left: -34, width: 120, height: 120, borderRadius: 9999, backgroundColor: hero.blob, animation: "kidsBlob 5s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  <span
                    className="pointer-events-none"
                    style={{ position: "absolute", bottom: -40, right: -28, width: 130, height: 130, borderRadius: 9999, backgroundColor: hero.blob, animation: "kidsBlob 6.5s ease-in-out infinite", animationDelay: "0.8s" }}
                    aria-hidden="true"
                  />
                  <span style={{ position: "relative", fontSize: 42, lineHeight: 1, animation: "kidsBounce 2s ease-in-out infinite", animationDelay: `${hi * 0.4}s` }}>
                    {hero.emoji}
                  </span>
                  <span style={{ position: "relative", fontSize: 24, fontWeight: 900, color: hero.ink }}>
                    {t(hero.label)}
                  </span>
                  <span style={{ position: "relative", fontSize: 13, fontWeight: 700, color: hero.ink, opacity: 0.8 }}>
                    {t(hero.sub)}
                  </span>
                </button>
              ))}
            </div>

            {/* "✨ Explore More ➜" — opens the bottom drawer */}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
              style={{
                height: 52,
                padding: "0 24px",
                backgroundColor: "#ffffff",
                borderRadius: 9999,
                border: `3px solid ${theme.primary}`,
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                outline: "none",
              } as CSSProperties}
            >
              <span style={{ fontSize: 18 }}>✨</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: theme.primary }}>{t("kids.more.title")}</span>
              <span style={{ fontSize: 18, color: theme.primary }}>{isRTL ? "⬅" : "➜"}</span>
            </button>
          </div>

          {/* Right sidebar (82px) — exactly four quick-access pastel cards */}
          <div className="shrink-0 flex flex-col gap-3 min-h-0" style={{ width: 82 }}>
            {sideItems.map((item, i) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="kids-tile flex-1 min-h-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
                style={{
                  minWidth: 60,
                  minHeight: 60,
                  backgroundColor: item.bg,
                  borderRadius: 22,
                  border: `3px solid ${theme.primary}`,
                  outline: "none",
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1, animation: `kidsFloat ${5 + i * 0.4}s ease-in-out infinite` }}>{item.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: brandInk, textAlign: "center", padding: "0 2px", lineHeight: 1.1 }}>{t(item.label)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom action bar — two large finger-friendly buttons */}
        <div className="shrink-0 flex gap-4" style={{ height: 76 }}>
          {bottomActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex-1 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.97] transition-transform"
              style={{
                minHeight: 56,
                backgroundColor: a.bg,
                color: a.fg,
                borderRadius: 28,
                border: `3px solid ${a.border}`,
                outline: "none",
              }}
            >
              <span style={{ fontSize: 32 }}>{a.emoji}</span>
              <span style={{ fontSize: 24, fontWeight: 900 }}>{t(a.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* "Explore More" drawer — slides up from the bottom as a sheet */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          className="absolute inset-0 z-[60] flex items-end justify-center"
          style={{ background: "rgba(20,20,40,0.45)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full flex flex-col gap-4"
            style={{
              maxHeight: "78%",
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: `4px solid ${theme.primary}`,
              boxShadow: "0 -24px 60px rgba(0,0,0,0.28)",
              padding: "16px 28px 28px",
              animation: "kidsSheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Drag handle indicator */}
            <div
              className="shrink-0 mx-auto"
              style={{ width: 56, height: 6, borderRadius: 9999, backgroundColor: `${theme.primary}33` }}
              aria-hidden="true"
            />

            <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
              <p style={{ fontSize: 30, fontWeight: 900, color: brandInk }}>
                ✨ {t("kids.more.title")}
              </p>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                style={{ width: 52, height: 52, borderRadius: 9999, backgroundColor: pageBg, border: `3px solid ${theme.primary}`, fontSize: 26, fontWeight: 900, color: theme.primary, outline: "none" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div
              className="grid gap-4 overflow-y-auto"
              style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
            >
              {moreItems.map((item, i) => {
                const hue = bh + i * 32;
                const fill = hslToHex(hue, Math.min(Math.max(kidsSat, 45), 66), 89);
                const ink = hslToHex(hue, Math.min(Math.max(bs, 50), 74), 32);
                return (
                  <button
                    key={item.key + i}
                    onClick={() => runMore(item.onClick)}
                    className="kids-tile flex flex-col items-center justify-center gap-2 cursor-pointer"
                    style={{
                      minWidth: 60,
                      minHeight: 120,
                      padding: "14px 8px",
                      backgroundColor: fill,
                      borderRadius: 26,
                      border: `3px solid ${theme.primary}`,
                      outline: "none",
                    }}
                  >
                    <span style={{ fontSize: 44, lineHeight: 1, animation: `kidsFloat ${4 + (i % 4) * 0.5}s ease-in-out infinite`, animationDelay: `${(i % 5) * 0.3}s` }}>
                      {item.emoji}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: ink, textAlign: "center", lineHeight: 1.15 }}>
                      {t(item.label)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
