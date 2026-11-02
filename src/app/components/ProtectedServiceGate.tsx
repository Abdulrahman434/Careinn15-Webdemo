import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthContext";
import { useNurseStore } from "./NurseDataStore";
import { PatientPinPrompt, PatientPinSetup } from "./PatientPinDialogs";
import { PasswordGate } from "./PasswordGate";
import { PROTECTED_SERVICES, PROTECT_MEAL_ORDERING, PIN_INACTIVITY_LOCK_MS } from "../lib/pin/pinConfig";
import { usePinSession, pinSession } from "../lib/pin/pinSession";
import { getPinService, usePinOnline } from "../lib/pin/pinClient";

/* ═══════════════════════════════════════════════════════════════════════════
 * Protected services gate — CareMe, Consultation, Patient Services
 * (+ Meal Ordering when PROTECT_MEAL_ORDERING).
 *
 *   guest            → Patient Login (never a PIN screen)
 *   patient, no PIN  → opens (the PIN is optional)
 *   patient, PIN, session unlocked → opens
 *   patient, PIN, session locked   → PatientPinPrompt, then opens
 *   PIN status unknown (offline before the first answer) → prompt, which
 *     shows "Connection needed" — fail closed.
 *
 * The session relocks after PIN_INACTIVITY_LOCK_MS of inactivity (here), when
 * the screensaver appears (App.tsx), and on every page load (pinSession is
 * memory-only).
 *
 * Everything else (Media, Games, Reading, …) never passes through here.
 *
 * This is UI gating only.
 * // BACKEND-REQUIRED: authorize every protected API request on the server;
 * //   a hidden tile or a PIN prompt protects nothing on its own.
 * ═══════════════════════════════════════════════════════════════════════════ */

export type ProtectedServiceId = "careMe" | "consultation" | "patientServices" | "mealOrdering";

export function isProtectedService(id: ProtectedServiceId): boolean {
  if (id === "mealOrdering") return PROTECT_MEAL_ORDERING;
  return (PROTECTED_SERVICES as readonly string[]).includes(id);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Forgot PIN: Patient Login (re-confirm the signed-in patient, no sign-out)
 *   → create a new PIN → protected services locked again.
 * Nothing is reset until the patient has re-confirmed AND confirmed the new
 * PIN, so backing out at any point leaves the old PIN working.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function useForgotPinFlow(onFinished?: (newPinSet: boolean) => void) {
  const [stage, setStage] = useState<"login" | "setup" | null>(null);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const start = useCallback(() => setStage("login"), []);
  const end = useCallback((newPinSet: boolean) => {
    setStage(null);
    pinSession.lock();
    finished.current?.(newPinSet);
  }, []);

  const element: React.ReactNode =
    stage === "login" ? (
      // Same layer as the real sign-in screen: outside the scaled canvas.
      createPortal(
        <PasswordGate reauth={{ onSuccess: () => setStage("setup"), onCancel: () => end(false) }} />,
        document.body,
      )
    ) : stage === "setup" ? (
      <div className="fixed inset-0" style={{ zIndex: 99999 }}>
        <PatientPinSetup
          afterReauth
          onDone={() => end(true)}
          onCancel={() => end(false)}
          onGoHome={() => end(false)}
          onGoLogin={() => setStage("login")}
        />
      </div>
    ) : null;

  return { start, active: stage !== null, element };
}

export function useProtectedServiceGate() {
  const { isGuest, logout } = useAuth();
  const nurse = useNurseStore();
  const { unlocked, hasPin } = usePinSession();
  const online = usePinOnline();
  const isPatient = !isGuest && !!nurse.patient?.mrn;

  /** True while protected content must not be on screen. */
  const locked = isGuest || (isPatient && !unlocked && hasPin !== false);

  // Learn whether this patient has a PIN, so a patient without one is not
  // shown a lock. Retried when the connection comes back.
  useEffect(() => {
    if (isPatient && hasPin === null && online) void getPinService().getLockState();
  }, [isPatient, hasPin, online]);

  // Relock after PIN_INACTIVITY_LOCK_MS without a touch, key or scroll. The
  // elapsed time is also checked when the page becomes visible again, because
  // timers can stall while the kiosk shows another app on top of the WebView.
  useEffect(() => {
    if (!unlocked) return;
    let last = Date.now();
    let timer = setTimeout(() => pinSession.lock(), PIN_INACTIVITY_LOCK_MS);
    const activity = () => {
      last = Date.now();
      clearTimeout(timer);
      timer = setTimeout(() => pinSession.lock(), PIN_INACTIVITY_LOCK_MS);
    };
    const visible = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= PIN_INACTIVITY_LOCK_MS) pinSession.lock();
    };
    const events = ["pointerdown", "mousemove", "keydown", "touchstart", "wheel", "scroll"];
    events.forEach(e => window.addEventListener(e, activity, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, activity, { capture: true }));
      document.removeEventListener("visibilitychange", visible);
    };
  }, [unlocked]);

  const [pending, setPending] = useState(false);
  const pendingOpen = useRef<(() => void) | null>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const guard = useCallback((id: ProtectedServiceId, open: () => void) => {
    if (!isProtectedService(id)) { open(); return; }
    if (isGuest) { logout(); return; }
    if (!lockedRef.current) { open(); return; }
    pendingOpen.current = open;
    setPending(true);
  }, [isGuest, logout]);

  const finish = useCallback(() => {
    const open = pendingOpen.current;
    pendingOpen.current = null;
    setPending(false);
    open?.();
  }, []);

  const cancel = useCallback(() => { pendingOpen.current = null; setPending(false); }, []);
  const forgot = useForgotPinFlow();

  const element: React.ReactNode = (
    <>
      {pending && (
        <PatientPinPrompt
          onUnlocked={finish}
          onNoPin={finish}
          onCancel={cancel}
          // The service the patient tapped is not opened after a reset: they
          // land back on a locked screen and use their new PIN.
          onForgotPin={() => { cancel(); forgot.start(); }}
          onGoHome={cancel}
          onGoLogin={() => { cancel(); logout(); }}
        />
      )}
      {forgot.element}
    </>
  );

  return { guard, locked, prompting: pending || forgot.active, element };
}
