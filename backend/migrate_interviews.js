const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hbsoa',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  console.log('--- Migration Table interviews ---');
  
  // Création ou mise à jour de la table interviews
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id SERIAL PRIMARY KEY,
      application_id INTEGER,
      candidate_id INTEGER,
      user_id INTEGER,
      rh_id INTEGER,
      scheduled_at TIMESTAMP NOT NULL,
      meeting_link TEXT,
      visio_link TEXT,
      room_id VARCHAR(100),
      status VARCHAR(50) DEFAULT 'programme',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ajout des colonnes au cas où la table existait déjà
  const cols = [
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS user_id INTEGER;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_id INTEGER;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS application_id INTEGER;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS rh_id INTEGER;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_link TEXT;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS visio_link TEXT;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS room_id VARCHAR(100);',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'programme\';',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS notes TEXT;',
    'ALTER TABLE interviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;'
  ];

  for (const c of cols) {
    try {
      await pool.query(c);
    } catch (e) {
      console.log('Col already exists or error:', e.message);
    }
  }

  // Vérifier colonnes
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'interviews';
  `);
  console.log('Colonnes de la table interviews :', res.rows);

  await pool.end();
  console.log(' Migration interviews terminée avec succès.');
}

migrate().catch(console.error);
