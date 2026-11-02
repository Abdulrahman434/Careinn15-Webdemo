/* ═══════════════════════════════════════════════════════════════════════════
 * PinService — the only door the UI uses for the patient PIN.
 *
 * UI code calls getPinService() and never knows which implementation is
 * behind it. Today that is MockPinService; the real API client replaces it
 * with one setPinServiceImpl() call at startup and no UI change.
 *
 * Every call made through getPinService() is wrapped by pinClient.ts, which
 * adds the offline check (fail closed), the request timeout and network-
 * failure tracking, so a real implementation gets those for free.
 *
 * Rules for every implementation:
 *  - Never write the PIN, or anything derived from it, to localStorage,
 *    sessionStorage, IndexedDB, cookies, the URL, logs or analytics.
 *  - Never verify a PIN on the device. The server decides.
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PinLockState {
  /** The patient has a PIN on the server. */
  hasPin: boolean;
  /** Consecutive wrong attempts since the last success or lock. */
  failedAttempts: number;
  /** Epoch ms when the current temporary lock ends; null when not locked. */
  lockedUntil: number | null;
}

export type PinErrorCode =
  /** No connection — nothing was sent. Fail closed. */
  | "offline"
  /** No answer within PIN_REQUEST_TIMEOUT_MS. The outcome is unknown. */
  | "timeout"
  /** The request failed (network error / 5xx). The outcome is unknown. */
  | "network"
  /** PIN was wrong. No detail about why, or how many tries are left. */
  | "wrong"
  /** Too many wrong attempts; see lock.lockedUntil. */
  | "locked"
  /** New PIN rejected: wrong length, non-numeric or too easy to guess. */
  | "invalid"
  /** verify/change called but the patient has no PIN. */
  | "no-pin"
  /** The service could not complete the request for another reason. */
  | "unavailable";

export type PinResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: PinErrorCode; lock?: PinLockState };

export interface PinService {
  /** Create or replace the patient's PIN. Resolve ok only once it is saved.
   *  // BACKEND-REQUIRED: store only a slow salted hash (argon2/bcrypt/scrypt)
   *  //   scoped to patient + admission; validate format/strength server-side;
   *  //   require a valid patient session token; make the call idempotent so
   *  //   a retried request after a timeout cannot leave two different PINs. */
  setPin(pin: string): Promise<PinResult>;

  /** Check a PIN. On success the server resets the wrong-attempt counter.
   *  // BACKEND-REQUIRED: the attempt counter, lock level and lock expiry
   *  //   must live on the server — browser storage can be cleared. Return
   *  //   the same generic error for every wrong PIN. Rate-limit per patient
   *  //   AND per device. Issue a short-lived unlock token on success. */
  verifyPin(pin: string): Promise<PinResult>;

  /** Remove the current PIN so a new one can be created. Only call after
   *  the patient has signed in again on the Patient Login screen.
   *  // BACKEND-REQUIRED: only allow this with a fresh, re-authenticated
   *  //   patient session (not the existing one). Nurse/admin reset is a
   *  //   staff tool and out of scope for this UI. */
  requestReset(): Promise<PinResult>;

  /** Current has-PIN + lockout state for the signed-in patient. */
  getLockState(): Promise<PinResult<PinLockState>>;

  /** Discharge / session end: forget everything held for this patient on
   *  this device. Never throws; works offline (it only deletes).
   *  // BACKEND-REQUIRED: delete the stored PIN per the hospital retention
   *  //   policy and revoke any unlock tokens for this admission. */
  clearOnDischarge(): Promise<void>;
}
