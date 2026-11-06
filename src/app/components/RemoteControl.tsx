import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DialogFrame, DialogTitleBar, DialogText, DialogActions, DialogButton } from "./dialogKit";
import { Smartphone } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { useNurseStore } from "./NurseDataStore";
import { attachCursor } from "../lib/remote/remoteInput";
import { nativeRemote, nativeRemoteStatus } from "../lib/remote/nativeRemote";
import {
  getRemoteState, rejoinNativeSession, startRemote, stopRemote, subscribeRemote,
  type RemoteEndReason, type RemoteState,
} from "../lib/remote/remoteSession";

/** Above every overlay in the app, including the screensaver and admin gate. */
const Z_TOP = 2147483000;

const END_MESSAGES: Partial<Record<RemoteEndReason, string>> = {
  idle: "remote.end.idle",
  expired: "remote.end.expired",
  "code-expired": "remote.end.codeExpired",
  unreachable: "remote.end.unreachable",
  lost: "remote.end.lost",
};

/**
 * The terminal half of the phone remote: QR pairing, the pointer the phone
 * drives, a "Phone connected" chip that can always end it, and a short
 * notice when a session ends by itself. Settings starts a session with the
 * `careinn-remote-start` window event.
 */
export function RemoteControl() {
  const { theme } = useTheme();
  const { t, locale, isRTL, fontFamily } = useLocale();
  const mrn = useNurseStore().patient?.mrn ?? "";
  const [s, setS] = useState<RemoteState>(getRemoteState);

  useEffect(() => {
    const off = subscribeRemote(setS);
    rejoinNativeSession();
    return off;
  }, []);

  // On the kiosk app with its accessibility service off, offer to turn it on
  // first so the phone can reach other apps and websites too.
  const [askAccess, setAskAccess] = useState(false);

  useEffect(() => {
    const start = () => {
      if (!theme.remoteControl) return;
      if (nativeRemoteStatus() === "off") setAskAccess(true);
      else void startRemote({ locale, color: theme.primary });
    };
    window.addEventListener("careinn-remote-start", start);
    return () => window.removeEventListener("careinn-remote-start", start);
  }, [locale, theme.primary, theme.remoteControl]);

  // A session belongs to whoever is here now: signing out unmounts the app,
  // and a new admission changes the patient.
  useEffect(() => () => stopRemote("signed-out"), []);
  const sessionMrn = useRef(mrn);
  useEffect(() => {
    if (mrn !== sessionMrn.current) {
      sessionMrn.current = mrn;
      stopRemote("signed-out");
    }
  }, [mrn]);
  useEffect(() => {
    if (!theme.remoteControl) stopRemote("cancelled");
  }, [theme.remoteControl]);

  const pairing = s.phase === "starting" || (s.phase === "waiting" && !s.phoneSeen);

  // The QR library is only fetched when a code is actually shown.
  const [qrSvg, setQrSvg] = useState("");
  useEffect(() => {
    if (!s.pairUrl) {
      setQrSvg("");
      return;
    }
    let alive = true;
    const url = s.pairUrl;
    void import("uqr").then(({ renderSVG }) => {
      if (alive) setQrSvg(renderSVG(url, { ecc: "M", border: 1 }));
    });
    return () => { alive = false; };
  }, [s.pairUrl]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pairing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pairing]);

  const [notice, setNotice] = useState("");
  useEffect(() => {
    const key = s.phase === "off" && s.endReason ? END_MESSAGES[s.endReason] : undefined;
    if (!key) return;
    setNotice(t(key));
    const id = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(id);
    // t is rebuilt every render; the notice only needs to follow the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, s.endReason]);

  const remaining = Math.max(0, (s.pairExpiresAt ?? now) - now);
  const countdown = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;
  const linked = s.phoneSeen && (s.phase === "connected" || s.phase === "waiting");
  const dir = isRTL ? "rtl" : "ltr";

  return createPortal(
    <>
      {/* Both on the shared popup (dialogKit.tsx), titled with the Settings
          row that opened them. */}
      {askAccess && (
        <DialogFrame size="small" position="fixed" zIndex={Z_TOP} onClose={() => setAskAccess(false)}>
          <DialogTitleBar title={t("remote.settings.title")} onClose={() => setAskAccess(false)} icon={Smartphone} />
          <DialogText style={{ marginTop: "8px" }}>
            <b style={{ color: theme.textHeading }}>{t("remote.access.title")}</b> {t("remote.access.body")}
          </DialogText>
          <DialogActions>
            <DialogButton kind="outline" label={t("remote.access.skip")} onClick={() => { setAskAccess(false); void startRemote({ locale, color: theme.primary }); }} />
            <DialogButton label={t("remote.access.open")} onClick={() => { setAskAccess(false); nativeRemote()?.openSettings(); }} />
          </DialogActions>
        </DialogFrame>
      )}

      {pairing && (
        <DialogFrame size="small" position="fixed" zIndex={Z_TOP} onClose={() => stopRemote("cancelled")}>
          <DialogTitleBar title={t("remote.settings.title")} onClose={() => stopRemote("cancelled")} icon={Smartphone} />
          <DialogText style={{ marginTop: "8px" }}>
            {t("remote.pair.step1")} {t("remote.pair.step2")}
          </DialogText>
          <div className="flex flex-col items-center" style={{ gap: "12px", marginTop: "20px" }}>
            <div
              className="flex items-center justify-center"
              style={{ width: "232px", height: "232px", borderRadius: theme.radiusLg, border: `1px solid ${theme.borderDefault}`, padding: "12px", backgroundColor: "#FFFFFF" }}
            >
              {qrSvg ? (
                <div
                  style={{ width: "100%", height: "100%" }}
                  dangerouslySetInnerHTML={{ __html: qrSvg.replace("<svg ", '<svg width="100%" height="100%" ') }}
                />
              ) : (
                <div style={{ fontSize: "16px", color: theme.textMuted }}>{t("remote.pair.preparing")}</div>
              )}
            </div>
            {s.phase === "waiting" && (
              <DialogText align="center">{t("remote.pair.expires", countdown)}</DialogText>
            )}
          </div>
          <DialogActions>
            <DialogButton kind="secondary" label={t("remote.cancel")} onClick={() => stopRemote("cancelled")} />
          </DialogActions>
        </DialogFrame>
      )}

      {/* With the Android finger the app draws the pointer, above every app. */}
      {s.phase === "connected" && !s.native && (
        <div
          ref={attachCursor}
          aria-hidden="true"
          style={{ position: "fixed", left: 0, top: 0, zIndex: Z_TOP + 2, pointerEvents: "none", willChange: "transform" }}
        >
          <svg width="30" height="36" viewBox="0 0 20 24" style={{ display: "block" }}>
            <path
              d="M2 2 L2 19 L6.5 15 L9.5 22 L12.5 20.7 L9.6 14 L15.5 14 Z"
              fill="#111827" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {linked && (
        <div
          className="fixed flex items-center"
          style={{
            zIndex: Z_TOP + 1, bottom: "20px", insetInlineStart: "20px", direction: dir, fontFamily,
            gap: "12px", padding: "8px 8px 8px 16px", borderRadius: theme.radiusFull,
            backgroundColor: "#FFFFFF", boxShadow: "0 4px 18px rgba(0,0,0,0.18)", color: "#1A2B3C",
          }}
        >
          <span
            style={{
              width: "10px", height: "10px", borderRadius: "50%",
              backgroundColor: s.phase === "connected" ? "#16A34A" : "#F59E0B",
            }}
          />
          <Smartphone size={18} color={theme.primary} />
          <span style={{ fontSize: "15px", fontWeight: 600 }}>
            {t(s.phase === "connected" ? "remote.chip.connected" : "remote.chip.reconnecting")}
          </span>
          <button
            onClick={() => stopRemote("cancelled")}
            className="cursor-pointer active:scale-[0.96] transition-transform"
            style={{
              height: "36px", padding: "0 16px", borderRadius: theme.radiusFull, border: "none",
              backgroundColor: theme.primary, color: "#FFFFFF", fontSize: "14px", fontWeight: 600, fontFamily,
            }}
          >
            {t("remote.chip.disconnect")}
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="fixed"
          style={{
            zIndex: Z_TOP + 1, bottom: "24px", left: "50%", transform: "translateX(-50%)", direction: dir, fontFamily,
            padding: "12px 22px", borderRadius: theme.radiusFull, backgroundColor: "rgba(17,24,39,0.92)",
            color: "#FFFFFF", fontSize: "15px", maxWidth: "calc(100vw - 48px)",
          }}
        >
          {notice}
        </div>
      )}
    </>,
    document.body,
  );
}
