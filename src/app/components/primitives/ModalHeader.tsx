import { CSSProperties } from "react";
import { X } from "lucide-react";
import { useTheme, TEXT_STYLE, TYPE_SCALE, WEIGHT, LEADING } from "../ThemeContext";
import { useLocale } from "../i18n";

/**
 * ModalHeader — the one top row every app popup wears.
 *
 * The three big popups had each grown their own: the title ran 18px, 22px and
 * 30px, the close button was a 34px square, a 44px circle and a 48px square,
 * and the leading icon was 18px in one and 24px in the others. Opening two in
 * a row read as two different products. This is that row, once.
 *
 * Usage:
 *   <ModalHeader icon={Target} title={tr("care.pcc.goal.title")}
 *                subtitle={tr("goal.picker.subtitle")} onClose={onClose} />
 *
 * `padX` exists because a popup's header should line up with its own body,
 * and the bodies legitimately differ. Everything that made the headers look
 * unrelated — sizes, weights, radii, the close button — is fixed here.
 */

interface ModalHeaderProps {
  /** Lucide icon component, rendered at a fixed 24px in a 48px tile. */
  icon: typeof X;
  title: string;
  /** Second line — the hospital name, or what the popup is for. */
  subtitle?: string;
  onClose: () => void;
  /** Horizontal padding, to match the body below. Default 28px. */
  padX?: string;
  /** Set false on popups that must not change language mid-flow. */
  showLanguage?: boolean;
  style?: CSSProperties;
}

export function ModalHeader({
  icon: Icon,
  title,
  subtitle,
  onClose,
  padX = "28px",
  showLanguage = true,
  style,
}: ModalHeaderProps) {
  const { theme, setLocale } = useTheme();
  const { t, locale, isRTL, fontFamily } = useLocale();

  const square: CSSProperties = {
    width: "48px",
    height: "48px",
    borderRadius: theme.radiusMd,
  };

  return (
    <div
      className="shrink-0 flex items-center gap-4"
      style={{
        padding: `20px ${padX}`,
        borderBottom: `1px solid ${theme.borderSubtle}`,
        ...style,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{ ...square, backgroundColor: theme.primarySubtle }}
      >
        <Icon size={24} style={{ color: theme.primaryOn }} />
      </div>

      <div className="flex-1 min-w-0" style={{ textAlign: isRTL ? "right" : "left" }}>
        <h2
          style={{
            fontFamily,
            ...TEXT_STYLE.dialogTitle,
            color: theme.textHeading,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily,
              ...TEXT_STYLE.dialogHelper,
              color: theme.textMuted,
              margin: "3px 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {showLanguage && (
        <div
          role="group"
          aria-label={t("general.language")}
          className="shrink-0 flex items-center"
          style={{
            height: "48px",
            padding: "4px",
            gap: "2px",
            borderRadius: theme.radiusMd,
            backgroundColor: theme.tileInactiveBg,
            /* The pair reads left-to-right in every locale: these are the
               names of the languages, not text in them. */
            direction: "ltr",
          }}
        >
          {(["en", "ar"] as const).map((code) => {
            const active = locale === code;
            return (
              <button
                key={code}
                onClick={() => setLocale(code)}
                aria-label={t(code === "en" ? "general.lang.en" : "general.lang.ar")}
                aria-pressed={active}
                className="cursor-pointer flex items-center justify-center active:scale-95 transition-all"
                style={{
                  minWidth: "44px",
                  height: "40px",
                  padding: "0 10px",
                  borderRadius: theme.radiusSm,
                  border: "none",
                  outline: "none",
                  backgroundColor: active ? theme.primary : "transparent",
                  color: active ? theme.textInverse : theme.textMuted,
                  fontFamily: theme.fontFamily,
                  fontSize: TYPE_SCALE.sm,
                  fontWeight: active ? WEIGHT.bold : WEIGHT.semibold,
                  lineHeight: LEADING.none,
                }}
              >
                {code === "en" ? "EN" : "AR"}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onClose}
        aria-label={t("general.close")}
        className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
        style={{
          ...square,
          backgroundColor: theme.tileInactiveBg,
          border: "none",
          outline: "none",
        }}
      >
        <X size={22} style={{ color: theme.textMuted }} />
      </button>
    </div>
  );
}
