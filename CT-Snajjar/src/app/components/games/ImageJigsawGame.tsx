import { useState, useCallback, useEffect, useRef } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { Trophy, RotateCcw, ArrowLeft, Camera, Image as ImageIcon } from "lucide-react";

type Difficulty = 3 | 4 | 5;
type Category = 'Nature' | 'Animals';

const IMAGES: Record<Category, string[]> = {
  Nature: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop", // New Nature 7 (Lake/Mountain)
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format&fit=crop"
  ],
  Animals: [
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555169062-013468b47731?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501705388883-4ed8a543392c?w=800&auto=format&fit=crop", // New Animal 5 (Zebra)
    "https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?w=800&auto=format&fit=crop", // New Animal 6 (Giraffe)
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1557246565-8a3d3ab5d7f6?w=800&auto=format&fit=crop"
  ]
};

export function ImageJigsawGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  const [gameState, setGameState] = useState<"menu" | "playing" | "complete">("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [category, setCategory] = useState<Category>('Nature');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [pieces, setPieces] = useState<{ id: number; currentPos: number }[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const timerRef = useRef<any>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  const initializeGame = useCallback(() => {
    const urls = IMAGES[category];
    const url = urls[selectedImageIndex];
    setImageUrl(url);

    const totalPieces = difficulty * difficulty;
    let initialPieces = Array.from({ length: totalPieces }, (_, i) => ({ id: i, currentPos: i }));

    // Shuffle
    do {
      initialPieces = initialPieces.sort(() => Math.random() - 0.5);
      initialPieces.forEach((p, i) => p.currentPos = i);
    } while (isSolved(initialPieces));

    setPieces(initialPieces);
    setGameState("playing");
    setTimer(0);
    setMoves(0);
    setSelectedPiece(null);
    clearGameState();
  }, [category, difficulty, selectedImageIndex]);

  const saveGameState = useCallback(() => {
    if (gameState !== "playing" || pieces.length === 0) return;
    const state = {
      difficulty,
      category,
      selectedImageIndex,
      imageUrl,
      pieces,
      timer,
      moves,
      timestamp: Date.now()
    };
    localStorage.setItem('image-jigsaw-game-state', JSON.stringify(state));
    console.log('=== SAVE GAME STATE ===', 'image-jigsaw-game-state', JSON.stringify(state));
  }, [gameState, pieces, difficulty, category, selectedImageIndex, imageUrl, timer, moves]);

  const loadGameState = () => {
    const saved = localStorage.getItem('image-jigsaw-game-state');
    console.log('=== LOAD GAME STATE ===', 'image-jigsaw-game-state', saved);
    if (saved) {
      const state = JSON.parse(saved);
      setDifficulty(state.difficulty);
      setCategory(state.category);
      setSelectedImageIndex(state.selectedImageIndex);
      setImageUrl(state.imageUrl);
      setPieces(state.pieces);
      setTimer(state.timer);
      setMoves(state.moves);
      setGameState("playing");
      setShowResumeModal(false);
    }
  };

  const clearGameState = () => {
    localStorage.removeItem('image-jigsaw-game-state');
  };

  const handleNewGame = () => {
    clearGameState();
    setHasSavedGame(false);
    setShowResumeModal(false);
    setGameState("menu");
  };

  useEffect(() => {
    const saved = localStorage.getItem('image-jigsaw-game-state');
    console.log('=== LOAD GAME STATE ===', 'image-jigsaw-game-state', saved);
    if (saved) {
      setHasSavedGame(true);
      setShowResumeModal(true);
    }
  }, []);

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);

  const isSolved = (currentPieces: { id: number; currentPos: number }[]) => {
    return currentPieces.every(p => p.id === p.currentPos);
  };

  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState]);

  const handlePieceClick = (index: number) => {
    if (gameState !== "playing") return;

    if (selectedPiece === null) {
      setSelectedPiece(index);
    } else {
      if (selectedPiece !== index) {
        const newPieces = [...pieces];
        // Swap pieces
        const tempId = newPieces[selectedPiece].id;
        newPieces[selectedPiece].id = newPieces[index].id;
        newPieces[index].id = tempId;

        setPieces(newPieces);
        setMoves(moves + 1);

        if (isSolved(newPieces)) {
          setGameState("complete");
          clearGameState();
        }
      }
      setSelectedPiece(null);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToGames} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Puzzle</h1>
        </div>

        <div className="flex items-center gap-6">
          {gameState === "playing" && (
            <>
              <div className="flex flex-col items-end">
                <span style={{ fontFamily, fontSize: '12px', color: theme.textMuted }}>Moves: {moves}</span>
                <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: theme.primary }}>{formatTime(timer)}</span>
              </div>
              <button onClick={handleNewGame} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
                <RotateCcw size={24} color={theme.textHeading} />
              </button>
            </>
          )}
          <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-auto">
        {gameState === "menu" && (
          <div className="w-full max-w-6xl flex flex-col items-center gap-10">
            <div className="text-center">
              <h2 className="text-4xl font-black mb-4" style={{ color: theme.textHeading }}>Picture Puzzle</h2>
              <p className="text-lg opacity-70" style={{ color: theme.textNormal }}>Choose a category, a specific image, and difficulty to start.</p>
            </div>

            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="flex flex-col gap-6">
                <h3 className="text-xl font-bold" style={{ color: theme.textHeading }}>1. Choose Category</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(['Nature', 'Animals'] as Category[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setSelectedImageIndex(0); }}
                      className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all active:scale-95"
                      style={{
                        backgroundColor: category === cat ? theme.primarySubtle : 'white',
                        borderColor: category === cat ? theme.primary : '#F3F4F6'
                      }}
                    >
                      <div className={`p-3 rounded-xl ${category === cat ? 'bg-white' : 'bg-gray-100'}`}>
                        {cat === 'Nature' ? <ImageIcon size={24} /> : <Camera size={24} />}
                      </div>
                      <span className="text-lg font-bold" style={{ color: theme.textHeading }}>{cat}</span>
                    </button>
                  ))}
                </div>

                <h3 className="text-xl font-bold mt-4" style={{ color: theme.textHeading }}>2. Difficulty</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[3, 4, 5].map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d as Difficulty)}
                      className="flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-95"
                      style={{
                        backgroundColor: difficulty === d ? theme.primarySubtle : 'white',
                        borderColor: difficulty === d ? theme.primary : '#F3F4F6'
                      }}
                    >
                      <span className="text-lg font-bold" style={{ color: theme.textHeading }}>{d}x{d} ({d * d} Pieces)</span>
                      <span className="text-sm font-medium px-3 py-1 rounded-full bg-white">{d === 3 ? 'Easy' : d === 4 ? 'Medium' : 'Hard'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                <h3 className="text-xl font-bold" style={{ color: theme.textHeading }}>3. Select Image</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {IMAGES[category].map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className="relative aspect-square rounded-2xl overflow-hidden border-4 transition-all active:scale-95 group"
                      style={{
                        borderColor: selectedImageIndex === idx ? theme.primary : 'transparent',
                        boxShadow: selectedImageIndex === idx ? SHADOW.lg : 'none'
                      }}
                    >
                      <img src={url} alt={`Puzzle ${idx + 1}`} className="w-full h-full object-cover" />
                      {selectedImageIndex === idx && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="bg-white rounded-full p-2 shadow-lg">
                            <Trophy size={20} color={theme.primary} />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={initializeGame}
                  className="mt-4 py-5 bg-blue-600 text-white text-xl font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                >
                  START PUZZLE
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === "playing" && (
          <>
            <div
              className="absolute top-8 left-8 w-[200px] h-[200px] rounded-xl overflow-hidden shadow-md z-10 pointer-events-none"
              style={{ border: `2px solid ${theme.textMuted || '#ccc'}` }}
            >
              <img src={imageUrl} alt="Puzzle preview" className="w-full h-full object-cover" />
            </div>
            <div className="relative flex flex-col items-center gap-8">
              <div
                className="grid gap-1 bg-gray-200 p-1 rounded-xl shadow-2xl overflow-hidden"
                style={{
                  gridTemplateColumns: `repeat(${difficulty}, 1fr)`,
                  width: "min(80vw, 600px)",
                  aspectRatio: "1/1"
                }}
              >
                {pieces.map((piece, i) => {
                  const row = Math.floor(piece.id / difficulty);
                  const col = piece.id % difficulty;
                  const percentage = 100 / (difficulty - 1);

                  return (
                    <button
                      key={i}
                      onClick={() => handlePieceClick(i)}
                      className="relative w-full h-full overflow-hidden transition-all duration-200"
                      style={{
                        border: selectedPiece === i ? "4px solid #3B82F6" : "none",
                        boxShadow: selectedPiece === i ? "inset 0 0 40px rgba(59,130,246,0.5)" : "none",
                        zIndex: selectedPiece === i ? 10 : 1,
                        transform: selectedPiece === i ? "scale(0.95)" : "scale(1)"
                      }}
                    >
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: `${difficulty * 100}%`,
                          backgroundPosition: `${col * percentage}% ${row * percentage}%`,
                        }}
                      />
                      <div className="absolute inset-0 bg-black/5" />
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-3 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center">
                  <span className="text-xs uppercase text-gray-400 font-bold">Category</span>
                  <span className="font-bold">{category}</span>
                </div>
                <div className="px-6 py-3 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center">
                  <span className="text-xs uppercase text-gray-400 font-bold">Grid</span>
                  <span className="font-bold">{difficulty}x{difficulty}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {gameState === "complete" && (
          <div className="flex flex-col items-center gap-8 max-w-md text-center">
            <div className="relative">
              <div className="w-64 h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img src={imageUrl} alt="Complete" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-green-500 text-white p-4 rounded-full shadow-lg">
                <Trophy size={32} />
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-black" style={{ color: theme.textHeading }}>Puzzle Complete! 🎉</h2>
              <p className="text-xl opacity-70 mt-2">Amazing work! You solved it perfectly.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <span className="block text-xs uppercase text-gray-400 font-bold">Time</span>
                <span className="text-2xl font-bold" style={{ color: theme.textHeading }}>{formatTime(timer)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <span className="block text-xs uppercase text-gray-400 font-bold">Moves</span>
                <span className="text-2xl font-bold" style={{ color: theme.textHeading }}>{moves}</span>
              </div>
            </div>

            <button
              onClick={() => setGameState("menu")}
              className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all text-xl"
            >
              NEW PUZZLE
            </button>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
      `}</style>
      {/* Resume Modal */}
      {showResumeModal && (
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
    </div>
  );
}
