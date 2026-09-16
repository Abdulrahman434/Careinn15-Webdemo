import { useEffect, useState } from "react";
import { FileSignature, Check, Languages, ChevronLeft, Trash2 } from "lucide-react";
import { useTheme } from "../../ThemeContext";
import type { Locale } from "../../i18n";
import { NURSE_FORMS, formHasLocale, pick, type FormDef } from "../FormsData";
import { SignaturePad } from "../SignaturePad";

/** A form the family member has put their name to. */
interface SignedForm {
  formId: string;
  signerName: string;
  signerRelationship: string;
  /** The language the document was displayed in when it was signed — what they
   *  actually read is part of the record, not a display preference. */
  locale: Locale;
  signedAt: string;
  signature: string;
}

const STORE_KEY = "careinn-signed-forms";

/** Never throws: a blocked store must not take the ward's forms down. */
function readSigned(): SignedForm[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSigned(list: SignedForm[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* A failed write is a lost save, not a dead screen. */
  }
}

export function FormsTab() {
  const { theme: t } = useTheme();
  const [signed, setSigned] = useState<SignedForm[]>(() => readSigned());
  const [open, setOpen] = useState<FormDef | null>(null);

  useEffect(() => { writeSigned(signed); }, [signed]);

  const signedFor = (id: string) => signed.find((s) => s.formId === id);

  if (open) {
    return (
      <FormReader
        form={open}
        existing={signedFor(open.id)}
        onBack={() => setOpen(null)}
        onSign={(record) => {
          setSigned((prev) => [record, ...prev.filter((s) => s.formId !== record.formId)]);
          setOpen(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="nurse-card">
        <h3>Forms</h3>
        <p style={{ fontSize: "13px", color: t.textMuted, marginTop: -4, marginBottom: 14 }}>
          Open a form to read it with the patient or their family member, switch it to their
          language, and take their signature on this screen.
        </p>

        <div className="flex flex-col" style={{ gap: 10 }}>
          {NURSE_FORMS.map((form) => {
            const record = signedFor(form.id);
            const bilingual = formHasLocale(form, "ar");
            return (
              <button
                key={form.id}
                onClick={() => setOpen(form)}
                className="flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform"
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  borderRadius: t.radiusLg,
                  backgroundColor: t.surfaceInset,
                  border: t.borderInset,
                  outline: "none",
                  textAlign: "left",
                }}
              >
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 44, height: 44, borderRadius: t.radiusMd,
                    backgroundColor: record ? t.successSubtle : t.primarySubtle,
                  }}
                >
                  {record
                    ? <Check size={20} style={{ color: t.successOn }} strokeWidth={2.6} />
                    : <FileSignature size={20} style={{ color: t.primaryOn }} />}
                </div>

                <div className="flex-1 min-w-0">
                  <span style={{ fontSize: "15px", fontWeight: 700, color: t.textHeading, display: "block" }}>
                    {form.title.en}
                  </span>
                  <span style={{ fontSize: "12.5px", color: t.textMuted }}>
                    {record
                      ? `Signed by ${record.signerName} · ${new Date(record.signedAt).toLocaleDateString()}`
                      : bilingual ? "English and Arabic · not signed" : "English only · not signed"}
                  </span>
                </div>

                {bilingual && (
                  <span
                    className="shrink-0 inline-flex items-center gap-1.5"
                    style={{
                      padding: "4px 10px", borderRadius: t.radiusFull,
                      backgroundColor: t.primarySubtle, color: t.primaryOn,
                      fontSize: "12px", fontWeight: 600,
                    }}
                  >
                    <Languages size={13} />
                    AR
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FormReader({
  form, existing, onBack, onSign,
}: {
  form: FormDef;
  existing?: SignedForm;
  onBack: () => void;
  onSign: (record: SignedForm) => void;
}) {
  const { theme: t } = useTheme();
  const bilingual = formHasLocale(form, "ar");
  const [locale, setLocale] = useState<Locale>("en");
  const [name, setName] = useState(existing?.signerName ?? "");
  const [relationship, setRelationship] = useState(existing?.signerRelationship ?? "");
  const [signature, setSignature] = useState<string | null>(existing?.signature ?? null);

  const isRTL = locale === "ar";
  const ready = !!name.trim() && (!form.askRelationship || !!relationship.trim()) && !!signature;

  const field = (value: string, set: (v: string) => void, label: string, placeholder: string) => (
    <div className="flex flex-col flex-1 min-w-0" style={{ gap: 6 }}>
      <label style={{ fontSize: "12.5px", fontWeight: 600, color: t.textMuted }}>{label}</label>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="ni-input"
        style={{
          height: 46, padding: "0 14px",
          borderRadius: t.radiusMd,
          backgroundColor: t.surface,
          border: t.borderInset,
          outline: "none",
          fontFamily: t.fontFamily, fontSize: "14px", color: t.textHeading,
        }}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="nurse-card">
        {/* Reader header: back, title, and the language the family reads in */}
        <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
          <button
            onClick={onBack}
            className="shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              width: 40, height: 40, borderRadius: t.radiusMd,
              backgroundColor: t.tileInactiveBg, border: "none", outline: "none",
            }}
            aria-label="Back to forms"
          >
            <ChevronLeft size={20} style={{ color: t.textMuted }} />
          </button>

          <h3 style={{ flex: 1, minWidth: 0, margin: 0 }}>{form.title.en}</h3>

          {bilingual && (
            <div className="flex shrink-0" style={{ gap: 4, padding: 4, borderRadius: t.radiusFull, backgroundColor: t.surfaceInset }}>
              {(["en", "ar"] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className="cursor-pointer active:scale-95 transition-transform"
                  style={{
                    padding: "6px 16px", borderRadius: t.radiusFull, border: "none", outline: "none",
                    backgroundColor: locale === l ? t.primary : "transparent",
                    color: locale === l ? t.brandOnPrimary : t.textMuted,
                    fontFamily: t.fontFamily, fontSize: "13px", fontWeight: 700,
                  }}
                >
                  {l === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* The document. Direction follows the language it is being read in,
            not the nurse interface's own. */}
        <div
          dir={isRTL ? "rtl" : "ltr"}
          style={{
            maxHeight: 340, overflowY: "auto",
            padding: "18px 20px",
            borderRadius: t.radiusLg,
            backgroundColor: t.surfaceInset,
            border: t.borderInset,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          <p style={{ fontSize: "17px", fontWeight: 700, color: t.textHeading, marginBottom: 10 }}>
            {pick(form.title, locale)}
          </p>
          {form.intro && (
            <p style={{ fontSize: "14px", color: t.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
              {pick(form.intro, locale)}
            </p>
          )}
          {form.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 14 }}>
              {section.heading && (
                <p style={{ fontSize: "14px", fontWeight: 700, color: t.textHeading, marginBottom: 8 }}>
                  {pick(section.heading, locale)}
                </p>
              )}
              <ol style={{ margin: 0, paddingInlineStart: 20 }}>
                {section.clauses.map((clause, ci) => (
                  <li
                    key={ci}
                    style={{ fontSize: "14px", color: t.textBody, lineHeight: 1.65, marginBottom: 6 }}
                  >
                    {pick(clause, locale)}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      <div className="nurse-card">
        <h3>Signature</h3>
        <div className="flex gap-3" style={{ marginBottom: 14 }}>
          {field(name, setName, `${form.signerLabel.en} name`, "Full name")}
          {form.askRelationship && field(relationship, setRelationship, "Relationship to patient", "For example: daughter, spouse")}
        </div>

        <SignaturePad onChange={setSignature} />

        {existing && (
          <p style={{ fontSize: "12.5px", color: t.textMuted, marginTop: 12 }}>
            Previously signed by {existing.signerRelationship
              ? `${existing.signerName} (${existing.signerRelationship})`
              : existing.signerName} on {new Date(existing.signedAt).toLocaleString()} — in{" "}
            {existing.locale === "ar" ? "Arabic" : "English"}. Signing again replaces it.
          </p>
        )}

        <div className="flex items-center gap-3" style={{ marginTop: 16 }}>
          <button
            onClick={() => ready && onSign({
              formId: form.id,
              signerName: name.trim(),
              signerRelationship: relationship.trim(),
              locale,
              signedAt: new Date().toISOString(),
              signature: signature!,
            })}
            disabled={!ready}
            className="flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              height: 48, padding: "0 26px",
              borderRadius: t.radiusMd, border: "none", outline: "none",
              backgroundColor: ready ? t.primary : t.disabledBg,
              color: ready ? t.brandOnPrimary : t.disabledOn,
              cursor: ready ? "pointer" : "default",
              fontFamily: t.fontFamily, fontSize: "14px", fontWeight: 700,
            }}
          >
            <Check size={18} />
            Save signature
          </button>

          {!ready && (
            <span style={{ fontSize: "12.5px", color: t.textMuted }}>
              Name{form.askRelationship ? ", relationship" : ""} and signature are all required.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
