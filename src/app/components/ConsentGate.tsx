import { useEffect, useRef, useState } from "react";
import { useLocale } from "./i18n";

/* ═══════════════════════════════════════════════════════════════════════════
 * Admission consent gate
 *
 * Shown once, after the onboarding/welcome flow and before the patient reaches
 * the home screen. The consent document itself lives in an <iframe> (NOT a PDF
 * viewer) and reports its own scroll position to us via window.postMessage:
 *
 *   { source: "consent-form", type: "ready" | "progress" | "scrolled-to-end", value?: number }
 *
 * The Accept button stays disabled until the form reports "scrolled-to-end",
 * so the patient cannot continue without scrolling the whole document.
 *
 * Colors are fixed to the consent document's own brand (plum #7a1f4d, disabled
 * #cfc6d3) rather than theme tokens, so the gate matches the framed form 1:1
 * regardless of which hospital brand is active.
 * ═══════════════════════════════════════════════════════════════════════════ */

const PLUM = "#7a1f4d";
const DISABLED = "#cfc6d3";

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
  const { t, dir, fontFamily } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

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

  return (
    <div
      dir={dir}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "900px",
          height: "100%",
          maxHeight: "96%",
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 28px",
            color: "#ffffff",
            background: PLUM,
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          {t("admissionConsent.title")}
        </div>

        {/* Thin progress bar */}
        <div style={{ height: "4px", background: "#efe7ee" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              background: PLUM,
              transition: "width 0.15s ease-out",
            }}
          />
        </div>

        {/* Framed consent document */}
        <iframe
          ref={iframeRef}
          src={src}
          title={t("admissionConsent.title")}
          style={{ flex: 1, width: "100%", border: "none" }}
        />

        {/* Footer: hint + reject/accept */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            padding: "18px 28px",
            borderTop: "1px solid #e6dfe9",
            background: "#ffffff",
          }}
        >
          <span style={{ fontSize: "15px", color: "#6d6373" }}>
            {t("admissionConsent.hint")}
          </span>
          <div style={{ display: "flex", flexShrink: 0, gap: "12px" }}>
            {/* Secondary / outline */}
            <button
              type="button"
              disabled={!reachedEnd}
              onClick={() => setConfirmingReject(true)}
              style={{
                padding: "14px 28px",
                borderRadius: "12px",
                border: `2px solid ${reachedEnd ? PLUM : DISABLED}`,
                fontSize: "17px",
                fontWeight: 700,
                color: reachedEnd ? PLUM : DISABLED,
                background: "transparent",
                cursor: reachedEnd ? "pointer" : "not-allowed",
                transition: "border-color 0.2s ease, color 0.2s ease",
              }}
            >
              {t("admissionConsent.reject")}
            </button>
            {/* Primary */}
            <button
              type="button"
              disabled={!reachedEnd}
              onClick={onAccept}
              style={{
                padding: "14px 28px",
                borderRadius: "12px",
                border: "none",
                fontSize: "17px",
                fontWeight: 700,
                color: "#ffffff",
                background: reachedEnd ? PLUM : DISABLED,
                cursor: reachedEnd ? "pointer" : "not-allowed",
                transition: "background 0.2s ease",
              }}
            >
              {t("admissionConsent.accept")}
            </button>
          </div>
        </div>
      </div>

      {/* Reject confirmation */}
      {confirmingReject && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            }}
          >
            <p style={{ margin: "0 0 24px", fontSize: "18px", color: "#2b2230", lineHeight: 1.5 }}>
              {t("admissionConsent.confirm.message")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setConfirmingReject(false)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: `2px solid ${PLUM}`,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: PLUM,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {t("admissionConsent.confirm.goBack")}
              </button>
              <button
                type="button"
                onClick={onReject}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: PLUM,
                  cursor: "pointer",
                }}
              >
                {t("admissionConsent.confirm.yesReject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
