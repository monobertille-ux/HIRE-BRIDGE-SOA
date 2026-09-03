const pool = require('./db');

async function migrateEvents() {
  console.log(' Début de la migration du Calendrier Municipal & Événements...');

  try {
    // 1. Table municipal_events étendue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS municipal_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'institutionnel',
        event_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        start_time VARCHAR(50) DEFAULT '09h00',
        end_time VARCHAR(50) DEFAULT '15h00',
        location VARCHAR(255) DEFAULT 'Hôtel de Ville, Mairie de Soa',
        organizer VARCHAR(255) DEFAULT 'Mairie de la Commune de Soa',
        target_audience VARCHAR(255) DEFAULT 'Grand Public & Citoyens de Soa',
        access_type VARCHAR(100) DEFAULT 'Entrée Libre & Gratuite',
        is_public BOOLEAN DEFAULT TRUE,
        capacity INT DEFAULT 150,
        registered_count INT DEFAULT 0,
        banner_color VARCHAR(50) DEFAULT '#22c55e',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Migration des colonnes manquantes si la table existait déjà
    const cols = [
      { name: 'end_date', type: 'TIMESTAMP' },
      { name: 'start_time', type: 'VARCHAR(50) DEFAULT \'09h00\'' },
      { name: 'end_time', type: 'VARCHAR(50) DEFAULT \'15h00\'' },
      { name: 'organizer', type: 'VARCHAR(255) DEFAULT \'Mairie de la Commune de Soa\'' },
      { name: 'target_audience', type: 'VARCHAR(255) DEFAULT \'Grand Public & Citoyens de Soa\'' },
      { name: 'access_type', type: 'VARCHAR(100) DEFAULT \'Entrée Libre & Gratuite\'' },
      { name: 'is_public', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'banner_color', type: 'VARCHAR(50) DEFAULT \'#22c55e\'' }
    ];

    for (const c of cols) {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='municipal_events' AND column_name='${c.name}') THEN
            ALTER TABLE municipal_events ADD COLUMN ${c.name} ${c.type};
          END IF;
        END $$;
      `);
    }

    // 3. Table event_registrations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES municipal_events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      );
    `);

    // 4. Insertion des Événements Municipaux Réels de Soa
    const countRes = await pool.query('SELECT COUNT(*) FROM municipal_events');
    if (parseInt(countRes.rows[0].count, 10) < 6) {
      await pool.query('DELETE FROM municipal_events WHERE id > 0');

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      const seedEvents = [
        {
          title: 'Session Ordinaire du Conseil Municipal — Vote du Budget & Bilan PCD',
          category: 'institutionnel',
          description: 'Séance plénière publique des conseillers municipaux consacrée à l\'examen des comptes administratifs, au vote des délibérations d\'investissement communal et à l\'évaluation du Plan Communal de Développement (PCD).',
          event_date: new Date(currentYear, currentMonth, 15, 9, 30),
          end_date: new Date(currentYear, currentMonth, 15, 16, 0),
          start_time: '09h30',
          end_time: '16h00',
          location: 'Hôtel de Ville de Soa — Grande Salle des Actes',
          organizer: 'Cabinet du Maire & Conseil Municipal',
          target_audience: 'Conseillers municipaux, Autorités administratives, Société civile & Grand Public',
          access_type: 'Séance Ouverte au Public',
          is_public: true,
          capacity: 120,
          banner_color: '#0f172a'
        },
        {
          title: 'Journée d\'Accueil Citoyen & Intégration des Étudiants UY II',
          category: 'universitaire',
          description: 'Grand rassemblement annuel d\'accueil et d\'orientation pour les nouveaux étudiants de l\'Université de Yaoundé II. Guichet spécial État Civil (certificats de résidence, légalisations gratuites), présentation des associations et accompagnement social.',
          event_date: new Date(currentYear, currentMonth, 22, 10, 0),
          end_date: new Date(currentYear, currentMonth, 22, 17, 0),
          start_time: '10h00',
          end_time: '17h00',
          location: 'Esplanade de la Mairie & Campus Universitaire UY II',
          organizer: 'Service des Affaires Sociales, Jeunesse & Université de Yaoundé II',
          target_audience: 'Nouveaux étudiants, associations étudiantes & résidents de Soa',
          access_type: 'Entrée Libre & Gratuite',
          is_public: true,
          capacity: 500,
          banner_color: '#2563eb'
        },
        {
          title: 'Opération "Soa Ville Propre" & Campagne Éco-Citoyenne de Salubrité',
          category: 'ecologie',
          description: 'Mobilisation communautaire pour la salubrité urbaine, le désherbage des espaces publics, le curage des caniveaux et la sensibilisation au tri écologique des déchets ménagers.',
          event_date: new Date(currentYear, currentMonth, 5, 7, 30),
          end_date: new Date(currentYear, currentMonth, 5, 12, 30),
          start_time: '07h30',
          end_time: '12h30',
          location: 'Carrefour Soa Centre & Principaux Axes Municipaux',
          organizer: 'Service Hygiène, Salubrité & HYSACAM',
          target_audience: 'Tous les citoyens, commerçants, transporteurs et comités de développement',
          access_type: 'Participation Volontaire & Citoyenne',
          is_public: true,
          capacity: 300,
          banner_color: '#16a34a'
        },
        {
          title: 'Grande Foire Agropastorale & Marché des Saveurs du Terroir de Soa',
          category: 'terroir',
          description: 'Exposition-vente directe des producteurs locaux (manioc, maïs, produits maraîchers, volailles), démonstrations de transformation culinaire et remise de distinctions aux exploitants agricoles de la commune.',
          event_date: new Date(currentYear, currentMonth, 28, 8, 0),
          end_date: new Date(currentYear, currentMonth, 28, 18, 0),
          start_time: '08h00',
          end_time: '18h00',
          location: 'Ferme Pilote Communale & Marché Central de Soa',
          organizer: 'Pôle Développement Économique & Coopératives Paysannes',
          target_audience: 'Producteurs, acheteurs grossistes, ménages et grand public',
          access_type: 'Accès Libre',
          is_public: true,
          capacity: 400,
          banner_color: '#ea580c'
        },
        {
          title: 'Forum Municipal de l\'Emploi & Job Dating des PME de Soa',
          category: 'emploi_jeunesse',
          description: 'Rencontre directe entre les demandeurs d\'emploi de la commune, les diplômés universitaires et les entreprises locales. Ateliers de relecture de CV, simulations d\'entretiens et recrutements express.',
          event_date: new Date(currentYear, currentMonth + 1, 10, 9, 0),
          end_date: new Date(currentYear, currentMonth + 1, 10, 16, 30),
          start_time: '09h00',
          end_time: '16h30',
          location: 'Centre Polyvalent Communal de Soa',
          organizer: 'Direction des Ressources Humaines & Plateforme HireBridge',
          target_audience: 'Jeunes diplômés, chercheurs d\'emploi, cadres en reconversion',
          access_type: 'Inscription Recommandée sur le Portail',
          is_public: true,
          capacity: 250,
          banner_color: '#7c3aed'
        },
        {
          title: 'Grande Finale du Tournoi Inter-Quartiers du Maire & Festivités Culturelles',
          category: 'culture_sport',
          description: 'Match de clôture du championnat municipal de football, danses traditionnelles Béti, animations musicales et remise solennelle des trophées et récompenses par Monsieur le Maire de Soa.',
          event_date: new Date(currentYear, currentMonth + 1, 25, 14, 0),
          end_date: new Date(currentYear, currentMonth + 1, 25, 19, 0),
          start_time: '14h00',
          end_time: '19h00',
          location: 'Stade Municipal de Soa',
          organizer: 'Commission Sportive & Culturelle de la Mairie',
          target_audience: 'Jeunesse, familles, supporters et passionnés de culture',
          access_type: 'Entrée Libre',
          is_public: true,
          capacity: 1000,
          banner_color: '#db2777'
        }
      ];

      for (const ev of seedEvents) {
        await pool.query(`
          INSERT INTO municipal_events (
            title, description, category, event_date, end_date, start_time, end_time,
            location, organizer, target_audience, access_type, is_public, capacity, banner_color
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          ev.title, ev.description, ev.category, ev.event_date, ev.end_date, ev.start_time, ev.end_time,
          ev.location, ev.organizer, ev.target_audience, ev.access_type, ev.is_public, ev.capacity, ev.banner_color
        ]);
      }
    }

    console.log(' Migration du Calendrier Municipal terminée avec succès !');
  } catch (err) {
    console.error(' Erreur migration events :', err);
  } finally {
    process.exit(0);
  }
}

migrateEvents();
