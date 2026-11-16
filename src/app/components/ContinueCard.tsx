import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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

const TOOL_ICON: Record<string, LucideIcon> = { notes: StickyNote, whiteboard: PenTool, stopwatch: Timer };

const hostOf = (s?: string): string | null => {
  if (!s) return null;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) && u.hostname ? u.hostname.replace(/^www\./, "") : null;
  } catch { return null; }
};

/* Where the card goes: the empty stretch of the top bar after the hospital
   logo, the same place in every layout. Each top bar marks it with
   <ContinueCardSlot />. More than one can be mounted at once (Food Ordering
   draws its own bar over the home one), so the newest wins. */
const slots: HTMLElement[] = [];
const slotListeners = new Set<() => void>();
const subscribeSlots = (fn: () => void) => { slotListeners.add(fn); return () => { slotListeners.delete(fn); }; };
const currentSlot = () => slots[slots.length - 1] ?? null;

export function ContinueCardSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    slots.push(el);
    slotListeners.forEach((fn) => fn());
    return () => {
      const i = slots.indexOf(el);
      if (i >= 0) slots.splice(i, 1);
      slotListeners.forEach((fn) => fn());
    };
  }, []);
  /* The card is absolutely positioned inside, so however wide it is it never
     widens the top bar's columns or pushes the prayer times off centre. */
  return <div ref={ref} className="relative flex-1 min-w-0 self-stretch flex items-center" />;
}

/**
 * "Continue where you left off": the patient's last unfinished app, link,
 * game or tool, one tap from the home screen.
 *
 * Rendered once by App and shown in the top bar's slot (above). The record
 * lives in continueActivity.ts; this only reads it and re-checks the patient
 * whenever the screen comes back to the front.
 */
export function ContinueCard({
  hidden,
  onOpenGame,
  onOpenTool,
}: {
  hidden: boolean;
  onOpenGame: (id: string) => void;
  onOpenTool: (id: string) => void;
}) {
  const { theme } = useTheme();
  const { t, locale, isRTL, fontFamily, localizeNumber } = useLocale();
  const [activity, setActivity] = useState<ContinueActivity | null>(() => getVisibleActivity());
  const [now, setNow] = useState(() => Date.now());
  const slot = useSyncExternalStore(subscribeSlots, currentSlot);

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

  /* How much room the top bar leaves beside the logo depends on the hospital's
     logo and the screen. The name gives way first (ellipsis, down to
     SPACE[12] of it); then the icon goes; if Continue and × still do not fit
     (a phone's header) the card stays out of sight rather than run into the
     prayer times or off the canvas. Measured from the live elements, so a new
     logo or language needs no new numbers. */
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<"full" | "noIcon" | "none">("full");
  const shown = !hidden && !!activity && !!slot;
  useLayoutEffect(() => {
    const card = cardRef.current, nameEl = nameRef.current, buttons = buttonsRef.current;
    if (!shown || !card || !nameEl || !buttons || !slot) return;
    const check = () => {
      const s = getComputedStyle(card);
      const gap = parseFloat(s.columnGap) || 0;
      const frame = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight)
        + parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth);
      const rest = frame + gap + buttons.offsetWidth;
      const name = Math.min(nameEl.scrollWidth, parseFloat(SPACE[12]));
      const icon = parseFloat(SPACE[5]) + gap;
      const room = slot.clientWidth - parseFloat(SPACE[2]);
      setFit(room >= rest + icon + name ? "full" : room >= rest + name ? "noIcon" : "none");
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(slot);
    ro.observe(buttons);
    return () => ro.disconnect();
  }, [shown, slot, activity, locale]);

  if (!shown) return null;
  const a = activity!;

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

  const iconBox = { width: SPACE[5], height: SPACE[5], borderRadius: theme.radiusMd, flexShrink: 0 } as const;
  const Glyph = a.kind === "game" ? Gamepad2 : a.kind === "tool" ? (TOOL_ICON[a.id] ?? Play) : Play;
  const showImage = (a.kind === "app" || a.kind === "url") && !!iconSrc && !iconFailed;

  return createPortal(
    <div
      ref={cardRef}
      role="status"
      aria-hidden={fit === "none" || undefined}
      data-continue-card=""
      className="absolute flex items-center"
      style={{
        /* No offsets: the slot's flex start + centre place it right after the
           logo, vertically centred in the bar, on the start side in Arabic.
           SPACE[2] of air before the prayer times. max-content + max-width
           (rather than shrink-to-fit) is what lets the name, not the card,
           give way. */
        width: "max-content",
        maxWidth: `calc(100% - ${SPACE[2]})`,
        visibility: fit === "none" ? "hidden" : "visible",
        /* Hidden content still has layout; keep it from widening a phone's page. */
        overflow: fit === "none" ? "hidden" : undefined,
        gap: SPACE[1],
        padding: SPACE[1],
        borderRadius: theme.radiusLg,
        /* Elevated, not plain surface: in dark mode the plain surface is the
           top bar's own tone and the card would vanish into it. */
        backgroundColor: theme.surfaceElevated,
        border: theme.cardBorder,
        boxShadow: SHADOW.md,
        direction: isRTL ? "rtl" : "ltr",
        fontFamily,
        animation: "continueCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`@keyframes continueCardIn { from { opacity: 0; transform: translateY(-${SPACE[1]}); } to { opacity: 1; transform: none; } }`}</style>
      {fit !== "full" ? null : showImage ? (
        <ImageWithFallback
          src={iconSrc!}
          alt=""
          style={{ ...iconBox, objectFit: "cover" }}
          onError={() => setIconFailed(true)}
        />
      ) : (
        <div className="flex items-center justify-center" style={{ ...iconBox, backgroundColor: theme.primarySubtle }}>
          <Glyph size={22} strokeWidth={2.2} style={{ color: theme.iconBrand }} />
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span
          ref={nameRef}
          style={{
            ...TEXT_STYLE.subtitle, color: theme.textHeading,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {name}
        </span>
        <span
          style={{
            ...TEXT_STYLE.caption, color: theme.textMuted,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {ago}
        </span>
      </div>
      <div ref={buttonsRef} className="flex items-center shrink-0" style={{ gap: SPACE[1] }}>
        {/* Touch-sized (touchTargetMin) but no taller: the card has to sit
            inside the top bar. */}
        <TouchButton
          small
          onClick={onContinue}
          style={{ height: theme.touchTargetMin, paddingLeft: SPACE[2], paddingRight: SPACE[2], fontFamily, whiteSpace: "nowrap" }}
        >
          {t("continue.action")}
        </TouchButton>
        <IconButton
          onClick={() => clearActivity()}
          aria-label={t("continue.dismiss")}
          style={{ width: theme.touchTargetMin, height: theme.touchTargetMin }}
        >
          <X size={20} strokeWidth={2.5} style={{ color: theme.textMuted }} />
        </IconButton>
      </div>
    </div>,
    slot!,
  );
}
