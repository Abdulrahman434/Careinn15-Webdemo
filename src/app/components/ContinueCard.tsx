import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, PenTool, Play, StickyNote, Timer, X, type LucideIcon } from "lucide-react";
import { useTheme, TEXT_STYLE, TYPE_SCALE, WEIGHT, LEADING, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { TouchButton, IconButton } from "./primitives";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { proxyImageUrl } from "../lib/imageProxy";
import { fetchDeviceLocation } from "../lib/hospitalApi";
import { apps, getDeviceInfo, useAndroidEvent } from "../utils/androidBridge";
import {
  applyLocation, clearActivity, clearPendingLaunch, getVisibleActivity, markReturned, recordLaunch, subscribe,
  type ContinueActivity,
} from "../lib/continueActivity";
import { useLockedApps } from "../lib/lockedApps";

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

/* Controls the popped card must never cover. A home layout marks them with
   data-continue-keep-clear (Kids' and Spotlight's bottom action bars, the
   Call tile). Some are already tagged for other reasons and are used as they
   are: the CI layout's Call and CareMe tiles (data-call-button /
   data-careme-button) and portrait's CareMe card (data-tour="careme", which
   is near the bottom of a phone's page). */
const KEEP_CLEAR = '[data-continue-keep-clear], [data-call-button], [data-careme-button], [data-tour="careme"]';
/* How long a popped card stays before it docks, and how long docking takes. */
const POP_MS = 10_000;
const DOCK_MS = 350;
const reducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

type Mode = "popped" | "docking" | "docked";
type Fit = "full" | "noIcon" | "none";

/**
 * "Continue where you left off": the patient's last unfinished app, link,
 * game or tool, one tap from the home screen.
 *
 * Rendered once by App, inside the canvas. A record the patient has not seen
 * yet pops up as a large card at the bottom centre, so it is noticed right as
 * they come back; after POP_MS, or as soon as they touch anything else, it
 * docks into the top bar's slot (above), where it stays. The record lives in
 * continueActivity.ts; this only reads it and re-checks the patient whenever
 * the screen comes back to the front.
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
  const { theme, darkMode } = useTheme();
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

  /* Back from an outside app: kiosk-resumed on the kiosk, the tab becoming
     visible in a browser. Only now does an app/link record become a card. */
  const onReturn = useCallback(() => {
    markReturned();
    void recheckPatient();
  }, [recheckPatient]);
  /* A low-RAM kiosk can reload the WebView while the outside app is in front,
     and kiosk-resumed then fires before anything is listening. Being on
     screen when the card mounts counts as the return. */
  useEffect(() => {
    if (document.visibilityState === "visible") onReturn();
    else void recheckPatient();
  }, [onReturn, recheckPatient]);
  useAndroidEvent("kiosk-resumed", onReturn);
  /* Only the launch that failed: a game or an app the patient already came
     back from stays. */
  useAndroidEvent("app-launch-failed", () => clearPendingLaunch());
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

  /* Continue opens without the app-lock PIN, so a locked app, link, game or
     tool gets no card until the patient unlocks it. */
  const lockedIds = useLockedApps();
  const locked = !!activity?.lockId && lockedIds.has(activity.lockId);
  const shown = !hidden && !!activity && !locked && !!slot;
  const leftAt = activity?.leftAt ?? null;

  /* Pop once per record (per leftAt), the first time it can be seen. Kept in
     memory: a reload may pop it once more. An overlay opening over a popped
     card docks it, so closing the overlay never pops it again. Layout effect,
     so a new record never shows docked for a frame before it pops. */
  const [mode, setMode] = useState<Mode>("docked");
  const poppedFor = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!shown) {
      setMode("docked");
      return;
    }
    if (leftAt !== null && leftAt !== poppedFor.current) {
      poppedFor.current = leftAt;
      setMode("popped");
    }
  }, [shown, leftAt]);

  const popWrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popButtonsRef = useRef<HTMLDivElement>(null);
  const [dockTo, setDockTo] = useState<string | null>(null);

  /* Shrinks the popped card toward the slot in the top bar, then shows the
     docked card there. Straight to docked under reduced motion. */
  const dock = useCallback(() => {
    const card = popRef.current;
    const canvas = popWrapRef.current?.offsetParent as HTMLElement | null;
    if (reducedMotion() || !card || !canvas || !slot) {
      setMode("docked");
      return;
    }
    const c = card.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    const scale = canvas.getBoundingClientRect().width / canvas.offsetWidth || 1;
    const k = Math.min(1, s.height / c.height);
    const toX = (isRTL ? s.right - (c.width * k) / 2 : s.left + (c.width * k) / 2) - (c.left + c.width / 2);
    const toY = s.top + s.height / 2 - (c.top + c.height / 2);
    setDockTo(`translate(${toX / scale}px, ${toY / scale}px) scale(${k})`);
    setMode("docking");
  }, [slot, isRTL]);
  useEffect(() => {
    if (mode !== "docking") return;
    const id = window.setTimeout(() => setMode("docked"), DOCK_MS);
    return () => window.clearTimeout(id);
  }, [mode]);

  /* Popped: dock after POP_MS, or on a touch anywhere else. Capture phase and
     no preventDefault, so that touch still opens whatever is under it. */
  useEffect(() => {
    if (mode !== "popped") return;
    const id = window.setTimeout(dock, POP_MS);
    const onDown = (e: PointerEvent) => {
      if (popRef.current && e.target instanceof Node && popRef.current.contains(e.target)) return;
      dock();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [mode, dock, leftAt]);

  /* Where the popped card sits, measured from the live layout so a new layout
     or language needs no new numbers: bottom centre, SPACE[3] up, as wide as
     it can be without touching a KEEP_CLEAR control beside it (the title
     wraps first, then the icon goes). If even that will not fit beside them,
     it sits SPACE[3] above them instead (Kids' and Spotlight's action bars). */
  const [pop, setPop] = useState<{ bottom: number; maxWidth: number; fit: Fit } | null>(null);
  useLayoutEffect(() => {
    const wrap = popWrapRef.current, card = popRef.current, buttons = popButtonsRef.current;
    const canvas = wrap?.offsetParent as HTMLElement | null;
    if (mode !== "popped" || !wrap || !card || !buttons || !canvas) return;
    const place = () => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      const cr = canvas.getBoundingClientRect();
      const scale = cr.width / W || 1;
      const s = getComputedStyle(card);
      const gap = parseFloat(s.columnGap) || 0;
      const frame = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight)
        + parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth);
      /* The title wraps to a second line rather than lose the name, so it
         needs no more than SPACE[16] of width. */
      const textMin = parseFloat(SPACE[16]);
      const needNoIcon = frame + gap + buttons.offsetWidth + textMin;
      const needFull = needNoIcon + parseFloat(SPACE[8]) + gap;
      const edge = parseFloat(SPACE[3]), air = parseFloat(SPACE[2]);
      const cardH = card.offsetHeight;
      const blockers = [...canvas.querySelectorAll<HTMLElement>(KEEP_CLEAR)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({
          left: (r.left - cr.left) / scale, right: (r.right - cr.left) / scale,
          top: (r.top - cr.top) / scale, bottom: (r.bottom - cr.top) / scale,
        }));
      const mid = W / 2;
      let bottom = edge;
      for (let i = 0; i < 4; i++) {
        const top = H - bottom - cardH;
        const beside = blockers.filter((b) => b.bottom > top && b.top < H - bottom);
        let half = mid - edge;
        for (const b of beside) {
          half = Math.min(half, b.left >= mid ? b.left - mid - air : b.right <= mid ? mid - b.right - air : 0);
        }
        const room = Math.max(0, 2 * half);
        if (room >= needNoIcon || beside.length === 0) {
          return { bottom, maxWidth: room, fit: (room >= needFull ? "full" : "noIcon") as Fit };
        }
        bottom = H - Math.min(...beside.map((b) => b.top)) + edge;
      }
      return { bottom, maxWidth: W - 2 * edge, fit: "noIcon" as Fit };
    };
    const update = () => setPop((p) => {
      const n = place();
      return p && p.bottom === n.bottom && p.maxWidth === n.maxWidth && p.fit === n.fit ? p : n;
    });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(canvas);
    ro.observe(buttons);
    return () => ro.disconnect();
  }, [mode, activity, locale]);

  /* How much room the top bar leaves beside the logo depends on the hospital's
     logo and the screen. The name gives way first (ellipsis, down to
     SPACE[12] of it); then the icon goes; if Continue and × still do not fit
     (a phone's header) the card stays out of sight rather than run into the
     prayer times or off the canvas. Measured from the live elements, so a new
     logo or language needs no new numbers. */
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>("full");
  const docked = shown && mode === "docked";
  useLayoutEffect(() => {
    const card = cardRef.current, nameEl = nameRef.current, buttons = buttonsRef.current;
    if (!docked || !card || !nameEl || !buttons || !slot) return;
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
  }, [docked, slot, activity, locale]);

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
      recordLaunch({ kind: "app", id: a.id, name: a.name, nameAr: a.nameAr, icon: a.icon, lockId: a.lockId });
      apps.launch(a.id);
    } else if (a.kind === "url") {
      recordLaunch({ kind: "url", id: a.id, name: a.name, nameAr: a.nameAr, icon: a.icon, lockId: a.lockId });
      window.open(a.id, "_blank", "noopener,noreferrer");
    } else if (a.kind === "game") {
      onOpenGame(a.id);
    } else {
      onOpenTool(a.id);
    }
  };

  /* Brand fill with its own ink, so the card stands out from the white top
     bar and the home tiles. In dark mode the raw brand (a navy) sinks into
     the dark bar, so the fill is iconBrand: the same hue lifted to 3:1
     against the dark surface. */
  const fill = darkMode ? theme.iconBrand : theme.primary;
  const ink = theme.brandOnPrimary;
  const Glyph = a.kind === "game" ? Gamepad2 : a.kind === "tool" ? (TOOL_ICON[a.id] ?? Play) : Play;
  const showImage = (a.kind === "app" || a.kind === "url") && !!iconSrc && !iconFailed;
  const icon = (box: string, radius: string, glyph: number) => {
    const style = { width: box, height: box, borderRadius: radius, flexShrink: 0 } as const;
    return showImage ? (
      <ImageWithFallback src={iconSrc!} alt="" style={{ ...style, objectFit: "cover" }} onError={() => setIconFailed(true)} />
    ) : (
      <div className="flex items-center justify-center" style={{ ...style, backgroundColor: ink }}>
        <Glyph size={glyph} strokeWidth={2.2} style={{ color: fill }} />
      </div>
    );
  };
  const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
  const motion = `
    @keyframes continueCardIn { from { opacity: 0; transform: translateY(-${SPACE[1]}); } to { opacity: 1; transform: none; } }
    @keyframes continuePopIn { from { opacity: 0; transform: translateY(${SPACE[6]}); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { [data-continue-card] { animation: none !important; transition: none !important; } }`;

  if (mode !== "docked") {
    const p = pop ?? { bottom: parseFloat(SPACE[3]), maxWidth: 0, fit: "full" as Fit };
    return (
      <div
        ref={popWrapRef}
        className="absolute flex justify-center pointer-events-none"
        /* Above the home tiles, under the toasts (80). */
        style={{ left: 0, right: 0, bottom: p.bottom, zIndex: 60 }}
      >
        <div
          ref={popRef}
          role="status"
          data-continue-card="popped"
          className="flex items-center"
          style={{
            width: "max-content",
            maxWidth: p.maxWidth || `calc(100% - 2 * ${SPACE[3]})`,
            minWidth: 0,
            gap: SPACE[3],
            padding: SPACE[3],
            borderRadius: theme.radiusLg,
            backgroundColor: fill,
            boxShadow: SHADOW["2xl"],
            direction: isRTL ? "rtl" : "ltr",
            fontFamily,
            pointerEvents: mode === "popped" ? "auto" : "none",
            ...(mode === "docking"
              ? {
                  transform: dockTo ?? undefined,
                  opacity: 0,
                  transition: `transform ${DOCK_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${DOCK_MS}ms ease-in`,
                }
              : { animation: "continuePopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }),
          }}
        >
          <style>{motion}</style>
          {p.fit === "full" && icon(SPACE[8], theme.radiusMd, 34)}
          <div className="flex flex-col min-w-0" style={{ flex: "1 1 auto" }}>
            <span
              style={{
                fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, lineHeight: LEADING.snug, color: ink,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere",
              }}
            >
              {t("continue.titleWithName", name)}
            </span>
            <span style={{ ...TEXT_STYLE.body, color: ink, ...ellipsis }}>{ago}</span>
          </div>
          <div ref={popButtonsRef} className="flex items-center shrink-0" style={{ gap: SPACE[1] }}>
            <TouchButton
              onClick={onContinue}
              style={{
                height: SPACE[8], paddingLeft: SPACE[3], paddingRight: SPACE[3], gap: SPACE[1],
                borderRadius: theme.radiusFull, backgroundColor: ink, color: fill, boxShadow: "none",
                fontFamily, whiteSpace: "nowrap",
              }}
            >
              <Play size={22} strokeWidth={2.5} fill="currentColor" />
              {t("continue.action")}
            </TouchButton>
            <IconButton
              onClick={() => clearActivity()}
              aria-label={t("continue.dismiss")}
              style={{ width: theme.touchTargetMin, height: theme.touchTargetMin, backgroundColor: "transparent" }}
            >
              <X size={28} strokeWidth={2.5} style={{ color: ink }} />
            </IconButton>
          </div>
        </div>
      </div>
    );
  }

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
        backgroundColor: fill,
        /* A soft brand ring, so the card reads as one object on the bar. */
        boxShadow: `${SHADOW.md}, 0 0 0 4px ${theme.primaryBorder}`,
        direction: isRTL ? "rtl" : "ltr",
        fontFamily,
        animation: "continueCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{motion}</style>
      {fit === "full" && icon(SPACE[5], theme.radiusMd, 22)}
      <div className="flex flex-col min-w-0">
        <span ref={nameRef} style={{ ...TEXT_STYLE.subtitle, color: ink, ...ellipsis }}>
          {name}
        </span>
        <span style={{ ...TEXT_STYLE.caption, color: ink, ...ellipsis }}>
          {ago}
        </span>
      </div>
      <div ref={buttonsRef} className="flex items-center shrink-0" style={{ gap: SPACE[1] }}>
        {/* Touch-sized (touchTargetMin) but no taller: the card has to sit
            inside the top bar. */}
        <TouchButton
          small
          onClick={onContinue}
          style={{
            height: theme.touchTargetMin, paddingLeft: SPACE[2], paddingRight: SPACE[2],
            borderRadius: theme.radiusFull, backgroundColor: ink, color: fill, boxShadow: "none",
            fontFamily, whiteSpace: "nowrap",
          }}
        >
          {t("continue.action")}
        </TouchButton>
        <IconButton
          onClick={() => clearActivity()}
          aria-label={t("continue.dismiss")}
          style={{ width: theme.touchTargetMin, height: theme.touchTargetMin, backgroundColor: "transparent" }}
        >
          <X size={20} strokeWidth={2.5} style={{ color: ink }} />
        </IconButton>
      </div>
    </div>,
    slot!,
  );
}
