import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { getAccount, verifyPin, verifyNfcUid } from "../lib/accountAuth";
import { useNfcTap } from "../utils/nfc";
import { Lock, Smartphone } from "lucide-react";
import { PinKeypad } from "./MyAccountDialog";

interface Props {
  visible: boolean;
  onUnlock: () => void;
}

export function AccountLockScreen({ visible, onUnlock }: Props) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const account = getAccount();

  // Handle NFC tap for unlock
  useNfcTap((uid) => {
    if (visible && account?.nfcCardUid) {
      if (verifyNfcUid(uid)) {
        setPin("");
        setError(false);
        onUnlock();
      }
    }
  }, visible);

  // Clear state when visibility changes
  useEffect(() => {
    if (!visible) {
      setPin("");
      setError(false);
    }
  }, [visible]);

  // Handle PIN verification
  const handlePinComplete = async (completedPin: string) => {
    const isCorrect = await verifyPin(completedPin);
    if (isCorrect) {
      setPin("");
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 1000); // 1s shake/error display
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: t.surface,
        backgroundImage: `linear-gradient(to bottom, ${t.primarySubtle}, ${t.surface})`,
        animation: "settingsFadeIn 0.3s ease-out",
      }}
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: "400px",
          padding: "40px 32px",
          borderRadius: t.radiusXl,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 24px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="flex items-center justify-center mb-6"
          style={{ width: "64px", height: "64px", borderRadius: t.radiusFull, backgroundColor: t.primarySubtle }}
        >
          <Lock size={32} style={{ color: t.primary }} />
        </div>
        
        <span style={{ fontFamily: t.fontFamily, fontSize: "20px", fontWeight: 700, color: t.textHeading, textAlign: "center", marginBottom: "8px" }}>
          {tr("lock.title")}
        </span>

        {account?.nfcCardUid && (
          <div className="flex items-center gap-2 mb-4" style={{ padding: "8px 16px", borderRadius: t.radiusLg, backgroundColor: t.tileInactiveBg }}>
            <Smartphone size={16} style={{ color: t.textMuted }} />
            <span style={{ fontFamily: t.fontFamily, fontSize: "14px", fontWeight: 500, color: t.textMuted }}>
              {tr("lock.nfc.hint")}
            </span>
          </div>
        )}

        {error && (
          <span style={{ fontFamily: t.fontFamily, fontSize: "14px", fontWeight: 600, color: "#D10044", marginBottom: "16px", animation: "settingsFadeIn 0.2s ease-out" }}>
            {tr("lock.wrongPin")}
          </span>
        )}

        <div style={{ marginTop: "16px", width: "100%" }}>
          <PinKeypad pin={pin} setPin={setPin} error={error} onComplete={handlePinComplete} />
        </div>
      </div>
    </div>
  );
}
