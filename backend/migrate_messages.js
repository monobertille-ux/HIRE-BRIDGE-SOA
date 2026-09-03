const pool = require('./db');

async function migrateMessages() {
  console.log(' Début de la migration de la Messagerie Interne RH / Candidat...');

  try {
    // 1. Table messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        attachment_url VARCHAR(255),
        subject VARCHAR(255) DEFAULT 'Général',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Colonnes additionnelles au cas où la table existait
    const cols = [
      { name: 'attachment_url', type: 'VARCHAR(255)' },
      { name: 'subject', type: 'VARCHAR(255) DEFAULT \'Général\'' },
      { name: 'is_read', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const c of cols) {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='${c.name}') THEN
            ALTER TABLE messages ADD COLUMN ${c.name} ${c.type};
          END IF;
        END $$;
      `);
    }

    // 2. Table rh_settings (Disponibilité & Permanence RH)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rh_settings (
        id SERIAL PRIMARY KEY,
        is_available BOOLEAN DEFAULT true,
        status_text VARCHAR(100) DEFAULT 'En ligne & Disponible',
        working_hours VARCHAR(100) DEFAULT 'Du Lundi au Vendredi, 07h30 — 15h30',
        notice_text TEXT DEFAULT 'Ce service de messagerie est strictement réservé aux échanges professionnels relatifs à vos candidatures, stages et formations.',
        auto_reply TEXT DEFAULT 'Bonjour. Votre message a bien été transmis au Service des Ressources Humaines de la Mairie de Soa. Nous vous répondrons dans les meilleurs délais durant les heures ouvrées.',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const rhSetCount = await pool.query('SELECT COUNT(*) FROM rh_settings');
    if (parseInt(rhSetCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO rh_settings (is_available, status_text, working_hours, notice_text, auto_reply)
        VALUES (
          true,
          'En ligne & Disponible',
          'Du Lundi au Vendredi, 07h30 — 15h30',
          'Ce service de messagerie est strictement et exclusivement réservé aux échanges professionnels relatifs à vos candidatures, demandes de stage et formations auprès de la Mairie de Soa. Tout abus ou propos déplacé entraînera la clôture définitive du dossier.',
          'Bonjour. Votre message a bien été transmis au Service RH de la Mairie de Soa. Un agent examinera votre demande durant les heures de service (07h30 - 15h30).'
        )
      `);
    }

    // 3. Récupérer l'ID de l'admin RH
    const rhUserRes = await pool.query("SELECT id FROM users WHERE role = 'admin_rh' OR role = 'super_admin' ORDER BY id ASC LIMIT 1");
    if (rhUserRes.rows.length > 0) {
      const rhId = rhUserRes.rows[0].id;

      // Seed un premier message d'accueil pour les candidats si aucun message n'existe
      const candRes = await pool.query("SELECT id FROM users WHERE role = 'candidate' OR role = 'candidat' ORDER BY id ASC LIMIT 1");
      if (candRes.rows.length > 0) {
        const candId = candRes.rows[0].id;
        const msgCheck = await pool.query('SELECT COUNT(*) FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)', [rhId, candId]);

        if (parseInt(msgCheck.rows[0].count, 10) === 0) {
          await pool.query(`
            INSERT INTO messages (sender_id, receiver_id, content, subject, is_read, created_at)
            VALUES ($1, $2, $3, $4, true, NOW() - INTERVAL '2 hours')
          `, [
            rhId,
            candId,
            'Bonjour et bienvenue sur la messagerie officielle de la Mairie de Soa. Nous sommes à votre disposition pour vous orienter sur vos démarches de recrutement, de stage et de formation municipale.',
            'Bienvenue au Service RH'
          ]);
        }
      }
    }

    console.log(' Migration de la Messagerie terminée avec succès !');
  } catch (err) {
    console.error(' Erreur migration messages :', err);
  } finally {
    process.exit(0);
  }
}

migrateMessages();
