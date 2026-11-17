import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { Gamepad2, PenTool, Play, StickyNote, Timer, X, type LucideIcon } from "lucide-react";
import { useTheme, TEXT_STYLE, TYPE_SCALE, WEIGHT, LEADING, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { TouchButton, IconButton } from "./primitives";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { GameMark, isGameMark } from "./gameMarks";
import { CLASSIC, SERVICES_GRID, PORTRAIT, KIDS, SPOTLIGHT, CI } from "./homeLayout";
import { proxyImageUrl } from "../lib/imageProxy";
import { fetchDeviceLocation } from "../lib/hospitalApi";
import { apps, getDeviceInfo, useAndroidEvent } from "../utils/androidBridge";
import {
  applyLocation, clearActivity, clearPendingLaunch, getVisibleActivity, markReturned, recordLaunch, subscribe,
  readPillSpot, savePillSpot,
  type ContinueActivity,
} from "../lib/continueActivity";
import { useLockedApps } from "../lib/lockedApps";
import { useCanvasSize } from "../lib/canvasSize";
import { setContinueLane, usePageLeavesLane } from "../lib/continueLane";
import { useHomeCovered } from "../lib/coversHome";

const TOOL_ICON: Record<string, LucideIcon> = { notes: StickyNote, whiteboard: PenTool, stopwatch: Timer };

const hostOf = (s?: string): string | null => {
  if (!s) return null;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) && u.hostname ? u.hostname.replace(/^www\./, "") : null;
  } catch { return null; }
};

/** Which home layout is on screen; each has its own fixed limits (restArea). */
export type ContinueLayout = "classic" | "classic-v2" | "classic-v3" | "ci" | "kids" | "spotlight" | "portrait";

/* How long a popped card stays before it docks, and how long docking takes. */
const POP_MS = 10_000;
const DOCK_MS = 350;
const reducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};
const px = (v: string) => parseFloat(v);

/* The record that last popped. Kept outside the component, so a remount (the
   canvas crossing the handheld size, say) never pops a docked record again; a
   reload may pop it once more. */
let poppedFor: number | null = null;

type Mode = "popped" | "docking" | "docked";
type Area = { bottom: number; maxWidth: number; maxHeight: number };

/**
 * Where the card may sit on each layout, worked out from the layouts' own
 * fixed sizes (homeLayout.ts), never from the page: bottom centre, `bottom`
 * up, no wider than `maxWidth` and no taller than `maxHeight`. Call, CareMe
 * and the action bars stay clear whether a hospital shows them or not.
 * Layouts mirror in Arabic around the centre, so the distances are the same.
 */
function restArea(layout: ContinueLayout, W: number, H: number, compact: boolean, laned: boolean): Area {
  const edge = px(compact ? SPACE[2] : SPACE[3]);
  const air = px(SPACE[2]);
  const mid = W / 2;
  const across = W - 2 * edge;
  /** As wide as it can be with `air` to spare before something `reach` from the centre. */
  const beside = (reach: number) => Math.min(across, 2 * (reach - air));
  /** Classic: no higher than the bottom row of service cards (v3: CareMe sits just above it). */
  const bottomRowBand = CLASSIC.bottomEdge + SERVICES_GRID.bottomRow - edge;
  switch (layout) {
    case "classic":
    case "classic-v3": {
      /* Call is the fourth card of the bottom row, the one before the end rail. */
      const tile = (W - 2 * CLASSIC.edge - CLASSIC.startColumn - CLASSIC.rail - 2 * CLASSIC.columnGap - 3 * SERVICES_GRID.tileGap) / 4;
      const call = W - CLASSIC.edge - CLASSIC.rail - CLASSIC.columnGap - tile;
      return { bottom: edge, maxWidth: beside(call - mid), maxHeight: bottomRowBand };
    }
    case "classic-v2": {
      /* Call is in the end rail, CareMe in the start column. */
      const reach = Math.min(W - CLASSIC.edge - CLASSIC.rail - mid, mid - CLASSIC.edge - CLASSIC.startColumn);
      return { bottom: edge, maxWidth: beside(reach), maxHeight: bottomRowBand };
    }
    case "portrait": {
      /* A page that scrolls ends above the card's own lane (continueLane). */
      if (laned) return { bottom: edge, maxWidth: across, maxHeight: Infinity };
      /* One that fits: Call ends one gap above the shortcuts row. */
      const row = H >= PORTRAIT.roomyMinHeight ? PORTRAIT.shortcutsRow.roomy : PORTRAIT.shortcutsRow.tablet;
      return { bottom: edge, maxWidth: across, maxHeight: PORTRAIT.edge + row + PORTRAIT.gap - edge - air };
    }
    case "kids":
      return { bottom: KIDS.bottomEdge + KIDS.actionBar + edge, maxWidth: across, maxHeight: Infinity };
    case "spotlight": {
      const careMe = W - SPOTLIGHT.cards.insetEnd - SPOTLIGHT.cards.width;
      return { bottom: SPOTLIGHT.actionBar.bottom + SPOTLIGHT.actionBar.height + edge, maxWidth: beside(careMe - mid), maxHeight: Infinity };
    }
    case "ci": {
      /* Above the bottom group of tiles (Call first), and clear of the whole
         main block (CareMe is in it), all at their largest scale. */
      const grow = (CI.tileScaleMax - 1) / 2;
      const rowTop = CI.bottomTiles.bottom + CI.bottomTiles.height * (1 + grow);
      const m = CI.mainTiles;
      const block = W - m.end - m.columns * m.size - (m.columns - 1) * m.gap - m.size * grow;
      return { bottom: rowTop + edge, maxWidth: beside(block - mid), maxHeight: Infinity };
    }
  }
}

/**
 * "Continue where you left off": the patient's last unfinished app, link,
 * game or tool, one tap from the home screen.
 *
 * Rendered once by App, inside the canvas. A record the patient has not seen
 * yet pops up as a large card at the bottom centre, so it is noticed right as
 * they come back; after POP_MS, or as soon as they touch anything else, it
 * shrinks in place into a small pill, where it stays. The record lives in
 * continueActivity.ts; this only reads it and re-checks the patient whenever
 * the screen comes back to the front.
 */
export function ContinueCard({
  hidden,
  layout,
  onOpenGame,
  onOpenTool,
}: {
  hidden: boolean;
  layout: ContinueLayout;
  onOpenGame: (id: string) => void;
  onOpenTool: (id: string) => void;
}) {
  const { theme, darkMode } = useTheme();
  const { t, locale, isRTL, fontFamily, localizeNumber } = useLocale();
  const canvas = useCanvasSize();
  const [activity, setActivity] = useState<ContinueActivity | null>(() => getVisibleActivity());
  const [now, setNow] = useState(() => Date.now());
  /* Where the patient dragged the pill (fractions of the canvas), or null. */
  const [spot, setSpot] = useState(() => readPillSpot());

  const refresh = useCallback(() => {
    setActivity(getVisibleActivity());
    setSpot(readPillSpot());
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
  /* Out of sight under any popup, drawer or panel a layout draws (coversHome). */
  const covered = useHomeCovered();
  const shown = !hidden && !covered && !!activity && !locked;
  const leftAt = activity?.leftAt ?? null;

  /* Pop once per record (per leftAt), the first time it can be seen. An
     overlay opening over a popped card docks it, so closing the overlay never
     pops it again. Layout effect, so a new record never shows as a pill for a
     frame before it pops. */
  const [mode, setMode] = useState<Mode>("docked");
  useLayoutEffect(() => {
    if (!shown) {
      setMode("docked");
      return;
    }
    if (leftAt !== null && leftAt !== poppedFor) {
      poppedFor = leftAt;
      setMode("popped");
    }
  }, [shown, leftAt]);

  const pageLeavesLane = usePageLeavesLane();
  const laned = layout === "portrait" && pageLeavesLane;
  const area = restArea(layout, canvas.width, canvas.height, canvas.compact, laned);
  /* The pill is one touch target high, with SPACE[1] around it. */
  const pillH = px(theme.touchTargetMin) + 2 * px(SPACE[1]);

  /* The pill can be dragged anywhere (spec §6d); the canvas edges are the
     only limit. Its centre: the live drag, else the patient's saved spot
     (re-clamped to the canvas as it is now), else null = the default spot at
     the bottom centre. */
  const W = canvas.width, H = canvas.height;
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillSize, setPillSize] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const clampCentre = (x: number, y: number) => {
    const hw = (pillSize.w || pillH) / 2, hh = (pillSize.h || pillH) / 2;
    return { x: Math.min(Math.max(x, hw), W - hw), y: Math.min(Math.max(y, hh), H - hh) };
  };
  const pillAt = drag ?? (spot ? clampCentre(spot.x * W, spot.y * H) : null);
  /* Where the pill comes to rest, for the dock animation to aim at. */
  const restCentre = pillAt ?? { x: W / 2, y: H - area.bottom - pillH / 2 };
  const restRef = useRef(restCentre);
  restRef.current = restCentre;

  const popRef = useRef<HTMLDivElement>(null);
  const [dockTo, setDockTo] = useState("none");
  /* Shrinks the popped card toward where the pill rests: in place at the
     default spot, or across to the patient's spot. Straight to the pill under
     reduced motion. */
  const dock = useCallback(() => {
    const el = popRef.current;
    const h = el?.offsetHeight;
    if (reducedMotion() || !el || !h) {
      setMode("docked");
      return;
    }
    const k = Math.min(1, pillH / h);
    const from = { x: W / 2, y: H - area.bottom - h / 2 };
    const to = restRef.current;
    setDockTo(`translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${k})`);
    setMode("docking");
  }, [pillH, W, H, area.bottom]);
  useEffect(() => {
    if (mode !== "docking") return;
    const id = window.setTimeout(() => setMode("docked"), DOCK_MS);
    return () => window.clearTimeout(id);
  }, [mode]);

  /* The pill measures only itself, to stay whole inside the canvas. */
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => setPillSize((p) => (p.w === el.offsetWidth && p.h === el.offsetHeight ? p : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, shown]);

  /* Drag vs tap: a touch that moves less than SPACE[2] (canvas px) is a tap
     and resumes; past that the pill follows the finger, and letting go
     neither resumes nor reaches the tile underneath. Finger movement is
     divided by the canvas scale, so the pill tracks the finger exactly at any
     screen size. Only one pointer drives it; a second finger is ignored.
     Pointer capture starts only once it is a drag, so a plain tap or mouse
     click still lands on the button and resumes. */
  type Drag = { id: number; sx: number; sy: number; lx: number; ly: number; cx: number; cy: number; scale: number; moved: boolean; el: HTMLElement };
  const dragRef = useRef<Drag | null>(null);
  const unlisten = useRef<(() => void) | null>(null);
  const swallowClick = useRef(false);
  const live = useRef({ clampCentre, W, H });
  live.current = { clampCentre, W, H };
  const at = (d: Drag) => live.current.clampCentre(d.cx + (d.lx - d.sx) / d.scale, d.cy + (d.ly - d.sy) / d.scale);
  /* Every way a drag ends comes here: release, cancel, lost capture, the
     card being hidden, unmounting. `commit` saves where it was last moved
     to (never a cancel's own coordinates, which some engines send as 0,0). */
  const endDrag = useCallback((commit: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    unlisten.current?.();
    unlisten.current = null;
    setDrag(null);
    if (!d || !d.moved) return;
    try { if (d.el.hasPointerCapture(d.id)) d.el.releasePointerCapture(d.id); } catch { /* already gone */ }
    if (!commit) return;
    const c = at(d);
    const next = { x: c.x / live.current.W, y: c.y / live.current.H };
    savePillSpot(next);
    setSpot(next);
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
  }, []);
  useEffect(() => { if (!shown) endDrag(false); }, [shown, endDrag]);
  useEffect(() => () => endDrag(false), [endDrag]);
  const onPillDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = pillRef.current;
    const canvasEl = el?.closest("#careinn-canvas") as HTMLElement | null;
    if (!el || !canvasEl) return;
    const cr = canvasEl.getBoundingClientRect();
    const scale = cr.width / canvasEl.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    const d: Drag = {
      id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, scale, moved: false, el,
      cx: (r.left + r.width / 2 - cr.left) / scale, cy: (r.top + r.height / 2 - cr.top) / scale,
    };
    dragRef.current = d;
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== d.id || dragRef.current !== d) return;
      d.lx = ev.clientX;
      d.ly = ev.clientY;
      if (!d.moved) {
        if (Math.hypot((d.lx - d.sx) / d.scale, (d.ly - d.sy) / d.scale) < px(SPACE[2])) return;
        d.moved = true;
        try { d.el.setPointerCapture(d.id); } catch { /* pointer already gone */ }
      }
      setDrag(at(d));
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== d.id || dragRef.current !== d) return;
      d.lx = ev.clientX;
      d.ly = ev.clientY;
      endDrag(true);
    };
    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId === d.id && dragRef.current === d) endDrag(true);
    };
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    unlisten.current = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
    };
  };
  /* Only the pill's own capture: a touch is first captured by the element
     under the finger, and that loss (when the pill takes over) bubbles here. */
  const onPillLostCapture = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d && d.moved && e.pointerId === d.id && e.target === e.currentTarget) endDrag(true);
  };

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

  /* The popped card measures only itself. Continue and × move to a second,
     full-width row when they do not fit beside the icon and a SPACE[24]-wide
     name (a phone). The title takes up to two lines, or one if two would make
     the card taller than its layout allows (a tablet's portrait page). */
  const popButtonsRef = useRef<HTMLDivElement>(null);
  const [twoRows, setTwoRows] = useState(false);
  const [oneLine, setOneLine] = useState(false);
  const [popH, setPopH] = useState(0);
  /* Phones step every size down one SPACE step; type steps down by itself
     (PHONE_TYPE_SCALE). */
  const compact = canvas.compact;
  const pad = compact ? SPACE[2] : SPACE[3];
  const popIcon = compact ? SPACE[6] : SPACE[8];
  const pillIcon = compact ? SPACE[4] : SPACE[5];
  useLayoutEffect(() => {
    setTwoRows(false);
    setOneLine(false);
  }, [leftAt, locale, layout, canvas.width, canvas.height]);
  useLayoutEffect(() => {
    const el = popRef.current, buttons = popButtonsRef.current;
    if (!el || !buttons || mode !== "popped") return;
    const measure = () => {
      if (!twoRows && area.maxWidth < 4 * px(pad) + px(popIcon) + px(SPACE[24]) + buttons.offsetWidth) {
        setTwoRows(true);
        return;
      }
      if (!oneLine && el.offsetHeight > area.maxHeight) setOneLine(true);
      setPopH(el.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, area.maxWidth, area.maxHeight, pad, popIcon, twoRows, oneLine]);

  /* Portrait: a page that scrolls ends above the card (PortraitHome reads the
     lane). While docking it already holds the pill's height, so the page
     eases with the card instead of jumping after it. A pill the patient has
     moved keeps no lane. */
  const lane = layout === "portrait" && shown && (mode === "popped" || !spot)
    ? (mode === "popped" ? popH : pillH) + area.bottom + px(SPACE[1])
    : 0;
  useEffect(() => { setContinueLane(lane); }, [lane]);
  useEffect(() => () => setContinueLane(0), []);

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
  const title = t("continue.titleWithName", name);

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

  /* Light: brand fill, white ink, a white Continue button. Dark: the card
     simply turns white, with brand ink and a brand Continue button. */
  const fill = darkMode ? theme.surfaceLight : theme.primary;
  const ink = darkMode ? theme.primaryOnLight : theme.brandOnPrimary;
  const buttonBg = darkMode ? theme.primary : theme.brandOnPrimary;
  const buttonInk = darkMode ? theme.brandOnPrimary : theme.primary;

  /* Each item's own icon: a game's Games-folder tile in miniature, an app's
     logo, a tool's glyph. */
  const Glyph = a.kind === "tool" ? (TOOL_ICON[a.id] ?? Play) : a.kind === "game" ? Gamepad2 : Play;
  const showImage = (a.kind === "app" || a.kind === "url") && !!iconSrc && !iconFailed;
  const icon = (size: string, radius: string, glyph: number) => {
    if (a.kind === "game" && isGameMark(a.id)) return <GameMark id={a.id} size={size} radius={radius} />;
    const box = { width: size, height: size, borderRadius: radius, flexShrink: 0 } as const;
    return showImage ? (
      <ImageWithFallback src={iconSrc!} alt="" draggable={false} style={{ ...box, objectFit: "cover" }} onError={() => setIconFailed(true)} />
    ) : (
      <div className="flex items-center justify-center" style={{ ...box, backgroundColor: buttonBg }}>
        <Glyph size={glyph} strokeWidth={2.2} style={{ color: buttonInk }} />
      </div>
    );
  };
  const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
  const motion = `
    @keyframes continuePopIn { from { opacity: 0; transform: translateY(${SPACE[6]}); } to { opacity: 1; transform: none; } }
    @keyframes continuePillIn { from { opacity: 0; transform: scale(1.15); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { [data-continue-card] { animation: none !important; transition: none !important; } }`;
  /* Above the home tiles, under the toasts (80). */
  const restingAt = (children: ReactNode) => (
    <div
      className="absolute flex justify-center pointer-events-none"
      style={pillAt
        ? { left: pillAt.x - (pillSize.w || pillH) / 2, top: pillAt.y - (pillSize.h || pillH) / 2, zIndex: 60 }
        : { left: 0, right: 0, bottom: area.bottom, zIndex: 60 }}
    >
      {children}
    </div>
  );
  const atBottom = (children: ReactNode) => (
    <div className="absolute flex justify-center pointer-events-none" style={{ left: 0, right: 0, bottom: area.bottom, zIndex: 60 }}>
      {children}
    </div>
  );

  const dragging = !!drag;
  const pill = mode !== "popped" && restingAt(
    <div
      ref={pillRef}
      role="status"
      data-continue-card="pill"
      className={`flex items-center pointer-events-auto transition-transform duration-150 ${dragging ? "motion-safe:scale-[1.04]" : ""}`}
      onPointerDown={onPillDown}
      onLostPointerCapture={onPillLostCapture}
      onClickCapture={(e) => { if (swallowClick.current) { e.stopPropagation(); e.preventDefault(); swallowClick.current = false; } }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{
        /* No native pan, long-press menu, text selection or image drag: on
           Android these cancel the pointer mid-drag. */
        touchAction: "none",
        WebkitTouchCallout: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        cursor: dragging ? "grabbing" : undefined,
        height: pillH,
        /* No wider than twelve of its icons (480 on bedside screens, 384 on
           phones); a longer name gives way. */
        maxWidth: Math.min(area.maxWidth, 12 * px(pillIcon)),
        padding: SPACE[1],
        paddingInlineStart: `calc((${pillH}px - ${pillIcon}) / 2)`,
        borderRadius: theme.radiusFull,
        backgroundColor: fill,
        /* Lifted while it is being dragged. */
        boxShadow: dragging ? SHADOW["2xl"] : SHADOW.xl,
        direction: isRTL ? "rtl" : "ltr",
        fontFamily,
        animation: `continuePillIn ${DOCK_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      <style>{motion}</style>
      <button
        onClick={onContinue}
        className="flex items-center min-w-0 cursor-pointer active:scale-[0.97] transition-transform"
        style={{ height: theme.touchTargetMin, gap: SPACE[2], background: "none", border: "none", outline: "none", padding: 0, fontFamily }}
      >
        {icon(pillIcon, theme.radiusSm, compact ? 18 : 22)}
        <span style={{ fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, lineHeight: LEADING.tight, color: ink, ...ellipsis }}>
          {title}
        </span>
      </button>
      {/* × dismisses and never starts a drag. */}
      <span className="contents" onPointerDown={(e) => e.stopPropagation()}>
        <IconButton
          onClick={() => clearActivity()}
          aria-label={t("continue.dismiss")}
          style={{ width: theme.touchTargetMin, height: theme.touchTargetMin, backgroundColor: "transparent", flexShrink: 0 }}
        >
          <X size={20} strokeWidth={2.5} style={{ color: ink }} />
        </IconButton>
      </span>
    </div>,
  );

  if (mode === "docked") return pill;

  return (
    <>
      {pill}
      {atBottom(
        <div
          ref={popRef}
          /* One live region at a time: while it shrinks away, the pill under
             it is the one that speaks. */
          role={mode === "popped" ? "status" : undefined}
          aria-hidden={mode === "docking" || undefined}
          data-continue-card="popped"
          className={twoRows ? "flex flex-col" : "flex items-center"}
          style={{
            width: twoRows ? area.maxWidth : "max-content",
            maxWidth: area.maxWidth,
            gap: pad,
            padding: pad,
            borderRadius: theme.radiusLg,
            backgroundColor: fill,
            boxShadow: SHADOW.xl,
            direction: isRTL ? "rtl" : "ltr",
            fontFamily,
            transformOrigin: "center",
            pointerEvents: mode === "popped" ? "auto" : "none",
            ...(mode === "docking"
              ? {
                  transform: dockTo,
                  opacity: 0,
                  transition: `transform ${DOCK_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${DOCK_MS}ms ease-in`,
                }
              : { animation: "continuePopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }),
          }}
        >
          <style>{motion}</style>
          <div className="flex items-center min-w-0" style={{ gap: pad, flex: "1 1 auto" }}>
            {icon(popIcon, theme.radiusMd, compact ? 26 : 34)}
            <div className="flex flex-col min-w-0" style={{ flex: "1 1 auto" }}>
              <span
                style={{
                  fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, lineHeight: LEADING.snug, color: ink,
                  display: "-webkit-box", WebkitLineClamp: oneLine ? 1 : 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden", overflowWrap: "anywhere",
                }}
              >
                {title}
              </span>
              <span style={{ ...TEXT_STYLE.body, color: ink, ...ellipsis }}>{ago}</span>
            </div>
          </div>
          <div ref={popButtonsRef} className="flex items-center shrink-0" style={{ gap: SPACE[1] }}>
            <TouchButton
              onClick={onContinue}
              style={{
                flex: twoRows ? "1 1 auto" : undefined, height: compact ? theme.touchTargetMin : SPACE[8],
                paddingLeft: pad, paddingRight: pad, gap: SPACE[1],
                borderRadius: theme.radiusFull, backgroundColor: buttonBg, color: buttonInk, boxShadow: "none",
                fontFamily, whiteSpace: "nowrap",
              }}
            >
              <Play size={compact ? 18 : 22} strokeWidth={2.5} fill="currentColor" />
              {t("continue.action")}
            </TouchButton>
            <IconButton
              onClick={() => clearActivity()}
              aria-label={t("continue.dismiss")}
              style={{ width: theme.touchTargetMin, height: theme.touchTargetMin, backgroundColor: "transparent", flexShrink: 0 }}
            >
              <X size={compact ? 24 : 28} strokeWidth={2.5} style={{ color: ink }} />
            </IconButton>
          </div>
        </div>,
      )}
    </>
  );
}
