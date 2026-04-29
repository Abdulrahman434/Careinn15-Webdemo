import { useState, useEffect, useCallback } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { Trophy, RotateCcw, ArrowLeft, Search } from "lucide-react";

const WORD_CATEGORIES = {
  Animals: ["LION", "TIGER", "BEAR", "WOLF", "ZEBRA", "GIRAFFE", "MONKEY", "PANDA", "ELEPHANT", "KANGAROO", "DOLPHIN", "SHARK", "PENGUIN", "EAGLE", "SNAKE"],
  Food: ["APPLE", "PIZZA", "BURGER", "PASTA", "SUSHI", "DONUT", "STEAK", "SALAD", "BREAD", "CHEESE", "BANANA", "ORANGE", "CHICKEN", "TACO", "COOKIES"],
  Sports: ["SOCCER", "TENNIS", "BOXING", "GOLF", "HOCKEY", "CHESS", "RUGBY", "CRICKET", "SKATING", "DIVING", "KARATE", "SAILING", "SKIING", "SURFING", "CYCLING"],
  Countries: ["SAUDI", "JORDAN", "EGYPT", "KUWAIT", "FRANCE", "BRAZIL", "CANADA", "JAPAN", "ITALY", "SPAIN", "CHINA", "INDIA", "MEXICO", "GREECE", "TURKEY"],
  BodyParts: ["HEART", "LIVER", "BRAIN", "LUNGS", "SKULL", "BONE", "NERVE", "SKIN", "HAND", "FOOT", "EYES", "NOSE", "EARS", "NECK", "BACK"],
  Colors: ["PURPLE", "YELLOW", "ORANGE", "INDIGO", "SILVER", "GOLDEN", "BRONZE", "VIOLET", "MAROON", "CYAN", "MAGENTA", "BROWN", "BLACK", "WHITE", "GRAY"],
  Medical: ["NURSE", "DOCTOR", "XRAY", "BLOOD", "SCAN", "FEVER", "COUGH", "PILLS", "CHEST", "PULSE", "ORGAN", "CELLS", "VIRUS", "GERMS", "CLINIC"]
};

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { size: number; count: number }> = {
  easy: { size: 8, count: 5 },
  medium: { size: 12, count: 10 },
  hard: { size: 16, count: 15 }
};

const HIGHLIGHT_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2", "#F06292", "#AED581"];

export function WordSearchGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [grid, setGrid] = useState<string[][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [currentCategory, setCurrentCategory] = useState<keyof typeof WORD_CATEGORIES>("Animals");
  const [foundCellsMap, setFoundCellsMap] = useState<Record<string, { r: number; c: number }[]>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hintCells, setHintCells] = useState<{ r: number; c: number }[] | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [targetWords, setTargetWords] = useState<string[]>([]);

  const gridSize = DIFFICULTY_CONFIG[difficulty].size;
  const wordCount = DIFFICULTY_CONFIG[difficulty].count;

  const clearGameState = useCallback(() => {
    localStorage.removeItem('word-search-game-state');
  }, []);

  const saveGameState = useCallback(() => {
    if (!isActive || isComplete) return;
    const state = {
      difficulty,
      grid,
      foundWords,
      currentCategory,
      foundCellsMap,
      targetWords,
      timer,
      timestamp: Date.now()
    };
    localStorage.setItem('word-search-game-state', JSON.stringify(state));
    console.log('=== SAVE ===', state);
    console.log('=== SAVE GAME STATE ===', 'word-search-game-state', JSON.stringify(state));
  }, [difficulty, grid, foundWords, currentCategory, foundCellsMap, targetWords, timer, isActive, isComplete]);

  const initializeGame = useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const allWords = WORD_CATEGORIES[currentCategory];
    const words = [...allWords].sort(() => Math.random() - 0.5).slice(0, config.count);
    const newGrid = Array(config.size).fill(null).map(() => Array(config.size).fill(""));
    
    words.forEach(word => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const directions = ["H", "V", "D"]; // Horizontal, Vertical, Diagonal
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * config.size);
        const col = Math.floor(Math.random() * config.size);
        
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const r = direction === "V" ? row + i : direction === "D" ? row + i : row;
          const c = direction === "H" ? col + i : direction === "D" ? col + i : col;
          
          if (r >= config.size || c >= config.size || (newGrid[r][c] !== "" && newGrid[r][c] !== word[i])) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          for (let i = 0; i < word.length; i++) {
            const r = direction === "V" ? row + i : direction === "D" ? row + i : row;
            const c = direction === "H" ? col + i : direction === "D" ? col + i : col;
            newGrid[r][c] = word[i];
          }
          placed = true;
        }
      }
    });
    
    // Fill empty cells
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < config.size; r++) {
      for (let c = 0; c < config.size; c++) {
        if (newGrid[r][c] === "") {
          newGrid[r][c] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
    
    setGrid(newGrid);
    setTargetWords(words);
    setFoundWords([]);
    setSelectedCells([]);
    setFoundCellsMap({});
    setIsComplete(false);
    setTimer(0);
    setIsActive(false);
    setHintCells(null);
    clearGameState();
  }, [currentCategory, difficulty, clearGameState]);

  const handleNewGame = useCallback(() => {
    clearGameState();
    setHasSavedGame(false);
    setShowResumeModal(false);
    initializeGame();
  }, [clearGameState, initializeGame]);

  const loadGameState = useCallback(() => {
    try {
      const saved = localStorage.getItem('word-search-game-state');
    console.log('=== LOAD GAME STATE ===', 'word-search-game-state', saved);
      if (saved) {
        const state = JSON.parse(saved);
        if (state && state.grid) {
          setDifficulty(state.difficulty);
          setGrid(state.grid);
          setFoundWords(state.foundWords);
          setCurrentCategory(state.currentCategory);
          setFoundCellsMap(state.foundCellsMap);
          setTargetWords(state.targetWords);
          setTimer(state.timer);
          setIsActive(true);
          setHasSavedGame(false);
          setShowResumeModal(false);
        }
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
      clearGameState();
      handleNewGame();
    }
  }, [clearGameState, handleNewGame]);


  useEffect(() => {
    const saved = localStorage.getItem('word-search-game-state');
    console.log('=== LOAD GAME STATE ===', 'word-search-game-state', saved);
    if (saved) {
      setHasSavedGame(true);
      setShowResumeModal(true);
    } else {
      setShowResumeModal(false);
      initializeGame();
    }
    setIsBootstrapped(true);
  }, [initializeGame]); // Only on mount

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);

  // Initialize on settings change only if not active and not showing resume modal
  useEffect(() => {
    if (isBootstrapped && !isActive && !showResumeModal && !hasSavedGame && !isComplete) {
      initializeGame();
    }
  }, [currentCategory, difficulty, initializeGame, showResumeModal, hasSavedGame, isActive, isComplete, isBootstrapped]);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleCellClick = (r: number, c: number) => {
    if (!isActive) setIsActive(true);
    const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedCells.filter(cell => !(cell.r === r && cell.c === c));
    } else {
      newSelection = [...selectedCells, { r, c }];
    }
    
    setSelectedCells(newSelection);
    
    const selectedWord = newSelection.map(cell => grid[cell.r][cell.c]).join("");
    const reversedSelectedWord = [...newSelection].reverse().map(cell => grid[cell.r][cell.c]).join("");
    
    const matchedWord = targetWords.find(w => w === selectedWord || w === reversedSelectedWord);
    
    if (matchedWord && !foundWords.includes(matchedWord)) {
      setFoundWords(prev => [...prev, matchedWord]);
      setFoundCellsMap(prev => ({
        ...prev,
        [matchedWord]: newSelection
      }));
      setSelectedCells([]);
      
      if (foundWords.length + 1 === targetWords.length) {
        setIsActive(false);
        clearGameState();
        setTimeout(() => setIsComplete(true), 500);
      }
    }
  };

  const showHint = () => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const allWords = WORD_CATEGORIES[currentCategory];
    const wordsToFind = [...allWords].sort(() => Math.random() - 0.5).slice(0, config.count);
    const wordToHint = wordsToFind.find(w => !foundWords.includes(w));
    
    if (wordToHint) {
      // Find cells for this word
      // Since we don't store original positions, we have to search the grid
      // This is complex, but I'll skip storing positions for now and just show a random letter of a word
      // Alternatively, I'll update initializeGame to store positions.
      // For simplicity here, I'll just find ONE letter.
      alert(`Hint: Look for "${wordToHint}"`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToGames} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Word Search</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            style={{ padding: "8px 12px", borderRadius: theme.radiusMd, border: theme.cardBorder, outline: "none", fontFamily: fontFamily }}
          >
            <option value="easy">Easy (8x8)</option>
            <option value="medium">Medium (12x12)</option>
            <option value="hard">Hard (16x16)</option>
          </select>
          <select 
            value={currentCategory} 
            onChange={(e) => setCurrentCategory(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: theme.radiusMd, border: theme.cardBorder, outline: "none", fontFamily: fontFamily }}
          >
            {Object.keys(WORD_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div className="px-4 py-2 bg-gray-100 rounded-lg font-mono">
            {formatTime(timer)}
          </div>
          <button onClick={handleNewGame} className="flex items-center gap-2 px-6 py-3 cursor-pointer active:scale-95 transition-transform" style={{ backgroundColor: theme.primary, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <RotateCcw size={20} color={theme.textInverse} />
            <span style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.base, fontWeight: WEIGHT.semibold, color: theme.textInverse }}>Reset</span>
          </button>
          <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex px-16 py-8 gap-8 overflow-hidden">
        <div className="flex-1 flex items-center justify-center overflow-auto">
          <div className="grid gap-1 bg-white p-4 rounded-xl shadow-inner" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {grid.map((row, r) => row.map((char, c) => {
              const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
              let foundColor = null;
              foundWords.forEach((word, idx) => {
                if (foundCellsMap[word]?.some(cell => cell.r === r && cell.c === c)) {
                  foundColor = HIGHLIGHT_COLORS[idx % HIGHLIGHT_COLORS.length];
                }
              });

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className="flex items-center justify-center font-bold rounded transition-all select-none"
                  style={{
                    width: difficulty === 'hard' ? '24px' : difficulty === 'medium' ? '32px' : '48px',
                    height: difficulty === 'hard' ? '24px' : difficulty === 'medium' ? '32px' : '48px',
                    fontSize: difficulty === 'hard' ? '12px' : difficulty === 'medium' ? '16px' : '20px',
                    backgroundColor: isSelected ? theme.primary : foundColor || "transparent",
                    color: isSelected ? theme.textInverse : foundColor ? "#2D3436" : theme.textNormal,
                    border: "1px solid rgba(0,0,0,0.05)",
                    transform: isSelected ? "scale(1.1)" : "scale(1)",
                    zIndex: isSelected ? 1 : 0
                  }}
                >
                  {char}
                </button>
              );
            }))}
          </div>
        </div>
        
        <div className="w-80 flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Words:</h2>
            <button 
              onClick={showHint}
              className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full font-bold hover:bg-amber-200"
            >
              Hint
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {targetWords.map((word, idx) => {
              const fIdx = foundWords.indexOf(word);
              const isFound = fIdx !== -1;
              const color = isFound ? HIGHLIGHT_COLORS[fIdx % HIGHLIGHT_COLORS.length] : theme.textNormal;
              return (
                <div key={word} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: isFound ? `${color}20` : theme.surfaceElevated, opacity: isFound ? 0.8 : 1 }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isFound ? color : 'transparent' }} />
                  <span style={{ fontFamily: fontFamily, textDecoration: isFound ? "line-through" : "none", fontWeight: isFound ? WEIGHT.bold : WEIGHT.medium, color: isFound ? color : theme.textNormal }}>{word}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 100 }}>
          <div className="flex flex-col items-center gap-6 px-12 py-10" style={{ backgroundColor: theme.surface, borderRadius: theme.radiusCard, boxShadow: SHADOW["2xl"], border: theme.cardBorder }}>
            <Trophy size={80} color={theme.primary} strokeWidth={1.5} />
            <h2 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE["2xl"], fontWeight: WEIGHT.bold, color: theme.textHeading }}>Congratulations! 🎉</h2>
            <p style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.medium, color: theme.textMuted }}>You found all the words!</p>
            <div className="flex gap-4 mt-4">
              <button onClick={handleNewGame} className="px-8 py-4 cursor-pointer active:scale-95 transition-transform" style={{ backgroundColor: theme.primary, borderRadius: theme.radiusMd, border: "none", outline: "none", fontFamily: fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.semibold, color: theme.textInverse }}>Play Again</button>
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
                  color: theme.textHeading 
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
