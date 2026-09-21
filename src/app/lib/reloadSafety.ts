/**
 * What must not be interrupted.
 *
 * A screen being hidden says nothing about whether it is safe to replace: a
 * tab switched away from can be holding a half-built meal order or a form
 * somebody is halfway through typing, and reloading it throws that away with
 * no warning and nothing to undo. Visibility is about attention. This is
 * about work.
 *
 * Anything holding unsaved input, an unplaced order or a request in flight
 * registers a hold while that is true. An update waits for the last hold to
 * go, or for the patient to say now, or for a point the app already knows is
 * safe — logging out, for instance, where the screen is being handed on
 * anyway and nothing of theirs is left on it.
 */

import { useEffect } from "react";

const HOLDS_CHANGED = "careinn-reload-holds-changed";

/** id → why, so a blocked update can say what it is waiting for. */
const holds = new Map<string, string>();

function announce(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HOLDS_CHANGED));
}

export function holdReload(id: string, reason: string): void {
  if (holds.get(id) === reason) return;
  holds.set(id, reason);
  announce();
}

export function releaseReload(id: string): void {
  if (!holds.delete(id)) return;
  announce();
}

/** Why a reload is being held off, for a log line or a banner. */
export function reloadBlockers(): string[] {
  return [...holds.values()];
}

export function isSafeToReload(): boolean {
  return holds.size === 0;
}

export function subscribeHolds(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(HOLDS_CHANGED, fn);
  return () => window.removeEventListener(HOLDS_CHANGED, fn);
}

/**
 * Hold a reload off for as long as `active` is true.
 *
 * The cleanup releases on unmount too, so a form closed by navigating away
 * cannot leave a hold behind that blocks every future update.
 */
export function useReloadHold(active: boolean, id: string, reason: string): void {
  useEffect(() => {
    if (!active) return;
    holdReload(id, reason);
    return () => releaseReload(id);
  }, [active, id, reason]);
}
