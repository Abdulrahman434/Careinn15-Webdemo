import type { CSSProperties, ReactNode } from "react";
import { useCanvasSize, type CanvasSize } from "../../lib/canvasSize";
import { TYPE_SCALE } from "../ThemeContext";

/**
 * Portrait / phone arrangement shared by every game screen. Each helper
 * returns {} in landscape, so the 1920×1080 layout stays exactly as designed;
 * in portrait (useCanvasSize().portrait) the same pieces are rearranged:
 *
 *   gameHeader        the 88px bar wraps: back + title on the first line (with
 *                     the close button pinned to its end), the game's stats and
 *                     controls centred on the line(s) under it.
 *   gameHeaderLead    the back + title group — takes the whole first line.
 *   gameTitle         phones: smaller title that truncates instead of wrapping.
 *   gameHeaderTools   the stats/controls group — wraps and centres.
 *   gameHeaderGroup   a sub-group inside the tools — dissolves so its items wrap.
 *   gameHeaderClose   the close (×) button — pinned to the first line's end.
 *   gameBody          the play area stacks top to bottom and scrolls;
 *                     phones get 16px padding.
 *   gameGroup         a wrapper that only grouped pieces side by side —
 *                     dissolves so its pieces join the stack.
 *   gamePanel         a side panel (score, word list, leaderboard) — full width
 *                     above/below the board.
 *   GameBoardArea     the space the board fills: the height left over in the
 *                     body (never less than about a screen width).
 *   gameBoard         a board grid inside GameBoardArea: as big as fits —
 *                     min(available width, available height) for square boards;
 *                     a wide board (4×2 colour pads) stands upright (2×4).
 *   gameCellFont      a font size that shrinks with the board's cells.
 *   gameModal         a resume / win / game-over card — fits a phone's width.
 *   gameControl       a header select / language picker — 44px tall to touch.
 */

const PAD_COMPACT = 16;
const HEADER_PAD_BLOCK = (s: CanvasSize) => (s.compact ? 12 : 16);
const HEADER_PAD_INLINE = (s: CanvasSize) => (s.compact ? PAD_COMPACT : 32);
const CLOSE_SIZE = 56;

export function gameHeader(s: CanvasSize): CSSProperties {
  if (!s.portrait) return {};
  return {
    height: "auto",
    position: "relative",
    flexWrap: "wrap",
    rowGap: 12,
    paddingBlock: HEADER_PAD_BLOCK(s),
    paddingInline: HEADER_PAD_INLINE(s),
  };
}

export function gameHeaderLead(s: CanvasSize): CSSProperties {
  if (!s.portrait) return {};
  return {
    flexBasis: "100%",
    minWidth: 0,
    paddingInlineEnd: CLOSE_SIZE + 12,
    ...(s.compact ? { gap: 12 } : {}),
  };
}

export function gameTitle(s: CanvasSize): CSSProperties {
  if (!s.compact) return {};
  return { fontSize: TYPE_SCALE.md, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
}

export function gameHeaderTools(s: CanvasSize): CSSProperties {
  if (!s.portrait) return {};
  return {
    width: "100%",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: s.compact ? 8 : 12,
    ...(s.compact ? { columnGap: 8 } : {}),
  };
}

export function gameHeaderGroup(s: CanvasSize): CSSProperties {
  return s.portrait ? { display: "contents" } : {};
}

export function gameHeaderClose(s: CanvasSize): CSSProperties {
  if (!s.portrait) return {};
  return { position: "absolute", top: HEADER_PAD_BLOCK(s), insetInlineEnd: HEADER_PAD_INLINE(s) };
}

export function gameBody(s: CanvasSize): CSSProperties {
  if (!s.portrait) return {};
  return {
    flexDirection: "column",
    justifyContent: "safe center",
    overflowY: "auto",
    minHeight: 0,
    ...(s.compact ? { padding: PAD_COMPACT, gap: 16 } : {}),
  };
}

export function gameGroup(s: CanvasSize): CSSProperties {
  return s.portrait ? { display: "contents" } : {};
}

export function gamePanel(s: CanvasSize): CSSProperties {
  if (!s.portrait) return {};
  return { width: "100%", minWidth: 0, flexShrink: 0 };
}

export function GameBoardArea({ children }: { children: ReactNode }) {
  const s = useCanvasSize();
  if (!s.portrait) return <>{children}</>;
  const pad = s.compact ? PAD_COMPACT : 64;
  return (
    <div
      style={{
        flex: "1 1 0",
        width: "100%",
        minHeight: Math.min(s.width - 2 * pad, Math.round(s.height * 0.45)),
        containerType: "size",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

export function gameBoard(s: CanvasSize, landscapeCols: number, landscapeRows: number = landscapeCols): CSSProperties {
  if (!s.portrait) return {};
  const cols = Math.min(landscapeCols, landscapeRows);
  const rows = Math.max(landscapeCols, landscapeRows);
  const tall = rows === cols ? "100cqh" : `calc(100cqh * ${cols} / ${rows})`;
  return {
    width: `min(100cqw, ${tall})`,
    height: "auto",
    aspectRatio: `${cols} / ${rows}`,
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };
}

export function gameCellFont(s: CanvasSize, px: number, cols: number, share = 0.5): string {
  if (!s.portrait) return `${px}px`;
  return `min(${px}px, ${((100 * share) / cols).toFixed(2)}cqmin)`;
}

export function gameModal(s: CanvasSize): CSSProperties {
  if (!s.compact) return {};
  return { maxWidth: `calc(100% - ${2 * PAD_COMPACT}px)`, paddingInline: 24 };
}

export function gameControl(s: CanvasSize): CSSProperties {
  return s.portrait ? { minHeight: 44, whiteSpace: "nowrap" } : {};
}
