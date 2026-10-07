import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, Smartphone, KeyRound, Trash2, ExternalLink } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { wipeForNextPatient } from "../lib/clearAllData";

/**
 * Staff-opened "sign in to a service" helper. It never handles passwords:
 * it opens the service's own page (an EMR portal, a streaming site) and
 * tells the user to finish sign-in the safe way — approve a code or QR on
 * their own phone, or use a passkey — so the password is entered on the
 * user's phone against the service, never typed through this terminal.
 * Whatever is opened here is cleared on sign-out (see wipeForNextPatient),
 * and "Clear now" wipes it on the spot.
 *
 * Reached from Settings and from the Care Team (staff) area. No address is
 * hardcoded: staff type the portal's address, so it works for any EMR once
 * the hospital provides the link.
 */
export function SignInHelper({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const { t, isRTL, fontFamily } = useLocale();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const open = () => {
    let u = url.trim();
    if (u && !/^https?:\/\//i.test(u) && /^[\w-]+(\.[\w-]+)+/.test(u)) u = "https://" + u;
    if (!/^https?:\/\/[^\s]+$/i.test(u)) { setError(t("signin.badUrl")); return; }
    setError("");
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const clearNow = async () => {
    try { (window.AndroidSystem as { clearSession?: () => void } | undefined)?.clearSession?.(); } catch { /* not on Android */ }
    try { await wipeForNextPatient(); } catch { /* best effort */ }
    setToast(t("signin.cleared"));
    setTimeout(() => setToast(""), 2500);
  };

  const card = (icon: React.ReactNode, text: string) => (
    <div className="flex items-start" style={{ gap: "12px" }}>
      <div style={{ color: theme.primary, flexShrink: 0, marginTop: "2px" }}>{icon}</div>
      <div style={{ fontSize: "15px", lineHeight: 1.6, color: "#334155" }}>{text}</div>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 2147483000, backgroundColor: "rgba(0,0,0,0.55)", fontFamily, direction: isRTL ? "rtl" : "ltr" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col"
        style={{
          width: "560px", maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 48px)", overflowY: "auto",
          backgroundColor: "#FFFFFF", borderRadius: theme.radiusLg, color: "#1A2B3C", padding: "28px", gap: "18px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: "12px" }}>
            <div className="flex items-center justify-center" style={{ width: "44px", height: "44px", borderRadius: "13px", backgroundColor: theme.primary }}>
              <ShieldCheck size={24} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: "21px", fontWeight: 700 }}>{t("signin.title")}</div>
              <div style={{ fontSize: "14px", color: "#64748B" }}>{t("signin.subtitle")}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={24} />
          </button>
        </div>

        <div className="flex" style={{ gap: "10px" }}>
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="https://…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, height: "52px", padding: "0 16px", borderRadius: "14px",
              border: `1.5px solid ${error ? "#EF4444" : "#CBD5E1"}`, fontSize: "16px", direction: "ltr",
            }}
          />
          <button
            onClick={open}
            className="cursor-pointer active:scale-[0.97] transition-transform flex items-center justify-center"
            style={{ height: "52px", padding: "0 22px", borderRadius: "14px", border: "none", backgroundColor: theme.primary, color: "#fff", fontSize: "16px", fontWeight: 600, gap: "8px" }}
          >
            <ExternalLink size={18} /> {t("signin.open")}
          </button>
        </div>
        {error && <div style={{ color: "#EF4444", fontSize: "14px", marginTop: "-8px" }}>{error}</div>}

        <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{t("signin.safe.title")}</div>
          {card(<Smartphone size={20} />, t("signin.safe.code"))}
          {card(<KeyRound size={20} />, t("signin.safe.passkey"))}
          {card(<Trash2 size={20} />, t("signin.safe.wipe"))}
        </div>

        <button
          onClick={clearNow}
          className="cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-center"
          style={{ height: "50px", borderRadius: theme.radiusFull, border: `1.5px solid ${theme.primary}`, color: theme.primary, backgroundColor: "transparent", fontSize: "15px", fontWeight: 600, gap: "8px" }}
        >
          <Trash2 size={18} /> {t("signin.clearNow")}
        </button>

        {toast && (
          <div style={{ textAlign: "center", color: "#16A34A", fontSize: "14px", fontWeight: 600 }}>{toast}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
