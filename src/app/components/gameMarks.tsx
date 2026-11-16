import type { ReactNode } from "react";

/**
 * Each game's tile in the Games folder: its background and the picture on it,
 * drawn for the launcher's GAME_TILE px tile. The launcher (AppLauncher) draws
 * its game tiles from here, and the Continue card shows the same tile in
 * miniature (GameMark), so the two cannot drift apart.
 *
 * The colours are the tiles' own artwork, not brand values, so they stay as
 * they are in every hospital and mode.
 */
export const GAME_TILE = 140;

/** The Games folder's games, by the id App and the launcher use. */
export type GameMarkId =
  | "memory" | "tictactoe" | "puzzle" | "colormatch" | "patternmemory" | "emojimatch" | "simonsays"
  | "wordsearch" | "reactiontime" | "brainmath" | "triviaquiz" | "picturepuzzle" | "wordchain";

export const GAME_MARKS = {
  memory: {
    bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    art: () => (
      <div className="relative flex items-center justify-center gap-3" style={{ width: 150, height: 150 }}>
        {/* Two cards - one flipped, one face down */}
        <div style={{
          width: 48,
          height: 64,
          backgroundColor: "#fff",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          ❤️
        </div>
        <div style={{
          width: 48,
          height: 64,
          background: "linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          position: "relative",
        }}>
          <div style={{
            width: 28,
            height: 36,
            border: "3px solid rgba(255,255,255,0.5)",
            borderRadius: 4,
          }} />
        </div>
      </div>
    ),
  },
  tictactoe: {
    bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          {/* Grid lines */}
          <line x1="30" y1="10" x2="30" y2="80" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="10" x2="60" y2="80" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
          <line x1="10" y1="30" x2="80" y2="30" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
          <line x1="10" y1="60" x2="80" y2="60" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
          {/* X */}
          <line x1="15" y1="15" x2="25" y2="25" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <line x1="25" y1="15" x2="15" y2="25" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          {/* O */}
          <circle cx="45" cy="45" r="10" stroke="#fff" strokeWidth="4" fill="none" />
          {/* X */}
          <line x1="50" y1="65" x2="60" y2="75" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <line x1="60" y1="65" x2="50" y2="75" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    ),
  },
  puzzle: {
    bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(3, 1fr)", width: 80, height: 80 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
            <div
              key={num}
              style={{
                backgroundColor: "#fff",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "#4facfe",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              {num}
            </div>
          ))}
          <div style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4 }} />
        </div>
      </div>
    ),
  },
  colormatch: {
    bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, 1fr)", width: 70, height: 70 }}>
          <div style={{ backgroundColor: "#FF6B6B", borderRadius: 8, boxShadow: "0 3px 10px rgba(255,107,107,0.4)" }} />
          <div style={{ backgroundColor: "#4ECDC4", borderRadius: 8, boxShadow: "0 3px 10px rgba(78,205,196,0.4)" }} />
          <div style={{ backgroundColor: "#FFE66D", borderRadius: 8, boxShadow: "0 3px 10px rgba(255,230,109,0.4)" }} />
          <div style={{ backgroundColor: "#A8E6CF", borderRadius: 8, boxShadow: "0 3px 10px rgba(168,230,207,0.4)" }} />
        </div>
      </div>
    ),
  },
  patternmemory: {
    bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)", width: 80 }}>
          {[
            { active: true, delay: 0 },
            { active: false, delay: 0 },
            { active: true, delay: 0.2 },
            { active: false, delay: 0 },
            { active: true, delay: 0.4 },
            { active: false, delay: 0 },
            { active: true, delay: 0.6 },
            { active: false, delay: 0 },
            { active: true, delay: 0.8 },
          ].map((dot, i) => (
            <div
              key={i}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: dot.active ? "#fff" : "rgba(255,255,255,0.2)",
                boxShadow: dot.active ? "0 0 12px rgba(255,255,255,0.6)" : "none",
                animation: dot.active ? `patternPulse 1.5s ease-in-out infinite ${dot.delay}s` : "none",
              }}
            />
          ))}
        </div>
      </div>
    ),
  },
  emojimatch: {
    bg: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    art: () => (
      <div className="relative flex items-center justify-center gap-2" style={{ width: 150, height: 150 }}>
        {["😊", "🎮", "⭐", "🎨"].map((emoji, i) => (
          <div
            key={i}
            style={{
              width: 32,
              height: 42,
              backgroundColor: "#fff",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
              transform: i % 2 === 0 ? "rotate(-5deg)" : "rotate(5deg)",
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    ),
  },
  simonsays: {
    bg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <div className="grid grid-cols-2 gap-1.5 w-20 h-20">
          <div style={{ backgroundColor: "#ef4444", borderRadius: "4px 0 0 0" }} />
          <div style={{ backgroundColor: "#3b82f6", borderRadius: "0 4px 0 0" }} />
          <div style={{ backgroundColor: "#10b981", borderRadius: "0 0 0 4px" }} />
          <div style={{ backgroundColor: "#f59e0b", borderRadius: "0 0 4px 0" }} />
        </div>
      </div>
    ),
  },
  wordsearch: {
    bg: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    art: () => (
      <span style={{ color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1 }}>ABC</span>
    ),
  },
  reactiontime: {
    bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full animate-pulse" />
        </div>
      </div>
    ),
  },
  brainmath: {
    bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <div className="flex flex-col items-center">
          <span style={{ fontSize: 40 }}>🧠</span>
          <span className="font-black text-2xl" style={{ marginTop: -10 }}>7 + 5</span>
        </div>
      </div>
    ),
  },
  triviaquiz: {
    bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    art: () => (
      <span style={{ color: "#fff", fontSize: 60, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1 }}>❓</span>
    ),
  },
  picturepuzzle: {
    bg: "linear-gradient(135deg, #1A56DB 0%, #06B6D4 100%)",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pieceShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25"/>
            </filter>
          </defs>
          <path 
            d="M35 35 H65 V45 A7 7 0 1 1 65 55 V65 H55 A7 7 0 1 0 45 65 H35 V35 Z" 
            fill="white" 
            filter="url(#pieceShadow)"
          />
        </svg>
      </div>
    ),
  },
  wordchain: {
    bg: "#065F46",
    art: () => (
      <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      </div>
    ),
  },
} satisfies Record<GameMarkId, { bg: string; art: () => ReactNode }>;

export const isGameMark = (id: string): id is GameMarkId => Object.prototype.hasOwnProperty.call(GAME_MARKS, id);

/**
 * A game's tile at any size: the same background and picture, scaled down
 * as a whole, so a 40 px mark is the 140 px tile in miniature.
 */
export function GameMark({ id, size, radius }: { id: GameMarkId; size: string; radius: string }) {
  const mark = GAME_MARKS[id];
  return (
    <div
      className="relative overflow-hidden shrink-0"
      style={{ width: size, height: size, borderRadius: radius, background: mark.bg }}
      aria-hidden="true"
    >
      <div
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          width: GAME_TILE,
          height: GAME_TILE,
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${parseFloat(size) / GAME_TILE})`,
        }}
      >
        {mark.art()}
      </div>
    </div>
  );
}
