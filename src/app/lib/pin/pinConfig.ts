/* ═══════════════════════════════════════════════════════════════════════════
 * Patient PIN — configuration
 *
 * The patient PIN is a convenience lock for a shared bedside screen. It is
 * NOT real security on its own: everything in the browser can be read or
 * changed by someone with access to the device. Real enforcement must live
 * on the server — see the BACKEND-REQUIRED notes across src/app/lib/pin/.
 *
 * The nurse / care-team PIN (SettingsPanel) is a separate 4-digit PIN and
 * does not use anything in this folder.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Digits in a patient PIN. Change here only — every patient PIN screen,
 *  validator and test reads this value. */
export const PIN_LENGTH = 6;

/** Wrong attempts in a row before a temporary lock. */
export const PIN_MAX_ATTEMPTS = 5;

/** Lock durations for the 1st, 2nd, 3rd+ lock in a row (progressive). The
 *  last value repeats; there is never a permanent lock. */
export const PIN_LOCKOUT_SCHEDULE_MS = [30_000, 60_000, 5 * 60_000] as const;

/** Any PIN request slower than this is abandoned and shown as "Please try
 *  again". The keypad is disabled while a request runs. */
export const PIN_REQUEST_TIMEOUT_MS = 10_000;

/** Protected services relock after this much inactivity. Separate from the
 *  10-minute screensaver timer in App.tsx. */
export const PIN_INACTIVITY_LOCK_MS = 5 * 60_000;

/** Consecutive network/timeout failures before the PIN screens switch to the
 *  recoverable error screen (Patient Login / Home). */
export const PIN_FATAL_AFTER_FAILURES = 3;

/** While offline, how often to re-check the connection so protected services
 *  recover without a manual refresh. */
export const PIN_RECONNECT_POLL_MS = 15_000;

/** Services that need the patient PIN while the session is locked. Media,
 *  Games and Reading are intentionally absent and stay open. */
export const PROTECTED_SERVICES = ["careMe", "consultation", "patientServices"] as const;

/** Meal Ordering joins PROTECTED_SERVICES only when this is true. */
export const PROTECT_MEAL_ORDERING = false;

/** NFC-card unlock for the patient PIN. Off: an NFC UID is checked on the
 *  device and works offline, which breaks the fail-closed rule. The NFC code
 *  is kept, only switched off. */
export const PATIENT_PIN_NFC_ENABLED = false;

/** localStorage keys owned by the patient PIN feature. None of them ever
 *  holds the PIN or a hash of it. */
export const PIN_STORAGE_KEYS = {
  /** MockPinService's stand-in for server-side state: has-PIN flag, attempt
   *  counter, lock level, lock expiry. Removed on discharge. */
  mockServerState: "careinn-pin-mock-server",
} as const;

/** The pre-6-digit local PIN store (lib/accountAuth). Holds a salted hash on
 *  the device, which the patient PIN must not do. Purged at startup. */
export const LEGACY_PIN_HASH_KEY = "careinn-account";
