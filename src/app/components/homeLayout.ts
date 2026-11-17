import { SPACE } from "./ThemeContext";

/**
 * Fixed sizes of the home layouts, in canvas px. The layouts draw themselves
 * from these, and the Continue card works out from the same numbers where it
 * may sit without covering Call, CareMe or an action bar (ContinueCard's
 * restArea). It never measures the page, so a hospital that hides Call still
 * gets the same limit, and changing a size here moves the limit with it.
 */
const px = (v: string) => parseFloat(v);

/** Layout 1 (Classic) on the 1920×1080 canvas: three columns (App.tsx). */
export const CLASSIC = {
  /** Space at the left and right screen edges, and between the columns. */
  edge: px(SPACE[4]),
  columnGap: px(SPACE[4]),
  /** Space under the content (the bottom row ends this far above the screen's edge). */
  bottomEdge: px(SPACE[3]),
  /** Start column: greeting + CareMe (v3: the hub grid). One and a half hub tiles. */
  startColumn: 400,
  /** End rail: shortcuts (v2: the service cards, Call among them). One hub tile wide. */
  rail: 264,
} as const;

/** The 4-column hub grid and its bottom row of service cards (ServicesGrid),
 *  in Classic and on the bedside portrait screen. Call is the fourth card. */
export const SERVICES_GRID = {
  tileGap: px(SPACE[3]),
  bottomRow: 192,
} as const;

/** Layout 1 on a portrait screen (PortraitHome). Call is the last service card,
 *  directly above the shortcuts row. */
export const PORTRAIT = {
  edge: px(SPACE[4]),
  gap: px(SPACE[3]),
  /** Phones (a canvas under 700 wide). */
  phoneEdge: px(SPACE[2]),
  phoneGap: px(SPACE[2]),
  /** From this canvas height the page is "roomy" (the bedside screen). */
  roomyMinHeight: 1600,
  shortcutsRow: { roomy: 160, tablet: 124, phone: 104 },
} as const;

/** Layout 3 (Kids): the Call Nurse / I Need Something bar along the bottom. */
export const KIDS = {
  actionBar: 76,
  bottomEdge: px(SPACE[2]),
} as const;

/** Layout 4 (Spotlight): the quick-actions bar (Call first) and the 3×2
 *  service cards, CareMe the last of them, nearest the end edge. */
export const SPOTLIGHT = {
  actionBar: { bottom: px(SPACE[5]), height: 104 },
  cards: { insetEnd: 92, width: 232 },
} as const;

/** Layout 2 (CI). CiHomescreen is a Figma import that writes these as classes
 *  (the bottom group: bottom-[29px], tiles h-[140px]; the main block at
 *  right-[30px]: rows of three size-[200px] tiles, gap-[8px]); keep them in
 *  step. The main block stays at the right in Arabic but its rows reverse, so
 *  CareMe can be any of its columns. Each group of tiles can be scaled up to
 *  tileScaleMax (ThemeAppearanceDialog's tile-size slider). */
export const CI = {
  bottomTiles: { bottom: 29, height: 140 },
  mainTiles: { end: 30, size: 200, gap: 8, columns: 3 },
  tileScaleMax: 1.2,
} as const;
