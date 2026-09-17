import React from "react";
import { X } from "lucide-react";
import { useTheme, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";
import { PinKeypad } from "./MyAccountDialog";

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
  width = 340,
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
  const { fontFamily } = useLocale();

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
          maxHeight: "90vh",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "28px 24px 24px 24px",
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          border: t.cardBorder,
          boxShadow: SHADOW.xl,
          animation: "pinDialogIn 0.2s ease-out",
        }}
      >
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            top: "12px",
            insetInlineEnd: "12px",
            width: "32px",
            height: "32px",
            borderRadius: t.radiusFull,
            backgroundColor: t.tileInactiveBg,
            border: "none",
            outline: "none",
          }}
        >
          <X size={16} style={{ color: t.textMuted }} />
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

        <span style={{ fontFamily, fontSize: "18px", fontWeight: 700, color: t.textHeading, textAlign: "center" }}>
          {title}
        </span>
        <span
          style={{
            fontFamily,
            fontSize: "13px",
            fontWeight: 500,
            color: error ? t.errorOn : t.textMuted,
            textAlign: "center",
            marginTop: "8px",
            lineHeight: "20px",
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
