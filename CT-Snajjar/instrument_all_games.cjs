const fs = require('fs');
const path = require('path');

const GAMES_DIR = 'src/app/components/games';
const files = fs.readdirSync(GAMES_DIR);

const CONFIGS = {
  'BrainMathGame.tsx': { key: 'brain-math-state', modalVar: 'setShowResumeModal' },
  'ColorMatchGame.tsx': { key: 'color-match-game-state', modalVar: 'setShowResumeModal' },
  'EmojiMatchGame.tsx': { key: 'emoji-match-game-state', modalVar: 'setShowResumeModal' },
  'ImageJigsawGame.tsx': { key: 'image-jigsaw-game-state', modalVar: 'setShowResumeModal' },
  'MemoryGame.tsx': { key: 'memory-game-state', modalVar: 'setShowStartScreen' }, // Uses start screen
  'PatternMemoryGame.tsx': { key: 'pattern-memory-game-state', modalVar: 'setShowResumeModal' },
  'ReactionTimeGame.tsx': { key: 'reaction-time-game-state', modalVar: 'setShowResumeModal' },
  'SimonSaysGame.tsx': { key: 'simon-says-game-state', modalVar: 'setShowResumeModal' },
  'SlidingPuzzleGame.tsx': { key: 'sliding-tiles-state', modalVar: 'setShowStartScreen' }, // Already somewhat fixed
  'TicTacToeGame.tsx': { key: 'tictactoe-game-state', modalVar: 'setShowStartScreen' }, // Uses start screen
  'TriviaQuizGame.tsx': { key: 'trivia-quiz-game-state', modalVar: 'setShowResumeModal' },
  'WordChainGame.tsx': { key: 'word-chain-game-state', modalVar: 'setShowResumeModal' },
  'WordSearchGame.tsx': { key: 'word-search-game-state', modalVar: 'setShowResumeModal' }
};

files.forEach(file => {
  if (!CONFIGS[file]) return;
  const config = CONFIGS[file];
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. INSTRUMENT SAVE
  // Find the save function and add a forced direct call
  const saveKey = config.key;
  
  // Replace the saveGameState content to be more aggressive
  // We want to ensure it saves regardless of flags if possible, or at least logs every time it's called
  content = content.replace(/localStorage\.setItem\(['"](.*?-state)['"], JSON\.stringify\(state\)\);/g, (match, key) => {
    return `localStorage.setItem('${key}', JSON.stringify(state));\n    console.log('=== SAVE ===', state);`;
  });

  // 2. INSTRUMENT LOAD (useEffect)
  // Ensure the mount useEffect sets the resume modal to true
  const modalSetter = config.modalVar;
  
  // Find the useEffect that loads on mount
  // regex to find the block that checks localStorage and sets hasSavedGame
  const loadPattern = /useEffect\(\(\) => \{\s*const saved = localStorage\.getItem\(['"](.*?-state)['"]\);([\s\S]*?)\}, \[\]\);/;
  
  content = content.replace(loadPattern, (match, key, body) => {
    return `useEffect(() => {
    const saved = localStorage.getItem('${key}');
    console.log('=== LOAD ===', saved);
    if (saved) {
      setHasSavedGame(true);
      ${modalSetter}(true);
    }
  }, []);`;
  });

  // Specifically for MemoryGame/TicTacToe/SlidingPuzzle that might use different deps
  if (file === 'MemoryGame.tsx' || file === 'SlidingPuzzleGame.tsx' || file === 'TicTacToeGame.tsx') {
      const depPattern = /useEffect\(\(\) => \{\s*const saved = localStorage\.getItem\(['"](.*?-state)['"]\);([\s\S]*?)\}, \[(.*?)\]\);/;
      content = content.replace(depPattern, (match, key, body, deps) => {
         return `useEffect(() => {
    const saved = localStorage.getItem('${key}');
    console.log('=== LOAD ===', saved);
    if (saved) {
      setHasSavedGame(true);
      ${modalSetter}(true);
    }
  }, [${deps}]);`;
      });
  }

  // 3. ADD LOGS TO ACTIONS
  // This is harder via regex, but we can try to wrap setMoves/setScore/etc.
  // Actually, we already have saveGameState being called in a useEffect in most of these.
  // Let's ensure THAT useEffect is triggered on every change.
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed ${file}`);
});
