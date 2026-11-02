import React, { useCallback, useEffect, useRef, useState } from "react";
import { Lock, CheckCircle2, WifiOff, AlertTriangle } from "lucide-react";
import { useTheme, TEXT_STYLE } from "./ThemeContext";
import { useLocale } from "./i18n";
import { PinDialog } from "./PinDialog";
import { PIN_METRICS } from "./pinMetrics";
import { PIN_LENGTH, PIN_FATAL_AFTER_FAILURES } from "../lib/pin/pinConfig";
import { validateNewPin } from "../lib/pin/pinPolicy";
import type { PinResult } from "../lib/pin/PinService";
import {
  getPinService, usePinOnline, retryPinConnection, getConsecutivePinFailures,
} from "../lib/pin/pinClient";

/* ═══════════════════════════════════════════════════════════════════════════
 * Patient PIN screens — 6 digits, verified by PinService only.
 *
 *  PatientPinSetup  — create (or change) the PIN: [current] → enter → confirm.
 *  PatientPinPrompt — unlock protected services with the PIN.
 *
 * Input protection: digits are entered on the on-screen keypad (no text
 * field exists, so there is nothing to autofill, paste into or reveal) and
 * show only as dots. Copy/cut/paste/drag/context-menu are blocked on the
 * whole card. Typed digits live in component state only and are cleared on
 * every error, timeout, step change and when the screen closes.
 *
 * The nurse / care-team PIN does not use this file.
 * ═══════════════════════════════════════════════════════════════════════════ */

const block = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

/** Blocks clipboard, drag-drop and the context menu for everything inside. */
function PinGuard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ display: "contents" }}
      onCopy={block} onCut={block} onPaste={block}
      onDragStart={block} onDrop={block} onContextMenu={block}
      data-pin-guard
    >
      {children}
    </div>
  );
}

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Re-renders every second until `until` passes, then calls onExpire. */
function useCountdown(until: number | null, onExpire: () => void): number {
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) { clearInterval(id); expire.current(); }
    }, 1000);
    return () => clearInterval(id);
  }, [until]);
  return until ? Math.max(0, until - now) : 0;
}

/* ── shared bits ────────────────────────────────────────────────────────── */

function ActionButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  const { theme: t } = useTheme();
  const { fontFamily } = useLocale();
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-full cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        height: PIN_METRICS.action,
        borderRadius: t.radiusLg,
        backgroundColor: primary ? t.primary : "transparent",
        border: primary ? "none" : `1.5px solid ${t.borderDefault}`,
        outline: "none",
      }}
    >
      <span style={{ fontFamily, ...TEXT_STYLE.dialogButton, color: primary ? t.textInverse : t.textMuted }}>{label}</span>
    </button>
  );
}

function ForgotLink({ onClick }: { onClick: () => void }) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();
  return (
    <button
      onClick={onClick}
      className="cursor-pointer"
      style={{ background: "transparent", border: "none", outline: "none", marginTop: "8px", padding: "8px 12px" }}
    >
      <span style={{ fontFamily, ...TEXT_STYLE.dialogButton, color: t.primaryOn, textDecoration: "underline" }}>
        {tr("patientPin.action.forgot")}
      </span>
    </button>
  );
}

function StatusBody({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center w-full gap-2" style={{ paddingTop: "20px" }}>
      {icon}
      <div className="flex flex-col w-full gap-2" style={{ marginTop: "12px" }}>{children}</div>
    </div>
  );
}

type Failure = "offline" | "retry" | "fatal";

/** Maps a failed transport-level result to the screen it needs. */
function failureFor(r: PinResult<any>): Failure | null {
  if (r.ok) return null;
  if (r.error === "offline") return "offline";
  if (r.error === "timeout" || r.error === "network" || r.error === "unavailable") {
    return getConsecutivePinFailures() >= PIN_FATAL_AFTER_FAILURES ? "fatal" : "retry";
  }
  return null;
}

interface FailureProps {
  /** Recoverable-error exits. Hidden when not provided. */
  onGoLogin?: () => void;
  onGoHome?: () => void;
}

function FailureBody({
  kind, offlineText, onRetry, onGoLogin, onGoHome, onForgotPin,
}: FailureProps & { kind: Failure; offlineText: string; onRetry: () => void; onForgotPin?: () => void }) {
  const { theme: t } = useTheme();
  const { t: tr, fontFamily } = useLocale();
  if (kind === "fatal") {
    return (
      <StatusBody icon={<AlertTriangle size={36} style={{ color: t.errorOn }} />}>
        <span style={{ fontFamily, ...TEXT_STYLE.dialogBody, color: t.textMuted, textAlign: "center" }}>
          {tr("patientPin.fatal.body")}
        </span>
        <ActionButton primary label={tr("patientPin.action.retry")} onClick={onRetry} />
        {onGoLogin && <ActionButton label={tr("patientPin.action.login")} onClick={onGoLogin} />}
        {onGoHome && <ActionButton label={tr("patientPin.action.home")} onClick={onGoHome} />}
      </StatusBody>
    );
  }
  return (
    <StatusBody icon={kind === "offline"
      ? <WifiOff size={36} style={{ color: t.textMuted }} />
      : <AlertTriangle size={36} style={{ color: t.errorOn }} />}>
      <span style={{ fontFamily, ...TEXT_STYLE.dialogBody, color: t.textMuted, textAlign: "center" }}>
        {kind === "offline" ? offlineText : tr("patientPin.error.retry")}
      </span>
      <ActionButton primary label={tr("patientPin.action.retry")} onClick={onRetry} />
      {onForgotPin && <div className="flex justify-center"><ForgotLink onClick={onForgotPin} /></div>}
    </StatusBody>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PatientPinSetup
 * ═══════════════════════════════════════════════════════════════════════════ */

type SetupStep = "loading" | "current" | "enter" | "confirm" | "saving" | "success" | Failure;

export function PatientPinSetup({
  onDone, onCancel, onGoLogin, onGoHome, onForgotPin, afterReauth = false,
}: FailureProps & {
  /** The service confirmed the new PIN is saved. */
  onDone: () => void;
  /** Closed without saving a new PIN. */
  onCancel: () => void;
  /** Shown on the "enter current PIN" step. */
  onForgotPin?: () => void;
  /** Forgot-PIN path: the patient just re-confirmed on Patient Login, so skip
   *  the current-PIN step. The old PIN is reset only when the new one is
   *  confirmed — cancelling before that leaves the old PIN in place. */
  afterReauth?: boolean;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const online = usePinOnline();
  const svc = getPinService();

  const [step, setStep] = useState<SetupStep>("loading");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const alive = useRef(true);

  const clearDigits = () => { setPin(""); setFirst(""); };

  const start = useCallback(async () => {
    clearDigits();
    setErrorKey(null);
    setStep("loading");
    const r = await svc.getLockState();
    if (!alive.current) return;
    if (!r.ok) { setStep(failureFor(r) ?? "retry"); return; }
    setLockedUntil(r.value.lockedUntil);
    if (afterReauth) { setStep("enter"); return; }
    if (r.value.hasPin && r.value.lockedUntil) setErrorKey("patientPin.error.locked");
    // Changing an existing PIN needs the current one first.
    setStep(r.value.hasPin ? "current" : "enter");
  }, [svc, afterReauth]);

  useEffect(() => {
    alive.current = true;
    void start();
    return () => { alive.current = false; clearDigits(); };
  }, [start]);

  // Recover automatically when the connection returns.
  useEffect(() => {
    if (online && step === "offline") void start();
  }, [online, step, start]);

  const remaining = useCountdown(step === "current" ? lockedUntil : null, () => { setLockedUntil(null); setErrorKey(null); });
  const locked = remaining > 0;

  const fail = (key: string, back: SetupStep) => {
    clearDigits();
    setErrorKey(key);
    setStep(back);
  };

  /** Which part of setup a transport failure happened in, for its title. */
  const failedPhase = useRef<"current" | "new">("new");

  const onCurrentComplete = async (value: string) => {
    failedPhase.current = "current";
    setPin("");
    setStep("saving");
    const r = await svc.verifyPin(value);
    if (!alive.current) return;
    if (r.ok) { setErrorKey(null); setStep("enter"); return; }
    const f = failureFor(r);
    if (f) { clearDigits(); setStep(f); return; }
    if (r.error === "locked") { setLockedUntil(r.lock?.lockedUntil ?? null); fail("patientPin.error.locked", "current"); return; }
    if (r.error === "no-pin") { setErrorKey(null); setStep("enter"); return; }
    fail("patientPin.error.wrong", "current");
  };

  const onEnterComplete = (value: string) => {
    const err = validateNewPin(value);
    if (err) { fail(err === "weak" ? "patientPin.error.weak" : "patientPin.error.length", "enter"); return; }
    setErrorKey(null);
    setFirst(value);
    setPin("");
    setStep("confirm");
  };

  const onConfirmComplete = async (value: string) => {
    if (value !== first) { fail("patientPin.error.mismatch", "enter"); return; }
    failedPhase.current = "new";
    setPin("");
    setStep("saving");
    if (afterReauth) {
      const reset = await svc.requestReset();
      if (!alive.current) return;
      if (!reset.ok) { clearDigits(); setStep(failureFor(reset) ?? "retry"); return; }
    }
    const r = await svc.setPin(value);
    clearDigits();
    if (!alive.current) return;
    if (r.ok) { setStep("success"); return; }
    const f = failureFor(r);
    if (f) { setStep(f); return; }
    // invalid (server-side strength check) or anything else: nothing saved.
    fail(r.error === "invalid" ? "patientPin.error.weak" : "patientPin.error.retry", "enter");
  };

  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (step !== "success") return;
    const id = setTimeout(() => done.current(), 1200);
    return () => clearTimeout(id);
  }, [step]);

  // Closing mid-save could leave the patient unsure whether a PIN exists, so
  // the card stays up until the service answers (max PIN_REQUEST_TIMEOUT_MS).
  const close = () => { if (step !== "saving") { clearDigits(); onCancel(); } };

  const lockIcon = <Lock size={28} style={{ color: t.primaryOn }} />;
  const common = {
    icon: step === "success" ? <CheckCircle2 size={28} style={{ color: t.primaryOn }} /> : lockIcon,
    pin, setPin, onClose: close, length: PIN_LENGTH,
  };

  if (step === "offline" || step === "retry" || step === "fatal") {
    const failedOnCurrent = failedPhase.current === "current";
    return (
      <PinGuard>
        <PinDialog
          {...common}
          title={step === "fatal" ? tr("patientPin.fatal.title")
            : failedOnCurrent ? tr("patientPin.setup.currentTitle")
            : tr("patientPin.setup.title")}
          subtitle="" errorText="" error={false}
          onComplete={() => {}}
          body={
            <FailureBody
              kind={step}
              offlineText={tr("patientPin.error.offlineSetup")}
              onRetry={async () => { await retryPinConnection(); void start(); }}
              onGoLogin={onGoLogin}
              onGoHome={onGoHome}
              onForgotPin={failedOnCurrent && step !== "fatal" && onForgotPin ? () => { clearDigits(); onForgotPin(); } : undefined}
            />
          }
        />
      </PinGuard>
    );
  }

  const isCurrent = step === "current" || (step === "saving" && !first);
  const isConfirm = step === "confirm" || (step === "saving" && !!first);
  const title =
    step === "success" ? tr("patientPin.setup.success")
    : isCurrent ? tr("patientPin.setup.currentTitle")
    : isConfirm ? tr("patientPin.setup.confirmTitle")
    : tr("patientPin.setup.title");
  const subtitle =
    step === "saving" ? tr(isCurrent ? "patientPin.prompt.checking" : "patientPin.setup.saving")
    : step === "success" ? ""
    : isCurrent ? tr("patientPin.setup.currentSubtitle")
    : isConfirm ? tr("patientPin.setup.confirmSubtitle")
    : tr("patientPin.setup.subtitle");
  const errorText = errorKey === "patientPin.error.locked"
    ? tr(errorKey, formatRemaining(remaining))
    : errorKey ? tr(errorKey) : "";

  return (
    <PinGuard>
      <PinDialog
        {...common}
        title={title}
        subtitle={subtitle}
        errorText={errorText}
        error={!!errorKey && step !== "saving"}
        setPin={(v) => { setPin(v); if (!locked) setErrorKey(null); }}
        disabled={step === "loading" || step === "saving" || step === "success" || locked}
        onComplete={(v) => {
          if (step === "current") void onCurrentComplete(v);
          else if (step === "enter") onEnterComplete(v);
          else if (step === "confirm") void onConfirmComplete(v);
        }}
        body={step === "success" ? <div style={{ height: PIN_METRICS.action }} /> : undefined}
        footer={isCurrent && onForgotPin ? <ForgotLink onClick={() => { clearDigits(); onForgotPin(); }} /> : undefined}
      />
    </PinGuard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PatientPinPrompt
 * ═══════════════════════════════════════════════════════════════════════════ */

type PromptStep = "loading" | "enter" | "checking" | Failure;

export function PatientPinPrompt({
  title, onUnlocked, onCancel, onForgotPin, onNoPin, onGoLogin, onGoHome,
}: FailureProps & {
  /** Defaults to "Enter your PIN". */
  title?: string;
  onUnlocked: () => void;
  onCancel: () => void;
  /** Always offered — there is no permanent lockout. */
  onForgotPin: () => void;
  /** The patient has no PIN, so there is nothing to unlock. */
  onNoPin: () => void;
}) {
  const { theme: t } = useTheme();
  const { t: tr } = useLocale();
  const online = usePinOnline();
  const svc = getPinService();

  const [step, setStep] = useState<PromptStep>("loading");
  const [pin, setPin] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const alive = useRef(true);
  const noPin = useRef(onNoPin);
  noPin.current = onNoPin;

  const start = useCallback(async () => {
    setPin("");
    setErrorKey(null);
    setStep("loading");
    const r = await svc.getLockState();
    if (!alive.current) return;
    if (!r.ok) { setStep(failureFor(r) ?? "retry"); return; }
    if (!r.value.hasPin) { noPin.current(); return; }
    setLockedUntil(r.value.lockedUntil);
    if (r.value.lockedUntil) setErrorKey("patientPin.error.locked");
    setStep("enter");
  }, [svc]);

  useEffect(() => {
    alive.current = true;
    void start();
    return () => { alive.current = false; setPin(""); };
  }, [start]);

  useEffect(() => {
    if (online && step === "offline") void start();
  }, [online, step, start]);

  const remaining = useCountdown(lockedUntil, () => { setLockedUntil(null); setErrorKey(null); });
  const locked = remaining > 0;

  const onComplete = async (value: string) => {
    setPin("");
    setStep("checking");
    const r = await svc.verifyPin(value);
    if (!alive.current) return;
    if (r.ok) { onUnlocked(); return; }
    const f = failureFor(r);
    if (f) { setStep(f); return; }
    if (r.error === "no-pin") { noPin.current(); return; }
    if (r.error === "locked") {
      setLockedUntil(r.lock?.lockedUntil ?? null);
      setErrorKey("patientPin.error.locked");
    } else {
      // One generic message for every wrong PIN: no hints, no attempts-left.
      setErrorKey("patientPin.error.wrong");
    }
    setStep("enter");
  };

  const close = () => { setPin(""); onCancel(); };
  const forgot = () => { setPin(""); onForgotPin(); };
  const icon = <Lock size={28} style={{ color: t.primaryOn }} />;

  if (step === "offline" || step === "retry" || step === "fatal") {
    return (
      <PinGuard>
        <PinDialog
          icon={icon} pin={pin} setPin={setPin} onClose={close} length={PIN_LENGTH}
          title={step === "fatal" ? tr("patientPin.fatal.title") : (title ?? tr("patientPin.prompt.title"))}
          subtitle="" errorText="" error={false}
          onComplete={() => {}}
          body={
            <FailureBody
              kind={step}
              offlineText={tr("patientPin.error.offline")}
              onRetry={async () => { await retryPinConnection(); void start(); }}
              onGoLogin={onGoLogin}
              onGoHome={onGoHome}
              onForgotPin={step === "fatal" ? undefined : forgot}
            />
          }
        />
      </PinGuard>
    );
  }

  const errorText = errorKey === "patientPin.error.locked"
    ? tr(errorKey, formatRemaining(remaining))
    : errorKey ? tr(errorKey) : "";

  return (
    <PinGuard>
      <PinDialog
        icon={icon}
        title={title ?? tr("patientPin.prompt.title")}
        subtitle={step === "checking" ? tr("patientPin.prompt.checking") : tr("patientPin.prompt.subtitle")}
        errorText={errorText}
        error={!!errorKey && step !== "checking"}
        pin={pin}
        setPin={(v) => { setPin(v); if (!locked) setErrorKey(null); }}
        length={PIN_LENGTH}
        disabled={step !== "enter" || locked}
        onComplete={(v) => { void onComplete(v); }}
        onClose={close}
        footer={<ForgotLink onClick={forgot} />}
      />
    </PinGuard>
  );
}
