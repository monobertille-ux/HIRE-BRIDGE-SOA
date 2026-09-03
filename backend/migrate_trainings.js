const pool = require('./db');

async function migrateTrainings() {
  console.log(' Début de la migration des Formations Municipales...');

  try {
    // 1. Table trainings étendue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trainings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Administration & Numérique',
        description TEXT,
        prerequisites TEXT,
        trainer VARCHAR(255) DEFAULT 'Cellule de Formation Mairie de Soa',
        location VARCHAR(255) DEFAULT 'Hôtel de Ville de Soa - Salle des Actes',
        format VARCHAR(100) DEFAULT 'Présentiel & Ateliers Pratiques',
        duration VARCHAR(100) DEFAULT '3 Semaines (45 Heures)',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        capacity INT DEFAULT 30,
        enrolled_count INT DEFAULT 0,
        certification VARCHAR(255) DEFAULT 'Certificat Officiel délivré par la Commune de Soa',
        status VARCHAR(50) DEFAULT 'OUVERTE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Migration des colonnes manquantes si la table existait déjà
    const columnsToAdd = [
      { name: 'category', type: 'VARCHAR(100) DEFAULT \'Administration & Numérique\'' },
      { name: 'prerequisites', type: 'TEXT' },
      { name: 'location', type: 'VARCHAR(255) DEFAULT \'Hôtel de Ville de Soa - Salle des Actes\'' },
      { name: 'format', type: 'VARCHAR(100) DEFAULT \'Présentiel & Ateliers Pratiques\'' },
      { name: 'duration', type: 'VARCHAR(100) DEFAULT \'3 Semaines (45 Heures)\'' },
      { name: 'end_date', type: 'TIMESTAMP' },
      { name: 'certification', type: 'VARCHAR(255) DEFAULT \'Certificat Officiel délivré par la Commune de Soa\'' },
      { name: 'status', type: 'VARCHAR(50) DEFAULT \'OUVERTE\'' }
    ];

    for (const col of columnsToAdd) {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainings' AND column_name='${col.name}') THEN
            ALTER TABLE trainings ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }

    // 3. Table training_applications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_applications (
        id SERIAL PRIMARY KEY,
        training_id INTEGER REFERENCES trainings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        nom VARCHAR(150),
        prenom VARCHAR(150),
        email VARCHAR(150),
        phone VARCHAR(50),
        motivation_text TEXT,
        cv_url VARCHAR(500),
        cv_filename VARCHAR(255),
        diploma_url VARCHAR(500),
        diploma_filename VARCHAR(255),
        cover_letter_url VARCHAR(500),
        cover_letter_filename VARCHAR(255),
        status VARCHAR(50) DEFAULT 'EN_ATTENTE',
        receipt_number VARCHAR(100),
        receipt_date TIMESTAMP,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(training_id, user_id)
      );
    `);

    // 4. Insertion des Formations Municipales Officielles si la table a peu de données
    const checkCount = await pool.query('SELECT COUNT(*) FROM trainings');
    if (parseInt(checkCount.rows[0].count, 10) < 5) {
      await pool.query('DELETE FROM trainings WHERE id > 0');

      const initialTrainings = [
        {
          title: 'Perfectionnement en Bureautique & Outils Numériques Municipaux',
          category: 'Administration & Digital',
          description: 'Formation intensive aux outils bureautiques avancés (Word, Excel automatisé pour la gestion municipale, PowerPoint), à la gestion documentaire dématérialisée et à l\'utilisation des téléprocédures citoyennes.',
          prerequisites: 'Niveau Bac ou équivalent, connaissances de base en informatique.',
          trainer: 'Cellule des Systèmes d\'Information & Télécoms de la Mairie de Soa',
          location: 'Mairie de Soa - Salle Multimédia & Innovation',
          format: 'Présentiel & Ateliers Pratiques sur PC',
          duration: '4 Semaines (60 Heures)',
          start_date: new Date(Date.now() + 10 * 24 * 3600 * 1000),
          end_date: new Date(Date.now() + 38 * 24 * 3600 * 1000),
          capacity: 25,
          certification: 'Certificat de Qualification Numérique délivré par la Mairie de Soa'
        },
        {
          title: 'Gestion Pratique de l\'État Civil & Rédaction des Actes Municipaux',
          category: 'Affaires Juridiques & Citoyenneté',
          description: 'Apprentissage approfondi des protocoles d\'enregistrement des naissances, mariages, déclarations de décès, délivrance des certificats de vie/résidence et archivage réglementaire sécurisé.',
          prerequisites: 'Bac+2 en Droit, Sciences Humaines ou Expérience administrative.',
          trainer: 'Service de l\'État Civil de la Commune de Soa',
          location: 'Hôtel de Ville de Soa - Salle des Actes',
          format: 'Présentiel avec Études de Cas Réels',
          duration: '3 Semaines (45 Heures)',
          start_date: new Date(Date.now() + 14 * 24 * 3600 * 1000),
          end_date: new Date(Date.now() + 35 * 24 * 3600 * 1000),
          capacity: 30,
          certification: 'Attestation d\'Aptitude aux Fonctions d\'Officier / Agent d\'État Civil'
        },
        {
          title: 'Hygiène Publique, Sécurité Sanitaire & Salubrité Urbaine',
          category: 'Environnement & Santé Publique',
          description: 'Techniques d\'inspection et de contrôle sanitaire des commerces alimentaires et débits de boisson, gestion du tri, collecte des ordures ménagères et aménagement des espaces verts communaux.',
          prerequisites: 'Ouvert à tous les candidats motivés par l\'action environnementale.',
          trainer: 'Service Hygiène & Salubrité de Soa en partenariat avec HYSACAM',
          location: 'Centre Communautaire de Soa',
          format: 'Présentiel & Visites de Terrain',
          duration: '2 Semaines (30 Heures)',
          start_date: new Date(Date.now() + 18 * 24 * 3600 * 1000),
          end_date: new Date(Date.now() + 32 * 24 * 3600 * 1000),
          capacity: 40,
          certification: 'Certificat d\'Agent Communal d\'Hygiène et Salubrité Publique'
        },
        {
          title: 'Comptabilité Publique Locale & Recouvrement des Recettes Communales',
          category: 'Finances Locales & Fiscalité',
          description: 'Comptabilité publique appliquée aux Collectivités Territoriales Décentralisées (CTD), techniques de recensement fiscal, régies des recettes, calcul des patentes/licences et gestion des droits de place.',
          prerequisites: 'Baccalauréat G2 / CG ou BTS/Licence en Comptabilité, Gestion, Finance.',
          trainer: 'Direction Financière & Recette Municipale de Soa',
          location: 'Hôtel de Ville de Soa - Pôle Économique',
          format: 'Présentiel & Logiciels Comptables Municipaux',
          duration: '5 Semaines (75 Heures)',
          start_date: new Date(Date.now() + 21 * 24 * 3600 * 1000),
          end_date: new Date(Date.now() + 56 * 24 * 3600 * 1000),
          capacity: 20,
          certification: 'Certificat de Spécialisation en Gestion Financière Municipale'
        },
        {
          title: 'Entreprenariat Agropastoral & Valorisation des Filières Locales',
          category: 'Développement Économique Local',
          description: 'Techniques modernes de production agricole (manioc, maïs, maraîchers), transformation locale à haute valeur ajoutée, montage de business plan agricole et accès aux marchés urbains de Yaoundé.',
          prerequisites: 'Jeunes diplômés, porteurs de projets agropastoraux ou exploitants locaux.',
          trainer: 'Cellule de Développement Rural & Consultants Agronomes',
          location: 'Ferme Pilote Communale de Soa',
          format: 'Ateliers Pratiques & Mentorat Projet',
          duration: '4 Semaines (60 Heures)',
          start_date: new Date(Date.now() + 25 * 24 * 3600 * 1000),
          end_date: new Date(Date.now() + 53 * 24 * 3600 * 1000),
          capacity: 50,
          certification: 'Certificat de Qualification Agropastorale de la Mairie de Soa'
        }
      ];

      for (const t of initialTrainings) {
        await pool.query(`
          INSERT INTO trainings (
            title, category, description, prerequisites, trainer, location, format, 
            duration, start_date, end_date, capacity, certification, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'OUVERTE')
        `, [
          t.title, t.category, t.description, t.prerequisites, t.trainer, t.location,
          t.format, t.duration, t.start_date, t.end_date, t.capacity, t.certification
        ]);
      }
    }

    console.log(' Migration des Formations Municipales terminée avec succès !');
  } catch (err) {
    console.error(' Erreur migration trainings :', err);
  } finally {
    process.exit(0);
  }
}

migrateTrainings();
