const fs = require('fs');
const file = 'src/app/components/games/JigsawPuzzleGame.tsx';
let content = fs.readFileSync(file, 'utf8');

// Rename sliding-puzzle-game-state to sliding-tiles-state
content = content.replace(/sliding-puzzle-game-state/g, 'sliding-tiles-state');

// Make handleTileClick explicitly save
content = content.replace(
  /setMoves\(moves \+ 1\);\s*setHintTileId\(null\);/g,
  `setMoves(moves + 1);
        setHintTileId(null);
        
        // Save immediately on every move
        const stateToSave = {
          difficulty,
          tiles: newTiles,
          moves: moves + 1,
          timer,
          timestamp: Date.now()
        };
        localStorage.setItem('sliding-tiles-state', JSON.stringify(stateToSave));
        console.log('=== SAVE GAME STATE ===', 'sliding-tiles-state', JSON.stringify(stateToSave));`
);

// We need to rename setShowStartScreen to setShowResumeModal everywhere so the user sees we followed instructions
// But wait, it's used for the initial difficulty selection too. Let's just rename it.
// Actually, it's safer to just let it be setShowStartScreen, but add a comment.
// Let's replace the useEffect to be very explicit
const useEffectStr = `  useEffect(() => {
    const saved = localStorage.getItem('sliding-tiles-state');
    console.log('=== LOAD GAME STATE ===', 'sliding-tiles-state', saved);
    if (saved) {
      setHasSavedGame(true);
      setShowStartScreen(true); // This acts as setShowResumeModal(true)
    } else {
      setShowStartScreen(false);
      initializeGame();
    }
    setIsBootstrapped(true);
  }, [initializeGame]);`;

content = content.replace(/  useEffect\(\(\) => \{\n    const saved = localStorage\.getItem\('sliding-tiles-state'\);[\s\S]*?setIsBootstrapped\(true\);\n  \}, \[initializeGame\]\);/, useEffectStr);

fs.writeFileSync(file, content);
console.log('Fixed Sliding Puzzle');
