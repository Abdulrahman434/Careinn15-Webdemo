import { useCallback, useEffect, useState } from "react";
import { Gamepad2, PenTool, Play, StickyNote, Timer, X, type LucideIcon } from "lucide-react";
import { useTheme, TEXT_STYLE, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { TouchButton, IconButton } from "./primitives";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { proxyImageUrl } from "../lib/imageProxy";
import { fetchDeviceLocation } from "../lib/hospitalApi";
import { apps, getDeviceInfo, useAndroidEvent } from "../utils/androidBridge";
import {
  applyLocation, clearActivity, getVisibleActivity, markReturned, recordLaunch, subscribe,
  type ContinueActivity,
} from "../lib/continueActivity";

/** Which home layout is showing; each one has its own clear spot for the card. */
export type ContinueLayout = "v1" | "v2" | "v3" | "ci" | "kids" | "spotlight" | "portrait";

/* Where the card sits on each home layout, in canvas px (1920×1080; portrait
   1080×1920). The bottom-start corner itself is taken in every layout but
   Spotlight — CareMe, the hub tiles, Call Nurse, the shortcut row — so the
   card sits on the nearest stretch of empty tile or photo, clear of icons,
   labels and those controls. "start" mirrors in RTL with the layout; CI keeps
   its tile grid on the same sides in Arabic, so its spot does not move. */
const PLACEMENT: Record<ContinueLayout, { bottom: number; inset: number; side: "start" | "left" }> = {
  v1: { bottom: 224, inset: 464, side: "start" },        // empty lower half of the 2nd hub row, above the service row
  v2: { bottom: 224, inset: 464, side: "start" },        // same, above the shortcut strip
  v3: { bottom: 381, inset: 497, side: "start" },        // over the greeting photo
  ci: { bottom: 184, inset: 400, side: "left" },         // on the background photo, right of the tile grid, above the small tiles
  kids: { bottom: 118, inset: 660, side: "start" },      // empty middle of the last activity row, above the Call Nurse bar
  spotlight: { bottom: 160, inset: 212, side: "start" }, // beside the sidebar, above the Call bar
  portrait: { bottom: 436, inset: 33, side: "start" },   // empty lower half of the 2nd hub row
};

const TOOL_ICON: Record<string, LucideIcon> = { notes: StickyNote, whiteboard: PenTool, stopwatch: Timer };

const hostOf = (s?: string): string | null => {
  if (!s) return null;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) && u.hostname ? u.hostname.replace(/^www\./, "") : null;
  } catch { return null; }
};

/**
 * "Continue where you left off": the patient's last unfinished app, link,
 * game or tool, one tap from the home screen.
 *
 * Floats in the bottom corner of the 1920×1080 canvas on the side away from
 * the toasts, rendered once for every layout like UpdateBanner. The record
 * lives in continueActivity.ts; this only reads it and re-checks the patient
 * whenever the screen comes back to the front.
 */
export function ContinueCard({
  hidden,
  onOpenGame,
  onOpenTool,
  layout = "v1",
}: {
  hidden: boolean;
  onOpenGame: (id: string) => void;
  onOpenTool: (id: string) => void;
  layout?: ContinueLayout;
}) {
  const { theme } = useTheme();
  const { t, locale, isRTL, fontFamily, localizeNumber } = useLocale();
  const [activity, setActivity] = useState<ContinueActivity | null>(() => getVisibleActivity());
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    setActivity(getVisibleActivity());
    setNow(Date.now());
  }, []);

  useEffect(() => subscribe(refresh), [refresh]);
  /* The 60 s tick keeps "Left N min ago" true. display-name-changed is fired
     by the full wipe (clearEverything), which clears storage without telling
     continueActivity's subscribers. */
  useEffect(() => {
    const id = window.setInterval(refresh, 60_000);
    window.addEventListener("display-name-changed", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("display-name-changed", refresh);
    };
  }, [refresh]);
  /* A game can finish and drop its save while it is open; read again as the
     home screen comes back. */
  useEffect(() => { if (!hidden) refresh(); }, [hidden, refresh]);

  /* A different patient in the bed, or an empty bed, wipes the record. A
     failed lookup (null) keeps what is there. No serial = plain browser, one
     fixed demo patient. */
  const recheckPatient = useCallback(async () => {
    const serial = getDeviceInfo()?.serial;
    if (!serial) return;
    applyLocation(await fetchDeviceLocation(serial));
    refresh();
  }, [refresh]);
  useEffect(() => { void recheckPatient(); }, [recheckPatient]);

  /* Back from an outside app: kiosk-resumed on the kiosk, the tab becoming
     visible in a browser. Only now does an app/link record become a card. */
  const onReturn = useCallback(() => {
    markReturned();
    void recheckPatient();
  }, [recheckPatient]);
  useAndroidEvent("kiosk-resumed", onReturn);
  useAndroidEvent("app-launch-failed", () => clearActivity());
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") onReturn(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [onReturn]);

  const [iconSrc, setIconSrc] = useState<string | null>(null);
  const [iconFailed, setIconFailed] = useState(false);
  const rawIcon = activity && (activity.kind === "app" || activity.kind === "url") ? activity.icon : undefined;
  useEffect(() => {
    setIconSrc(null);
    setIconFailed(false);
    if (!rawIcon) return;
    let cancelled = false;
    proxyImageUrl(rawIcon)
      .then((src) => { if (!cancelled) setIconSrc(src || null); })
      .catch(() => { /* fall back to the play glyph */ });
    return () => { cancelled = true; };
  }, [rawIcon]);

  if (hidden || !activity) return null;
  const a = activity;

  let name: string;
  if (a.kind === "game") name = t(`continue.game.${a.id}`);
  else if (a.kind === "tool") name = t(`tool.${a.id}`);
  else {
    const label = (locale === "ar" || locale === "ur") && a.nameAr ? a.nameAr : a.name;
    /* The launcher's address bar records the typed URL as the name. */
    name = label && !hostOf(label) ? label : hostOf(label) ?? hostOf(a.id) ?? a.id;
  }

  const mins = Math.floor((now - a.leftAt) / 60_000);
  const ago = mins < 1
    ? t("continue.justNow")
    : mins < 60
      ? t("continue.minAgo", localizeNumber(mins))
      : t("continue.hoursAgo", localizeNumber(Math.floor(mins / 60)));

  const onContinue = () => {
    if (a.kind === "app") {
      recordLaunch({ kind: "app", id: a.id, name: a.name, nameAr: a.nameAr, icon: a.icon });
      apps.launch(a.id);
    } else if (a.kind === "url") {
      recordLaunch({ kind: "url", id: a.id, name: a.name, nameAr: a.nameAr, icon: a.icon });
      window.open(a.id, "_blank", "noopener,noreferrer");
    } else if (a.kind === "game") {
      onOpenGame(a.id);
    } else {
      onOpenTool(a.id);
    }
  };

  const spot = PLACEMENT[layout];
  const side = spot.side === "left" ? "left" : isRTL ? "right" : "left";
  const iconBox = { width: SPACE[6], height: SPACE[6], borderRadius: theme.radiusMd, flexShrink: 0 } as const;
  const Glyph = a.kind === "game" ? Gamepad2 : a.kind === "tool" ? (TOOL_ICON[a.id] ?? Play) : Play;
  const showImage = (a.kind === "app" || a.kind === "url") && !!iconSrc && !iconFailed;

  return (
    <div
      role="status"
      data-continue-card=""
      className="absolute flex items-center"
      style={{
        bottom: `${spot.bottom}px`,
        [side]: `${spot.inset}px`,
        /* Over the home layouts, under every dialog, panel and toast (60+). */
        zIndex: 50,
        maxWidth: `calc(100% - 2 * ${SPACE[3]})`,
        gap: SPACE[2],
        padding: SPACE[2],
        borderRadius: theme.radiusLg,
        /* Elevated, not plain surface: in dark mode the plain surface is the
           tone of the cards it floats over. */
        backgroundColor: theme.surfaceElevated,
        border: theme.cardBorder,
        boxShadow: SHADOW.xl,
        direction: isRTL ? "rtl" : "ltr",
        fontFamily,
        animation: "continueCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`@keyframes continueCardIn { from { opacity: 0; transform: translateY(${SPACE[2]}); } to { opacity: 1; transform: none; } }`}</style>
      {showImage ? (
        <ImageWithFallback
          src={iconSrc!}
          alt=""
          style={{ ...iconBox, objectFit: "cover" }}
          onError={() => setIconFailed(true)}
        />
      ) : (
        <div className="flex items-center justify-center" style={{ ...iconBox, backgroundColor: theme.primarySubtle }}>
          <Glyph size={26} strokeWidth={2.2} style={{ color: theme.iconBrand }} />
        </div>
      )}
      <div className="flex flex-col min-w-0" style={{ maxWidth: SPACE[24] }}>
        <span
          style={{
            ...TEXT_STYLE.subtitle, color: theme.textHeading,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
        <span style={{ ...TEXT_STYLE.body, color: theme.textMuted, whiteSpace: "nowrap" }}>{ago}</span>
      </div>
      <TouchButton onClick={onContinue} style={{ fontFamily, gap: SPACE[1], flexShrink: 0, whiteSpace: "nowrap" }}>
        <Play size={20} strokeWidth={2.5} fill="currentColor" />
        {t("continue.action")}
      </TouchButton>
      <IconButton onClick={() => clearActivity()} aria-label={t("continue.dismiss")} style={{ flexShrink: 0 }}>
        <X size={20} strokeWidth={2.5} style={{ color: theme.textMuted }} />
      </IconButton>
    </div>
  );
}
