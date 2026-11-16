import { useSyncExternalStore } from "react";

/**
 * On a portrait home page that scrolls (a phone, a tablet, a browser window),
 * the Continue card rests in a lane along the bottom and the page's scroll
 * area ends above it, so nothing (Call included) can scroll under the card.
 *
 *  - The card asks for its lane: its own height plus its gap from the edge
 *    (0 when there is no card).
 *  - The page says whether it leaves the lane: only when it scrolls. A page
 *    that fits (the 1080×1920 bedside screen) keeps its full height, and the
 *    card keeps to that layout's fixed limit instead.
 */
let lane = 0;
let pageLeavesLane = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function setContinueLane(height: number): void {
  if (height === lane) return;
  lane = height;
  notify();
}

export function setPageLeavesLane(leaves: boolean): void {
  if (leaves === pageLeavesLane) return;
  pageLeavesLane = leaves;
  notify();
}

const readLane = () => lane;
const readPage = () => pageLeavesLane;

/** The lane the card asks for, in canvas px. */
export function useContinueLane(): number {
  return useSyncExternalStore(subscribe, readLane);
}

/** Whether the page on screen is leaving the lane. */
export function usePageLeavesLane(): boolean {
  return useSyncExternalStore(subscribe, readPage);
}
