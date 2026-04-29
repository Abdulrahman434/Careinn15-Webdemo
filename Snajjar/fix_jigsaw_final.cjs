const fs = require('fs');
const file = 'src/app/components/games/JigsawPuzzleGame.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the duplicated headers
const searchStr = '  const gridSize = DIFFICULTY_CONFIG[difficulty];\n  const tileCount = gridSize * gridSize;\n\n  const checkWin = useCallback((currentTiles: Tile[]) => {\n    return currentTiles.every((tile) => tile.currentPosition === tile.correctPosition);\n  }, []);\n\n  const isSolvable = useCallback((tiles: Tile[], size: number) => {\n    let inversions = 0;\n    const flat = tiles.map(t => t.id).filter(id => id !== size * size - 1);\n    for (let i = 0; i < flat.length; i++) {\n      for (let j = i + 1; j < flat.length; j++) {\n        if (flat[i] > flat[j]) inversions++;\n      }\n    }\n    if (size % 2 !== 0) return inversions % 2 === 0;\n    const emptyTile = tiles.find(t => t.id === size * size - 1)!;\n    const emptyRowFromBottom = size - Math.floor(tiles.indexOf(emptyTile) / size);\n    return (emptyRowFromBottom % 2 === 0) === (inversions % 2 !== 0);\n  }, []);\n\nimport { useState';

const firstPart = content.substring(0, content.indexOf(searchStr));
const secondPart = content.substring(content.indexOf('import { useState', firstPart.length));

if (firstPart.length > 0 && secondPart.length > 0) {
    content = secondPart;
}

// 2. Fix the broken useEffect
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

content = content.replace(brokenEffect, fixedEffect);

fs.writeFileSync(file, content);
console.log('Fixed JigsawPuzzleGame.tsx');
