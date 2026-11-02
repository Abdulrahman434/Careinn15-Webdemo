import { PIN_LENGTH } from "./pinConfig";

export type PinFormatError = "length" | "non-numeric" | "weak";

/** Format + strength check used by both the UI and the service.
 *  // BACKEND-REQUIRED: repeat this validation on the server; a client-side
 *  // check can be bypassed. */
export function validateNewPin(pin: string): PinFormatError | null {
  if (!/^\d*$/.test(pin)) return "non-numeric";
  if (pin.length !== PIN_LENGTH) return "length";
  if (isWeakPin(pin)) return "weak";
  return null;
}

/** True for PINs that are trivially guessed:
 *  - all one digit                       000000, 111111
 *  - ascending / descending runs (wrap)  123456, 654321, 901234
 *  - a shorter block repeated            121212, 123123
 *  - pairs of doubles                    112233, 998877 */
export function isWeakPin(pin: string): boolean {
  const d = [...pin].map(Number);
  const n = d.length;
  if (n < 2) return true;

  // A shorter block repeated to fill the PIN (block of 1 = all same digit).
  for (let p = 1; p <= n / 2; p++) {
    if (n % p !== 0) continue;
    if (d.every((x, i) => x === d[i % p])) return true;
  }

  // Every step +1 or every step -1 (mod 10).
  const steps = d.slice(1).map((x, i) => (x - d[i] + 10) % 10);
  if (steps.every(s => s === 1) || steps.every(s => s === 9)) return true;

  // aabbcc…
  if (n % 2 === 0) {
    let pairs = true;
    for (let i = 0; i < n; i += 2) if (d[i] !== d[i + 1]) { pairs = false; break; }
    if (pairs) return true;
  }

  return false;
}

/** Lock length for the Nth lock in a row (1-based), from the schedule. */
export function lockoutDurationMs(lockLevel: number, schedule: readonly number[]): number {
  if (lockLevel < 1) return 0;
  return schedule[Math.min(lockLevel, schedule.length) - 1];
}
