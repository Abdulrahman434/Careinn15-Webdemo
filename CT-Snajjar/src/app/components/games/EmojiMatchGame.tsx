import { useState, useCallback, useEffect } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { Trophy, RotateCcw, Timer, ArrowLeft } from "lucide-react";

interface EmojiPair {
  id: number;
  emoji: string;
  matched: boolean;
}

type Category = 'faces' | 'animals' | 'food' | 'travel' | 'sports';

const CATEGORIES: Record<Category, string[]> = {
  faces: ["😊", "😂", "🥰", "😎", "🤔", "😜", "🥳", "😇", "🤩", "🤯", "🧐", "😴"],
  animals: ["🐶", "🐱", "🦁", "🐼", "🐨", "🐸", "🐵", "🐧", "🦋", "🐙", "🦄", "🦖"],
  food: ["🍎", "🍕", "🍔", "🍣", "🌮", "🍩", "🍦", "🍓", "🥨", "🥑", "🥕", "🥐"],
  travel: ["🚗", "✈️", "🚢", "🏔", "🏝", "🌋", "🏰", "🗼", "🗺️", "🚀", "🚂", "🎡"],
  sports: ["⚽", "🏀", "🎾", "⚾", "🏐", "🥊", "🥋", "⛸️", "⛳", "🏊", "🏄", "🏇"]
};

export function EmojiMatchGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  const [category, setCategory] = useState<Category>('faces');
  const [leftEmojis, setLeftEmojis] = useState<EmojiPair[]>([]);
  const [rightEmojis, setRightEmojis] = useState<EmojiPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [matches, setMatches] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  const isGameComplete = matches === leftEmojis.length && leftEmojis.length > 0;

  const clearGameState = useCallback(() => {
    localStorage.removeItem('emoji-match-game-state');
  }, []);

  const saveGameState = useCallback(() => {
    if (!isPlaying || isGameComplete || timeLeft === 0) return;
    const state = {
      category,
      leftEmojis,
      rightEmojis,
      score,
      streak,
      matches,
      timeLeft,
      timestamp: Date.now()
    };
    localStorage.setItem('emoji-match-game-state', JSON.stringify(state));
  }, [category, leftEmojis, rightEmojis, score, streak, matches, timeLeft, isPlaying, isGameComplete]);

  const startGame = useCallback(() => {
    // Select random emojis from category
    const selectedEmojis = CATEGORIES[category].sort(() => Math.random() - 0.5).slice(0, 6);

    // Create left column (shuffled)
    const left = selectedEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      matched: false,
    })).sort(() => Math.random() - 0.5);

    // Create right column (differently shuffled)
    const right = selectedEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      matched: false,
    })).sort(() => Math.random() - 0.5);

    setLeftEmojis(left);
    setRightEmojis(right);
    setSelectedLeft(null);
    setSelectedRight(null);
    setScore(0);
    setStreak(0);
    setMatches(0);
    setTimeLeft(60);
    setIsPlaying(true);
    setShowCelebration(false);
    clearGameState();
  }, [category, clearGameState]);

  const handleNewGame = useCallback(() => {
    clearGameState();
    setHasSavedGame(false);
    setShowResumeModal(false);
    startGame();
  }, [clearGameState, startGame]);

  const loadGameState = useCallback(() => {
    try {
      const saved = localStorage.getItem('emoji-match-game-state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state && state.leftEmojis) {
          setCategory(state.category);
          setLeftEmojis(state.leftEmojis);
          setRightEmojis(state.rightEmojis);
          setScore(state.score);
          setStreak(state.streak);
          setMatches(state.matches);
          setTimeLeft(state.timeLeft);
          setIsPlaying(true);
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
    const saved = localStorage.getItem('emoji-match-high-score');
    if (saved) setHighScore(parseInt(saved));

    const savedState = localStorage.getItem('emoji-match-game-state');
    if (savedState) {
      setHasSavedGame(true);
      setShowResumeModal(true);
    }
    setIsBootstrapped(true);
  }, []);

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);

  useEffect(() => {
    if (isBootstrapped && !isPlaying && !showResumeModal && !hasSavedGame) {
      startGame();
    }
  }, [category, startGame, isPlaying, showResumeModal, hasSavedGame, isBootstrapped]);


  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      clearGameState();
    }
  }, [isPlaying, timeLeft]);

  const handleLeftClick = useCallback(
    (index: number) => {
      if (!isPlaying || leftEmojis[index].matched) return;

      if (selectedLeft === index) {
        setSelectedLeft(null);
      } else {
        setSelectedLeft(index);

        // If right is already selected, check for match
        if (selectedRight !== null) {
          if (leftEmojis[index].emoji === rightEmojis[selectedRight].emoji) {
            // Match!
            const newLeft = [...leftEmojis];
            const newRight = [...rightEmojis];
            newLeft[index].matched = true;
            newRight[selectedRight].matched = true;
            setLeftEmojis(newLeft);
            setRightEmojis(newRight);
            const newStreak = streak + 1;
            setStreak(newStreak);
            setScore(score + 10 + (newStreak > 1 ? newStreak * 2 : 0));
            setMatches(matches + 1);
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 600);

            // Check if all matched
            if (matches + 1 === leftEmojis.length) {
              setIsPlaying(false);
              clearGameState();
              if (score + 10 + (newStreak > 1 ? newStreak * 2 : 0) > highScore) {
                setHighScore(score + 10 + (newStreak > 1 ? newStreak * 2 : 0));
                localStorage.setItem('emoji-match-high-score', (score + 10 + (newStreak > 1 ? newStreak * 2 : 0)).toString());
              }
            }
          } else {
            setStreak(0);
          }

          // Reset selection after brief delay
          setTimeout(() => {
            setSelectedLeft(null);
            setSelectedRight(null);
          }, 500);
        }
      }
    },
    [isPlaying, leftEmojis, rightEmojis, selectedLeft, selectedRight, score, matches, streak, highScore]
  );

  const handleRightClick = useCallback(
    (index: number) => {
      if (!isPlaying || rightEmojis[index].matched) return;

      if (selectedRight === index) {
        setSelectedRight(null);
      } else {
        setSelectedRight(index);

        // If left is already selected, check for match
        if (selectedLeft !== null) {
          if (leftEmojis[selectedLeft].emoji === rightEmojis[index].emoji) {
            // Match!
            const newLeft = [...leftEmojis];
            const newRight = [...rightEmojis];
            newLeft[selectedLeft].matched = true;
            newRight[index].matched = true;
            setLeftEmojis(newLeft);
            setRightEmojis(newRight);
            const newStreak = streak + 1;
            setStreak(newStreak);
            setScore(score + 10 + (newStreak > 1 ? newStreak * 2 : 0));
            setMatches(matches + 1);
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 600);

            // Check if all matched
            if (matches + 1 === leftEmojis.length) {
              setIsPlaying(false);
              clearGameState();
              if (score + 10 + (newStreak > 1 ? newStreak * 2 : 0) > highScore) {
                setHighScore(score + 10 + (newStreak > 1 ? newStreak * 2 : 0));
                localStorage.setItem('emoji-match-high-score', (score + 10 + (newStreak > 1 ? newStreak * 2 : 0)).toString());
              }
            }
          } else {
            setStreak(0);
          }

          // Reset selection after brief delay
          setTimeout(() => {
            setSelectedLeft(null);
            setSelectedRight(null);
          }, 500);
        }
      }
    },
    [isPlaying, leftEmojis, rightEmojis, selectedLeft, selectedRight, score, matches, streak, highScore]
  );



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
            Emoji Match
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            style={{
              fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.medium,
              padding: '8px 12px', borderRadius: theme.radiusMd, border: theme.cardBorder,
              backgroundColor: theme.surfaceElevated, color: theme.textHeading, outline: 'none'
            }}
          >
            <option value="faces">Faces</option>
            <option value="animals">Animals</option>
            <option value="food">Food</option>
            <option value="travel">Travel</option>
            <option value="sports">Sports</option>
          </select>

          <div className="flex flex-col items-end">
            <span style={{ fontFamily, fontSize: '12px', color: theme.textMuted }}>Best: {highScore}</span>
            <span style={{ fontFamily, fontSize: TYPE_SCALE.sm, fontWeight: WEIGHT.bold, color: theme.primary }}>Streak: {streak}x</span>
          </div>

          <div
            className="flex items-center gap-2 px-6 py-3"
            style={{
              backgroundColor: theme.primarySubtle,
              borderRadius: theme.radiusFull,
            }}
          >
            <Timer size={20} color={theme.primary} />
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.semibold,
                color: theme.primary,
              }}
            >
              {timeLeft}s
            </span>
          </div>
          <div
            className="px-6 py-3"
            style={{
              backgroundColor: theme.accentSubtle,
              borderRadius: theme.radiusFull,
            }}
          >
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.semibold,
                color: theme.accent,
              }}
            >
              Score: {score}
            </span>
          </div>
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
            <RotateCcw size={20} color={theme.textInverse} />
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.base,
                fontWeight: WEIGHT.semibold,
                color: theme.textInverse,
              }}
            >
              {!isPlaying && leftEmojis.length === 0 ? "Start Game" : "Restart"}
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

      {/* Game Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 px-16 py-12">
        {!isPlaying && leftEmojis.length === 0 ? (
          /* Start Screen */
          <div className="flex flex-col items-center gap-8">
            <div
              className="w-48 h-48 flex items-center justify-center"
              style={{
                backgroundColor: theme.primarySubtle,
                borderRadius: "50%",
              }}
            >
              <span style={{ fontSize: "96px" }}>😊</span>
            </div>
            <h2
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE["2xl"],
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
                textAlign: "center",
              }}
            >
              Match the Emojis!
            </h2>
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.medium,
                color: theme.textMuted,
                textAlign: "center",
                maxWidth: "600px",
              }}
            >
              Click on matching emojis from the left and right columns to connect them. Match all pairs before time runs out!
            </p>
            <button
              onClick={startGame}
              className="px-12 py-5 cursor-pointer active:scale-95 transition-transform"
              style={{
                backgroundColor: theme.primary,
                borderRadius: theme.radiusMd,
                border: "none",
                outline: "none",
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.bold,
                color: theme.textInverse,
              }}
            >
              Start Game
            </button>
          </div>
        ) : isGameComplete ? (
          /* Win Screen */
          <div className="flex flex-col items-center gap-8">
            <Trophy size={120} color={theme.primary} strokeWidth={1.5} />
            <h2
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE["2xl"],
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
              }}
            >
              Perfect Match! 🎉
            </h2>
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.xl,
                fontWeight: WEIGHT.semibold,
                color: theme.primary,
              }}
            >
              Final Score: {score}
            </p>
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.medium,
                color: theme.textMuted,
              }}
            >
              Time remaining: {timeLeft} seconds
            </p>
            <button
              onClick={startGame}
              className="px-12 py-5 cursor-pointer active:scale-95 transition-transform"
              style={{
                backgroundColor: theme.primary,
                borderRadius: theme.radiusMd,
                border: "none",
                outline: "none",
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.bold,
                color: theme.textInverse,
              }}
            >
              Play Again
            </button>
          </div>
        ) : timeLeft === 0 ? (
          /* Time's Up Screen */
          <div className="flex flex-col items-center gap-8">
            <div
              className="w-48 h-48 flex items-center justify-center"
              style={{
                backgroundColor: theme.accentSubtle,
                borderRadius: "50%",
              }}
            >
              <span style={{ fontSize: "96px" }}>⏰</span>
            </div>
            <h2
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE["2xl"],
                fontWeight: WEIGHT.bold,
                color: theme.textHeading,
              }}
            >
              Time's Up!
            </h2>
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.xl,
                fontWeight: WEIGHT.semibold,
                color: theme.primary,
              }}
            >
              Score: {score}
            </p>
            <p
              style={{
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.md,
                fontWeight: WEIGHT.medium,
                color: theme.textMuted,
              }}
            >
              You matched {matches} out of {leftEmojis.length} pairs
            </p>
            <button
              onClick={startGame}
              className="px-12 py-5 cursor-pointer active:scale-95 transition-transform"
              style={{
                backgroundColor: theme.primary,
                borderRadius: theme.radiusMd,
                border: "none",
                outline: "none",
                fontFamily: fontFamily,
                fontSize: TYPE_SCALE.lg,
                fontWeight: WEIGHT.bold,
                color: theme.textInverse,
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          /* Playing Screen */
          <div className="flex gap-16 items-start">
            {/* Left Column */}
            <div className="flex flex-col gap-5">
              {leftEmojis.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleLeftClick(index)}
                  disabled={item.matched}
                  className="cursor-pointer transition-all duration-200 active:scale-95"
                  style={{
                    width: "200px",
                    height: "140px",
                    backgroundColor: item.matched
                      ? theme.primarySubtle
                      : selectedLeft === index
                        ? theme.primary
                        : theme.surface,
                    borderRadius: theme.radiusLg,
                    border: selectedLeft === index ? `3px solid ${theme.primary}` : theme.cardBorder,
                    boxShadow: selectedLeft === index ? `0 0 20px ${theme.primary}40` : SHADOW.md,
                    outline: "none",
                    fontSize: "72px",
                    opacity: item.matched ? 0.4 : 1,
                  }}
                >
                  {item.emoji}
                </button>
              ))}
            </div>

            {/* Center Indicator */}
            <div className="flex items-center" style={{ height: "840px" }}>
              <div
                className="flex flex-col items-center justify-center gap-4 px-8 py-6"
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: theme.radiusCard,
                  border: theme.cardBorder,
                  boxShadow: SHADOW.md,
                }}
              >
                <span style={{ fontSize: "48px" }}>↔️</span>
                <p
                  style={{
                    fontFamily: fontFamily,
                    fontSize: TYPE_SCALE.base,
                    fontWeight: WEIGHT.semibold,
                    color: theme.textMuted,
                    textAlign: "center",
                    maxWidth: "150px",
                  }}
                >
                  Match the pairs
                </p>
                <div
                  className="px-4 py-2"
                  style={{
                    backgroundColor: theme.primarySubtle,
                    borderRadius: theme.radiusFull,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fontFamily,
                      fontSize: TYPE_SCALE.sm,
                      fontWeight: WEIGHT.bold,
                      color: theme.primary,
                    }}
                  >
                    {matches}/{leftEmojis.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-5">
              {rightEmojis.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleRightClick(index)}
                  disabled={item.matched}
                  className="cursor-pointer transition-all duration-200 active:scale-95"
                  style={{
                    width: "200px",
                    height: "140px",
                    backgroundColor: item.matched
                      ? theme.primarySubtle
                      : selectedRight === index
                        ? theme.primary
                        : theme.surface,
                    borderRadius: theme.radiusLg,
                    border: selectedRight === index ? `3px solid ${theme.primary}` : theme.cardBorder,
                    boxShadow: selectedRight === index ? `0 0 20px ${theme.primary}40` : SHADOW.md,
                    outline: "none",
                    fontSize: "72px",
                    opacity: item.matched ? 0.4 : 1,
                  }}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Feedback Animation */}
      {showCelebration && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-[100]"
          style={{
            animation: "celebrationPulse 0.6s ease-out",
          }}
        >
          <div className="flex gap-4">
            {["⭐", "✨", "🎉", "✨", "⭐"].map((e, i) => (
              <span key={i} style={{ fontSize: "64px", animation: `floatUp ${0.4 + i * 0.1}s ease-out` }}>{e}</span>
            ))}
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

      <style>{`
        @keyframes celebrationPulse {
          0% { background-color: rgba(74, 222, 128, 0); }
          50% { background-color: rgba(74, 222, 128, 0.2); }
          100% { background-color: rgba(74, 222, 128, 0); }
        }
        @keyframes floatUp {
          0% { transform: translateY(20px) scale(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
