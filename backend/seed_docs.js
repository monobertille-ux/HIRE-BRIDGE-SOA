const pool = require('./db');

async function seedDocs() {
  try {
    const users = await pool.query("SELECT id, nom, prenom, email FROM users WHERE role='candidat'");
    console.log('Candidates in DB:', users.rows.length);

    for (const u of users.rows) {
      const existing = await pool.query('SELECT COUNT(*) FROM documents WHERE user_id=$1', [u.id]);
      if (parseInt(existing.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO documents (user_id, application_id, doc_type, document_type, file_name, file_url, mime_type)
          VALUES 
          ($1, 1, 'DEMANDE MANUSCRITE', 'Demande Manuscrite Timbrée', 'demande_manuscrite_timbre_soa.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'application/pdf'),
          ($1, 1, 'CURRICULUM VITAE', 'Curriculum Vitae Détaillé', 'cv_officiel_candidat_rh.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'application/pdf'),
          ($1, 1, 'CARTE NATIONALE IDENTITE', 'CNI / Document d Identité', 'cni_cameroun_recto_verso.png', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800', 'image/png'),
          ($1, 1, 'CASIER JUDICIAIRE', 'Extrait de Casier Judiciaire (Bulletin N°3)', 'bulletin_casier_judiciaire_soa.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'application/pdf'),
          ($1, 1, 'CERTIFICAT MEDICAL', 'Certificat Médical d Aptitude', 'certificat_medical_centre_soa.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'application/pdf')
        `, [u.id]);
        console.log('Sample documents inserted for user:', u.email);
      }

      // Check diplomas
      const dipExisting = await pool.query('SELECT COUNT(*) FROM candidate_diplomas WHERE user_id=$1', [u.id]);
      if (parseInt(dipExisting.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO candidate_diplomas (user_id, title, institution, level, year, file_name, file_url)
          VALUES 
          ($1, 'Licence Professionnelle en Gestion des Ressources Humaines', 'Université de Yaoundé II - Soa', 'BAC+3', 2024, 'diplome_licence_grh_soa.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
          ($1, 'Baccalauréat de l Enseignement Secondaire Général (Série A4)', 'Lycée Classique de Soa', 'BAC', 2021, 'diplome_baccalaureat_a4.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
        `, [u.id]);
        console.log('Sample diplomas inserted for user:', u.email);
      }
    }

    console.log(' Seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding docs:', err);
    process.exit(1);
  }
}

seedDocs();
