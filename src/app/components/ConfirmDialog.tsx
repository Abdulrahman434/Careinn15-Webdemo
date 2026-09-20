import React from "react";
import { useTheme, SHADOW, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "primary";
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "primary",
}: ConfirmDialogProps) {
  const { theme: t } = useTheme();
  const { t: tr, isRTL } = useLocale();

  if (!visible) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{
        backgroundColor: t.overlay,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        className="relative flex flex-col items-center"
        style={{
          width: "360px",
          padding: "32px 24px 24px 24px",
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          boxShadow: SHADOW.xl,
          animation: "confirmDialogIn 0.2s ease-out",
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        <button
          onClick={onCancel}
          className="absolute flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            top: "12px",
            [isRTL ? "left" : "right"]: "12px",
            width: "32px",
            height: "32px",
            borderRadius: t.radiusFull,
            backgroundColor: t.tileInactiveBg,
            border: "none",
            outline: "none",
          }}
        >
          <X size={18} style={{ color: t.textMuted }} />
        </button>

        <div
          className="flex items-center justify-center mb-5"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: t.radiusFull,
            backgroundColor: isDanger ? t.errorSubtle : t.primarySubtle,
          }}
        >
          <AlertTriangle size={30} style={{ color: isDanger ? t.errorOn : t.primaryOn }} />
        </div>

        {title && (
          <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogTitle, color: t.textHeading, textAlign: "center", marginBottom: "8px" }}>
            {title}
          </span>
        )}

        <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogBody, color: t.textBody, textAlign: "center", marginBottom: "20px" }}>
          {message}
        </span>

        <div className="flex flex-col w-full gap-2.5">
          <button
            onClick={onConfirm}
            className="flex items-center justify-center w-full cursor-pointer active:scale-[0.98] transition-all"
            style={{
              height: "54px",
              borderRadius: t.radiusLg,
              backgroundColor: isDanger ? t.error : t.primary,
              border: "none",
              outline: "none",
              /* One neutral elevation: a brand-tinted glow assumed the brand
                 was dark enough to cast one, which is not true of every config. */
              boxShadow: SHADOW.md,
            }}
          >
            <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogButton, color: isDanger ? t.onError : t.brandOnPrimary }}>
              {confirmLabel || tr("general.confirm")}
            </span>
          </button>

          <button
            onClick={onCancel}
            className="flex items-center justify-center w-full cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              height: "54px",
              borderRadius: t.radiusLg,
              backgroundColor: "transparent",
              border: `1.5px solid ${t.borderDefault}`,
              outline: "none",
            }}
          >
            <span style={{ fontFamily: t.fontFamily, ...TEXT_STYLE.dialogButton, color: t.textMuted }}>
              {cancelLabel || tr("general.cancel")}
            </span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes confirmDialogIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
