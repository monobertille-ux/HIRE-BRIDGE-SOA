const pool = require('./db');

async function migrateSupport() {
  console.log(' Début de la migration de la table support_tickets...');

  try {
    // 1. Créer la table support_tickets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normale',
        status VARCHAR(30) DEFAULT 'en_attente',
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seeder quelques tickets d'exemple pour les candidats existants
    const users = await pool.query('SELECT id FROM users LIMIT 3');
    for (const u of users.rows) {
      const ticketNum = `SOA-TICKET-2026-${String(u.id).padStart(4, '0')}`;
      await pool.query(`
        INSERT INTO support_tickets (user_id, ticket_number, category, subject, message, priority, status, admin_response)
        VALUES (
          $1,
          $2,
          'Dossier & Candidature',
          'Demande de précision sur la date de commission de sélection',
          'Bonjour, j''ai déposé ma candidature pour le poste d''Agent Administratif et je souhaitais savoir sous quel délai la commission municipale examinera les dossiers. Merci.',
          'normale',
          'resolu',
          'Bonjour. Les commissions de sélection se réunissent chaque deuxième jeudi du mois. Votre dossier est complet et sera examiné lors de la prochaine session. Bien cordialement, Le Support Mairie de Soa.'
        )
        ON CONFLICT (ticket_number) DO NOTHING;
      `, [u.id, ticketNum]);
    }

    console.log(' Migration des Tickets de Support terminée avec succès !');
  } catch (err) {
    console.error(' Erreur migration support_tickets :', err);
  } finally {
    process.exit(0);
  }
}

migrateSupport();
