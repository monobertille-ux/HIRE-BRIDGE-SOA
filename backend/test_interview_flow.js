const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hbsoa',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runTest() {
  console.log('=== TEST COMPLET DU FLUX ENTRETIEN VIDÉO RH ⟷ CANDIDAT ===');

  // 1. Trouver un candidat
  const candQ = await pool.query("SELECT id, nom, prenom, email FROM users WHERE role IN ('candidat', 'candidate') LIMIT 1");
  if (candQ.rows.length === 0) {
    console.log('Aucun candidat trouvé pour le test.');
    await pool.end();
    return;
  }
  const candidate = candQ.rows[0];
  console.log(`Candidat test : ${candidate.prenom} ${candidate.nom} (#${candidate.id}) - Email: ${candidate.email}`);

  // 2. Trouver un admin RH
  const rhQ = await pool.query("SELECT id, nom, prenom, role FROM users WHERE role IN ('admin_rh', 'super_admin') LIMIT 1");
  const rh = rhQ.rows[0] || { id: 1, nom: 'RH', prenom: 'Admin' };
  console.log(`Admin RH test : ${rh.prenom} ${rh.nom} (#${rh.id})`);

  // 3. Simuler une programmation d'entretien
  const scheduledTime = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // Dans 2 jours
  const roomId = 'visio-soa-test-' + Math.random().toString(36).substring(2, 7);
  const visioLink = `http://localhost:3000/candidat/dashboard?tab=interviews&room=${roomId}`;

  // Insertion entretien
  const intRes = await pool.query(`
    INSERT INTO interviews (
      user_id, candidate_id, application_id, rh_id, 
      scheduled_at, meeting_link, visio_link, room_id, status, notes, created_at
    ) VALUES ($1, $2, null, $3, $4, $5, $6, $7, 'programme', 'Entretien de test automatique', NOW())
    RETURNING *;
  `, [candidate.id, candidate.id, rh.id, scheduledTime, visioLink, visioLink, roomId]);
  console.log(' Entretien programmé en base :', intRes.rows[0].id, 'Réf salle :', intRes.rows[0].room_id);

  // Message automatique RH
  const msgContent = `Bonjour ${candidate.prenom} ${candidate.nom},\n\n` +
    `Votre entretien en visioconférence pour le poste communal a été programmé par le Service des Ressources Humaines pour le ${new Date(scheduledTime).toLocaleDateString('fr-FR')} à ${new Date(scheduledTime).toLocaleTimeString('fr-FR')}.\n\n` +
    `Réf salle : ${roomId}\nLien direct : ${visioLink}\n\n` +
    `IMPORTANT : Si vous avez une préoccupation, un empêchement ou un besoin de report concernant cet entretien, vous devez impérativement prévenir le Service RH dans cette messagerie au moins 24h avant la tenue de la visioconférence.\n\n` +
    `Cordialement,\nLe Service des Ressources Humaines — Mairie de Soa`;

  const msgRes = await pool.query(`
    INSERT INTO messages (sender_id, receiver_id, content, subject, is_read, created_at)
    VALUES ($1, $2, $3, $4, false, NOW())
    RETURNING id, subject;
  `, [rh.id, candidate.id, msgContent, 'Convocation Officielle à votre Entretien Vidéo — Mairie de Soa']);
  console.log(' Message automatique RH inséré dans la messagerie :', msgRes.rows[0]);

  // Notifications
  await pool.query(`
    INSERT INTO notifications (user_id, title, message, type, action_tab, is_read, icon)
    VALUES ($1, $2, $3, 'recrutement', 'interviews', false, 'fa-solid fa-video');
  `, [candidate.id, 'Convocation à un Entretien Vidéo', 'Entretien programmé']);

  await pool.query(`
    INSERT INTO notifications (user_id, title, message, type, action_tab, is_read, icon)
    VALUES ($1, $2, $3, 'information', 'interviews', false, 'fa-solid fa-envelope');
  `, [candidate.id, 'Email officiel important envoyé', 'Convocation transmise à votre adresse email']);
  console.log(' 2 Notifications in-app insérées pour le candidat.');

  // Vérification de la récupération salle visio
  const roomCheck = await pool.query('SELECT * FROM interviews WHERE room_id = $1', [roomId]);
  console.log(' Vérification salle visio :', roomCheck.rows.length === 1 ? 'OK' : 'ERREUR');

  await pool.end();
  console.log('=== TEST TERMINÉ AVEC SUCCÈS ===');
}

runTest().catch(console.error);
