import React from "react";
import { X } from "lucide-react";
import { useTheme, SHADOW, TEXT_STYLE, WEIGHT } from "./ThemeContext";
import { useLocale } from "./i18n";
import { PinKeypad } from "./MyAccountDialog";
import { PIN_METRICS } from "./pinMetrics";
import { DialogFrame, DialogTitleBar, DialogText } from "./dialogKit";

/* One shell for every 4-digit PIN prompt in the app, on the shared popup
   frame (dialogKit.tsx): the title names what was tapped, one line says what
   to do, then the keypad. Screens that ask for a PIN differ only in wording.
   `icon` is kept for callers but no longer drawn: no icon above the title. */
export function PinDialog({
  icon,
  title,
  subtitle,
  errorText,
  error,
  pin,
  setPin,
  onComplete,
  onClose,
  hint,
  footer,
  /* Sized for the panel this runs on — see pinMetrics.ts. */
  width = PIN_METRICS.card,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  errorText: string;
  error: boolean;
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  onComplete: (completedPin: string) => void;
  onClose: () => void;
  /** Optional line under the subtitle, e.g. the NFC card hint. */
  hint?: React.ReactNode;
  /** Optional action under the keypad, e.g. "Continue as Guest". */
  footer?: React.ReactNode;
  width?: number;
}) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();

  return (
    <DialogFrame kind="pin" onClose={onClose} zIndex={100}>
      <DialogTitleBar title={title} onClose={onClose} />
      <DialogText align="center" tone={error ? "error" : "muted"} style={{ marginTop: "16px" }}>
        {error ? errorText : subtitle}
      </DialogText>

      {hint}

      <div className="w-full">
        <PinKeypad pin={pin} setPin={setPin} error={error} onComplete={onComplete} />
      </div>

      {footer}
    </DialogFrame>
  );
}
