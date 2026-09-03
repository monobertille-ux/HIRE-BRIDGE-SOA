const bcrypt = require('bcrypt');
const pool = require('./db');

async function setupSuperAdmin() {
  const email = 'estellemono5@gmail.com';
  const rawPassword = 'Estelle#235';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // Vérifier si l'utilisateur existe déjà
  const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE users SET password_hash = $1, role = 'super_admin', status = 'actif', nom = 'Mono', prenom = 'Estelle', region = 'Direction Générale • Super Administration', ville = 'Soa' WHERE email = $2",
      [passwordHash, email]
    );
    console.log(' Compte Super Admin mis à jour avec succès pour ' + email);
  } else {
    await pool.query(
      "INSERT INTO users (nom, prenom, email, password_hash, role, region, ville, phone, status) VALUES ('Mono', 'Estelle', $1, $2, 'super_admin', 'Direction Générale • Super Administration', 'Soa', '+237 600 00 00 00', 'actif')",
      [email, passwordHash]
    );
    console.log(' Compte Super Admin créé avec succès pour ' + email);
  }

  // Vérification directe en base
  const verify = await pool.query('SELECT id, nom, prenom, email, role, status FROM users WHERE email = $1', [email]);
  console.log(' Utilisateur Super Admin en Base :', verify.rows[0]);

  // Test de connexion via l'API Express
  const loginRes = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: rawPassword })
  });
  const loginData = await loginRes.json();
  console.log(' Test Connexion API -> Statut HTTP:', loginRes.status);
  console.log(' Données Utilisateur Retournées :', {
    email: loginData.user?.email,
    nom: `${loginData.user?.prenom} ${loginData.user?.nom}`,
    role: loginData.user?.role,
    status: loginData.user?.status,
    hasToken: Boolean(loginData.token)
  });

  process.exit(0);
}

setupSuperAdmin().catch((err) => {
  console.error('Erreur setup super admin :', err);
  process.exit(1);
});
