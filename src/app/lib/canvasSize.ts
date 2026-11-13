import { createContext, useContext } from "react";

/**
 * The size of the app canvas (#careinn-canvas) in its own px — 1920×1080 in
 * landscape; in portrait the screen's own size (390 wide on a phone, 820 on a
 * tablet, 1080×1920 on the bedside screen). Browser media queries can't stand
 * in for this: the landscape canvas is scaled to fit, so a phone held sideways
 * still lays out at 1920 wide.
 *
 *   portrait  taller than wide — internal pages stack instead of sitting
 *             side by side.
 *   compact   under 700 wide (phones) — one column, smaller page chrome.
 */
export interface CanvasSize {
  width: number;
  height: number;
  portrait: boolean;
  compact: boolean;
}

export function canvasSize(width: number, height: number): CanvasSize {
  return { width, height, portrait: height > width, compact: width < 700 };
}

const CanvasSizeContext = createContext<CanvasSize>(canvasSize(1920, 1080));

export const CanvasSizeProvider = CanvasSizeContext.Provider;

export function useCanvasSize(): CanvasSize {
  return useContext(CanvasSizeContext);
}
