import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Search, Target } from "lucide-react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";
import { CARE_GOALS, isListedGoal } from "./careGoals";

/**
 * CareGoalPicker — the patient chooses what today is for.
 *
 * The goal used to be typed by a nurse and read by the patient. It is the
 * patient's day, so it is now the patient's sentence: the ward reads it back.
 *
 * Forty-five goals is too many for a dropdown on a screen somebody is using
 * from a bed, so this is a sheet with a search box and rows big enough for a
 * thumb. It follows the preferences form and the care partner agreement — a
 * portal onto the scaled canvas, because rendered in place it would inherit
 * the CareMe carousel's transform and come out the width of one slide.
 */
export function CareGoalPicker({
  initial, onSave, onClose,
}: {
  initial: string;
  onSave: (goal: string) => void;
  onClose: () => void;
}) {
  const { theme: t, darkMode } = useTheme();
  const { t: tr, fontFamily, dir } = useLocale();

  const startedListed = isListedGoal(initial);
  const [selected, setSelected] = useState(startedListed ? initial : "");
  const [own, setOwn] = useState(startedListed ? "" : initial);
  const [query, setQuery] = useState("");
  const ownRef = useRef<HTMLTextAreaElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CARE_GOALS as readonly string[];
    return (CARE_GOALS as readonly string[]).filter((g) => g.toLowerCase().includes(q));
  }, [query]);

  /* Whichever the patient touched last is the answer. Typing into the box
     clears the tick and picking a row clears the box, so the sheet never
     leaves two answers on screen and saves the one nobody meant. */
  const answer = own.trim() || selected;
  const canSave = answer !== initial.trim();

  const canvas = typeof document !== "undefined"
    ? document.getElementById("careinn-canvas") ?? document.body
    : null;
  if (!canvas) return null;

  const rowBase: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 18px",
    borderRadius: t.radiusMd,
    fontFamily,
    fontSize: TYPE_SCALE.base,
    textAlign: "start",
    cursor: "pointer",
    transition: "background 0.15s ease, border-color 0.15s ease",
  };

  return createPortal(
    <div
      dir={dir}
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 8600, backgroundColor: t.overlay, backdropFilter: "blur(4px)" }}
    >
      <style>{`
        .cg-field::placeholder { color: ${darkMode ? t.textMuted : t.textDisabled}; opacity: 1; }
      `}</style>

      <div
        className="relative flex flex-col"
        style={{
          width: "min(860px, 92%)",
          maxHeight: "92%",
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          border: t.cardBorder,
          boxShadow: SHADOW.xl,
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start gap-4 shrink-0"
          style={{ padding: "28px 28px 20px", borderBottom: `1px solid ${t.borderSubtle}` }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 48, height: 48, borderRadius: t.radiusMd, backgroundColor: t.primarySubtle }}
          >
            <Target size={24} style={{ color: t.primaryOn }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.extrabold, color: t.textHeading, margin: 0 }}>
              {tr("care.pcc.goal.title")}
            </h2>
            <p style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: t.textMuted, margin: "4px 0 0" }}>
              {tr("goal.picker.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={tr("goal.picker.cancel")}
            className="flex items-center justify-center shrink-0 cursor-pointer"
            style={{ width: 44, height: 44, borderRadius: "50%", border: "none", backgroundColor: t.surfaceInset, color: t.textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="shrink-0" style={{ padding: "18px 28px 0" }}>
          <div
            className="flex items-center gap-3"
            style={{
              padding: "0 16px",
              minHeight: 52,
              borderRadius: t.radiusMd,
              backgroundColor: t.surfaceInset,
              border: `1.5px solid ${t.borderDefault}`,
            }}
          >
            <Search size={18} style={{ color: t.textMuted }} />
            <input
              className="cg-field flex-1 outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("goal.picker.search")}
              style={{
                background: "none", border: "none", fontFamily,
                fontSize: TYPE_SCALE.base, color: t.textHeading, minWidth: 0,
              }}
            />
          </div>
        </div>

        {/* ── The list ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "16px 28px" }}>
          <div className="flex flex-col gap-2">
            {matches.map((goal) => {
              const on = selected === goal && !own.trim();
              return (
                <button
                  key={goal}
                  onClick={() => { setSelected(goal); setOwn(""); }}
                  style={{
                    ...rowBase,
                    backgroundColor: on ? t.primarySubtle : t.surfaceInset,
                    border: `1.5px solid ${on ? t.primary : t.borderDefault}`,
                    color: on ? t.primaryOn : t.textHeading,
                    fontWeight: on ? WEIGHT.bold : WEIGHT.medium,
                  }}
                >
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: "50%",
                      backgroundColor: on ? t.primary : "transparent",
                      border: on ? "none" : `2px solid ${t.borderDefault}`,
                    }}
                  >
                    {on && <Check size={15} style={{ color: t.brandOnPrimary }} />}
                  </span>
                  <span style={{ overflowWrap: "anywhere" }}>{goal}</span>
                </button>
              );
            })}

            {matches.length === 0 && (
              <p style={{ fontFamily, fontSize: TYPE_SCALE.base, color: t.textMuted, padding: "12px 4px" }}>
                {tr("goal.picker.noMatch")}
              </p>
            )}
          </div>

          {/* ── Something else ──
              The form's "Other, specify:", and the only place a patient can
              answer in their own language: the list is the hospital's English. */}
          <div style={{ marginTop: "22px" }}>
            <label
              htmlFor="care-goal-own"
              style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold, color: t.textMuted, display: "block", marginBottom: "8px" }}
            >
              {tr("goal.picker.own")}
            </label>
            <textarea
              id="care-goal-own"
              ref={ownRef}
              dir="auto"
              rows={2}
              value={own}
              onChange={(e) => { setOwn(e.target.value); if (e.target.value.trim()) setSelected(""); }}
              placeholder={tr("goal.picker.ownPlaceholder")}
              className="cg-field w-full outline-none"
              style={{
                padding: "12px 16px",
                borderRadius: t.radiusMd,
                backgroundColor: t.surfaceInset,
                border: `1.5px solid ${own.trim() ? t.primary : t.borderDefault}`,
                color: t.textHeading, fontFamily, fontSize: TYPE_SCALE.base,
                resize: "none",
              }}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between gap-3 shrink-0"
          style={{ padding: "18px 28px", borderTop: `1px solid ${t.borderSubtle}` }}
        >
          {/* Only offered once there is something to take back. */}
          {initial.trim() ? (
            <button
              onClick={() => { onSave(""); onClose(); }}
              className="cursor-pointer"
              style={{
                padding: "12px 18px", borderRadius: t.radiusMd, border: "none",
                background: "none", color: t.textMuted,
                fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold,
              }}
            >
              {tr("goal.picker.clear")}
            </button>
          ) : <span />}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="cursor-pointer"
              style={{
                padding: "12px 22px", borderRadius: t.radiusMd,
                border: `1.5px solid ${t.borderDefault}`, background: "none",
                color: t.textHeading, fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold,
              }}
            >
              {tr("goal.picker.cancel")}
            </button>
            <button
              disabled={!canSave}
              onClick={() => { onSave(answer); onClose(); }}
              className="cursor-pointer"
              style={{
                padding: "12px 26px", borderRadius: t.radiusMd, border: "none",
                backgroundColor: t.primary, color: t.brandOnPrimary,
                fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.bold,
                opacity: canSave ? 1 : 0.45,
              }}
            >
              {tr("goal.picker.save")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    canvas,
  );
}
