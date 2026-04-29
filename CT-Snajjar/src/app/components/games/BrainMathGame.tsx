import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { Trophy, RotateCcw, ArrowLeft, Timer, Zap, Brain } from "lucide-react";

type Equation = {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
  options: number[];
};

export function BrainMathGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [equation, setEquation] = useState<Equation | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const timerRef = useRef<any>(null);
  const startTimestamp = useRef<number>(0);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('brain-math-high-score');
    if (saved) setHighScore(parseInt(saved));

    const savedState = localStorage.getItem('brain-math-game-state');
    if (savedState) {
      setHasSavedGame(true);
      setShowResumeModal(true);
    }
  }, []);

  const saveGameState = useCallback(() => {
    if (gameState !== "playing" || !equation) return;
    const state = {
      level,
      score,
      questionsSolved,
      totalTimeTaken,
      averageSpeed,
      equation,
      timeLeft,
      timestamp: Date.now()
    };
    localStorage.setItem('brain-math-game-state', JSON.stringify(state));
  }, [gameState, level, score, questionsSolved, totalTimeTaken, averageSpeed, equation, timeLeft]);

  const loadGameState = () => {
    const saved = localStorage.getItem('brain-math-game-state');
    if (saved) {
      const state = JSON.parse(saved);
      setLevel(state.level);
      setScore(state.score);
      setQuestionsSolved(state.questionsSolved);
      setTotalTimeTaken(state.totalTimeTaken);
      setAverageSpeed(state.averageSpeed);
      setEquation(state.equation);
      setTimeLeft(state.timeLeft);
      setGameState("playing");
      setShowResumeModal(false);
    }
  };

  const clearGameState = () => {
    localStorage.removeItem('brain-math-game-state');
  };

  const handleNewGame = () => {
    clearGameState();
    setHasSavedGame(false);
    setShowResumeModal(false);
    startGame();
  };

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);

  const generateEquation = useCallback((currentLevel: number) => {
    const operators = ["+", "-", "*"];
    const operator = operators[Math.floor(Math.random() * (currentLevel > 5 ? 3 : 2))];
    
    let n1, n2, ans;
    const range = 10 + currentLevel * 2;

    if (operator === "+") {
      n1 = Math.floor(Math.random() * range) + 1;
      n2 = Math.floor(Math.random() * range) + 1;
      ans = n1 + n2;
    } else if (operator === "-") {
      ans = Math.floor(Math.random() * range) + 1;
      n2 = Math.floor(Math.random() * range) + 1;
      n1 = ans + n2;
    } else {
      n1 = Math.floor(Math.random() * Math.min(12, currentLevel + 2)) + 2;
      n2 = Math.floor(Math.random() * Math.min(10, currentLevel + 1)) + 2;
      ans = n1 * n2;
    }

    const options = [ans];
    while (options.length < 4) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const fake = ans + (offset === 0 ? 7 : offset);
      if (!options.includes(fake) && fake > 0) options.push(fake);
    }

    setEquation({
      num1: n1,
      num2: n2,
      operator,
      answer: ans,
      options: options.sort(() => Math.random() - 0.5)
    });
    
    const timeLimit = Math.max(3, 10 - Math.floor(currentLevel / 3));
    setTimeLeft(timeLimit);
    startTimestamp.current = performance.now();
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setLevel(1);
    setQuestionsSolved(0);
    setTotalTimeTaken(0);
    setAverageSpeed(0);
    generateEquation(1);
    clearGameState();
  };

  const handleAnswer = (selected: number) => {
    if (gameState !== "playing" || !equation) return;

    if (selected === equation.answer) {
      const timeTaken = (performance.now() - startTimestamp.current) / 1000;
      setTotalTimeTaken(prev => prev + timeTaken);
      setQuestionsSolved(prev => prev + 1);
      
      const newScore = score + Math.max(10, Math.round(timeLeft * 10));
      setScore(newScore);
      
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('brain-math-high-score', newScore.toString());
      }

      const nextLevel = Math.floor((questionsSolved + 1) / 3) + 1;
      setLevel(nextLevel);
      generateEquation(nextLevel);
    } else {
      setGameState("gameover");
      clearGameState();
    }
  };

  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 0.1), 100);
      return () => clearTimeout(timerRef.current);
    } else if (timeLeft <= 0 && gameState === "playing") {
      setGameState("gameover");
      clearGameState();
    }
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (questionsSolved > 0) {
      setAverageSpeed(totalTimeTaken / questionsSolved);
    }
  }, [questionsSolved, totalTimeTaken]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToGames} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Brain Math</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span style={{ fontFamily, fontSize: '12px', color: theme.textMuted }}>Level {level}</span>
            <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: theme.primary }}>Score: {score}</span>
          </div>
          <button onClick={onClose} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <span style={{ fontSize: "24px", color: theme.textHeading }}>×</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {gameState === "idle" && (
          <div className="flex flex-col items-center gap-8 max-w-md text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center shadow-inner">
              <Brain size={64} color={theme.primary} />
            </div>
            <h2 className="text-4xl font-black" style={{ color: theme.textHeading }}>Mental Math Challenge</h2>
            <p className="text-lg opacity-80" style={{ color: theme.textNormal }}>Solve equations as fast as you can. The time limit gets shorter each level!</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="block text-xs uppercase text-gray-400 font-bold">Best Score</span>
                <span className="text-2xl font-bold" style={{ color: theme.textHeading }}>{highScore}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="block text-xs uppercase text-gray-400 font-bold">Avg Speed</span>
                <span className="text-2xl font-bold" style={{ color: theme.textHeading }}>{averageSpeed > 0 ? averageSpeed.toFixed(2) + "s" : "--"}</span>
              </div>
            </div>
            <button 
              onClick={startGame}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all text-xl"
            >
              START GAME
            </button>
          </div>
        )}

        {gameState === "playing" && equation && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-12">
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-red-500 transition-all duration-100" 
                style={{ width: `${(timeLeft / (Math.max(3, 10 - Math.floor(level / 3)))) * 100}%` }}
              />
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="text-8xl font-black flex items-center gap-6" style={{ color: theme.textHeading }}>
                <span>{equation.num1}</span>
                <span className="text-blue-500">{equation.operator === "*" ? "×" : equation.operator}</span>
                <span>{equation.num2}</span>
                <span className="text-gray-300">=</span>
                <span className="text-gray-300">?</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full">
              {equation.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="py-10 bg-white border-4 border-gray-100 hover:border-blue-500 hover:bg-blue-50 rounded-[32px] text-5xl font-black transition-all active:scale-95 shadow-lg"
                  style={{ color: theme.textHeading }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="flex flex-col items-center gap-8 max-w-md text-center">
            <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center shadow-inner">
              <Zap size={64} color="#EF4444" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-red-500">Game Over!</h2>
              <p className="text-xl font-bold mt-2" style={{ color: theme.textHeading }}>Final Score: {score}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="block text-xs uppercase text-gray-400 font-bold">Solved</span>
                <span className="text-2xl font-bold" style={{ color: theme.textHeading }}>{questionsSolved}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="block text-xs uppercase text-gray-400 font-bold">Avg Speed</span>
                <span className="text-2xl font-bold" style={{ color: theme.textHeading }}>{averageSpeed.toFixed(2)}s</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all text-xl"
            >
              TRY AGAIN
            </button>
            <button 
              onClick={onBackToGames}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 font-bold rounded-2xl transition-all"
              style={{ color: theme.textHeading }}
            >
              BACK TO GAMES
            </button>
          </div>
        )}
      </div>

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
