import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, UserRound, AlertTriangle } from "lucide-react";
import { ModalHeader } from "./primitives";
import { useTheme, TYPE_SCALE, WEIGHT, LEADING, SHADOW } from "./ThemeContext";
import { useLocale, toLatinDigits, textDirection } from "./i18n";
import { SignaturePad } from "./nurse/SignaturePad";
import { ConfirmDialog } from "./ConfirmDialog";
import { CARE_PARTNER_ITEMS, type CarePartnerRecord } from "./carePartnerStore";
import { useReloadHold } from "../lib/reloadSafety";

/**
 * CarePartnerAgreement — the hospital's Care Partner Agreement Checklist, as a
 * screen the partner reads and signs.
 *
 * A modal, not a panel inside the CareMe card: this is fourteen numbered
 * statements, four fields and a signature box, and squeezed into a collapsible
 * section the signature was a smear in a letterbox. It follows the preferences
 * form — a full sheet over the card, with room to read.
 *
 * The statements are the hospital's own wording (see care.cp.item.* in i18n).
 * They are shown, never edited, and their order is the order on the paper.
 */
export function CarePartnerAgreement({
  initial, onAccept, onClose,
}: {
  initial: CarePartnerRecord;
  onAccept: (next: Pick<CarePartnerRecord, "name" | "relationship" | "mobile" | "signature" | "signedOn">) => void;
  onClose: () => void;
}) {
  const { theme: t, darkMode, locale } = useTheme();
  // A form on screen is a form being filled in; do not replace it underneath.
  useReloadHold(true, "care-partner-agreement", "care partner agreement open");
  const { t: tr, fontFamily, isRTL, dir } = useLocale();

  const [name, setName] = useState(initial.name);
  const [relationship, setRelationship] = useState(initial.relationship);
  const [mobile, setMobile] = useState(initial.mobile);
  const [signature, setSignature] = useState<string | null>(initial.signature);
  /* Ticking this is its own act. Reading the statements and accepting them are
     two different things, and a consent that was pre-ticked is not a consent. */
  const [consent, setConsent] = useState(false);
  const [askExit, setAskExit] = useState(false);

  /* The day the partner signs, stated rather than asked for: a typed date can
     be wrong, and a signed consent carrying the wrong date is worse than one
     carrying none. Fixed when the sheet opens so it cannot change under a
     partner who is halfway through reading. */
  const [signedOn] = useState(() =>
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, ""));
  const signedOnShown = new Date(signedOn).toLocaleDateString(
    locale === "ar" ? "ar-SA" : locale === "ur" ? "ur-PK" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  /* What is still missing, in the order the form asks for it — one line at a
     time, because a list of five faults is a wall, not an instruction. */
  const digits = mobile.replace(/\D/g, "");
  const missing =
    !name.trim() ? "care.cp.need.name"
    : !relationship.trim() ? "care.cp.need.relationship"
    : digits.length < 9 ? "care.cp.need.mobile"
    : !consent ? "care.cp.need.consent"
    : !signature ? "care.cp.need.signature"
    : null;
  const ready = missing === null;

  /* Anything typed or drawn is work the partner would lose on a stray tap. */
  const dirty = !!name.trim() || !!relationship.trim() || !!mobile.trim() || !!signature || consent;
  const requestClose = () => (dirty ? setAskExit(true) : onClose());

  /* Muted grey is legible on a white sheet and disappears on a dark one, and
     the people reading this are mostly not twenty. Labels and hints step up a
     level in dark mode rather than staying at the same token. */
  const labelColor = darkMode ? t.textBody : t.textMuted;

  const label: React.CSSProperties = {
    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
    color: labelColor, display: "block", marginBottom: "6px",
  };
  const field: React.CSSProperties = {
    width: "100%", minHeight: "52px", padding: "12px 16px",
    borderRadius: t.radiusMd, backgroundColor: t.surfaceInset,
    border: `1.5px solid ${t.borderDefault}`,
    color: t.textHeading, fontFamily, fontSize: TYPE_SCALE.base,
    outline: "none",
  };

  /* Portalled to the scaled canvas so it centres on the screen. Rendered in
     place it inherited the CareMe carousel's transform, which makes it the
     containing block for `fixed` — the sheet came out the width of one slide. */
  const canvas = typeof document !== "undefined"
    ? document.getElementById("careinn-canvas") ?? document.body
    : null;
  if (!canvas) return null;

  return createPortal(
    <div
      dir={dir}
      className="absolute inset-0 flex items-center justify-center"
      /* Above the preferences form (z 8600), which is one of the two places
         that opens this — answering "yes" there has to put the agreement in
         front of the question that asked, not behind it. Still below the PIN
         dialogs (z 10000), which must be able to cover everything. */
      style={{ zIndex: 8700, backgroundColor: t.overlay, backdropFilter: "blur(4px)" }}
    >
      {/* Placeholders come from the browser otherwise, which in dark mode puts
          faint grey on a dark field — the one piece of text in here that says
          what a field wants. */}
      <style>{`
        .cp-field::placeholder { color: ${darkMode ? t.textMuted : t.textDisabled}; opacity: 1; }
      `}</style>

      <div
        className="relative flex flex-col"
        style={{
          width: "min(1100px, 92%)",
          maxHeight: "92%",
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          border: t.cardBorder,
          boxShadow: SHADOW.xl,
          overflow: "hidden",
        }}
      >
        <ModalHeader
          icon={UserRound}
          title={tr("care.cp.title")}
          onClose={requestClose}
        />

        {/* The agreement itself */}
        <div className="flex-1 min-h-0 overflow-y-auto careme-scroll" style={{ padding: "24px 28px" }}>
          <p style={{
            fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.bold,
            color: t.textHeading, margin: "0 0 16px",
          }}>
            {tr("care.cp.intro")}
          </p>

          <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {CARE_PARTNER_ITEMS.map((n) => (
              <li
                key={n}
                className="flex items-start gap-3"
                style={{ marginBottom: "12px" }}
              >
                <span
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: "26px", height: "26px", borderRadius: t.radiusFull,
                    backgroundColor: t.primarySubtle, color: t.primaryOn,
                    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold,
                    marginTop: "2px",
                  }}
                >
                  {n}
                </span>
                <span style={{
                  fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.normal,
                  color: t.textBody, lineHeight: LEADING.normal,
                }}>
                  {tr(`care.cp.item.${n}`)}
                </span>
              </li>
            ))}
          </ol>

          {/* The acknowledgement is the consent, so the tick belongs to it —
              not to a second sentence underneath saying the same thing twice.
              The whole panel is the target: asking a shaky hand to find a
              28px square on glass is asking it to fail. */}
          <label
            className="flex items-start gap-3 cursor-pointer"
            style={{
              backgroundColor: t.primarySubtle,
              border: consent ? `1.5px solid ${t.primary}` : t.borderInset,
              borderRadius: t.radiusMd, padding: "16px 18px", margin: "20px 0 24px",
              userSelect: "none", transition: "border-color .15s",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden
              className="shrink-0 flex items-center justify-center"
              style={{
                width: "28px", height: "28px", marginTop: "2px",
                borderRadius: t.radiusSm,
                backgroundColor: consent ? t.primary : t.surface,
                border: `2px solid ${consent ? t.primary : t.borderCardColor}`,
                transition: "background-color .15s, border-color .15s",
              }}
            >
              {consent && <Check size={19} strokeWidth={3.2} style={{ color: t.brandOnPrimary }} />}
            </span>
            <span style={{
              fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold,
              color: t.textHeading, lineHeight: LEADING.normal,
            }}>
              {tr("care.cp.ack")}
            </span>
          </label>

          {/* The signature block, in the order the paper form has it */}
          <div className="grid grid-cols-2" style={{ gap: "16px" }}>
            <div>
              <label style={label}>{tr("care.cp.field.name")} <span style={{ color: t.errorOn }}>*</span></label>
              {/* auto reads the value, and an empty value reads as English —
                  which put an Arabic example on the left of an Arabic form.
                  Empty, it follows the hint; typed in, it follows the typing. */}
              <input
                dir={name ? "auto" : textDirection(tr("care.pcc.partner.namePlaceholder"))}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("care.pcc.partner.namePlaceholder")}
                className="cp-field"
                style={field}
              />
            </div>
            <div>
              <label style={label}>{tr("care.cp.field.relationship")} <span style={{ color: t.errorOn }}>*</span></label>
              <input
                dir={relationship ? "auto" : textDirection(tr("care.pcc.partner.relationshipPlaceholder"))}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder={tr("care.pcc.partner.relationshipPlaceholder")}
                className="cp-field"
                style={field}
              />
            </div>
            <div>
              <label style={label}>{tr("care.cp.field.mobile")} <span style={{ color: t.errorOn }}>*</span></label>
              {/* The form's own direction, not a forced ltr. Forced, the
                  Arabic placeholder was laid out as an English sentence and
                  came apart: the example number ended up to the LEFT of the
                  word introducing it. The digits inside still read left to
                  right — a number is a number in both languages — but the
                  line they sit on belongs to the form around them. */}
              <input
                dir={isRTL ? "rtl" : "ltr"}
                inputMode="tel"
                value={mobile}
                /* Arabic keyboards type ٠١٢٣٤٥٦٧٨٩, and \d matches none of
                   them, so every keystroke was dropped in silence. Converted,
                   then filtered: what is typed is what is stored. */
                onChange={(e) => setMobile(toLatinDigits(e.target.value).replace(/[^\d+\s-]/g, ""))}
                placeholder={tr("care.cp.mobilePlaceholder")}
                className="cp-field"
                style={{ ...field, textAlign: isRTL ? "right" : "left" }}
              />
            </div>
            <div>
              <label style={label}>{tr("care.cp.field.date")}</label>
              <div
                style={{
                  ...field,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "10px", cursor: "default",
                }}
              >
                <span dir="auto" style={{ fontFamily, fontSize: TYPE_SCALE.base, color: t.textHeading }}>
                  {signedOnShown}
                </span>
                <span style={{
                  fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                  color: t.primaryOn, backgroundColor: t.primarySubtle,
                  borderRadius: t.radiusFull, padding: "4px 12px",
                }}>
                  {tr("care.cp.dateToday")}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={label}>{tr("care.cp.field.sign")} <span style={{ color: t.errorOn }}>*</span></label>
            <p style={{
              fontFamily, fontSize: TYPE_SCALE.sm, color: labelColor, margin: "0 0 8px",
            }}>
              {tr("care.cp.signHint")}
            </p>
            {/* Room to actually sign: a signature drawn in a 130px strip is a
                scribble, and this one stands for a consent. */}
            <SignaturePad onChange={setSignature} height={220} />
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between gap-3"
          style={{ padding: "18px 28px", borderTop: `1px solid ${t.borderDefault}`, backgroundColor: t.surfaceInset }}
        >
          {/* The one thing still standing between here and a signed agreement.
              Silent once nothing is. */}
          <span className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
            {missing && (
              <>
                <AlertTriangle size={17} style={{ color: t.warningOn }} strokeWidth={2.4} className="shrink-0" />
                <span style={{
                  fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
                  color: darkMode ? t.textBody : t.textMuted,
                }}>
                  {tr(missing)}
                </span>
              </>
            )}
          </span>
          <button
            onClick={requestClose}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              minHeight: "54px", padding: "0 26px", borderRadius: t.radiusLg,
              backgroundColor: "transparent", border: `1.5px solid ${t.borderDefault}`,
              fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.medium,
              color: t.textMuted, outline: "none",
            }}
          >
            {tr("care.pcc.partner.cancel")}
          </button>
          <button
            disabled={!ready}
            onClick={() => onAccept({ name: name.trim(), relationship: relationship.trim(), mobile: mobile.trim(), signature, signedOn })}
            className="flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              minHeight: "54px", padding: "0 28px", borderRadius: t.radiusLg,
              backgroundColor: t.primary, border: "none", outline: "none",
              opacity: ready ? 1 : 0.45,
              cursor: ready ? "pointer" : "not-allowed",
              fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold,
              color: t.brandOnPrimary,
            }}
          >
            <Check size={20} strokeWidth={3} />
            {tr("care.pcc.partner.accept")}
          </button>
        </div>
      </div>

      {/* Leaving with something typed or drawn. The state behind this sheet is
          untouched while it is up, so "keep editing" really does keep it. */}
      <ConfirmDialog
        visible={askExit}
        variant="danger"
        title={tr("care.cp.exit.title")}
        message={tr("care.cp.exit.body")}
        confirmLabel={tr("care.cp.exit.discard")}
        cancelLabel={tr("care.cp.exit.keep")}
        onConfirm={() => { setAskExit(false); onClose(); }}
        onCancel={() => setAskExit(false)}
      />
    </div>,
    canvas,
  );
}
