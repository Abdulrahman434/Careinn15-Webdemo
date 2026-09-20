import React from "react";
import { X } from "lucide-react";
import { useTheme, SHADOW, TEXT_STYLE, WEIGHT } from "./ThemeContext";
import { useLocale } from "./i18n";
import { PinKeypad } from "./MyAccountDialog";
import { PIN_METRICS, PIN_TYPE } from "./pinMetrics";

/* One shell for every 4-digit PIN prompt in the app: same card, same (×) in
   the same corner, same icon tile, same type sizes, same keypad. Screens that
   ask for a PIN differ only in the icon and the wording. */
export function PinDialog({
  icon,
  title,
  subtitle,
  errorText,
  error,
  pin,
  setPin,
  onComplete,
  onClose,
  hint,
  footer,
  /* Sized for the panel this runs on — see pinMetrics.ts. */
  width = PIN_METRICS.card,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  errorText: string;
  error: boolean;
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  onComplete: (completedPin: string) => void;
  onClose: () => void;
  /** Optional line under the subtitle, e.g. the NFC card hint. */
  hint?: React.ReactNode;
  /** Optional action under the keypad, e.g. "Continue as Guest". */
  footer?: React.ReactNode;
  width?: number;
}) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{ animation: "pinDialogFade 0.15s ease-out" }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: t.overlay }} onClick={onClose} />

      <div
        className="relative flex flex-col items-center"
        style={{
          width: `${width}px`,
          /* Per cent of the scaled canvas, not vh: the kiosk transform-scales
             the whole 1920x1080 canvas, so vh resolves against the browser
             window instead and clipped this dialog mid-keypad. */
          maxHeight: "90%",
          overflowY: "auto",
          overflowX: "hidden",
          padding: PIN_METRICS.pad,
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          border: t.cardBorder,
          boxShadow: SHADOW.xl,
          animation: "pinDialogIn 0.2s ease-out",
        }}
      >
        {/* 44x44 of touch area around a 36px disc: the target is the finger's,
            the circle is the eye's. */}
        <button
          onClick={onClose}
          aria-label={tr("general.close")}
          className="absolute flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            top: "10px",
            insetInlineEnd: "10px",
            width: PIN_METRICS.close,
            height: PIN_METRICS.close,
            borderRadius: t.radiusFull,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: PIN_METRICS.closeDisc,
              height: PIN_METRICS.closeDisc,
              borderRadius: t.radiusFull,
              backgroundColor: t.tileInactiveBg,
            }}
          >
            <X size={18} style={{ color: t.textMuted }} />
          </span>
        </button>

        <div
          className="flex items-center justify-center"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: t.radiusLg,
            backgroundColor: t.primarySubtle,
            marginBottom: "16px",
          }}
        >
          {icon}
        </div>

        <span style={{ fontFamily, ...TEXT_STYLE.dialogTitle, fontSize: PIN_TYPE.title, fontWeight: WEIGHT.semibold, color: t.textHeading, textAlign: "center" }}>
          {title}
        </span>
        <span
          style={{
            fontFamily,
            ...TEXT_STYLE.dialogBody,
            color: error ? t.errorOn : t.textMuted,
            textAlign: "center",
            marginTop: "8px",
            transition: "color 0.2s",
          }}
        >
          {error ? errorText : subtitle}
        </span>

        {hint}

        <div className="w-full">
          <PinKeypad pin={pin} setPin={setPin} error={error} onComplete={onComplete} />
        </div>

        {footer}
      </div>

      <style>{`
        @keyframes pinDialogFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pinDialogIn {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
