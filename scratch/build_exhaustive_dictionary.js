const fs = require('fs');
const path = require('path');

const frenchTextRegex = />([^<>{}\n\r]+)</g;
const attrRegex = /(?:title|placeholder|alt|label)=["']([^"']+)["']/g;
const stringsFound = new Set();

function unescapeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'build') continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath);
    } else if (/\.(js|jsx)$/i.test(file)) {
      const content = fs.readFileSync(filePath, 'utf8');
      let match;
      while ((match = frenchTextRegex.exec(content)) !== null) {
        const txt = unescapeHtml(match[1].trim());
        if (txt.length > 1 && /[a-zA-ZÀ-ÿ]/.test(txt) && !txt.startsWith('http') && !txt.startsWith('fa-') && !txt.includes('console.log')) {
          stringsFound.add(txt);
        }
      }
      while ((match = attrRegex.exec(content)) !== null) {
        const txt = unescapeHtml(match[1].trim());
        if (txt.length > 1 && /[a-zA-ZÀ-ÿ]/.test(txt)) {
          stringsFound.add(txt);
        }
      }
    }
  }
}

scanDir('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/frontend/src');
console.log(`Total strings extrait du code frontend: ${stringsFound.size}`);

// Sauvegarder dans un fichier json
fs.writeFileSync('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/scratch/extracted_strings.json', JSON.stringify(Array.from(stringsFound), null, 2), 'utf8');
console.log('✅ Extraction terminée');
