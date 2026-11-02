import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
 * Patient PIN session — is the protected area unlocked right now?
 *
 * Memory only, on purpose: a refresh or app restart always starts locked.
 * Nothing here is the PIN; `hasPin` is a cached copy of the server's answer
 * so the UI knows whether to ask for a PIN or offer to create one.
 *
 * This is a UI convenience, not access control.
 * // BACKEND-REQUIRED: authorize every protected API request on the server
 * //   (e.g. with the unlock token issued by verifyPin); hiding a tile or
 * //   showing a PIN prompt here protects nothing by itself.
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PinSessionState {
  unlocked: boolean;
  /** null until the service has answered at least once this load. */
  hasPin: boolean | null;
}

type Listener = (s: PinSessionState) => void;

let state: PinSessionState = { unlocked: false, hasPin: null };
const listeners = new Set<Listener>();

function set(next: PinSessionState) {
  state = next;
  const snapshot = { ...state };
  listeners.forEach(l => { try { l(snapshot); } catch { /* listener errors must not break the lock */ } });
}

export const pinSession = {
  get: (): PinSessionState => ({ ...state }),
  markUnlocked: () => set({ ...state, unlocked: true }),
  lock: () => { if (state.unlocked) set({ ...state, unlocked: false }); },
  setHasPin: (hasPin: boolean) => set({ unlocked: hasPin ? state.unlocked : false, hasPin }),
  /** New patient / discharge: forget everything. */
  reset: () => set({ unlocked: false, hasPin: null }),
  subscribe: (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function usePinSession(): PinSessionState {
  const [s, setS] = useState(pinSession.get);
  useEffect(() => pinSession.subscribe(setS), []);
  return s;
}
