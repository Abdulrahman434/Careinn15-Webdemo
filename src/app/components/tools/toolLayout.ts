import type { CSSProperties } from "react";
import { TYPE_SCALE } from "../ThemeContext";

/**
 * Portrait layout of the tool screens (Calculator, Notes, Stopwatch…), shared
 * so every tool changes the same way. Each helper is merged into an existing
 * style and returns {} in landscape, leaving the 1920×1080 layout untouched.
 *
 *   portrait  the side panel stacks under the main panel, fixed widths drop
 *             to fit, and the page scrolls under its header.
 *   compact   (phones) a slimmer header and 16px page padding.
 */

/** The header bar: 64px tall with 16px sides on phones. */
export function toolHeader(compact: boolean): CSSProperties {
  return compact ? { height: "64px", paddingInline: "16px", gap: "12px" } : {};
}

/** A group inside the header (back + title, or the actions): lets the title shrink. */
export function toolHeaderGroup(compact: boolean): CSSProperties {
  return compact ? { gap: "12px", minWidth: 0 } : {};
}

/** The square back / close / action buttons: 44px on phones. */
export function toolHeaderButton(compact: boolean): CSSProperties {
  return compact ? { width: "44px", height: "44px", padding: 0, justifyContent: "center", flexShrink: 0 } : {};
}

export function toolTitle(compact: boolean): CSSProperties {
  return compact
    ? { fontSize: TYPE_SCALE.md, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
    : {};
}

/** The page under the header: scrolls in portrait, 16px padding on phones. */
export function toolBody(portrait: boolean, compact: boolean): CSSProperties {
  if (!portrait) return {};
  return {
    minHeight: 0,
    overflowY: "auto",
    scrollbarWidth: "none",
    ...(compact ? { padding: "16px" } : {}),
  };
}

/** Main panel + side panel: side by side in landscape, stacked in portrait. */
export function toolPanes(portrait: boolean, compact: boolean): CSSProperties {
  return portrait ? { flexDirection: "column", ...(compact ? { gap: "16px" } : {}) } : {};
}

/** The side panel (list, laps, techniques): full width when stacked. */
export function toolSidePanel(portrait: boolean): CSSProperties {
  return portrait ? { width: "100%", flexShrink: 0 } : {};
}

/** A fixed-width card or circle: never wider than the page in portrait. */
export function toolFit(portrait: boolean, width: string): CSSProperties {
  return portrait ? { width: `min(${width}, 100%)`, maxWidth: "100%" } : {};
}
