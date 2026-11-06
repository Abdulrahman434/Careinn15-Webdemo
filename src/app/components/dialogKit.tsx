/**
 * One popup system for the whole app.
 *
 *   Frame      400 wide (PIN, confirm), 450 (the device lists: Wi-Fi,
 *              Bluetooth, Cast) or 480 (lists, QR, forms). 28 padding,
 *              radius XL, surface, the XL shadow, the theme overlay behind.
 *   Two kinds  "pin" — a keypad popup: title, line and keypad all centred.
 *              "standard" — everything else (choices, lists, confirms):
 *              title and line start-aligned, like the content under them.
 *              Never a start-aligned title over centred content, or the
 *              reverse. Notification popups are their own design, not this.
 *   Title bar  The name of what was tapped ("Change PIN", not "Password"),
 *              × at the end, Back (when there is one) at the start.
 *              Standard popups carry an icon tile before the title saying
 *              what the popup is about (the item, Log out, Wi-Fi): brand
 *              tint, or red for something that can't be undone. PIN popups
 *              carry none — the keypad says what they are.
 *   Text       One short line under the title, muted.
 *   Height     At most 640 (≈60% of the 1080 screen). The title bar and
 *              the action buttons stay put; only what is between scrolls.
 *   Choices    A list of things to open (Change PIN, Update NFC card) uses
 *              the Settings list rows (listRow.tsx), never Cancel's grey
 *              outline: grey outline means Cancel and nothing else.
 *   Actions    56 tall, radius LG, side by side: Cancel first (grey text, the
 *              muted outline), the main action last (brand fill, or red for
 *              something that can't be undone).
 *
 * Touch: every control is at least 44×44 (× and Back are a 44 target around a
 * 36 disc); PIN keys stay 64 with 14 between them (see pinMetrics.ts).
 */
import React from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { useTheme, SHADOW, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";

export const DIALOG = {
  small: 400,
  /** Wi-Fi, Bluetooth, Cast: a device name plus a Disconnect on one row. */
  device: 450,
  content: 480,
  maxHeight: 640,
  pad: 28,
  /** Touch area of × and Back, and the disc drawn inside it. */
  control: 44,
  controlDisc: 36,
  action: 56,
  gap: 12,
} as const;

export type DialogSize = "small" | "device" | "content";
export type DialogKind = "pin" | "standard";

/* The frame tells its title bar and text which way to align. */
const KindContext = React.createContext<DialogKind>("standard");
/* The frame's footer: DialogActions anywhere inside the popup are drawn
   there, so the buttons never scroll away with the content. */
const FooterContext = React.createContext<HTMLElement | null>(null);
/* A slot under the title bar for controls that must not scroll away (the
   Wi-Fi / Bluetooth master switch). */
const PinnedContext = React.createContext<HTMLElement | null>(null);

/** Drawn in the fixed area under the title bar, wherever it sits in the
 *  popup's content; outside a frame it simply renders in place. */
export function DialogPinned({ children }: { children: React.ReactNode }) {
  const slot = React.useContext(PinnedContext);
  return slot ? createPortal(children, slot) : <>{children}</>;
}

export function DialogFrame({
  size = "small",
  kind = "standard",
  onClose,
  children,
  position = "absolute",
  zIndex = 60,
}: {
  size?: DialogSize;
  kind?: DialogKind;
  onClose?: () => void;
  children: React.ReactNode;
  /** "fixed" for popups that cover the whole screen from anywhere. They are
   *  drawn inside the scaled 1920x1080 canvas (#careinn-canvas), so they
   *  scale with everything else: a popup portalled to <body> skipped the
   *  scale and came out at raw size (Use my phone's "big text"). */
  position?: "absolute" | "fixed";
  zIndex?: number;
  /** Kept for callers; the frame always carries the standard inset. */
  padded?: boolean;
}) {
  const { theme: t } = useTheme();
  const { dir } = useLocale();
  /* A title bar first in line stays fixed at the top; the rest scrolls
     under it once the popup reaches its height limit. */
  const all = React.Children.toArray(children);
  const first = all[0];
  const hasBar = React.isValidElement(first) && first.type === DialogTitleBar;
  const bar = hasBar ? first : null;
  const body = hasBar ? all.slice(1) : all;
  const [footer, setFooter] = React.useState<HTMLElement | null>(null);
  const [pinned, setPinned] = React.useState<HTMLElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  /* hasFooter: buttons are pinned, so the content's own bottom inset gives
     way to the footer's. overflowing: content runs under the buttons, so a
     hairline divides them (none when everything fits). */
  const [hasFooter, setHasFooter] = React.useState(false);
  const [overflowing, setOverflowing] = React.useState(false);
  React.useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      setHasFooter(!!footer && footer.childElementCount > 0);
      setOverflowing(body.scrollHeight - body.clientHeight > 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    Array.from(body.children).forEach((c) => ro.observe(c));
    const mo = new MutationObserver(measure);
    mo.observe(body, { childList: true, subtree: true });
    if (footer) mo.observe(footer, { childList: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [footer]);
  const canvas = position === "fixed" && typeof document !== "undefined"
    ? document.getElementById("careinn-canvas")
    : null;
  const popup = (
    <KindContext.Provider value={kind}>
    <FooterContext.Provider value={footer}>
    <PinnedContext.Provider value={pinned}>
      <div
        data-no-remote
        className={`${canvas ? "absolute" : position} inset-0 flex items-center justify-center`}
        style={{ zIndex, animation: "dialogKitFade 0.15s ease-out" }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: t.overlay }} onClick={onClose} />
        <div
          dir={dir}
          className="relative flex flex-col"
          style={{
            width: `${size === "content" ? DIALOG.content : size === "device" ? DIALOG.device : DIALOG.small}px`,
            /* px of the 1920x1080 canvas, which the kiosk scales as a whole;
               90% still guards a canvas shorter than that. */
            maxHeight: `min(${DIALOG.maxHeight}px, 90%)`,
            overflow: "hidden",
            borderRadius: t.radiusXl,
            backgroundColor: t.surface,
            border: t.cardBorder,
            boxShadow: SHADOW.xl,
            animation: "dialogKitIn 0.2s ease-out",
          }}
        >
          {bar && <div className="shrink-0" style={{ padding: `${DIALOG.pad}px ${DIALOG.pad}px 0` }}>{bar}</div>}
          <div ref={setPinned} className="dk-pinned shrink-0" style={{ padding: `16px ${DIALOG.pad}px 0` }} />
          <div
            ref={bodyRef}
            className="flex flex-col flex-1 min-h-0"
            style={{
              overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none",
              paddingTop: bar ? 0 : DIALOG.pad,
              paddingInline: DIALOG.pad,
              paddingBottom: hasFooter ? 0 : DIALOG.pad,
            }}
          >
            {body}
          </div>
          <div
            ref={setFooter}
            className="dk-footer shrink-0"
            style={{
              padding: `24px ${DIALOG.pad}px ${DIALOG.pad}px`,
              borderTop: `1px solid ${overflowing ? t.borderDefault : "transparent"}`,
              marginTop: overflowing ? 0 : 0,
            }}
          />
        </div>
        <style>{`
          @keyframes dialogKitFade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes dialogKitIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: none; } }
          .dk-footer:empty, .dk-pinned:empty { display: none; }
        `}</style>
      </div>
    </PinnedContext.Provider>
    </FooterContext.Provider>
    </KindContext.Provider>
  );
  return canvas ? createPortal(popup, canvas) : popup;
}

function RoundControl({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  const { theme: t } = useTheme();
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
      style={{
        width: DIALOG.control, height: DIALOG.control,
        margin: -((DIALOG.control - DIALOG.controlDisc) / 2),
        borderRadius: t.radiusFull, background: "none", border: "none", outline: "none", padding: 0,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{ width: DIALOG.controlDisc, height: DIALOG.controlDisc, borderRadius: t.radiusFull, backgroundColor: t.tileInactiveBg }}
      >
        {children}
      </span>
    </button>
  );
}

export function DialogTitleBar({
  title,
  onClose,
  onBack,
  icon,
  tone = "brand",
}: {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  /** What the popup is about: a lucide icon component, or a ready element.
   *  Drawn in standard popups only. */
  icon?: React.ComponentType<any> | React.ReactNode;
  tone?: "brand" | "danger";
}) {
  const { theme: t } = useTheme();
  const { t: tr, isRTL } = useLocale();
  const centred = React.useContext(KindContext) === "pin";
  /* Keypad popups: equal slots either side keep the title on the centre
     line, with or without Back. Standard popups: the title starts where
     the content does, and the empty Back slot collapses. */
  const slot = { width: DIALOG.controlDisc, height: DIALOG.controlDisc } as const;
  return (
    <div className="flex items-center shrink-0" style={{ gap: "12px", minHeight: DIALOG.controlDisc }}>
      {(centred || onBack) && (
        <div className="shrink-0 flex items-center justify-center" style={slot}>
          {onBack && (
            <RoundControl onClick={onBack} label={tr("general.back")}>
              <ChevronLeft size={20} style={{ color: t.textHeading, transform: isRTL ? "scaleX(-1)" : undefined }} />
            </RoundControl>
          )}
        </div>
      )}
      {!centred && icon && (
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: t.radiusMd, backgroundColor: tone === "danger" ? t.errorSubtle : t.primarySubtle }}
        >
          {typeof icon === "function" || (typeof icon === "object" && icon !== null && "render" in (icon as any))
            ? React.createElement(icon as React.ComponentType<any>, { size: 20, style: { color: tone === "danger" ? t.errorOn : t.primaryOn } })
            : <span className="flex" style={{ color: tone === "danger" ? t.errorOn : t.primaryOn }}>{icon as React.ReactNode}</span>}
        </div>
      )}
      <span
        className="flex-1 min-w-0"
        style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogTitle, color: t.textHeading, textAlign: centred ? "center" : "start" }}
      >
        {title}
      </span>
      <div className="shrink-0 flex items-center justify-center" style={slot}>
        {onClose && (
          <RoundControl onClick={onClose} label={tr("general.close")}>
            <X size={18} style={{ color: t.textMuted }} />
          </RoundControl>
        )}
      </div>
    </div>
  );
}

/** The one line under the title, aligned like the title. */
export function DialogText({
  children,
  align,
  tone = "muted",
  style,
}: {
  children: React.ReactNode;
  align?: "start" | "center";
  tone?: "muted" | "error";
  style?: React.CSSProperties;
}) {
  const { theme: t } = useTheme();
  const kind = React.useContext(KindContext);
  const textAlign = align ?? (kind === "pin" ? "center" : "start");
  return (
    <p
      style={{
        fontFamily: t.fontFamily, ...TEXT_STYLE.dialogBody, margin: 0,
        color: tone === "error" ? t.errorOn : t.textMuted,
        textAlign, transition: "color 0.2s", ...style,
      }}
    >
      {children}
    </p>
  );
}

export function DialogActions({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const footer = React.useContext(FooterContext);
  /* Inside a frame: drawn in its fixed footer, under the scrolling content.
     The content's own bottom inset is the gap above the buttons. */
  if (footer) {
    return createPortal(
      <div className="flex w-full" style={{ gap: DIALOG.gap }}>{children}</div>,
      footer,
    );
  }
  return (
    <div className="flex w-full shrink-0" style={{ gap: DIALOG.gap, marginTop: "24px", ...style }}>
      {children}
    </div>
  );
}

export function DialogButton({
  label,
  onClick,
  kind = "primary",
  disabled = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  /** primary: the main action. outline: the other real choice (brand
   *  outline). secondary: Cancel / Skip only (grey). danger: can't undo
   *  (solid red). dangerOutline: destructive but routine, like Disconnect
   *  (red outline). */
  kind?: "primary" | "outline" | "secondary" | "danger" | "dangerOutline";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const { theme: t } = useTheme();
  const bg = kind === "primary" ? t.primary : kind === "danger" ? t.error : "transparent";
  const fg = kind === "primary" ? t.brandOnPrimary : kind === "danger" ? t.onError
    : kind === "outline" ? t.primaryOn : kind === "dangerOutline" ? t.errorOn : t.textMuted;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        /* minHeight, not height: stacked in a column, flex-1 would otherwise
           squash the button to nothing. */
        minHeight: DIALOG.action, flexShrink: 0, gap: "8px", padding: "0 16px",
        borderRadius: t.radiusLg, outline: "none",
        backgroundColor: bg,
        /* Cancel keeps its grey text; only its outline is strengthened. */
        border: kind === "secondary" ? `1.5px solid color-mix(in srgb, ${t.textMuted} 35%, transparent)`
          : kind === "outline" ? `1.5px solid ${t.primary}`
          : kind === "dangerOutline" ? `1.5px solid ${t.errorOn}` : "none",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon}
      <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogButton, color: fg }}>{label}</span>
    </button>
  );
}

/** An on/off row at the top of a list popup — Wi-Fi, Bluetooth — the way the
 *  phones' own Wi-Fi and Bluetooth screens open with their master switch.
 *  The whole row is the touch target; the switch is 56×32. */
export function DialogSwitchRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const { theme: t } = useTheme();
  const { isRTL } = useLocale();
  const W = 56, H = 32, KNOB = 26;
  /* Mirrored in right-to-left, as Android's own switch does: in Arabic, ON
     puts the knob on the left. */
  const atEnd = isRTL ? !on : on;
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center w-full cursor-pointer shrink-0"
      style={{
        minHeight: 64, gap: "16px", padding: "0 16px",
        borderRadius: t.radiusLg, border: `1px solid ${t.borderDefault}`,
        backgroundColor: "transparent", outline: "none", textAlign: "start",
      }}
    >
      <span className="flex-1 min-w-0" style={{ fontFamily: t.fontFamily, fontSize: "16px", fontWeight: 700, lineHeight: 1.4, color: t.textHeading }}>
        {label}
      </span>
      <span
        className="relative shrink-0"
        style={{
          width: W, height: H, borderRadius: H / 2,
          backgroundColor: on ? t.primary : `color-mix(in srgb, ${t.textMuted} 35%, transparent)`,
          transition: "background-color 0.2s ease",
        }}
      >
        <span
          className="absolute"
          style={{
            top: (H - KNOB) / 2, left: atEnd ? W - KNOB - (H - KNOB) / 2 : (H - KNOB) / 2,
            width: KNOB, height: KNOB, borderRadius: KNOB / 2,
            backgroundColor: "#FFFFFF", boxShadow: SHADOW.sm, transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
