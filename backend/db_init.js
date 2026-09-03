const pool = require('./db');
const bcrypt = require('bcrypt');

async function initDB() {
  try {
    console.log(' Initialisation et vérification des tables PostgreSQL pour HireBridge...');

    // 1. Table users (avec colonnes supplémentaires pour géolocalisation et statuts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        genre VARCHAR(50),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'candidat',
        region VARCHAR(100) DEFAULT 'Centre (Soa / Yaoundé)',
        ville VARCHAR(100) DEFAULT 'Soa',
        phone VARCHAR(50),
        reset_code VARCHAR(10),
        reset_code_expires TIMESTAMP,
        status VARCHAR(50) DEFAULT 'actif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'candidat';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Centre (Soa / Yaoundé)';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ville VARCHAR(100) DEFAULT 'Soa';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'actif';
    `);
    console.log(' Table users configurée.');

    // 2. Table jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        location VARCHAR(255) DEFAULT 'Mairie de Soa • Yaoundé, Cameroun',
        type VARCHAR(50) DEFAULT 'CDI',
        skills_required TEXT[],
        description TEXT,
        salary_range VARCHAR(100) DEFAULT 'Selon grille municipale',
        deadline TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
        status VARCHAR(50) DEFAULT 'actif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table jobs configurée.');

    // 3. Table candidate_profiles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        bio TEXT,
        phone VARCHAR(50),
        address TEXT,
        region VARCHAR(100) DEFAULT 'Centre',
        skills TEXT[],
        experience_years INT DEFAULT 0,
        education_level VARCHAR(100),
        completion_percentage INT DEFAULT 85,
        cv_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table candidate_profiles configurée.');

    // 4. Table applications (Candidatures)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        compatibility_score INT DEFAULT 75,
        status VARCHAR(50) DEFAULT 'soumis',
        cover_letter TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, job_id)
      );
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_category VARCHAR(255);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN DEFAULT false;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
    `);
    console.log(' Table applications configurée avec gestion des rejets.');

    // 5. Table documents (CV, CNI, Diplômes...)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        doc_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table documents configurée.');

    // 6. Table interviews (Entretiens en visioconférence)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rh_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMP NOT NULL,
        meeting_link TEXT,
        status VARCHAR(50) DEFAULT 'programme',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table interviews configurée.');

    // 7. Table contracts (Contrats et Signature électronique)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        contract_title VARCHAR(255) NOT NULL,
        contract_text TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'envoye',
        signed_at TIMESTAMP,
        signature_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table contracts configurée.');

    // 8. Table trainings & training_enrollments (Formations Mairie)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trainings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        trainer VARCHAR(255),
        start_date TIMESTAMP,
        capacity INT DEFAULT 30,
        enrolled_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS training_enrollments (
        id SERIAL PRIMARY KEY,
        training_id INTEGER REFERENCES trainings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(training_id, user_id)
      );
    `);
    console.log(' Tables trainings & training_enrollments configurées.');

    // 9. Table municipal_events & event_registrations (Calendrier Municipal)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS municipal_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'ceremonie',
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(255) DEFAULT 'Hôtel de Ville, Mairie de Soa',
        capacity INT DEFAULT 100,
        registered_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES municipal_events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      );
    `);
    console.log(' Tables municipal_events & event_registrations configurées.');

    // 10. Table news (Actualités Mairie de Soa)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        content TEXT,
        image_url TEXT,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table news configurée.');

    // 11. Table messages (Messagerie Interne RH / Candidats)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Table messages configurée.');

    // --- SEEDING DE DONNÉES PAR DÉFAUT ---

    // Création du compte Admin RH s'il n'existe pas
    const rhCheck = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['admin.rh@soa.cm']);
    if (rhCheck.rows.length === 0) {
      const rhPassHash = await bcrypt.hash('AdminSOA2026!', 10);
      await pool.query(`
        INSERT INTO users (nom, prenom, genre, email, password_hash, role, region, ville)
        VALUES ('Service RH', 'Administrateur', 'Masculin', 'admin.rh@soa.cm', $1, 'admin_rh', 'Centre (Soa)', 'Soa')
      `, [rhPassHash]);
      console.log(' Compte Admin RH créé : admin.rh@soa.cm / AdminSOA2026!');
    }

    // Création du compte Super Admin s'il n'existe pas
    const superCheck = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['superadmin@soa.cm']);
    if (superCheck.rows.length === 0) {
      const superPassHash = await bcrypt.hash('SuperAdminSOA2026!', 10);
      await pool.query(`
        INSERT INTO users (nom, prenom, genre, email, password_hash, role, region, ville)
        VALUES ('Mairie de Soa', 'Super Admin', 'Masculin', 'superadmin@soa.cm', $1, 'super_admin', 'Centre (Soa)', 'Soa')
      `, [superPassHash]);
      console.log(' Compte Super Admin créé : superadmin@soa.cm / SuperAdminSOA2026!');
    }

    // Offres d'emploi par défaut si la table est vide
    const jobsCount = await pool.query('SELECT COUNT(*) FROM jobs');
    if (parseInt(jobsCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO jobs (title, department, location, type, skills_required, description, salary_range) VALUES
        ('Développeur Web & Systèmes', 'Service Informatique', 'Mairie de Soa • Yaoundé, Cameroun', 'CDI', ARRAY['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'SQL'], 'Développement, maintenance et sécurisation du portail web et des services en ligne de la Mairie de Soa.', '250 000 FCFA - 400 000 FCFA'),
        ('Assistant Ressources Humaines', 'Service RH', 'Mairie de Soa • Yaoundé, Cameroun', 'CDI', ARRAY['Gestion RH', 'Recrutement', 'Droit du travail', 'Communication'], 'Gestion administrative du personnel communal, organisation des concours et suivi des recrutements.', '200 000 FCFA - 320 000 FCFA'),
        ('Chargé de Projets Municipaux', 'Direction Générale', 'Mairie de Soa • Yaoundé, Cameroun', 'CDD', ARRAY['Gestion de projet', 'Planification', 'Rédaction', 'Budgétisation'], 'Supervision et coordination de la mise en oeuvre des projets d infrastructures et d urbanisme de la commune.', '300 000 FCFA - 450 000 FCFA'),
        ('Analyste de Données Citoyennes', 'Service Informatique', 'Mairie de Soa • Yaoundé, Cameroun', 'CDD', ARRAY['SQL', 'Python', 'Excel', 'Analyse de données'], 'Traitement des statistiques démographiques et optimisation des services municipaux de Soa.', '220 000 FCFA - 350 000 FCFA'),
        ('Chargé de Communication Institutionnelle', 'Service Relations Publiques', 'Mairie de Soa • Yaoundé, Cameroun', 'CDI', ARRAY['Communication', 'Réseaux sociaux', 'Graphisme', 'Rédaction'], 'Gestion de l image officielle de la Mairie, relations avec la presse et animation des réseaux citoyens.', '180 000 FCFA - 300 000 FCFA'),
        ('Stagiaire Technicien Réseau', 'Service Informatique', 'Mairie de Soa • Yaoundé, Cameroun', 'Stage', ARRAY['Réseau', 'Maintenance', 'Support technique', 'Windows'], 'Support technique aux agents municipaux et maintenance du réseau informatique communal.', 'Indemnité de stage');
      `);
      console.log(' Offres d emploi initiales insérées.');
    }

    // Événements municipaux par défaut si la table est vide
    const eventsCount = await pool.query('SELECT COUNT(*) FROM municipal_events');
    if (parseInt(eventsCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO municipal_events (title, description, category, event_date, location, capacity) VALUES
        ('Forum de l Emploi et de l Entrepreneuriat de Soa', 'Grand rassemblement annuel réunissant jeunes diplômés, entreprises partenaires et l équipe municipale.', 'conference', NOW() + INTERVAL '10 days', 'Grande Salle des Fêtes de Soa', 250),
        ('Cérémonie d Accueil des Nouveaux Recrus Municipaux', 'Accueil officiel et remise des kits de bienvenue pour les nouveaux collaborateurs de la mairie.', 'ceremonie', NOW() + INTERVAL '18 days', 'Esplanade de la Mairie de Soa', 100),
        ('Atelier Jeunesse : Rédaction de CV & Coaching Entretien', 'Session pratique gratuite organisée par le Service RH de la Mairie de Soa.', 'jeunesse', NOW() + INTERVAL '5 days', 'Centre de Promotion de la Femme de Soa', 60);
      `);
      console.log(' Événements municipaux par défaut créés.');
    }

    // Formations par défaut si la table est vide
    const trainingsCount = await pool.query('SELECT COUNT(*) FROM trainings');
    if (parseInt(trainingsCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO trainings (title, description, trainer, start_date, capacity) VALUES
        ('Initiation à la Bureautique & Outils Numériques', 'Formation accélérée gratuite pour maitriser Word, Excel et le travail collaboratif en ligne.', 'Service Informatique Mairie de Soa', NOW() + INTERVAL '12 days', 40),
        ('Techniques de Gestion Administratives Municipales', 'Formation certifiante aux normes de rédaction administrative et droit des collectivités.', 'Direction des Affaires Générales', NOW() + INTERVAL '25 days', 30);
      `);
      console.log(' Formations municipales par défaut créées.');
    }

    // Actualités par défaut si la table est vide
    const newsCount = await pool.query('SELECT COUNT(*) FROM news');
    if (parseInt(newsCount.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO news (title, summary, content, image_url) VALUES
        ('Lancement officiel du portail HireBridge à la Mairie de Soa', 'La Mairie de Soa modernise ses recrutements avec la nouvelle plateforme digitale HireBridge.', 'Le Maire de la Commune de Soa a le plaisir d annoncer l ouverture officielle du portail HireBridge. Cet outil moderne garantit la transparence, la rapidité et l égalité des chances pour tous les candidats.', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'),
        ('Campagne de Recrutement Jeunes Diplômés 2026', 'Plus de 15 postes et stages ouverts dans divers services municipaux.', 'Dans le cadre du développement communal, la Mairie de Soa lance un appel à candidatures à destination des jeunes diplômés dans les domaines de l informatique, du droit, de la gestion et de la communication.', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80');
      `);
      console.log(' Actualités municipales par défaut créées.');
    }

    console.log(' Base de données HireBridge totalement initialisée et synchronisée avec succès !');
    process.exit(0);
  } catch (err) {
    console.error(' Erreur d initialisation PostgreSQL :', err);
    process.exit(1);
  }
}

initDB();
