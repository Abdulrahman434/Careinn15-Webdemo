import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Lock, Hand } from "lucide-react";
import { useTheme, TEXT_STYLE, SHADOW, SPACE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { DIALOG, DialogActions, DialogButton } from "./dialogKit";
import { setHasSeenAppLockTutorial } from "../lib/appLockTutorialStore";

export interface TargetTileInfo {
  id: string;
  name: string;
  icon?: React.ReactNode;
  rect: DOMRect | null;
  onOpenOriginalApp: () => void;
}

interface AppLockTutorialOverlayProps {
  target: TargetTileInfo;
  onClose: () => void;
  onStartLockSetup: (appId: string, appName: string) => void;
}

const HOLD_DURATION_MS = 1000;
const CARD_GAP = 24;
const EDGE = 16;
const CARET = 14;

export function AppLockTutorialOverlay({
  target,
  onClose,
  onStartLockSetup,
}: AppLockTutorialOverlayProps) {
  const { theme: t } = useTheme();
  const { t: tr, isRTL, fontFamily } = useLocale();

  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const [cardHeight, setCardHeight] = useState(220);

  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [tr]);

  const finish = useCallback(() => {
    setHasSeenAppLockTutorial(true);
    onClose();
  }, [onClose]);

  const startLockSetup = useCallback(() => {
    finish();
    onStartLockSetup(target.id, target.name);
  }, [finish, onStartLockSetup, target.id, target.name]);

  const completeLongPress = useCallback(() => {
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 30, 40]); } catch { /* non-fatal */ }
    }
    startLockSetup();
  }, [startLockSetup]);

  /* Letting go early resets the ring: a hold is never counted unless it lasts. */
  const cancelHold = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    holdStartTimeRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(() => {
    cancelHold();
    setIsHolding(true);
    holdStartTimeRef.current = performance.now();

    const tick = (now: number) => {
      if (!holdStartTimeRef.current) return;
      const pct = Math.min(100, ((now - holdStartTimeRef.current) / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        cancelHold();
        completeLongPress();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [cancelHold, completeLongPress]);

  useEffect(() => () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  /* Remote / keyboard: Escape dismisses, holding OK is the same as holding the tile. */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && !isHolding && !e.repeat) startHold();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") cancelHold();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isHolding, startHold, cancelHold, finish]);

  const handleNotNow = () => {
    finish();
    target.onOpenOriginalApp();
  };

  /* ─── Placement ─── */
  const rect = target.rect;
  const tileWidth = rect ? rect.width : 200;
  const tileHeight = rect ? rect.height : 200;
  const tileLeft = rect ? rect.left : window.innerWidth / 2 - 100;
  const tileTop = rect ? rect.top : window.innerHeight / 2 - 100;

  const cardWidth = DIALOG.small;
  // The card sits on the reading-forward side of the tile (right in LTR, left
  // in RTL) and flips when that side has no room.
  const roomAfter = isRTL
    ? tileLeft - CARD_GAP - cardWidth >= EDGE
    : tileLeft + tileWidth + CARD_GAP + cardWidth <= window.innerWidth - EDGE;
  const onRight = isRTL ? !roomAfter : roomAfter;

  const coachLeft = Math.max(EDGE, Math.min(
    window.innerWidth - cardWidth - EDGE,
    onRight ? tileLeft + tileWidth + CARD_GAP : tileLeft - CARD_GAP - cardWidth,
  ));
  const tileCenterY = tileTop + tileHeight / 2;
  const coachTop = Math.max(EDGE, Math.min(window.innerHeight - cardHeight - EDGE, tileCenterY - cardHeight / 2));
  // The caret points at the tile's centre, kept clear of the card's corners.
  const caretTop = Math.max(32, Math.min(cardHeight - 32, tileCenterY - coachTop));

  const radius = parseFloat(t.radiusCard) || 40;

  return (
    <div
      className="fixed inset-0 z-[9990] select-none overflow-hidden"
      style={{ backgroundColor: t.overlay, fontFamily }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Tap outside: dismiss without opening anything */}
      <div className="absolute inset-0" onClick={(e) => { e.stopPropagation(); finish(); }} />

      {/* ─── The real tile, lifted above the dim layer ─── */}
      <div
        role="button"
        aria-label={`${tr("appLock.tutorial.pressAndHold")} — ${target.name}`}
        className="fixed z-[9995] flex flex-col items-center justify-center cursor-pointer active:scale-[0.97] transition-transform"
        style={{
          left: tileLeft,
          top: tileTop,
          width: tileWidth,
          height: tileHeight,
          backgroundColor: t.surfaceElevated,
          borderRadius: radius,
          boxShadow: `0 0 0 ${SPACE[1]} ${t.primarySubtle}, ${SHADOW.xl}`,
          touchAction: "none",
        }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Outline that fills around the tile while it is held */}
        <svg className="absolute inset-0 pointer-events-none" width={tileWidth} height={tileHeight} aria-hidden>
          <rect
            x={1.5} y={1.5} width={tileWidth - 3} height={tileHeight - 3}
            rx={radius - 1.5} ry={radius - 1.5}
            fill="none" stroke={t.primaryBorder} strokeWidth={3}
          />
          <rect
            x={1.5} y={1.5} width={tileWidth - 3} height={tileHeight - 3}
            rx={radius - 1.5} ry={radius - 1.5}
            fill="none" stroke={t.primary} strokeWidth={4} strokeLinecap="round"
            pathLength={100} strokeDasharray="100 100" strokeDashoffset={100 - holdProgress}
            style={{ opacity: isHolding ? 1 : 0 }}
          />
        </svg>

        {/* "Press and hold" label above the tile */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center whitespace-nowrap pointer-events-none"
          style={{
            bottom: `calc(100% + ${SPACE[2]})`,
            gap: SPACE[1],
            padding: `${SPACE[1]} ${SPACE[2]}`,
            borderRadius: t.radiusFull,
            backgroundColor: t.primary,
            color: t.brandOnPrimary,
            boxShadow: SHADOW.md,
            ...TEXT_STYLE.label,
          }}
        >
          <Hand size={16} strokeWidth={2.25} aria-hidden />
          <span>{tr("appLock.tutorial.pressAndHold")}</span>
          <span
            className="absolute left-1/2 -translate-x-1/2 rotate-45"
            style={{ bottom: -5, width: 10, height: 10, backgroundColor: t.primary }}
          />
        </div>

        <div className="relative flex flex-col items-center justify-center text-center" style={{ gap: SPACE[1], padding: SPACE[2] }}>
          <div
            className="flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: t.radiusMd, backgroundColor: t.primarySubtle, color: t.iconBrand }}
          >
            {target.icon ?? <Lock size={28} />}
          </div>
          <span style={{ ...TEXT_STYLE.subtitle, color: t.textHeading }}>{target.name}</span>
        </div>
      </div>

      {/* ─── Coachmark card ─── */}
      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="app-lock-tutorial-title"
        className="fixed z-[9996] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        style={{
          left: coachLeft,
          top: coachTop,
          width: cardWidth,
          padding: DIALOG.pad,
          backgroundColor: t.surfaceElevated,
          borderRadius: t.radiusLg,
          boxShadow: SHADOW.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caret pointing at the tile */}
        <span
          aria-hidden
          className="absolute rotate-45"
          style={{
            top: caretTop - CARET / 2,
            [onRight ? "left" : "right"]: -CARET / 2,
            width: CARET,
            height: CARET,
            backgroundColor: t.surfaceElevated,
          }}
        />

        <div
          className="flex items-center justify-center"
          style={{ width: 48, height: 48, borderRadius: t.radiusFull, backgroundColor: t.primarySubtle, color: t.iconBrand, marginBottom: SPACE[2] }}
        >
          <Lock size={24} strokeWidth={2.25} aria-hidden />
        </div>
        <h3 id="app-lock-tutorial-title" style={{ ...TEXT_STYLE.dialogTitle, color: t.textHeading, margin: 0 }}>
          {tr("appLock.tutorial.title")}
        </h3>
        <p style={{ ...TEXT_STYLE.dialogBody, color: t.textBody, margin: `${SPACE[1]} 0 0` }}>
          {tr("appLock.tutorial.body")}
        </p>

        <DialogActions>
          <DialogButton kind="secondary" label={tr("appLock.tutorial.notNow")} onClick={handleNotNow} />
          <DialogButton kind="primary" label={tr("appLock.setup.confirm")} onClick={startLockSetup} />
        </DialogActions>
      </div>
    </div>
  );
}
