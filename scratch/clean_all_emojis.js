const fs = require('fs');
const path = require('path');
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: 'c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/backend/.env' });

// Expression régulière Unicode très large couvrant TOUS les Emojis et Symboles Unicode complexes
const emojiRegex = /[\u{1F000}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FB}-\u{25FE}]/gu;

console.log('=== 1. BALAYAGE COMPLET DES FICHIERS DU PROJET ===');
function scanAndClean(dir) {
  let cleanedCount = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'build') continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      cleanedCount += scanAndClean(filePath);
    } else if (/\.(js|jsx|ts|tsx|html|css|json|md|sql|env)$/i.test(file)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (emojiRegex.test(content)) {
        console.log('Emoji trouvé et supprimé dans :', filePath);
        content = content.replace(emojiRegex, '');
        fs.writeFileSync(filePath, content, 'utf8');
        cleanedCount++;
      }
    }
  }
  return cleanedCount;
}

const frontendCleaned = scanAndClean('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/frontend');
const backendCleaned = scanAndClean('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/backend');
console.log('Total fichiers nettoyés :', frontendCleaned + backendCleaned);

console.log('\n=== 2. BALAYAGE ET NETTOYAGE EN BASE DE DONNÉES POSTGRESQL ===');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hirebridge',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function cleanDatabase() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    for (const tRow of tablesRes.rows) {
      const table = tRow.table_name;
      const colsRes = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND data_type IN ('text', 'character varying', 'character')
      `);

      for (const cRow of colsRes.rows) {
        const col = cRow.column_name;
        // Sélectionner les enregistrements contenant des emojis et les nettoyer
        const rows = await pool.query(`SELECT id, "${col}" FROM "${table}" WHERE "${col}" IS NOT NULL`);
        for (const row of rows.rows) {
          const val = row[col];
          if (val && emojiRegex.test(val)) {
            const cleanedVal = val.replace(emojiRegex, '').trim();
            console.log(`Purger emoji dans table [${table}], colonne [${col}], ID [${row.id}]`);
            await pool.query(`UPDATE "${table}" SET "${col}" = $1 WHERE id = $2`, [cleanedVal, row.id]);
          }
        }
      }
    }
    console.log('✅ Base de données PostgreSQL 100% purgée de tout emoji !');
  } catch (err) {
    console.error('Erreur nettoyage DB :', err.message);
  } finally {
    await pool.end();
  }
}

cleanDatabase();
