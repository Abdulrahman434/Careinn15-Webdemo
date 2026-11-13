import type { CSSProperties } from "react";

/**
 * The section rail of a two-pane internal page (Room Control, Patient
 * Services, Live TV, About Us…): a column down the leading edge of the page
 * card, and — where a page has no room for the column (phones for Patient
 * Services and Live TV; every portrait size for pages that pass
 * useCanvasSize().portrait) — a strip of the same buttons across its top
 * that scrolls sideways, so the content under it gets the full width.
 * Callers pass that choice as `compact` below.
 *
 *   pageRailCard  the white page card: row (rail | content) or column.
 *   pageRail      the rail itself.
 *   pageRailItem  added to each rail button — on phones it sizes to its label.
 *
 * Each page keeps its own button look (active fill, icon tile); only the
 * arrangement changes, the same way on every page.
 */
export function pageRailCard(compact: boolean): CSSProperties {
  return { display: "flex", flexDirection: compact ? "column" : "row" };
}

export function pageRail(compact: boolean, width: number, divider: string): CSSProperties {
  return compact
    ? {
        display: "flex",
        flexDirection: "row",
        gap: 8,
        padding: "12px",
        width: "100%",
        flexShrink: 0,
        overflowX: "auto",
        scrollbarWidth: "none",
        borderBottom: `1px solid ${divider}`,
      }
    : {
        display: "flex",
        flexDirection: "column",
        /* The landscape width everywhere it is a column (portrait tablets
           and the bedside portrait screen included), so no label that fits
           in landscape is cut short there. */
        width: `${width}px`,
        flexShrink: 0,
        borderInlineEnd: `1px solid ${divider}`,
      };
}

export function pageRailItem(compact: boolean): CSSProperties {
  return compact ? { width: "auto", flexShrink: 0, minHeight: 52, whiteSpace: "nowrap" } : {};
}

/** Padding of the content pane beside (or, on phones, under) the rail. */
export function pageRailContentPad(compact: boolean): string {
  return compact ? "16px" : "28px 32px";
}
