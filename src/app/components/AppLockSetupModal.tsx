import React, { useState } from "react";
import { Lock, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { useTheme, SHADOW } from "./ThemeContext";
import { useLocale } from "./i18n";
import { isAccountSet, setAccount } from "../lib/accountAuth";
import { lockedAppsStore } from "../lib/lockedApps";
import { PinKeypad } from "./MyAccountDialog";

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

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center select-none"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        fontFamily,
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative flex flex-col items-center p-7 w-[360px] animate-in fade-in zoom-in-95 duration-200"
        style={{
          borderRadius: t.radiusXl,
          backgroundColor: t.surface,
          border: t.cardBorder,
          boxShadow: SHADOW.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            top: "12px",
            insetInlineEnd: "12px",
            width: "32px",
            height: "32px",
            borderRadius: t.radiusFull,
            backgroundColor: t.tileInactiveBg,
            border: "none",
            outline: "none",
          }}
        >
          <X size={16} style={{ color: t.textMuted }} />
        </button>

        {/* ─── CONFIRM LOCK (When PIN already exists) ─── */}
        {step === "confirm-lock" && (
          <div className="flex flex-col items-center text-center w-full pt-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ backgroundColor: t.primarySubtle, color: t.primaryOn }}
            >
              <Lock size={32} strokeWidth={2.2} />
            </div>

            <h3 style={{ fontFamily, fontSize: "18px", fontWeight: 700, color: t.textHeading, lineHeight: 1.3 }}>
              {tr("appLock.setup.title")?.replace("{name}", appName) || `Lock ${appName}?`}
            </h3>

            <p className="px-2" style={{ fontFamily, fontSize: "13px", fontWeight: 500, color: t.textMuted, marginTop: "8px", lineHeight: "20px" }}>
              {tr("appLock.setup.desc") || "A PIN will be required whenever someone opens this app."}
            </p>

            <div className="flex flex-col w-full gap-2.5 mt-6">
              <button
                onClick={handleLockExistingPin}
                className="w-full py-3.5 cursor-pointer active:scale-98 transition-all shadow-sm"
                style={{ fontFamily, fontSize: "14px", fontWeight: 700, color: t.textInverse, backgroundColor: t.primary, borderRadius: t.radiusLg, border: "none" }}
              >
                {tr("appLock.setup.confirm") || "Lock App"}
              </button>
              <button
                onClick={onClose}
                className="w-full py-3.5 cursor-pointer active:scale-98 transition-all"
                style={{ fontFamily, fontSize: "14px", fontWeight: 600, color: t.textMuted, backgroundColor: "transparent", borderRadius: t.radiusLg, border: `1.5px solid ${t.borderDefault}` }}
              >
                {tr("appLock.cancel") || "Cancel"}
              </button>
            </div>
          </div>
        )}

        {/* ─── CREATE PIN STEP 1 ─── */}
        {step === "create-pin1" && (
          <div className="flex flex-col items-center text-center w-full pt-2">
            <div
              className="flex items-center justify-center"
              style={{ width: "56px", height: "56px", borderRadius: t.radiusLg, backgroundColor: t.primarySubtle, marginBottom: "16px" }}
            >
              <Lock size={28} style={{ color: t.primaryOn }} />
            </div>

            <h3 style={{ fontFamily, fontSize: "18px", fontWeight: 700, color: t.textHeading }}>
              {tr("appLock.createPin.title") || "Create Privacy PIN"}
            </h3>
            <p style={{ fontFamily, fontSize: "13px", fontWeight: 500, color: t.textMuted, marginTop: "8px", lineHeight: "20px" }}>
              {tr("appLock.createPin.sub1") || `Set a 4-digit PIN to lock ${appName}`}
            </p>

            <div className="w-full">
              <PinKeypad
                pin={pin1}
                setPin={setPin1}
                error={error}
                onComplete={handlePin1Complete}
              />
            </div>
          </div>
        )}

        {/* ─── CREATE PIN STEP 2 (CONFIRMATION) ─── */}
        {step === "create-pin2" && (
          <div className="flex flex-col items-center text-center w-full pt-2">
            <div
              className="flex items-center justify-center"
              style={{ width: "56px", height: "56px", borderRadius: t.radiusLg, backgroundColor: t.primarySubtle, marginBottom: "16px" }}
            >
              <Lock size={28} style={{ color: t.primaryOn }} />
            </div>

            <h3 style={{ fontFamily, fontSize: "18px", fontWeight: 700, color: t.textHeading }}>
              {tr("appLock.createPin.confirmTitle") || "Confirm Privacy PIN"}
            </h3>
            <p style={{ fontFamily, fontSize: "13px", fontWeight: 500, color: t.textMuted, marginTop: "8px", lineHeight: "20px" }}>
              {tr("appLock.createPin.sub2") || "Re-enter your 4-digit PIN to confirm"}
            </p>

            <div className="w-full">
              <PinKeypad
                pin={pin2}
                setPin={setPin2}
                error={error}
                onComplete={handlePin2Complete}
              />
            </div>
          </div>
        )}

        {/* ─── SUCCESS TOAST ─── */}
        {step === "success" && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 animate-in zoom-in-75 duration-200">
              <CheckCircle2 size={40} strokeWidth={2.2} />
            </div>
            <h3 style={{ fontFamily, fontSize: "18px", fontWeight: 700, color: t.textHeading }}>
              {toastMessage}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
