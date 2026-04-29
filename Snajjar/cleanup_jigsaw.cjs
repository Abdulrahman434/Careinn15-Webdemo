const fs = require('fs');
const file = 'src/app/components/games/JigsawPuzzleGame.tsx';
let content = fs.readFileSync(file, 'utf8');

const firstHeader = content.indexOf('import');
const secondHeader = content.indexOf('import', firstHeader + 1);

if (secondHeader !== -1) {
    content = content.substring(secondHeader);
}

// Fix the broken useEffect
const brokenEffect = `  useEffect(() => {
    const saved = localStorage.getItem('sliding-tiles-state');
    console.log('=== LOAD ===', saved);
    console.log('=== LOAD GAME STATE ===', 'sliding-tiles-state', saved);
    if (saved) {
      else {
      setShowStartScreen(false);
      initializeGame();
    }
    setIsBootstrapped(true);
  }, [initializeGame]);`;

const fixedEffect = `  useEffect(() => {
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
  }, [initializeGame]);`;

if (content.includes(brokenEffect)) {
    content = content.replace(brokenEffect, fixedEffect);
} else {
    // Fallback if formatting differs slightly
    console.log('Broken effect not found exactly, trying regex');
    content = content.replace(/useEffect\(\(\) => \{\n\s*const saved = localStorage\.getItem\('sliding-tiles-state'\);\n\s*console\.log\('=== LOAD ===', saved\);\n\s*console\.log\('=== LOAD GAME STATE ===', 'sliding-tiles-state', saved\);\n\s*if \(saved\) \{\n\s*else \{\n\s*setShowStartScreen\(false\);\n\s*initializeGame\(\);\n\s*\}\n\s*setIsBootstrapped\(true\);\n\s*\}, \[initializeGame\]\);/, fixedEffect);
}

fs.writeFileSync(file, content);
console.log('Cleaned up JigsawPuzzleGame.tsx');
