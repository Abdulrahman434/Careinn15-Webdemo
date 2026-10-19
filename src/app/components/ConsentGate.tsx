import { useEffect, useRef, useState } from "react";
import { FileCheck2, Check, AlertTriangle } from "lucide-react";
import { ModalHeader } from "./primitives";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";
import { ConfirmDialog } from "./ConfirmDialog";

/* ═══════════════════════════════════════════════════════════════════════════
 * Admission consent gate
 *
 * Shown after the onboarding consent step (Burjeel only). The consent document
 * itself lives in an <iframe> (NOT a PDF viewer) and reports its own scroll
 * position to us via window.postMessage:
 *
 *   { source: "consent-form", type: "ready" | "progress" | "scrolled-to-end", value?: number }
 *
 * The Accept button stays disabled until the form reports "scrolled-to-end",
 * so the patient cannot continue without scrolling the whole document.
 *
 * Chrome (header, footer, pill buttons, EN/AR toggle, fonts and tokens) is
 * shared with the Care Partner Agreement dialog — same ModalHeader, same
 * ConfirmDialog, same TYPE_SCALE / WEIGHT / SHADOW scale and theme tokens — so
 * the two popups read as one product.
 *
 * Language: the EN/AR toggle in ModalHeader flips the app locale, which drives
 * this gate's labels and direction (useLocale) AND the language shown inside
 * the iframe. The host tells the iframe which language and font to render via a
 * `?lang=&font=` query on first load, and a postMessage afterwards:
 *
 *   { source: "consent-form-host", type: "set-lang", lang: "en" | "ar", font }
 *
 * On a language change the document scrolls back to the top and Accept is
 * disabled again until the end of the newly shown language is reached.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Hospitals that require the admission consent step before the home screen.
 * Add more config ids here as other hospitals adopt the flow. The ids match
 * the HospitalCoreConfig.id values in ThemeContext (and the ThemeContext
 * `activeConfigId` / localStorage "active-hospital-id"). */
const CONSENT_HOSPITAL_IDS = new Set<string>(["burjeel"]);

export function requiresAdmissionConsent(hospitalId: string | null | undefined): boolean {
  return !!hospitalId && CONSENT_HOSPITAL_IDS.has(hospitalId.trim().toLowerCase());
}

interface ConsentMessage {
  source?: string;
  type?: "ready" | "progress" | "scrolled-to-end";
  value?: number;
}

interface ConsentGateProps {
  /** The consent document to frame. Defaults to the bundled dummy form.
   *  TODO(backend): this should come from the file the admin uploads under
   *  Backend → Consent → Consent Form, not a hard-coded public asset. */
  src?: string;
  onAccept: () => void;
  /** Called when the patient confirms rejection. Acceptance is NOT saved.
   *  The caller logs the patient out / returns to the welcome screen.
   *  TODO(backend): record the rejection server-side as well (patient id,
   *  consent type = admission, timestamp). */
  onReject: () => void;
}

export function ConsentGate({ src = "/consent-form.html", onAccept, onReject }: ConsentGateProps) {
  const { theme, darkMode } = useTheme();
  const { t, locale, dir, fontFamily } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  /* The form has English and Arabic; every other locale (e.g. Urdu) reads the
     English document, matching the EN/AR-only toggle in the header. */
  const formLang: "en" | "ar" = locale === "ar" ? "ar" : "en";

  /* Built once, so toggling the language does NOT reload the iframe — the
     language change is a postMessage, not a new src. */
  const initialSrc = useRef(
    `${src}${src.includes("?") ? "&" : "?"}lang=${formLang}&font=${encodeURIComponent(fontFamily)}`,
  ).current;

  /* Incoming scroll reports from the framed document. */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only trust messages coming from THIS iframe's document, and only ones
      // that carry the agreed envelope. Everything else is ignored.
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as ConsentMessage | null;
      if (!data || data.source !== "consent-form") return;

      if (data.type === "progress" && typeof data.value === "number") {
        setProgress(Math.max(0, Math.min(1, data.value)));
      } else if (data.type === "scrolled-to-end") {
        setReachedEnd(true);
        setProgress(1);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* Language change (via the header toggle): tell the iframe to switch, and
     require the patient to reach the end of the newly shown language again.
     Skipped on first mount — the iframe already got lang+font via its src. */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setReachedEnd(false);
    setProgress(0);
    iframeRef.current?.contentWindow?.postMessage(
      { source: "consent-form-host", type: "set-lang", lang: formLang, font: fontFamily },
      "*",
    );
  }, [formLang, fontFamily]);

  /* The X and the Reject button do the same thing: ask before leaving without
     accepting. */
  const requestReject = () => setConfirmingReject(true);

  return (
    <div
      dir={dir}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 100000,
        backgroundColor: theme.overlay,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        padding: "24px",
        fontFamily,
      }}
    >
      <div
        className="relative flex flex-col"
        style={{
          /* Same footprint as the Care Partner Agreement dialog — a bounded
             box, not the full screen. Percentage (not vh) so it tracks the
             scaled 1920×1080 canvas the gate lives in. */
          width: "min(920px, 92%)",
          height: "85%",
          maxHeight: "85%",
          borderRadius: theme.radiusXl,
          backgroundColor: theme.surface,
          border: theme.cardBorder,
          boxShadow: SHADOW.xl,
          overflow: "hidden",
        }}
      >
        {/* Shared header: tinted icon tile, title, EN/AR toggle, close (X). The
            X closes without accepting (behaves like Reject). */}
        <ModalHeader
          icon={FileCheck2}
          title={t("admissionConsent.title")}
          onClose={requestReject}
        />

        {/* Thin progress bar under the header */}
        <div className="shrink-0" style={{ height: "4px", backgroundColor: theme.surfaceInset }}>
          <div
            style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: theme.primary,
              transition: "width 0.15s ease-out",
            }}
          />
        </div>

        {/* Framed consent document */}
        <iframe
          ref={iframeRef}
          src={initialSrc}
          title={t("admissionConsent.title")}
          style={{ flex: 1, width: "100%", border: "none" }}
        />

        {/* Footer: hint on the left, Reject / Accept pills on the right —
            matching the Care Partner Agreement footer. */}
        <div
          className="shrink-0 flex items-center justify-between gap-3"
          style={{
            padding: "18px 28px",
            borderTop: `1px solid ${theme.borderDefault}`,
            backgroundColor: theme.surfaceInset,
          }}
        >
          <span className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
            {!reachedEnd && (
              <>
                <AlertTriangle size={17} style={{ color: theme.warningOn }} strokeWidth={2.4} className="shrink-0" />
                <span
                  style={{
                    fontFamily,
                    fontSize: TYPE_SCALE.sm,
                    fontWeight: WEIGHT.semibold,
                    color: darkMode ? theme.textBody : theme.textMuted,
                  }}
                >
                  {t("admissionConsent.hint")}
                </span>
              </>
            )}
          </span>

          {/* Secondary / outline pill */}
          <button
            type="button"
            disabled={!reachedEnd}
            onClick={requestReject}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              minHeight: "54px",
              padding: "0 26px",
              borderRadius: theme.radiusFull,
              backgroundColor: "transparent",
              border: `1.5px solid ${theme.borderDefault}`,
              fontFamily,
              fontSize: TYPE_SCALE.base,
              fontWeight: WEIGHT.medium,
              color: theme.textMuted,
              outline: "none",
              opacity: reachedEnd ? 1 : 0.45,
              cursor: reachedEnd ? "pointer" : "not-allowed",
            }}
          >
            {t("admissionConsent.reject")}
          </button>

          {/* Primary pill with a check icon */}
          <button
            type="button"
            disabled={!reachedEnd}
            onClick={onAccept}
            className="flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              minHeight: "54px",
              padding: "0 28px",
              borderRadius: theme.radiusFull,
              backgroundColor: theme.primary,
              border: "none",
              outline: "none",
              fontFamily,
              fontSize: TYPE_SCALE.base,
              fontWeight: WEIGHT.semibold,
              color: theme.brandOnPrimary,
              boxShadow: reachedEnd ? SHADOW.md : "none",
              opacity: reachedEnd ? 1 : 0.45,
              cursor: reachedEnd ? "pointer" : "not-allowed",
            }}
          >
            <Check size={20} strokeWidth={3} />
            {t("admissionConsent.accept")}
          </button>
        </div>
      </div>

      {/* Reject confirmation — shared dialog, in front of the gate. */}
      <ConfirmDialog
        visible={confirmingReject}
        variant="danger"
        message={t("admissionConsent.confirm.message")}
        confirmLabel={t("admissionConsent.confirm.yesReject")}
        cancelLabel={t("admissionConsent.confirm.goBack")}
        onConfirm={onReject}
        onCancel={() => setConfirmingReject(false)}
      />
    </div>
  );
}
