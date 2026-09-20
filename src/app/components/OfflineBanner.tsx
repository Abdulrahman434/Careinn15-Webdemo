import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTheme, SHADOW, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { wifi, isAndroidApp } from "../utils/androidBridge";
import { PIN_METRICS } from "./pinMetrics";
import { verifyPin } from "../lib/accountAuth";

interface OfflineBannerProps {
  visible: boolean;
  onBypass?: () => void;
}

// Grace period to avoid flashing the banner during initial app load
// or brief network blips. Only render after offline has been confirmed
// for this many ms.
const SHOW_DELAY_MS = 1500;

export function OfflineBanner({ visible, onBypass }: OfflineBannerProps) {
  const { theme: t } = useTheme();
  const { fontFamily, t: tr } = useLocale();
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [render, setRender] = useState(false);

  // Debounce visibility so we don't flash on cold boot or transient drops.
  useEffect(() => {
    if (!visible) {
      setRender(false);
      setShowPinEntry(false);
      setPin("");
      setPinError(false);
      return;
    }
    const id = setTimeout(() => setRender(true), SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible]);

  if (!render) return null;

  const openWifi = () => {
    if (isAndroidApp()) {
      wifi.openSettings();
    }
  };

  const handleContinueOffline = () => {
    onBypass?.();
  };

  const submitPin = async () => {
    const ok = await verifyPin(pin);
    if (ok) {
      setPin("");
      setShowPinEntry(false);
      setPinError(false);
      if (onBypass) {
        onBypass();
      } else {
        openWifi();
      }
    } else {
      setPinError(true);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: t.overlay,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 9000,
        }}
      />
      {/* Centered card */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            /* The same card as the PIN prompt and the confirm dialog: one
               popup shape for the app, rather than this one keeping its own
               width, radius and edgeless surface. */
            width: PIN_METRICS.card,
            maxWidth: "92%",
            padding: PIN_METRICS.pad,
            borderRadius: t.radiusXl,
            backgroundColor: t.surface,
            border: t.cardBorder,
            boxShadow: SHADOW.xl,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* A tinted tile, like every other dialog's icon. Warning tones
              rather than grey: losing the network is not a routine state, and
              a grey glyph on a grey disc gave the card no focal point. */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: t.radiusLg,
              backgroundColor: t.warningSubtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <WifiOff size={28} color={t.warningOn} />
          </div>

          {/* Title + subtitle */}
          <div style={{ textAlign: "center", marginBottom: 26, textWrap: "balance" } as any}>
            <p
              style={{
                fontFamily,
                ...TEXT_STYLE.dialogTitle,
                color: t.textHeading,
                margin: "0 0 8px 0",
              }}
            >
              {tr("offline.title")}
            </p>
            <p
              style={{
                fontFamily,
                ...TEXT_STYLE.dialogBody,
                color: t.textMuted,
                margin: 0,
              }}
            >
              {tr("offline.subtitle")}
            </p>
          </div>

          {!showPinEntry ? (
            /* Action buttons */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
              }}
            >
              <button
                onClick={openWifi}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  minHeight: `${PIN_METRICS.action}px`,
                  padding: "0 20px",
                  borderRadius: t.radiusLg,
                  backgroundColor: t.primary,
                  border: "none",
                  cursor: "pointer",
                  fontFamily,
                  ...TEXT_STYLE.dialogButton,
                  color: t.textInverse,
                }}
              >
                <Wifi size={20} color={t.textInverse} />
                {tr("offline.openWifi")}
              </button>

              {/* Quiet, and no shield on it. Two filled-and-outlined buttons
                  of the same width read as two equal choices, when one of
                  them is "carry on, the screen still works" — and a shield
                  belongs on something that protects, not on a way out. */}
              <button
                onClick={handleContinueOffline}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  padding: "0 16px",
                  borderRadius: t.radiusMd,
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily,
                  ...TEXT_STYLE.dialogButton,
                  color: t.textMuted,
                }}
              >
                {tr("offline.adminPin")}
              </button>
            </div>
          ) : (
            /* PIN entry */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
              }}
            >
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (pinError) setPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitPin();
                }}
                placeholder={tr("offline.enterPin")}
                style={{
                  minHeight: `${PIN_METRICS.action}px`,
                  padding: "0 18px",
                  borderRadius: t.radiusLg,
                  backgroundColor: t.surfaceInset,
                  border: `1.5px solid ${pinError ? t.errorOn : t.borderDefault}`,
                  outline: "none",
                  fontFamily,
                  ...TEXT_STYLE.dialogBody,
                  color: t.textBody,
                  textAlign: "center",
                  letterSpacing: "0.4em",
                }}
              />
              <button
                onClick={submitPin}
                disabled={!pin}
                style={{
                  minHeight: `${PIN_METRICS.action}px`,
                  padding: "0 20px",
                  borderRadius: t.radiusLg,
                  backgroundColor: t.primary,
                  border: "none",
                  cursor: pin ? "pointer" : "not-allowed",
                  opacity: pin ? 1 : 0.5,
                  fontFamily,
                  ...TEXT_STYLE.dialogButton,
                  color: t.textInverse,
                }}
              >
                {tr("general.confirm")}
              </button>
              <button
                onClick={() => {
                  setShowPinEntry(false);
                  setPin("");
                  setPinError(false);
                }}
                style={{
                  padding: "8px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily,
                  ...TEXT_STYLE.label,
                  color: t.textMuted,
                }}
              >
                {tr("offline.cancel")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
