const fs = require('fs');

const dict = JSON.parse(fs.readFileSync('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/scratch/full_phrases_dictionary.json', 'utf8'));

const file = 'c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/frontend/src/utils/domTranslator.js';
let content = fs.readFileSync(file, 'utf8');

const phrasesObjStr = `const PHRASES = ${JSON.stringify(dict, null, 2)};`;

// Remplacer l'objet const PHRASES = { ... }; dans domTranslator.js
content = content.replace(/const PHRASES = \{[\s\S]*?\n\};/, phrasesObjStr);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ domTranslator.js injecté avec succès avec les 1236 expressions traduites !');
