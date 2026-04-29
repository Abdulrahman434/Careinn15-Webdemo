import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme, TYPE_SCALE, WEIGHT, SHADOW } from "../ThemeContext";
import { useLocale } from "../i18n";
import { Timer, RotateCcw, ArrowLeft, Zap } from "lucide-react";

type GameMode = 'click' | 'sound' | 'visual';
type Rating = 'Excellent!' | 'Good' | 'Slow';

export function ReactionTimeGame({ onClose, onBackToGames }: { onClose: () => void; onBackToGames: () => void }) {
  const { theme } = useTheme();
  const { fontFamily } = useLocale();
  const [gameState, setGameState] = useState<"idle" | "waiting" | "active" | "result">("idle");
  const [mode, setMode] = useState<GameMode>('click');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<Record<GameMode, number[]>>({ click: [], sound: [], visual: [] });
  const timerRef = useRef<number | null>(null);
  const startTimestamp = useRef<number>(0);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('reaction-leaderboard');
    console.log('=== LOAD GAME STATE ===', 'reaction-leaderboard', saved);
    if (saved) setLeaderboard(JSON.parse(saved));

    const savedState = localStorage.getItem('reaction-speed-game-state');
    console.log('=== LOAD GAME STATE ===', 'reaction-speed-game-state', savedState);
    if (savedState) {
      setHasSavedGame(true);
      setShowResumeModal(true);
    }
  }, []);

  const saveGameState = useCallback(() => {
    if (gameState === "active" || gameState === "waiting" || (gameState === "idle" && history.length === 0)) return;
    const state = {
      mode,
      history,
      gameState: gameState === "result" ? "result" : "idle",
      reactionTime,
      timestamp: Date.now()
    };
    localStorage.setItem('reaction-speed-game-state', JSON.stringify(state));
    console.log('=== SAVE ===', state);
    console.log('=== SAVE GAME STATE ===', 'reaction-speed-game-state', JSON.stringify(state));
  }, [mode, history, gameState, reactionTime]);

  const loadGameState = () => {
    const saved = localStorage.getItem('reaction-speed-game-state');
    console.log('=== LOAD GAME STATE ===', 'reaction-speed-game-state', saved);
    if (saved) {
      const state = JSON.parse(saved);
      setMode(state.mode);
      setHistory(state.history);
      setGameState(state.gameState);
      setReactionTime(state.reactionTime);
      setShowResumeModal(false);
    }
  };

  const clearGameState = () => {
    localStorage.removeItem('reaction-speed-game-state');
  };

  const handleNewGame = () => {
    clearGameState();
    setHasSavedGame(false);
    setShowResumeModal(false);
    resetGame();
  };

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {}
  };

  const startTest = () => {
    if (history.length >= 5) setHistory([]);
    setGameState("waiting");
    setReactionTime(null);
    
    const delay = Math.random() * 2000 + 1500; // 1.5-3.5 seconds
    timerRef.current = window.setTimeout(() => {
      setGameState("active");
      if (mode === 'sound') playBeep();
      startTimestamp.current = performance.now();
    }, delay);
  };

  const handleTap = () => {
    if (gameState === "waiting") {
      clearTimeout(timerRef.current!);
      setGameState("idle");
      alert("Too early! Wait for the signal.");
    } else if (gameState === "active") {
      const time = performance.now() - startTimestamp.current;
      const roundedTime = Math.round(time);
      setReactionTime(roundedTime);
      
      const newHistory = [...history, roundedTime];
      setHistory(newHistory);
      
      // Update leaderboard
      const currentModeLeaderboard = [...(leaderboard[mode] || []), roundedTime]
        .sort((a, b) => a - b)
        .slice(0, 5);
      const newLeaderboard = { ...leaderboard, [mode]: currentModeLeaderboard };
      setLeaderboard(newLeaderboard);
      localStorage.setItem('reaction-leaderboard', JSON.stringify(newLeaderboard));
    console.log('=== SAVE GAME STATE ===', 'reaction-leaderboard', JSON.stringify(newLeaderboard));
      
      setGameState("result");
    }
  };

  const resetGame = () => {
    setGameState("idle");
    setReactionTime(null);
    setHistory([]);
  };

  const getRating = (time: number): Rating => {
    if (time < 250) return "Excellent!";
    if (time < 400) return "Good";
    return "Slow";
  };

  const averageTime = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: theme.background }}>
      <div className="shrink-0 flex items-center justify-between px-8" style={{ height: "88px", backgroundColor: theme.surface, borderBottom: theme.cardBorder, boxShadow: SHADOW.lg }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToGames} className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform" style={{ width: "56px", height: "56px", backgroundColor: theme.surfaceElevated, borderRadius: theme.radiusMd, border: "none", outline: "none" }}>
            <ArrowLeft size={24} color={theme.textHeading} />
          </button>
          <h1 style={{ fontFamily: fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Reaction Speed</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={mode}
            onChange={(e) => { setMode(e.target.value as GameMode); resetGame(); }}
            style={{ padding: "8px 12px", borderRadius: theme.radiusMd, border: theme.cardBorder, outline: "none", fontFamily: fontFamily }}
          >
            <option value="click">Visual: Click Green</option>
            <option value="sound">Audio: Wait for Beep</option>
            <option value="visual">Symbol: Wait for Check</option>
          </select>
          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold">
            Round {history.length + (gameState === "result" ? 0 : 1)}/5
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Leaderboard */}
        <div className="w-80 border-r p-8 flex flex-col gap-6" style={{ backgroundColor: theme.surface, borderColor: theme.cardBorder }}>
          <h2 style={{ fontFamily, fontSize: TYPE_SCALE.lg, fontWeight: WEIGHT.bold, color: theme.textHeading }}>Top 5 ({mode})</h2>
          <div className="flex flex-col gap-3">
            {leaderboard[mode].length === 0 ? (
              <p style={{ fontFamily, color: theme.textMuted }}>No scores yet!</p>
            ) : (
              leaderboard[mode].map((time, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.surfaceElevated }}>
                  <span style={{ fontFamily, fontWeight: WEIGHT.bold, color: theme.primary }}>#{i + 1}</span>
                  <span style={{ fontFamily, fontWeight: WEIGHT.semibold, color: theme.textNormal }}>{time}ms</span>
                </div>
              ))
            )}
          </div>
          {averageTime !== null && (
            <div className="mt-auto p-4 rounded-xl border-2 border-dashed" style={{ borderColor: theme.primarySubtle }}>
              <p style={{ fontFamily, fontSize: TYPE_SCALE.sm, color: theme.textMuted, textAlign: 'center' }}>Average (last {history.length} rounds)</p>
              <p style={{ fontFamily, fontSize: TYPE_SCALE.xl, fontWeight: WEIGHT.bold, color: theme.primary, textAlign: 'center' }}>{averageTime}ms</p>
            </div>
          )}
        </div>

        {/* Main Game Area */}
        <div 
          className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200"
          onClick={handleTap}
          style={{ 
            backgroundColor: gameState === "active" ? "#4ADE80" : gameState === "waiting" ? "#F87171" : theme.background
          }}
        >
          <div className="flex flex-col items-center gap-8 p-12 bg-white/10 backdrop-blur-md rounded-[40px] border border-white/20 shadow-2xl max-w-md w-full text-center">
            {gameState === "idle" && (
              <>
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Timer size={48} color="white" />
                </div>
                <h2 className="text-3xl font-bold" style={{ color: theme.textHeading }}>Ready?</h2>
                <p className="text-lg opacity-80" style={{ color: theme.textNormal }}>
                  {mode === 'click' && "Tap when the screen turns green!"}
                  {mode === 'sound' && "Tap when you hear the beep!"}
                  {mode === 'visual' && "Tap when the ❌ turns into ✅!"}
                </p>
                <button 
                  onClick={(e) => { e.stopPropagation(); startTest(); }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                  START ROUND 1
                </button>
              </>
            )}

            {gameState === "waiting" && (
              <>
                <div className="w-24 h-24 bg-red-400 rounded-full flex items-center justify-center animate-pulse">
                  {mode === 'visual' ? <span className="text-5xl">❌</span> : <Timer size={48} color="white" />}
                </div>
                <h2 className="text-3xl font-bold text-white uppercase">Wait for it...</h2>
              </>
            )}

            {gameState === "active" && (
              <>
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                  {mode === 'visual' ? <span className="text-5xl">✅</span> : <Zap size={48} color="#4ADE80" fill="#4ADE80" />}
                </div>
                <h2 className="text-4xl font-black text-white italic">NOW!!!</h2>
              </>
            )}

            {gameState === "result" && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontFamily, fontSize: TYPE_SCALE.md, fontWeight: WEIGHT.bold, color: theme.primary }}>{getRating(reactionTime!)}</span>
                  <div className="text-7xl font-black" style={{ color: theme.primary }}>
                    {reactionTime}ms
                  </div>
                </div>
                <p className="text-lg opacity-80" style={{ color: theme.textNormal }}>
                  {history.length < 5 ? `Round ${history.length} complete!` : "5-Round training finished!"}
                </p>
                <button 
                  onClick={(e) => { e.stopPropagation(); if (history.length >= 5) resetGame(); else startTest(); }}
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                  {history.length >= 5 ? "RESTART TRAINING" : "START NEXT ROUND"}
                </button>
              </>
            )}
          </div>
        </div>
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
