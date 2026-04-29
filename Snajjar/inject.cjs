const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/app/components/games');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add console.log after setItem
  content = content.replace(/localStorage\.setItem\('([^']+)',\s*(.*?)\);/g, (match, key, val) => {
    if (content.includes(`=== SAVE GAME STATE ===', '${key}'`)) return match;
    return `${match}\n    console.log('=== SAVE GAME STATE ===', '${key}', ${val});`;
  });
  
  // Add console.log after getItem
  content = content.replace(/const\s+(\w+)\s*=\s*localStorage\.getItem\('([^']+)'\);/g, (match, varName, key) => {
    if (content.includes(`=== LOAD GAME STATE ===', '${key}'`)) return match;
    return `${match}\n    console.log('=== LOAD GAME STATE ===', '${key}', ${varName});`;
  });
  
  // For let saved = localStorage.getItem
  content = content.replace(/let\s+(\w+)\s*=\s*localStorage\.getItem\('([^']+)'\);/g, (match, varName, key) => {
    if (content.includes(`=== LOAD GAME STATE ===', '${key}'`)) return match;
    return `${match}\n    console.log('=== LOAD GAME STATE ===', '${key}', ${varName});`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log('Updated ' + file);
});
