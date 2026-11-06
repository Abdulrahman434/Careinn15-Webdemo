import { useState, Children, Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";

/* ─── Settings list ───
 * One row style for every "open something" action (Use my phone, My
 * Preferences, Set PIN, Care Team, Log out, Clear Data). Each hospital build
 * has a different set of these, so they are a single list: a row left out
 * just closes the gap, with no half-empty grid cell or lonely button. */
export function ListRowGroup({ children }: { children: React.ReactNode }) {
  const { theme: t } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <div
      className="flex flex-col shrink-0"
      style={{ borderRadius: t.radiusLg, border: `1px solid ${t.borderDefault}`, overflow: "hidden" }}
    >
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <div style={{ height: "1px", backgroundColor: t.borderDefault, marginInlineStart: "72px" }} />}
          {row}
        </Fragment>
      ))}
    </div>
  );
}

export function ListRow({
  icon: Icon, label, value, onClick, tone = "brand", mirrorIcon = false,
  disabled = false, valueTone = "muted",
}: {
  icon: React.ComponentType<any>;
  label: string;
  /** What the row is set to now ("English", "PIN is on") — one short line. */
  value?: string;
  onClick: () => void;
  tone?: "brand" | "danger";
  mirrorIcon?: boolean;
  /** Shown but not usable yet (e.g. Server before the admin PIN). */
  disabled?: boolean;
  /** "warning" when the value asks for attention ("Not finished"). */
  valueTone?: "muted" | "warning";
}) {
  const { theme: t } = useTheme();
  const { isRTL } = useLocale();
  const [pressed, setPressed] = useState(false);
  const ink = tone === "danger" ? t.errorOn : t.primaryOn;
  const tint = tone === "danger" ? t.errorSubtle : t.primarySubtle;
  return (
    <button
      data-no-remote
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className="flex items-center w-full cursor-pointer"
      style={{
        minHeight: "64px", gap: "16px", padding: "12px 16px",
        /* No fill at rest; the tint only while a finger is on it. */
        backgroundColor: pressed ? tint : "transparent",
        border: "none", outline: "none", textAlign: "start",
        transition: "background-color 0.12s ease",
        opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{ width: "40px", height: "40px", borderRadius: t.radiusMd, backgroundColor: tint }}
      >
        <Icon size={20} style={{ color: ink, transform: mirrorIcon && isRTL ? "scaleX(-1)" : undefined }} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: "2px" }}>
        <span style={{ fontFamily: t.fontFamily, fontSize: "16px", fontWeight: 700, lineHeight: 1.4, color: tone === "danger" ? t.errorOn : t.textHeading }}>
          {label}
        </span>
        {value && (
          <span style={{ fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 500, lineHeight: 1.4, color: valueTone === "warning" ? t.warningOn : t.textMuted }}>
            {value}
          </span>
        )}
      </div>
      <ChevronRight size={18} style={{ color: t.textDisabled, transform: isRTL ? "scaleX(-1)" : undefined, flexShrink: 0 }} />
    </button>
  );
}

