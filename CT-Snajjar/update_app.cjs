const fs = require('fs');
const file = 'src/app/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use a simpler string replacement
const oldImport = 'import { JigsawPuzzleGame } from "./components/games/JigsawPuzzleGame";';
const newImport = 'import { SlidingPuzzleGame } from "./components/games/SlidingPuzzleGame";';

if (content.includes(oldImport)) {
    content = content.replace(oldImport, newImport);
} else {
    // Try without quotes
    content = content.replace(/import \{ JigsawPuzzleGame \} from [\"'].\/components\/games\/JigsawPuzzleGame[\"'];/, newImport);
}

content = content.replace('<JigsawPuzzleGame', '<SlidingPuzzleGame');

fs.writeFileSync(file, content);
console.log('Updated App.tsx');
