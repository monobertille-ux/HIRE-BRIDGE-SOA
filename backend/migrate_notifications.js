const pool = require('./db');

async function migrateNotifications() {
  console.log(' Début de la migration du système de Notifications...');

  try {
    // 1. Table notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'information',
        action_tab VARCHAR(50) DEFAULT 'dashboard',
        is_read BOOLEAN DEFAULT false,
        icon VARCHAR(60) DEFAULT 'fa-solid fa-bell',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seeder des notifications réalistes pour tous les candidats
    const candidatesRes = await pool.query("SELECT id, nom, prenom FROM users WHERE role = 'candidate' OR role = 'candidat'");
    
    for (const cand of candidatesRes.rows) {
      const checkCount = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [cand.id]);
      if (parseInt(checkCount.rows[0].count, 10) === 0) {
        const initialNotifs = [
          {
            title: 'Bienvenue sur la plateforme officielle de la Mairie de Soa',
            message: `Bonjour ${cand.prenom}, votre compte citoyen est actif. Découvrez les offres d'emploi, formations municipales et démarches de stage de la commune.`,
            type: 'compte_securite',
            action_tab: 'dashboard',
            is_read: true,
            icon: 'fa-solid fa-circle-check',
            timeAgo: "INTERVAL '3 days'"
          },
          {
            title: 'Dépôt de candidature enregistré avec succès',
            message: 'Votre dossier de candidature a été transmis à la commission des Ressources Humaines. Un accusé de réception a été généré.',
            type: 'recrutement',
            action_tab: 'applications',
            is_read: false,
            icon: 'fa-solid fa-briefcase',
            timeAgo: "INTERVAL '1 day'"
          },
          {
            title: 'Nouveau programme de Formation Municipale disponible',
            message: 'La session "Gestion Moderne de la Salubrité Urbaine & HYSACAM" est désormais ouverte aux inscriptions.',
            type: 'formation',
            action_tab: 'trainings',
            is_read: false,
            icon: 'fa-solid fa-graduation-cap',
            timeAgo: "INTERVAL '18 hours'"
          },
          {
            title: 'Opération "Soa Ville Propre" — Calendrier Communal',
            message: 'Participez à la grande journée éco-citoyenne de salubrité publique programmée ce mois-ci par la Mairie.',
            type: 'evenement',
            action_tab: 'events',
            is_read: false,
            icon: 'fa-regular fa-calendar-check',
            timeAgo: "INTERVAL '6 hours'"
          },
          {
            title: 'Messagerie RH : Service disponible',
            message: 'Les agents de la Direction des RH sont à votre disposition durant les heures de service (07h30 - 15h30).',
            type: 'message_rh',
            action_tab: 'messages',
            is_read: false,
            icon: 'fa-solid fa-comments',
            timeAgo: "INTERVAL '2 hours'"
          }
        ];

        for (const n of initialNotifs) {
          await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, action_tab, is_read, icon, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - ${n.timeAgo})
          `, [cand.id, n.title, n.message, n.type, n.action_tab, n.is_read, n.icon]);
        }
      }
    }

    console.log(' Migration des Notifications terminée avec succès !');
  } catch (err) {
    console.error(' Erreur migration notifications :', err);
  } finally {
    process.exit(0);
  }
}

migrateNotifications();
