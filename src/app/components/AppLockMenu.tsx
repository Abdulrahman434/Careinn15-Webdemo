import React, { useState, useEffect, useRef } from "react";
import { useTheme, SHADOW, TYPE_SCALE } from "./ThemeContext";
import { DialogFrame, DialogTitleBar, DialogText, DialogActions, DialogButton } from "./dialogKit";
import { useLocale } from "./i18n";
import { Lock, Unlock, X, CheckCircle, ShieldAlert } from "lucide-react";
import { lockedAppsStore } from "../lib/lockedApps";
import { verifyPin, isAccountSet } from "../lib/accountAuth";
import { PinKeypad } from "./MyAccountDialog";
import { PIN_METRICS } from "./pinMetrics";

interface AppLockMenuProps {
  appId: string;
  appName: string;
  isCurrentlyLocked: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onRequestPinSetup: () => void;
  onOpenApp?: () => void;
}

type Step = "menu" | "verify-pin" | "success";

export function AppLockMenu({
  appId,
  appName,
  isCurrentlyLocked,
  onClose,
  onRequestPinSetup,
  onOpenApp
}: AppLockMenuProps) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();
  const [step, setStep] = useState<Step>(onOpenApp ? "verify-pin" : "menu");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [successMode, setSuccessMode] = useState<"locked" | "unlocked">("locked");

  const handleLock = () => {
    if (!isAccountSet()) {
      onRequestPinSetup();
      onClose();
      return;
    }
    lockedAppsStore.lock(appId);
    setSuccessMode("locked");
    setStep("success");
  };

  const handleUnlock = () => {
    setStep("verify-pin");
  };

  const handlePinComplete = async (completedPin: string) => {
    const isValid = await verifyPin(completedPin);
    if (isValid) {
      if (onOpenApp) {
        onOpenApp();
        onClose();
      } else {
        lockedAppsStore.unlock(appId);
        setSuccessMode("unlocked");
        setStep("success");
      }
    } else {
      setError(true);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 1000);
    }
  };

  /* Latest onClose, read when the timer fires: with onClose in the deps a
     re-rendering parent restarts the timer and "Locked" never closes. */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => onCloseRef.current(), 1200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  /* On the shared popup (dialogKit.tsx). The keypad and its result are a PIN
     popup (centred); the lock / unlock question is a standard one. Every
     step is titled with the action: Lock this app / Unlock this app, or the
     app's name when the PIN opens it. */
  const actionTitle = onOpenApp ? appName : isCurrentlyLocked ? tr("appLock.unlock.title") : tr("appLock.lock.title");
  const keypad = (step === "verify-pin" && isAccountSet()) || step === "success";

  return (
    <DialogFrame kind={keypad ? "pin" : "standard"} position="fixed" zIndex={10000} onClose={onClose}>
      <DialogTitleBar title={actionTitle} onClose={onClose} icon={isCurrentlyLocked ? Unlock : Lock} tone={isCurrentlyLocked && step === "menu" ? "danger" : "brand"} />

      {step === "menu" && (
        <>
          <DialogText style={{ marginTop: "8px" }}>
            {isCurrentlyLocked ? tr("appLock.unlock.subtitle") : tr("appLock.lock.subtitle")}
          </DialogText>
          <DialogActions>
            <DialogButton kind="secondary" label={tr("appLock.cancel")} onClick={onClose} />
            <DialogButton
              kind={isCurrentlyLocked ? "danger" : "primary"}
              label={isCurrentlyLocked ? tr("appLock.unlock.button") : tr("appLock.lock.button")}
              onClick={isCurrentlyLocked ? handleUnlock : handleLock}
            />
          </DialogActions>
        </>
      )}

      {step === "verify-pin" && !isAccountSet() && (
        <>
          <DialogText style={{ marginTop: "8px" }}>{tr("appLock.noPinSetup.subtitle")}</DialogText>
          <DialogActions>
            <DialogButton kind="secondary" label={tr("appLock.cancel")} onClick={onClose} />
            <DialogButton label={tr("settings.setPin")} onClick={onRequestPinSetup} />
          </DialogActions>
        </>
      )}

      {step === "verify-pin" && isAccountSet() && (
        <>
          <DialogText tone={error ? "error" : "muted"} style={{ marginTop: "16px" }}>
            {error ? tr("pin.wrong") : tr("lock.subtitle")}
          </DialogText>
          <PinKeypad pin={pin} setPin={setPin} error={error} onComplete={handlePinComplete} />
        </>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center" style={{ gap: "16px", padding: "32px 0 16px" }}>
          <CheckCircle size={48} style={{ color: t.successOn }} />
          <DialogText>{successMode === "locked" ? tr("appLock.locked") : tr("appLock.unlocked")}</DialogText>
        </div>
      )}
    </DialogFrame>
  );
}
