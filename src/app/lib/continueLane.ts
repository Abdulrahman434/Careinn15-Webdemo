import { useSyncExternalStore } from "react";

/**
 * On a phone the Continue card rests in a lane along the bottom of the home
 * page, and the page's scroll area ends above it, so nothing (Call included)
 * can scroll under the card. The card sets the lane to its own height plus its
 * gap from the edge; PortraitHome leaves that much room. 0 when there is no card.
 */
let lane = 0;
const listeners = new Set<() => void>();

export function setContinueLane(height: number): void {
  if (height === lane) return;
  lane = height;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const read = () => lane;

export function useContinueLane(): number {
  return useSyncExternalStore(subscribe, read);
}
