import React, { useState } from "react";
import { Lock, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { useTheme, SHADOW, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { isAccountSet, setAccount } from "../lib/accountAuth";
import { lockedAppsStore } from "../lib/lockedApps";
import { PinKeypad } from "./MyAccountDialog";
import { DialogFrame, DialogTitleBar, DialogText, DialogActions, DialogButton } from "./dialogKit";

interface AppLockSetupModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "confirm-lock" | "create-pin1" | "create-pin2" | "success";

export function AppLockSetupModal({
  appId,
  appName,
  onClose,
  onSuccess,
}: AppLockSetupModalProps) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily, isRTL } = useLocale();

  const hasPin = isAccountSet();
  const [step, setStep] = useState<Step>(hasPin ? "confirm-lock" : "create-pin1");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ─── Lock immediately if PIN already exists ─── */
  const handleLockExistingPin = () => {
    lockedAppsStore.lock(appId);
    showToastAndClose(`${appName} ${tr("appLock.lockedSuccessSuffix") || "is now locked."}`);
  };

  /* ─── Finish 4-digit PIN Step 1 ─── */
  const handlePin1Complete = (val: string) => {
    setPin1(val);
    setStep("create-pin2");
  };

  /* ─── Finish 4-digit PIN Step 2 ─── */
  const handlePin2Complete = async (val: string) => {
    setPin2(val);
    if (val === pin1) {
      await setAccount(val, null);
      lockedAppsStore.lock(appId);
      showToastAndClose(`${appName} ${tr("appLock.lockedSuccessSuffix") || "is now locked."}`);
    } else {
      setError(true);
      setTimeout(() => {
        setPin1("");
        setPin2("");
        setError(false);
        setStep("create-pin1");
      }, 1000);
    }
  };

  const showToastAndClose = (msg: string) => {
    setToastMessage(msg);
    setStep("success");
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1400);
  };

  /* On the shared popup (dialogKit.tsx). The question is a standard popup;
     creating the PIN is a PIN popup, with the same title and lines as Set
     PIN in Settings — one PIN, so one name for it. */
  const lockTitle = (tr("appLock.setup.title") || "Lock {name}?").replace("{name}", appName);
  const creating = step === "create-pin1" || step === "create-pin2";
  return (
    <DialogFrame kind={step === "confirm-lock" ? "standard" : "pin"} position="fixed" zIndex={10000} onClose={onClose}>
      <DialogTitleBar title={creating ? tr("settings.setPin") : lockTitle} onClose={onClose} icon={Lock} />

      {step === "confirm-lock" && (
        <>
          <DialogText style={{ marginTop: "8px" }}>{tr("appLock.setup.desc")}</DialogText>
          <DialogActions>
            <DialogButton kind="secondary" label={tr("appLock.cancel")} onClick={onClose} />
            <DialogButton label={tr("appLock.setup.confirm")} onClick={handleLockExistingPin} />
          </DialogActions>
        </>
      )}

      {creating && (
        <>
          <DialogText tone={error ? "error" : "muted"} style={{ marginTop: "16px" }}>
            {error ? tr("pinSetup.mismatch") : step === "create-pin1" ? tr("pinSetup.subtitle") : tr("pinSetup.confirm")}
          </DialogText>
          <PinKeypad
            pin={step === "create-pin1" ? pin1 : pin2}
            setPin={step === "create-pin1" ? setPin1 : setPin2}
            error={error}
            onComplete={step === "create-pin1" ? handlePin1Complete : handlePin2Complete}
          />
        </>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center" style={{ gap: "16px", padding: "32px 0 16px" }}>
          <CheckCircle2 size={48} style={{ color: t.successOn }} />
          <DialogText>{toastMessage}</DialogText>
        </div>
      )}
    </DialogFrame>
  );
}
