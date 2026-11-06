import React, { useState, useEffect } from "react";
import { useTheme, SHADOW, TEXT_STYLE, WEIGHT } from "./ThemeContext";
import { DialogFrame, DialogTitleBar, DialogText, DialogActions, DialogButton } from "./dialogKit";
import { useLocale } from "./i18n";
import { getAccount, verifyPin, verifyNfcUid } from "../lib/accountAuth";
import { useNfcTap } from "../utils/nfc";
import { Lock, Smartphone, X } from "lucide-react";
import { PinKeypad } from "./MyAccountDialog";
import { guestModeStore } from "../lib/guestMode";
import { PIN_METRICS, PIN_TYPE } from "./pinMetrics";

interface Props {
  visible: boolean;
  onUnlock: () => void;
  onClose: () => void;
  onSkipAsGuest: () => void;
}

export function AccountLockScreen({ visible, onUnlock, onClose, onSkipAsGuest }: Props) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const account = getAccount();

  // Handle NFC tap for unlock
  useNfcTap((uid) => {
    if (visible && account?.nfcCardUid) {
      if (verifyNfcUid(uid)) {
        guestModeStore.exitGuestMode();
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
      guestModeStore.exitGuestMode();
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

  const handleSkipAsGuest = () => {
    guestModeStore.enterGuestMode();
    onSkipAsGuest();
  };

  if (!visible) return null;

  /* A PIN popup on the shared frame (dialogKit.tsx): centred title, one
     line (the NFC hint, or the error), the keypad, then the guest choice. */
  return (
    <DialogFrame kind="pin" position="fixed" zIndex={9999} onClose={onClose}>
      <DialogTitleBar title={tr("lock.title")} onClose={onClose} />
      <DialogText tone={error ? "error" : "muted"} style={{ marginTop: "16px" }}>
        {error ? tr("lock.wrongPin") : account?.nfcCardUid ? tr("lock.nfc.hint") : tr("lock.subtitle")}
      </DialogText>
      <PinKeypad pin={pin} setPin={setPin} error={error} onComplete={handlePinComplete} />
      <DialogActions>
        {/* The guest choice and what it means, together in the footer. */}
        <div className="flex flex-col w-full" style={{ gap: "8px" }}>
          <DialogButton kind="outline" label={tr("lock.guest.button")} onClick={handleSkipAsGuest} />
          <DialogText>{tr("lock.guest.subtitle")}</DialogText>
        </div>
      </DialogActions>
    </DialogFrame>
  );
}
