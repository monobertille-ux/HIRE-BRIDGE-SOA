require('dotenv').config();
const pool = require('./db');

async function testSave() {
  try {
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('Aucun utilisateur trouvé pour le test.');
      process.exit(0);
    }
    const userId = userRes.rows[0].id;
    console.log('Test mise à jour profil pour userId =', userId);

    const nom = 'Tjega';
    const prenom = 'Wilfried';
    const title = 'Développeur Web & Mobile Fullstack';
    const bio = 'Passionné par la conception de plateformes numériques pour la modernisation des services de la Mairie de Soa.';
    const skills = ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Gestion de projet'];
    const experience_years = 3;
    const education_level = 'Master / Ingénieur';
    const phone = '+237 690 11 22 33';
    const address = 'Soa Centre, Face Mairie';
    const region = 'Centre (Soa / Yaoundé)';
    const ville = 'Soa';
    const portfolio_url = 'https://wilfried-portfolio.dev';
    const linkedin_url = 'https://linkedin.com/in/wilfried';
    const github_url = 'https://github.com/wilfried';

    // 1. Update users
    await pool.query(
      `UPDATE users SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        phone = COALESCE($3, phone),
        region = COALESCE($4, region),
        ville = COALESCE($5, ville),
        address = COALESCE($6, address)
       WHERE id = $7`,
      [nom, prenom, phone, region, ville, address, userId]
    );

    // 2. Update candidate_profiles
    const p = await pool.query(
      `INSERT INTO candidate_profiles(user_id,title,bio,skills,experience_years,education_level,phone,address,region,ville,portfolio_url,linkedin_url,github_url,completion_percentage,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,100,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
         title=EXCLUDED.title,
         bio=EXCLUDED.bio,
         skills=EXCLUDED.skills,
         experience_years=EXCLUDED.experience_years,
         education_level=EXCLUDED.education_level,
         phone=EXCLUDED.phone,
         address=EXCLUDED.address,
         region=EXCLUDED.region,
         ville=EXCLUDED.ville,
         portfolio_url=EXCLUDED.portfolio_url,
         linkedin_url=EXCLUDED.linkedin_url,
         github_url=EXCLUDED.github_url,
         completion_percentage=EXCLUDED.completion_percentage,
         updated_at=NOW()
       RETURNING *`,
      [userId, title, bio, skills, experience_years, education_level, phone, address, region, ville, portfolio_url, linkedin_url, github_url]
    );

    console.log(' Test Save Profile Réussi ! Profil:', p.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(' Erreur Test Save Profile:', err);
    process.exit(1);
  }
}

testSave();
