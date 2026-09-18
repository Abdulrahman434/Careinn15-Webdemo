import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, UserRound } from "lucide-react";
import { useTheme, TYPE_SCALE, WEIGHT, LEADING, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";
import { SignaturePad } from "./nurse/SignaturePad";
import { DateField } from "./nurse/DateField";
import { CARE_PARTNER_ITEMS, type CarePartnerRecord } from "./carePartnerStore";

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
  const { theme: t } = useTheme();
  const { t: tr, fontFamily, isRTL, dir } = useLocale();

  const [name, setName] = useState(initial.name);
  const [relationship, setRelationship] = useState(initial.relationship);
  const [mobile, setMobile] = useState(initial.mobile);
  const [signature, setSignature] = useState<string | null>(initial.signature);
  /* Dated today by default — the partner is signing now — but editable,
     because the paper form has a date line and wards use it. */
  const [signedOn, setSignedOn] = useState(
    initial.signedOn || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, ""),
  );

  const ready = !!name.trim() && !!relationship.trim() && !!mobile.trim() && !!signature;

  const label: React.CSSProperties = {
    fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.semibold,
    color: t.textMuted, display: "block", marginBottom: "6px",
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
        {/* Header */}
        <div
          className="shrink-0 flex items-center gap-4"
          style={{ padding: "22px 28px", borderBottom: `1px solid ${t.borderDefault}` }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: "48px", height: "48px", borderRadius: t.radiusLg, backgroundColor: t.primarySubtle }}
          >
            <UserRound size={24} style={{ color: t.primaryOn }} />
          </div>
          <h2
            className="flex-1 min-w-0"
            style={{
              fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold,
              color: t.textHeading, margin: 0, lineHeight: LEADING.snug,
            }}
          >
            {tr("care.cp.title")}
          </h2>
          <button
            onClick={onClose}
            aria-label={tr("care.pcc.partner.cancel")}
            className="shrink-0 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            style={{
              width: "48px", height: "48px", borderRadius: t.radiusMd,
              backgroundColor: t.tileInactiveBg, border: "none", outline: "none",
            }}
          >
            <X size={22} style={{ color: t.textMuted }} strokeWidth={2.5} />
          </button>
        </div>

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

          {/* The acknowledgement the signature belongs to */}
          <p style={{
            fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold,
            color: t.textHeading, lineHeight: LEADING.normal,
            backgroundColor: t.primarySubtle, border: t.borderInset,
            borderRadius: t.radiusMd, padding: "16px 18px", margin: "20px 0 24px",
          }}>
            {tr("care.cp.ack")}
          </p>

          {/* The signature block, in the order the paper form has it */}
          <div className="grid grid-cols-2" style={{ gap: "16px" }}>
            <div>
              <label style={label}>{tr("care.cp.field.name")} <span style={{ color: t.errorOn }}>*</span></label>
              <input
                dir="auto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("care.pcc.partner.namePlaceholder")}
                style={field}
              />
            </div>
            <div>
              <label style={label}>{tr("care.cp.field.relationship")} <span style={{ color: t.errorOn }}>*</span></label>
              <input
                dir="auto"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder={tr("care.pcc.partner.relationshipPlaceholder")}
                style={field}
              />
            </div>
            <div>
              <label style={label}>{tr("care.cp.field.mobile")} <span style={{ color: t.errorOn }}>*</span></label>
              <input
                dir="ltr"
                inputMode="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d+\s-]/g, ""))}
                placeholder={tr("care.cp.mobilePlaceholder")}
                style={{ ...field, textAlign: isRTL ? "right" : "left" }}
              />
            </div>
            <div>
              <label style={label}>{tr("care.cp.field.date")}</label>
              <DateField value={signedOn} onChange={setSignedOn} style={{ minHeight: "52px" }} />
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={label}>{tr("care.cp.field.sign")} <span style={{ color: t.errorOn }}>*</span></label>
            <p style={{
              fontFamily, fontSize: TYPE_SCALE.sm, color: t.textMuted, margin: "0 0 8px",
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
          <span style={{ flex: 1, minWidth: 0 }} />
          <button
            onClick={onClose}
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
    </div>,
    canvas,
  );
}
