const pool = require('./db');

async function migrateSettings() {
  console.log(' Début de la migration des Paramètres & Préférences Utilisateur...');

  try {
    // 1. Table user_settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        email_notif_jobs BOOLEAN DEFAULT true,
        email_notif_applications BOOLEAN DEFAULT true,
        email_notif_trainings BOOLEAN DEFAULT true,
        email_notif_messages BOOLEAN DEFAULT true,
        email_notif_events BOOLEAN DEFAULT true,
        push_notif_enabled BOOLEAN DEFAULT true,
        background_notif_enabled BOOLEAN DEFAULT true,
        sms_notif_enabled BOOLEAN DEFAULT false,
        profile_visibility VARCHAR(30) DEFAULT 'public_rh',
        allow_ai_matching BOOLEAN DEFAULT true,
        theme_mode VARCHAR(20) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'fr',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seeder des paramètres pour les utilisateurs existants
    const users = await pool.query('SELECT id FROM users');
    for (const u of users.rows) {
      await pool.query(`
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING;
      `, [u.id]);
    }

    console.log(' Migration des Paramètres terminée avec succès !');
  } catch (err) {
    console.error(' Erreur migration user_settings :', err);
  } finally {
    process.exit(0);
  }
}

migrateSettings();
