/**
 * Reminders for tomorrow's meals.
 *
 * The kitchen's window is a few hours long and shuts for good at 8 PM, so a
 * patient who never opens the meal screen that afternoon simply does not eat
 * what they would have chosen. These are the nudges that stop that happening:
 * one when the window opens, one on each hour after it while something is
 * still unordered, one when the last hour starts, and one when it has shut.
 *
 * Deliberately says nothing about a guest. Nothing in the record tells us
 * whether anyone is staying in the room, and a reminder about a companion who
 * does not exist is worse than no reminder at all — the patient's own meals
 * are the only thing here we can be sure about.
 *
 * Pure except for the clock: App owns the timer, the toast and the memory of
 * what has already fired.
 */
import type { MealId } from "./menuData";
import { orderWindowStart, ORDER_WINDOW_END } from "./orderWindow";

const MEAL_IDS: MealId[] = ["breakfast", "lunch", "dinner"];

/** What a placed order has to look like for us to count it. */
interface OrderLike {
  mealId?: string;
  mealType?: string;
  deliveryDate?: string;
  orderFor?: "patient" | "guest";
  autoStandard?: boolean;
}

/** Tomorrow's meals the patient has not sent to the kitchen.
 *
 *  Guest orders do not count for or against: they are a different tray, and
 *  this is the patient's own list. Neither do standing fallback orders, which
 *  nobody chose. */
export function unorderedMealsForTomorrow(orders: OrderLike[]): MealId[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.toDateString();

  const ordered = new Set<string>();
  for (const o of orders) {
    if (o.autoStandard) continue;
    if (o.orderFor === "guest") continue;
    if (!o.deliveryDate || new Date(o.deliveryDate).toDateString() !== day) continue;
    const id = o.mealId || o.mealType?.toLowerCase();
    if (id) ordered.add(id);
  }
  return MEAL_IDS.filter((id) => !ordered.has(id));
}

export type ReminderKind =
  /** The window just opened — nothing is late yet. */
  | "open"
  /** On the hour, nothing at all chosen. */
  | "none"
  /** On the hour, one or two meals left. */
  | "some"
  /** The last hour before the cut-off. */
  | "last"
  /** Past the cut-off, with meals that were never chosen. */
  | "closed";

export interface DueReminder {
  kind: ReminderKind;
  /** Stable per day, so one firing cannot repeat after a reload. */
  slot: string;
  /** Tomorrow's meals still unordered — empty for "open" and "closed". */
  missing: MealId[];
}

/**
 * The reminder this hour owes the patient, or null for silence.
 *
 * Called on a timer, so it answers for the hour the clock is in rather than
 * for the exact minute: a kiosk woken at 5:40 PM still gets 5 PM's reminder,
 * which is the point of reminding at all.
 */
export function dueReminder(now: Date, orders: OrderLike[]): DueReminder | null {
  const start = orderWindowStart();
  const end = ORDER_WINDOW_END;
  const hour = now.getHours();
  const dateKey = now.toDateString();
  const missing = unorderedMealsForTomorrow(orders);

  if (hour < start) return null;

  if (hour === start) {
    return { kind: "open", slot: `${dateKey}|open`, missing: [] };
  }

  if (hour >= end) {
    /* Once, and only if something was actually left behind. */
    if (missing.length === 0) return null;
    return { kind: "closed", slot: `${dateKey}|closed`, missing };
  }

  if (missing.length === 0) return null;

  if (hour === end - 1) {
    return { kind: "last", slot: `${dateKey}|last`, missing };
  }

  return {
    kind: missing.length === MEAL_IDS.length ? "none" : "some",
    slot: `${dateKey}|h${hour}`,
    missing,
  };
}

/* ── What has already been said today ──────────────────────────────────────
   Kept in localStorage, not in React state: the screen reloads, the kiosk
   restarts, and neither is a reason to say the same thing twice. */
const FIRED_KEY = "careinn-meal-reminders-fired";

export function alreadyFired(slot: string): boolean {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(slot);
  } catch { return false; }
}

export function markFired(slot: string) {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    /* Slots carry their date, so yesterday's are dead weight. Keep the tail. */
    const next = [...list, slot].slice(-12);
    localStorage.setItem(FIRED_KEY, JSON.stringify(next));
  } catch { /* storage unavailable — the reminder simply may repeat */ }
}

/* ── Wording ───────────────────────────────────────────────────────────────
   Kept beside the rule that picks the reminder, so a new case cannot be
   raised without a line to say. `clock` renders an hour the way the rest of
   the meal screen does, in whatever language is on. */
export function reminderText(
  r: DueReminder,
  t: (key: string, ...args: string[]) => string,
  clock: (hour: number) => string,
): { title: string; body: string } {
  const end = clock(ORDER_WINDOW_END);
  const start = clock(orderWindowStart());
  const names = r.missing.map((id) => t(`toast.meal.${id}`));
  const list = names.length === 2 ? t("food.remind.and", names[0], names[1]) : names.join("");

  switch (r.kind) {
    case "open":
      return { title: t("food.remind.open.title"), body: t("food.remind.open.body", end) };
    case "none":
      return { title: t("food.remind.none.title"), body: t("food.remind.none.body", end) };
    case "some":
      return {
        title: t(r.missing.length === 1 ? "food.remind.some.title.one" : "food.remind.some.title.two"),
        body: t("food.remind.some.body", list, end),
      };
    case "last":
      return { title: t("food.remind.last.title"), body: t("food.remind.last.body", end) };
    case "closed":
      return { title: t("food.remind.closed.title"), body: t("food.remind.closed.body", end, start) };
  }
}
