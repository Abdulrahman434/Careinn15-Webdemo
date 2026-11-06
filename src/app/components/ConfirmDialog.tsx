import React from "react";
import { useLocale } from "./i18n";
import { DialogFrame, DialogTitleBar, DialogText, DialogActions, DialogButton } from "./dialogKit";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "primary";
  /** The mark in the title bar; a warning triangle (danger) or info mark by default. */
  icon?: React.ElementType | React.ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "primary",
  icon,
}: ConfirmDialogProps) {
  const { t: tr } = useLocale();
  if (!visible) return null;

  /* On the shared popup (dialogKit.tsx): the title names the action, one
     line says what happens, Cancel then the action. The icon sits in the
     title bar: the caller's, or a warning / info mark by variant. */
  return (
    <DialogFrame onClose={onCancel} position="fixed" zIndex={10000}>
      <DialogTitleBar
        title={title || confirmLabel || tr("general.confirm")}
        onClose={onCancel}
        icon={icon || (variant === "danger" ? AlertTriangle : Info)}
        tone={variant === "danger" ? "danger" : "brand"}
      />
      <DialogText style={{ marginTop: "8px" }}>{message}</DialogText>
      <DialogActions>
        <DialogButton kind="secondary" label={cancelLabel || tr("general.cancel")} onClick={onCancel} />
        <DialogButton kind={variant === "danger" ? "danger" : "primary"} label={confirmLabel || tr("general.confirm")} onClick={onConfirm} />
      </DialogActions>
    </DialogFrame>
  );
}
