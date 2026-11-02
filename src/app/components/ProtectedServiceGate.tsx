import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { useNurseStore } from "./NurseDataStore";
import { PatientPinPrompt } from "./PatientPinDialogs";
import { PROTECTED_SERVICES, PROTECT_MEAL_ORDERING } from "../lib/pin/pinConfig";
import { usePinSession } from "../lib/pin/pinSession";
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

  const element: React.ReactNode = pending ? (
    <PatientPinPrompt
      onUnlocked={finish}
      onNoPin={finish}
      onCancel={cancel}
      // Forgot PIN → Patient Login re-auth is wired in a later step.
      onForgotPin={cancel}
      onGoHome={cancel}
      onGoLogin={() => { cancel(); logout(); }}
    />
  ) : null;

  return { guard, locked, prompting: pending, element };
}
