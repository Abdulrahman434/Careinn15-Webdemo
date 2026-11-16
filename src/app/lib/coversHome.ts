import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * Popups, drawers, panels and coach marks drawn over the home screen from
 * inside a layout (the shared dialog frame, the app-lock coach mark, the
 * shortcuts' More panel, Kids' Explore More drawer, the admin gate) say so
 * while they are up. The Continue card stays out of sight meanwhile, so it
 * never floats over them or takes their taps. Screens and overlays that App
 * itself opens are in the card's `hidden` instead.
 */
let open = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** Call in an overlay; `active` false while it is closed but still mounted. A
 *  layout effect, so the card is gone before the overlay first paints. */
export function useCoversHome(active = true): void {
  useLayoutEffect(() => {
    if (!active) return;
    open += 1;
    notify();
    return () => {
      open -= 1;
      notify();
    };
  }, [active]);
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const read = () => open > 0;

export function useHomeCovered(): boolean {
  return useSyncExternalStore(subscribe, read);
}
