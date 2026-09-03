require('dotenv').config();
const pool = require('./db');

async function runMigration() {
  try {
    console.log(' Démarrage de la migration des tables users et candidate_profiles...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ville VARCHAR(100) DEFAULT 'Soa';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Centre (Soa / Yaoundé)';

      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Centre (Soa / Yaoundé)';
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS ville VARCHAR(100) DEFAULT 'Soa';
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS headline VARCHAR(255);
      ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS completion_percentage INT DEFAULT 85;

      CREATE TABLE IF NOT EXISTS candidate_diplomas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        institution VARCHAR(255) DEFAULT 'Non spécifié',
        year INT DEFAULT 2024,
        level VARCHAR(100) DEFAULT 'Licence / Master',
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Tables synchronisées avec succès ! candidate_diplomas est prête.');
    process.exit(0);
  } catch (err) {
    console.error(' Erreur migration:', err);
    process.exit(1);
  }
}

runMigration();
