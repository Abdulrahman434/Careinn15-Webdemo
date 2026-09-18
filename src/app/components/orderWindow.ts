/**
 * When the kitchen takes orders.
 *
 * One window each afternoon buys exactly one day: tomorrow. It lives in its
 * own module because two very different things ask about it — the meal screen,
 * and the reminders that fire whether or not anyone has opened that screen —
 * and the hours must be one fact, stated once.
 */

/* Fakeeh's kitchen opens its run at 2 PM; every other hospital starts at 4.
   Read off the active hospital rather than the theme, because the window is
   also asked about outside React (timers, reminders). "active-hospital-id" is
   ThemeContext's key — it is the hospital the whole app is branded as. */
const ORDER_WINDOW_START_BY_HOSPITAL: Record<string, number> = { dsfh: 14 };
const ORDER_WINDOW_START_DEFAULT = 16;

export function orderWindowStart(): number {
  if (typeof window === "undefined") return ORDER_WINDOW_START_DEFAULT;
  const id = localStorage.getItem("active-hospital-id") || "";
  return ORDER_WINDOW_START_BY_HOSPITAL[id] ?? ORDER_WINDOW_START_DEFAULT;
}

/** The kitchen stops taking tomorrow's orders at 8 PM, everywhere. */
export const ORDER_WINDOW_END = 20;

/** Today's window as a Date, for formatting an hour the patient can read. */
export function windowClock(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}
