import { useState } from "react";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./i18n";
import { verifyPin, verifyNfcUid, getAccount } from "../lib/accountAuth";
import { useNfcTap } from "../utils/nfc";
import { PinDialog } from "./PinDialog";
import { HeartPulse } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  onNfcSuccess: () => void;
}

export function CareMePinDialog({ onClose, onSuccess, onNfcSuccess }: Props) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const acc = getAccount();
  const hasNfcCard = !!acc?.nfcCardUid;

  useNfcTap((uid: string) => {
    if (verifyNfcUid(uid)) {
      onNfcSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 800);
    }
  });

  const handleComplete = (completedPin: string) => {
    verifyPin(completedPin).then((isValid) => {
      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 1000);
      }
    });
  };

  return (
    <PinDialog
      icon={<HeartPulse size={28} style={{ color: t.primaryOn }} />}
      title={tr("guest.careMe.dialog.title")}
      subtitle={tr("guest.careMe.dialog.enterPin")}
      errorText={tr("guest.careMe.dialog.incorrect")}
      error={error}
      pin={pin}
      setPin={(value) => { setPin(value); setError(false); }}
      onComplete={handleComplete}
      onClose={onClose}
      hint={hasNfcCard ? (
        <p style={{ fontFamily, fontSize: "12px", color: t.textMuted, textAlign: "center", marginTop: "12px" }}>
          {tr("lock.nfc.hint")}
        </p>
      ) : undefined}
    />
  );
}
