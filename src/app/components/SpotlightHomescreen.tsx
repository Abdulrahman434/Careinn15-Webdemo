import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  type LucideIcon,
  Gamepad2, BookOpen, Hash, MonitorPlay, Globe, BriefcaseBusiness, Info,
  Tv, UtensilsCrossed, ConciergeBell, BookOpenText, MessagesSquare, HandHeart,
  Phone, Stethoscope, SlidersHorizontal, Cast,
} from "lucide-react";
import { TopBar } from "./TopBar";
import { NewsTicker } from "./NewsTicker";
import { AutoCarousel } from "./AutoCarousel";
import { useTheme, TYPE_SCALE, WEIGHT, LEADING, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { usePatientInfo } from "../lib/usePatientInfo";
import { useRipple } from "./useRipple";

/**
 * Layout 4 — "Spotlight". The hospital photo fills the screen; a floating
 * category rail sits on the left, the greeting over the photo, a 3×2 grid of
 * glass service cards on the right and a glass action bar along the bottom.
 * Inherits the active hospital's brand, logo and photo like the other layouts.
 *
 * Glass surfaces are the theme surface mixed toward transparent, so dark mode
 * and every hospital brand come through without a hardcoded colour.
 */

interface SpotlightHomescreenProps {
  onOpenCategory: (categoryKey: string) => void;
  onLaunchTool: (toolId: string) => void;
  onShowCareMeExpanded: () => void;
  onShowIptv: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenSurvey: () => void;
  onDhuhrTap: () => void;
  unreadCount: number;
  tickerPaused?: boolean;
}

/* Fixed positions on the 1920×1080 canvas, measured from the reference design. */
const RAIL_W = 148;
const CARD_W = 232;
const CARD_H = 254;
const GRID_GAP = 16;

export default function SpotlightHomescreen({
  onOpenCategory,
  onLaunchTool,
  onShowCareMeExpanded,
  onShowIptv,
  onOpenSettings,
  onOpenNotifications,
  onOpenSurvey,
  onDhuhrTap,
  unreadCount,
  tickerPaused,
}: SpotlightHomescreenProps) {
  const { theme, darkMode } = useTheme();
  const { t, isRTL } = useLocale();
  const { displayName, displayMrn, displayRoom } = usePatientInfo();

  const glass = (strength: number): CSSProperties => ({
    background: `color-mix(in srgb, ${theme.surface} ${strength}%, transparent)`,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    border: `1px solid color-mix(in srgb, ${theme.surface} 70%, transparent)`,
    boxShadow: SHADOW.xl,
  });

  const rail: { key: string; label: string; icon: LucideIcon }[] = [
    { key: "Games", label: t("hub.games"), icon: Gamepad2 },
    { key: "Reading", label: t("hub.reading"), icon: BookOpen },
    { key: "Social", label: t("hub.social"), icon: Hash },
    { key: "Media", label: t("hub.media"), icon: MonitorPlay },
    { key: "Internet", label: t("hub.internet"), icon: Globe },
    { key: "Tools", label: t("hub.tools"), icon: BriefcaseBusiness },
    { key: "About Us", label: t("about.title"), icon: Info },
  ];

  const cards: { key: string; title: string; sub: string; icon: LucideIcon; featured?: boolean; onClick: () => void }[] = [
    { key: "tv", title: t("tv.liveTv"), sub: t("spotlight.liveTv.sub"), icon: Tv, onClick: onShowIptv },
    { key: "food", title: t("service.orderFood"), sub: t("spotlight.food.sub"), icon: UtensilsCrossed, onClick: () => onOpenCategory("Order Food") },
    { key: "room", title: t("service.housekeeping"), sub: t("spotlight.room.sub"), icon: ConciergeBell, onClick: () => onOpenCategory("Housekeeping") },
    { key: "edu", title: t("hub.education"), sub: t("hub.education.desc"), icon: BookOpenText, onClick: () => onOpenCategory("Education") },
    { key: "feedback", title: t("service.shareFeedback"), sub: t("spotlight.feedback.sub"), icon: MessagesSquare, onClick: onOpenSurvey },
    { key: "careme", title: t("care.title"), sub: t("spotlight.careme.sub"), icon: HandHeart, featured: true, onClick: onShowCareMeExpanded },
  ];

  const actions: { key: string; title: string; sub: string; icon: LucideIcon; featured?: boolean; onClick: () => void }[] = [
    { key: "call", title: t("service.call"), sub: t("spotlight.call.sub"), icon: Phone, featured: true, onClick: () => onOpenCategory("Call") },
    { key: "consult", title: t("service.consultation"), sub: t("spotlight.consult.sub"), icon: Stethoscope, onClick: () => onOpenCategory("Consultation") },
    { key: "room", title: t("shortcut.roomControl"), sub: t("spotlight.roomControl.sub"), icon: SlidersHorizontal, onClick: () => onLaunchTool("roomcontrol") },
    { key: "cast", title: t("spotlight.cast"), sub: t("spotlight.cast.sub"), icon: Cast, onClick: onOpenSettings },
  ];

  return (
    <div className="size-full relative flex flex-col overflow-hidden">
      {/* Hospital photo, full bleed, with a soft veil so text and glass stay legible. */}
      <AutoCarousel
        images={theme.heroImageUrls?.length ? theme.heroImageUrls : [theme.heroImageUrl]}
        opacity={darkMode ? 0.45 : 0.85}
        objectPosition={theme.heroCropPosition}
        intervalSeconds={theme.slideshowInterval || 8}
        style={{ zIndex: 0 }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          background: [
            `linear-gradient(180deg, color-mix(in srgb, ${theme.background} 70%, transparent) 0%, transparent 28%, transparent 70%, color-mix(in srgb, ${theme.background} 75%, transparent) 100%)`,
            `linear-gradient(${isRTL ? 270 : 90}deg, color-mix(in srgb, ${theme.background} 85%, transparent) 0%, color-mix(in srgb, ${theme.background} 60%, transparent) 32%, transparent 55%)`,
          ].join(", "),
        }}
      />

      <div className="relative shrink-0" style={{ zIndex: 2 }}>
        <TopBar onDhuhrTap={onDhuhrTap} onSettingsTap={onOpenSettings} onBellTap={onOpenNotifications} unreadCount={unreadCount} />
        <NewsTicker paused={tickerPaused} />
      </div>

      <div className="relative flex-1 min-h-0" style={{ zIndex: 1 }}>
        {/* ── Category rail ── */}
        <nav
          className="absolute flex flex-col items-center justify-between"
          style={{
            ...glass(78),
            insetInlineStart: SPACE[5],
            top: SPACE[5],
            bottom: SPACE[5],
            width: RAIL_W,
            borderRadius: theme.radiusXl,
            padding: `${SPACE[3]} 0`,
          }}
        >
          {rail.map(({ key, label, icon: Icon }) => {
            const active = key === "About Us";
            return (
              <Pressable
                key={key}
                onClick={() => onOpenCategory(key)}
                className="flex flex-col items-center"
                style={() => ({ gap: SPACE[1], background: "none", width: "100%", borderRadius: theme.radiusMd })}
              >
                {(pressed) => {
                  const filled = active || pressed;
                  return (
                    <>
                      <span
                        className="flex items-center justify-center"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: theme.radiusMd,
                          background: pressed || active ? theme.primary : "transparent",
                          boxShadow: filled ? SHADOW.md : "none",
                          transition: "background-color 0.1s ease-out",
                        }}
                      >
                        <Icon size={34} strokeWidth={1.9} style={{ color: pressed ? theme.textInverse : active ? theme.brandOnPrimary : theme.textHeading }} />
                      </span>
                      <span style={{ fontSize: TYPE_SCALE.base, fontWeight: filled ? WEIGHT.semibold : WEIGHT.medium, color: filled ? theme.primaryOn : theme.textBody, lineHeight: LEADING.tight }}>
                        {label}
                      </span>
                    </>
                  );
                }}
              </Pressable>
            );
          })}
        </nav>

        {/* ── Greeting over the photo ── */}
        <div
          className="absolute flex flex-col"
          style={{ insetInlineStart: 250, top: 190, maxWidth: 560, gap: SPACE[1] }}
        >
          <span style={{ fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textBody }}>{t("general.hello")}</span>
          <span style={{ fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.extrabold, color: theme.textHeading, lineHeight: LEADING.tight }}>{displayName}</span>
          <div className="flex items-center" style={{ gap: SPACE[2], marginTop: SPACE[1], fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textHeading }}>
            {displayMrn && <span>{t("greeting.mrn")}: {displayMrn}</span>}
            {displayMrn && displayRoom && <span style={{ width: 2, height: 18, background: theme.textMuted }} />}
            {displayRoom && <span>{t("greeting.room", displayRoom)}</span>}
          </div>
          <p style={{ marginTop: SPACE[3], fontSize: TYPE_SCALE.md, fontStyle: "italic", color: theme.textBody, lineHeight: LEADING.normal }}>
            {t("general.welcome", theme.hospitalName)}
          </p>
        </div>

        {/* ── Service cards, 3×2 ── */}
        <div
          className="absolute grid"
          style={{
            insetInlineEnd: 92,
            top: 90,
            gridTemplateColumns: `repeat(3, ${CARD_W}px)`,
            gridAutoRows: `${CARD_H}px`,
            gap: GRID_GAP,
          }}
        >
          {cards.map(({ key, title, sub, icon: Icon, featured, onClick }) => (
            <Pressable
              key={key}
              onClick={onClick}
              className="flex flex-col items-center justify-start"
              style={(pressed) => ({
                ...glass(featured || pressed ? 0 : 72),
                ...(pressed
                  ? { background: featured ? theme.primaryDark : theme.primary, border: "none", boxShadow: `0px 2px 8px 0px ${theme.primarySubtle}` }
                  : featured
                  ? { background: theme.primary, border: "none" }
                  : null),
                borderRadius: theme.radiusLg,
                gap: SPACE[1],
                padding: `${SPACE[4]} ${SPACE[2]} ${SPACE[2]}`,
              })}
            >
              {(pressed) => {
                const onBrand = featured || pressed;
                return (
                  <>
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 104,
                        height: 104,
                        borderRadius: theme.radiusFull,
                        background: onBrand
                          ? `color-mix(in srgb, ${theme.brandOnPrimary} 20%, transparent)`
                          : theme.primarySubtle,
                        marginBottom: SPACE[2],
                        transition: "background-color 0.1s ease-out",
                      }}
                    >
                      <Icon size={50} strokeWidth={1.8} style={{ color: onBrand ? theme.brandOnPrimary : theme.engagementIconColor }} />
                    </span>
                    <CardText onBrand={onBrand} title={title} sub={sub} />
                  </>
                );
              }}
            </Pressable>
          ))}
        </div>

        {/* ── Quick actions bar ── */}
        <div
          className="absolute flex items-center"
          style={{
            ...glass(78),
            insetInlineEnd: 150,
            bottom: SPACE[5],
            width: 1140,
            height: 104,
            borderRadius: theme.radiusLg,
            padding: `${SPACE[1]}`,
          }}
        >
          {actions.map(({ key, title, sub, icon: Icon, featured, onClick }, i) => (
            <div key={key} className="flex-1 flex items-center h-full">
              {i > 0 && <span style={{ width: 1, height: 48, background: actions[i - 1].featured ? "transparent" : theme.borderDefault }} />}
              <Pressable
                onClick={onClick}
                className="flex-1 flex items-center justify-center h-full"
                style={(pressed) => ({ gap: SPACE[2], background: pressed ? (featured ? theme.primaryDark : theme.primary) : featured ? theme.primary : "none", borderRadius: theme.radiusMd, transition: "background-color 0.1s ease-out" })}
              >
                {(p) => { const pressed = p || !!featured; return (
                  <>
                    <Icon size={38} strokeWidth={1.7} style={{ color: pressed ? theme.textInverse : theme.textHeading }} />
                    <span className="flex flex-col items-start" style={{ textAlign: "start" }}>
                      <span style={{ fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.bold, color: pressed ? theme.textInverse : theme.textHeading, lineHeight: LEADING.snug }}>{title}</span>
                      <span style={{ fontSize: TYPE_SCALE.sm, color: pressed ? theme.textInverse : theme.textMuted, opacity: pressed ? 0.85 : 1, lineHeight: LEADING.snug }}>{sub}</span>
                    </span>
                  </>
                ); }}
              </Pressable>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardText({ onBrand, title, sub }: { onBrand?: boolean; title: ReactNode; sub: ReactNode }) {
  const { theme } = useTheme();
  return (
    <>
      <span style={{ fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: onBrand ? theme.brandOnPrimary : theme.textHeading, lineHeight: LEADING.snug, textAlign: "center" }}>
        {title}
      </span>
      <span style={{ fontSize: TYPE_SCALE.base, color: onBrand ? theme.brandOnPrimary : theme.textMuted, opacity: onBrand ? 0.9 : 1, lineHeight: LEADING.snug, textAlign: "center" }}>
        {sub}
      </span>
    </>
  );
}

/* Same press feedback as the main layout's hub tiles: brand fill, a slight
   shrink and a ripple while held (the tap tick comes from useRipple's global
   listener). The fill is held a moment after release so a quick tap still
   shows it. */
export function Pressable({ onClick, className, style, children }: {
  onClick: () => void;
  className: string;
  style: (pressed: boolean) => CSSProperties;
  children: (pressed: boolean) => ReactNode;
}) {
  const { onPointerDown, rippleElements } = useRipple("rgba(255,255,255,0.12)");
  const [pressed, setPressed] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = () => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 150);
  };
  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current); }, []);

  return (
    <button
      data-nav="true"
      onPointerDown={(e) => { onPointerDown(e); if (releaseTimer.current) clearTimeout(releaseTimer.current); setPressed(true); }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer transition-transform duration-100 ease-out ${className}`}
      style={{ border: "none", outline: "none", ...style(pressed), transform: pressed ? "scale(0.96)" : "scale(1)" }}
    >
      {rippleElements}
      {children(pressed)}
    </button>
  );
}
