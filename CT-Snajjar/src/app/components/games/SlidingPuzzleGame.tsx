import { useState, useCallback, useEffect } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { Trophy, RotateCcw, Shuffle, ArrowLeft } from "lucide-react";

interface Tile {
  id: number;
  currentPosition: number;
  correctPosition: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, number> = {
  easy: 3,
  medium: 4,
  hard: 5
};

export function SlidingPuzzleGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hintTileId, setHintTileId] = useState<number | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  const gridSize = DIFFICULTY_CONFIG[difficulty];
  const tileCount = gridSize * gridSize;

  const checkWin = useCallback((currentTiles: Tile[]) => {
    return currentTiles.every((tile) => tile.currentPosition === tile.correctPosition);
  }, []);

  const isSolvable = useCallback((tiles: Tile[], size: number) => {
    let inversions = 0;
    const flat = tiles.map(t => t.id).filter(id => id !== size * size - 1);
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        if (flat[i] > flat[j]) inversions++;
      }
    }
    if (size % 2 !== 0) return inversions % 2 === 0;
    const emptyTile = tiles.find(t => t.id === size * size - 1)!;
    const emptyRowFromBottom = size - Math.floor(tiles.indexOf(emptyTile) / size);
    return (emptyRowFromBottom % 2 === 0) === (inversions % 2 !== 0);
  }, []);

  const clearGameState = useCallback(() => {
    localStorage.removeItem('sliding-tiles-state');
  }, []);

  const saveGameState = useCallback(() => {
    if (!isActive || isComplete) return;
    const state = {
      difficulty,
      tiles,
      moves,
      timer,
      timestamp: Date.now()
    };
    console.log('=== SAVE ===', state);
    localStorage.setItem('sliding-tiles-state', JSON.stringify(state));
    console.log('=== SAVE GAME STATE ===', 'sliding-tiles-state', JSON.stringify(state));
  }, [difficulty, tiles, moves, timer, isActive, isComplete]);

  const initializeGame = useCallback(() => {
    const count = DIFFICULTY_CONFIG[difficulty] * DIFFICULTY_CONFIG[difficulty];
    // Create tiles array
    const initialTiles: Tile[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      currentPosition: i,
      correctPosition: i,
    }));

    // Shuffle tiles - ensure solvable
    let shuffled = [...initialTiles];
    do {
      for (let i = shuffled.length - 2; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // Update current positions after shuffle
      shuffled.forEach((tile, index) => {
        tile.currentPosition = index;
      });
    } while (!isSolvable(shuffled, DIFFICULTY_CONFIG[difficulty]) || checkWin(shuffled));

    setTiles(shuffled);
    setMoves(0);
    setIsComplete(false);
    setTimer(0);
    setIsActive(false);
    setHintTileId(null);
    clearGameState();
  }, [difficulty, isSolvable, checkWin, clearGameState]);

  const handleNewGame = useCallback(() => {
    clearGameState();
    setHasSavedGame(false);
    setShowStartScreen(false);
    initializeGame();
  }, [clearGameState, initializeGame]);

  const loadGameState = useCallback(() => {
    try {
      const saved = localStorage.getItem('sliding-tiles-state');
      console.log('=== LOAD ===', saved);
    console.log('=== LOAD GAME STATE ===', 'sliding-tiles-state', saved);
      if (saved) {
        const state = JSON.parse(saved);
        if (state && state.tiles) {
          setDifficulty(state.difficulty);
          setTiles(state.tiles);
          setMoves(state.moves);
          setTimer(state.timer);
          setIsActive(true);
          setHasSavedGame(false);
          setShowStartScreen(false);
        }
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
      clearGameState();
      handleNewGame();
    }
  }, [clearGameState, handleNewGame]);

  useEffect(() => {
    const saved = localStorage.getItem('sliding-tiles-state');
    console.log('=== LOAD ===', saved);
    console.log('=== LOAD GAME STATE ===', 'sliding-tiles-state', saved);
    if (saved) {
      setHasSavedGame(true);
      setShowStartScreen(true);
    } else {
      setShowStartScreen(false);
      initializeGame();
    }
    setIsBootstrapped(true);
  }, [initializeGame]); // Only on mount or when initializeGame changes (rare)

  useEffect(() => {
    if (isActive && !isComplete) {
      saveGameState();
    }
  }, [isActive, isComplete, tiles, moves, timer, saveGameState]);


  // Initialize on difficulty change only if active and not showing start screen
  useEffect(() => {
    if (isBootstrapped && !isActive && !showStartScreen && !hasSavedGame && !isComplete) {
      initializeGame();
    }
  }, [difficulty, initializeGame, showStartScreen, hasSavedGame, isActive, isComplete, isBootstrapped]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isComplete) {
      interval = setInterval(() => {
        setTimer((timer) => timer + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTileClick = useCallback(
    (clickedIndex: number) => {
      const emptyIndex = tiles.findIndex((tile) => tile.id === tileCount - 1);
      const clickedTile = tiles[clickedIndex];

      if (!isActive) setIsActive(true);

      // Check if clicked tile is adjacent to empty space
      const emptyRow = Math.floor(emptyIndex / gridSize);
      const emptyCol = emptyIndex % gridSize;
      const clickedRow = Math.floor(clickedIndex / gridSize);
      const clickedCol = clickedIndex % gridSize;

      const isAdjacent =
        (Math.abs(emptyRow - clickedRow) === 1 && emptyCol === clickedCol) ||
        (Math.abs(emptyCol - clickedCol) === 1 && emptyRow === clickedRow);

      if (isAdjacent) {
        const newTiles = [...tiles];
        const emptyTile = newTiles[emptyIndex];

        // Swap positions
        const tempPosition = clickedTile.currentPosition;
        clickedTile.currentPosition = emptyTile.currentPosition;
        emptyTile.currentPosition = tempPosition;

        // Swap in array
        [newTiles[clickedIndex], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[clickedIndex]];

        setTiles(newTiles);
        setMoves(moves + 1);
        setHintTileId(null);
        
        // Save immediately on every move
        const stateToSave = {
          difficulty,
          tiles: newTiles,
          moves: moves + 1,
          timer,
          timestamp: Date.now()
        };
        console.log('=== SAVE ===', stateToSave);
        localStorage.setItem('sliding-tiles-state', JSON.stringify(stateToSave));
        console.log('=== SAVE GAME STATE ===', 'sliding-tiles-state', JSON.stringify(stateToSave));

        if (checkWin(newTiles)) {
          setIsComplete(true);
          clearGameState();
        }
      }
    },
    [tiles, moves, checkWin, gridSize, tileCount, isActive]
  );

  const getHint = () => {
    const emptyIndex = tiles.findIndex(t => t.id === tileCount - 1);
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    // Possible moves
    const adjIndices = [
      emptyIndex - gridSize, // Top
      emptyIndex + gridSize, // Bottom
      emptyIndex - 1,        // Left
      emptyIndex + 1         // Right
    ].filter(idx => {
      if (idx < 0 || idx >= tileCount) return false;
      const r = Math.floor(idx / gridSize);
      const c = idx % gridSize;
      return (Math.abs(r - emptyRow) === 1 && c === emptyCol) || (Math.abs(c - emptyCol) === 1 && r === emptyRow);
    });

    // Pick a move that moves a tile closer to its correct position
    for (const idx of adjIndices) {
      const tile = tiles[idx];
      const currRow = Math.floor(idx / gridSize);
      const currCol = idx % gridSize;
      const targetRow = Math.floor(tile.correctPosition / gridSize);
      const targetCol = tile.correctPosition % gridSize;

      const emptyTargetRow = Math.floor(emptyIndex / gridSize);
      const emptyTargetCol = emptyIndex % gridSize;

      // Simple heuristic: if moving this tile to the empty spot makes it closer to target
      const currDist = Math.abs(currRow - targetRow) + Math.abs(currCol - targetCol);
      const nextDist = Math.abs(emptyTargetRow - targetRow) + Math.abs(emptyTargetCol - targetCol);

      if (nextDist < currDist) {
        setHintTileId(tile.id);
        return;
      }
    }
    // Default to first available if no "smart" move found
    setHintTileId(tiles[adjIndices[0]].id);
  };

  const getTileColor = (tileId: number) => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
      "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739"
    ];
    return colors[tileId % colors.length];
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: theme.background,
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-8"
        style={{
          height: "88px",
          backgroundColor: theme.surface,
          borderBottom: theme.cardBorder,
          boxShadow: SHADOW.lg,
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToGames}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: theme.surfaceElevated,
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
            }}
          >
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1
            style={{
              fontFamily: fontFamily,
              fontSize: TYPE_SCALE.xl,
              fontWeight: WEIGHT.bold,
              color: theme.textHeading,
            }}
          >
            Sliding Puzzle
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            style={{
              fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.medium,
              padding: '8px 12px', borderRadius: theme.radiusMd, border: theme.cardBorder,
              backgroundColor: theme.surfaceElevated, color: theme.textHeading, outline: 'none'
            }}
          >
            <option value="easy">Easy (3x3)</option>
            <option value="medium">Medium (4x4)</option>
            <option value="hard">Hard (5x5)</option>
          </select>

          <div className="flex flex-col items-end">
            <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: theme.primary }}>{formatTime(timer)}</span>
          </div>

          <div
            className="px-6 py-3"
            style={{
              backgroundColor: theme.primarySubtle,
              borderRadius: theme.radiusFull,
            }}
          >
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.semibold,
                color: theme.primary,
              }}
            >
              Moves: {moves}
            </span>
          </div>

          <button
            onClick={getHint}
            className="px-6 py-3 cursor-pointer active:scale-95 transition-transform"
            style={{
              backgroundColor: theme.surfaceElevated,
              borderRadius: theme.radiusMd,
              border: theme.cardBorder,
              outline: "none",
              fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold,
              color: theme.textHeading,
            }}
          >
            Hint
          </button>

          <button
            onClick={handleNewGame}
            className="flex items-center gap-2 px-6 py-3 cursor-pointer active:scale-95 transition-transform"
            style={{
              backgroundColor: theme.primary,
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
            }}
          >
            <Shuffle size={20} color={theme.textInverse} />
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.base,
                fontWeight: WEIGHT.semibold,
                color: theme.textInverse,
              }}
            >
              Shuffle
            </span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: theme.surfaceElevated,
              borderRadius: theme.radiusMd,
              border: "none",
              outline: "none",
            }}
          >
            <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
          </button>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8">
        <div className="flex gap-12 items-center">
          {/* Current Puzzle */}
          <div className="flex flex-col items-center gap-6">
            <div
              className="grid gap-2 p-4"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, ${difficulty === 'hard' ? '100px' : difficulty === 'medium' ? '130px' : '160px'})`,
                gridTemplateRows: `repeat(${gridSize}, ${difficulty === 'hard' ? '100px' : difficulty === 'medium' ? '130px' : '160px'})`,
                backgroundColor: theme.surface,
                borderRadius: theme.radiusCard,
                border: theme.cardBorder,
                boxShadow: SHADOW.md,
              }}
            >
              {tiles.map((tile, index) => (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(index)}
                  disabled={tile.id === tileCount - 1}
                  className="flex items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: tile.id === tileCount - 1 ? "transparent" : getTileColor(tile.id),
                    borderRadius: theme.radiusMd,
                    border: hintTileId === tile.id ? `4px solid ${theme.primary}` : tile.id === tileCount - 1 ? "2px dashed rgba(255,255,255,0.1)" : "none",
                    boxShadow: tile.id === tileCount - 1 ? "none" : SHADOW.sm,
                    outline: "none",
                    opacity: tile.id === tileCount - 1 ? 0.3 : 1,
                    animation: hintTileId === tile.id ? 'pulse 1s infinite' : 'none'
                  }}
                >
                  {tile.id !== tileCount - 1 && (
                    <span
                      style={{
                        fontFamily: fontFamily,
                        fontSize: difficulty === 'hard' ? '32px' : difficulty === 'medium' ? '48px' : '64px',
                        fontWeight: WEIGHT.extrabold,
                        color: "#2D3436",
                        textShadow: "0 1px 2px rgba(255,255,255,0.5)",
                      }}
                    >
                      {tile.id + 1}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Solution Reference */}
          <div className="flex flex-col items-center gap-6">
            <div
              className="px-6 py-2"
              style={{
                backgroundColor: theme.primarySubtle,
                borderRadius: theme.radiusFull,
              }}
            >
              <span
                style={{
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.base,
                  fontWeight: WEIGHT.semibold,
                  color: theme.primary,
                }}
              >
                Solution
              </span>
            </div>
            <div
              className="grid gap-1 p-2"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, 60px)`,
                gridTemplateRows: `repeat(${gridSize}, 60px)`,
                backgroundColor: theme.surface,
                borderRadius: theme.radiusCard,
                border: theme.cardBorder,
                boxShadow: SHADOW.sm,
                opacity: 0.5,
              }}
            >
              {Array.from({ length: tileCount }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center"
                  style={{
                    backgroundColor: i === tileCount - 1 ? "transparent" : getTileColor(i),
                    borderRadius: theme.radiusSm,
                    border: i === tileCount - 1 ? "2px dashed rgba(255,255,255,0.1)" : "none",
                  }}
                >
                  {i !== tileCount - 1 && (
                    <span
                      style={{
                        fontFamily: fontFamily,
                        fontSize: "20px",
                        fontWeight: WEIGHT.bold,
                        color: "#2D3436",
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>

      {/* Start Screen / Resume Modal */}
      {showStartScreen && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 150,
          }}
        >
          <div
            className="flex flex-col items-center gap-8 px-16 py-12"
            style={{
              backgroundColor: theme.surface,
              borderRadius: theme.radiusCard,
              boxShadow: SHADOW["2xl"],
              border: theme.cardBorder,
              maxWidth: "500px",
              width: "90%"
            }}
          >
            <div className="w-24 h-24 rounded-full bg-primarySubtle flex items-center justify-center" style={{ backgroundColor: theme.primarySubtle }}>
              <RotateCcw size={48} color={theme.primary} />
            </div>

            <div className="text-center gap-2 flex flex-col">
              <h2 style={{ fontFamily, fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading }}>
                Resume Game?
              </h2>
              <p style={{ fontFamily, fontSize: TYPE_SCALE.md, color: theme.textMuted }}>
                We found a saved session. Would you like to continue or start fresh?
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={loadGameState}
                className="w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: theme.primary, color: theme.textInverse, fontSize: TYPE_SCALE.md }}
              >
                Continue Playing
              </button>
              <button
                onClick={handleNewGame}
                className="w-full py-5 rounded-2xl font-bold transition-all hover:bg-black/5 active:scale-95"
                style={{ backgroundColor: theme.surfaceElevated, color: theme.textHeading, border: theme.cardBorder, fontSize: TYPE_SCALE.md }}
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win Modal */}
      {isComplete && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
          }}
        >
          <div
            className="flex flex-col items-center gap-6 px-12 py-10"
            style={{
              backgroundColor: theme.surface,
              borderRadius: theme.radiusCard,
              boxShadow: SHADOW["2xl"],
              border: theme.cardBorder,
            }}
          >
            <Trophy size={80} color={theme.primary} strokeWidth={1.5} />
            <h2
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE["2xl"],
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
              }}
            >
              Puzzle Solved! 🎉
            </h2>
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.medium,
                color: theme.textMuted,
              }}
            >
              You completed the puzzle in {moves} moves!
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={initializeGame}
                className="px-8 py-4 cursor-pointer active:scale-95 transition-transform"
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: theme.radiusMd,
                  border: "none",
                  outline: "none",
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.md,
                  fontWeight: WEIGHT.semibold,
                  color: theme.textInverse,
                }}
              >
                Play Again
              </button>
              <button
                onClick={onClose}
                className="px-8 py-4 cursor-pointer active:scale-95 transition-transform"
                style={{
                  backgroundColor: theme.surfaceElevated,
                  borderRadius: theme.radiusMd,
                  border: theme.cardBorder,
                  outline: "none",
                  fontFamily: fontFamily,
                  fontSize: TYPE_SCALE.md,
                  fontWeight: WEIGHT.semibold,
                  color: theme.textHeading,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Force Redeploy: 1777451733987