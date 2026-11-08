import { Search, X } from "lucide-react";
import { useTheme, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";

/* ─── Search field ───
 * One search box for every grid page with a category rail (Live TV, Patient
 * Services). It sits at the end of the heading row: 440 × 56, inset fill,
 * search icon at the start, a clear (×) button once something is typed. */
export function SearchField({
  value, onChange, placeholder, clearLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  clearLabel: string;
}) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  return (
    <label
      className="ck-search-box shrink-0 flex items-center gap-3"
      style={{
        width: 440,
        height: 56,
        paddingInlineStart: 18,
        paddingInlineEnd: 8,
        borderRadius: theme.radiusMd,
        backgroundColor: theme.surfaceInset,
        border: `1.5px solid ${theme.borderSubtle}`,
        ["--ck-search-focus" as any]: theme.primary,
      }}
    >
      <style>{`
        .ck-search::placeholder { color: ${theme.textDisabled}; }
        .ck-search-box:focus-within { border-color: var(--ck-search-focus) !important; }
      `}</style>
      <Search size={22} color={theme.textMuted} strokeWidth={2.2} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="ck-search flex-1 min-w-0 bg-transparent outline-none"
        style={{ ...TEXT_STYLE.body, fontFamily, color: theme.textHeading, border: "none" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="shrink-0 flex items-center justify-center cursor-pointer active:scale-95"
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radiusSm,
            backgroundColor: theme.surface,
            border: "none",
            outline: "none",
          }}
        >
          <X size={20} color={theme.textMuted} />
        </button>
      )}
    </label>
  );
}
