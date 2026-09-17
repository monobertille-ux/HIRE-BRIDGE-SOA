const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const pool = require('./db');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Dossier uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Multer — stockage générique
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Multer — dossier PDF uniquement
const dossierUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error(`"${file.originalname}" n'est pas un PDF. Seuls les PDF sont acceptés.`));
  }
});

const allDocFields = [
  { name: 'cv', maxCount: 1 },
  { name: 'demande_manuscrite', maxCount: 1 },
  { name: 'lettre_motivation', maxCount: 1 },
  { name: 'copie_cni', maxCount: 1 },
  { name: 'certificat_scolarite', maxCount: 1 },
  { name: 'attestation_ecole', maxCount: 1 },
  { name: 'copie_diplome', maxCount: 1 },
];

const DOCS_EMPLOI            = ['cv', 'demande_manuscrite', 'lettre_motivation', 'copie_cni'];
const DOCS_STAGE_ACADEMIQUE  = ['cv', 'demande_manuscrite', 'certificat_scolarite', 'attestation_ecole', 'copie_cni'];
const DOCS_STAGE_PRO         = ['cv', 'demande_manuscrite', 'lettre_motivation', 'copie_diplome', 'copie_cni'];

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const verifyToken = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Accès non autorisé.' });
  jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY_PROVISOIRE', (err, user) => {
    if (err) return res.status(403).json({ message: 'Jeton invalide ou expiré.' });
    req.user = user;
    next();
  });
};

// ==========================================
// 1. AUTHENTIFICATION & COMPTES
// ==========================================

app.post('/api/register', async (req, res) => {
  const { nom, prenom, genre, email, password, region, ville } = req.body;
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    if ((await pool.query('SELECT id FROM users WHERE LOWER(email)=$1', [cleanEmail])).rows.length > 0)
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO users (nom,prenom,genre,email,password_hash,role,region,ville)
       VALUES ($1,$2,$3,$4,$5,'candidat',$6,$7)
       RETURNING id,nom,prenom,email,role,region,ville`,
      [nom, prenom, genre || 'Non spécifié', cleanEmail, hashedPassword, region || 'Centre (Soa)', ville || 'Soa']
    );
    const user = newUser.rows[0];
    await pool.query(
      `INSERT INTO candidate_profiles (user_id,title,skills,experience_years,education_level,completion_percentage,region)
       VALUES ($1,'Nouveau Candidat',ARRAY['Communication','Bureautique'],1,'Licence / Master',60,$2)`,
      [user.id, region || 'Centre']
    );
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'SECRET_KEY_PROVISOIRE', { expiresIn: '24h' });
    res.status(201).json({ message: 'Compte créé avec succès !', token, user });
  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [cleanEmail]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash)))
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' });
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'SECRET_KEY_PROVISOIRE', { expiresIn: '24h' });
    res.json({ message: 'Connexion réussie !', token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, avatar_url: user.avatar_url, region: user.region, ville: user.ville } });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur.' }); }
});

const handleGoogleAuth = async (req, res) => {
  const googleToken = req.body.credential || req.body.token;
  if (!googleToken) return res.status(400).json({ message: 'Jeton Google manquant.' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: googleToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, given_name, family_name } = ticket.getPayload();
    const cleanEmail = (email || '').trim().toLowerCase();
    let userResult = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [cleanEmail]);
    let user;
    if (userResult.rows.length === 0) {
      const h = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      user = (await pool.query(
        `INSERT INTO users(nom,prenom,genre,email,password_hash,role) VALUES($1,$2,'Non spécifié',$3,$4,'candidat') RETURNING id,nom,prenom,email,role,avatar_url`,
        [family_name || 'Google', given_name || 'Utilisateur', cleanEmail, h]
      )).rows[0];
      await pool.query(`INSERT INTO candidate_profiles(user_id,title,skills,experience_years,education_level,completion_percentage) VALUES($1,'Candidat Google',ARRAY['Communication','Bureautique'],1,'Bac / Licence',65)`, [user.id]);
    } else { user = userResult.rows[0]; }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'candidat' },
      process.env.JWT_SECRET || 'SECRET_KEY_PROVISOIRE', { expiresIn: '24h' });

    // Envoi d'un email d'information simple (signalement de connexion via Google)
    try {
      const loginDate = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' });
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Confidentielle';

      transporter.sendMail({
        from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
        to: cleanEmail,
        subject: ' Notification de connexion à votre compte via Google',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #00a859; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #0b192c; margin: 0;">Mairie de Soa — HireBridge</h2>
              <p style="color: #64748b; font-size: 0.85rem; margin-top: 5px;">Notification d'accès à la plateforme</p>
            </div>

            <p style="font-size: 1rem; color: #1e293b;">Bonjour <strong>${user.prenom || 'Citoyen'} ${user.nom || ''}</strong>,</p>

            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6;">
              Ce message vous informe que vous venez de vous connecter à la plateforme <strong>HireBridge Soa</strong> via votre compte <strong>Google</strong>.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 4px 0; font-size: 0.9rem; color: #0f172a;"><strong>Compte Google :</strong> ${cleanEmail}</p>
              <p style="margin: 4px 0; font-size: 0.9rem; color: #0f172a;"><strong>Date &amp; Heure :</strong> ${loginDate}</p>
              <p style="margin: 4px 0; font-size: 0.9rem; color: #0f172a;"><strong>Adresse IP :</strong> ${userIp}</p>
            </div>

            <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5; background-color: #f1f5f9; padding: 12px; border-radius: 8px;">
              <em>Cet email est une simple notification automatique d'information. Si c'est bien vous qui vous êtes connecté, aucune action de votre part n'est requise. Si une autre personne a utilisé votre compte Google, ce message vous permet d'en être immédiatement averti.</em>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 0.78rem; color: #94a3b8; text-align: center;">
              Mairie de Soa — Plateforme Numérique Officielle de Recrutement &amp; Gestion Citoyenne
            </p>
          </div>
        `
      }).catch(err => console.error('Erreur envoi email alerte Google:', err));
    } catch (emailErr) {
      console.error('Erreur préparation email Google alert:', emailErr);
    }

    res.json({ message: 'Connexion Google réussie !', token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role || 'candidat', avatar_url: user.avatar_url } });
  } catch (err) { res.status(400).json({ message: 'Échec Google Auth.' }); }
};
app.post('/api/google-auth', handleGoogleAuth);
app.post('/api/google-login', handleGoogleAuth);

app.post('/api/forgot-password', async (req, res) => {
  const cleanEmail = (req.body.email || '').trim().toLowerCase();
  try {
    if ((await pool.query('SELECT id FROM users WHERE LOWER(email)=$1', [cleanEmail])).rows.length === 0)
      return res.status(404).json({ message: 'Aucun compte trouvé.' });
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET reset_code=$1, reset_code_expires=$2 WHERE LOWER(email)=$3',
      [resetCode, new Date(Date.now() + 15 * 60000), cleanEmail]);
    try {
      await transporter.sendMail({ from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`, to: cleanEmail,
        subject: 'Code de réinitialisation - Mairie de Soa',
        html: `<h2>Code: <b style="color:#22c55e;letter-spacing:5px">${resetCode}</b></h2><p>Expire dans 15 min.</p>` });
    } catch (e) { /* email non configuré */ }
    res.json({ message: `Code généré ! (Dev: ${resetCode})` });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const check = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1 AND reset_code=$2 AND reset_code_expires>NOW()', [cleanEmail, code]);
    if (check.rows.length === 0) return res.status(400).json({ message: 'Code incorrect ou expiré.' });
    await pool.query('UPDATE users SET password_hash=$1, reset_code=NULL, reset_code_expires=NULL WHERE LOWER(email)=$2',
      [await bcrypt.hash(newPassword, 10), cleanEmail]);
    res.json({ message: 'Mot de passe réinitialisé !' });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

// ==========================================
// 1.1 GESTION DU PROFIL & SÉCURITÉ ADMIN RH
// ==========================================

// Récupérer le profil complet de l'Admin RH
app.get('/api/admin/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query(`
      SELECT id, nom, prenom, email, role, avatar_url, phone, region, ville, created_at
      FROM users
      WHERE id = $1
    `, [userId]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Erreur GET /api/admin/profile:', err);
    res.status(500).json({ message: 'Erreur chargement profil RH.' });
  }
});

// Mettre à jour les informations du profil RH
app.put('/api/admin/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { nom, prenom, email, phone, ville, region } = req.body;
    if (!nom || !prenom || !email) {
      return res.status(400).json({ message: 'Nom, prénom et email obligatoires.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Vérifier si l'email est déjà pris par un autre utilisateur
    const checkEmail = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [cleanEmail, userId]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: 'Cette adresse email est déjà utilisée par un autre compte.' });
    }

    const r = await pool.query(`
      UPDATE users
      SET nom = $1, prenom = $2, email = $3, phone = $4, ville = $5, region = $6
      WHERE id = $7
      RETURNING id, nom, prenom, email, role, avatar_url, phone, region, ville, created_at
    `, [nom.trim(), prenom.trim(), cleanEmail, phone || '', ville || 'Soa', region || 'Centre (Soa)', userId]);

    if (r.rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    res.json({
      message: 'Profil RH mis à jour avec succès !',
      user: r.rows[0]
    });
  } catch (err) {
    console.error('Erreur PUT /api/admin/profile:', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil RH.' });
  }
});

// Téléverser / Mettre à jour la photo de profil (Avatar) RH
app.post('/api/admin/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file || !userId) return res.status(400).json({ message: 'Fichier image ou identifiant manquant.' });
    const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id, nom, prenom, email, role, avatar_url, phone, region, ville',
      [avatarUrl, userId]
    );
    res.json({
      message: 'Photo de profil RH mise à jour avec succès !',
      avatarUrl,
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur upload avatar RH:', err);
    res.status(500).json({ message: 'Erreur upload photo de profil RH.' });
  }
});

// Modifier le mot de passe sécurisé de l'Admin RH
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    const userQ = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userQ.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    const user = userQ.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    res.json({ message: 'Votre mot de passe a été modifié avec succès ! Vos accès sont sécurisés.' });
  } catch (err) {
    console.error('Erreur changement mot de passe RH:', err);
    res.status(500).json({ message: 'Erreur lors de la modification du mot de passe.' });
  }
});

// ==========================================
// 2. PROFIL CANDIDAT & DOCUMENTS
// ==========================================

// Helper pour calculer précisément le pourcentage de complétion du profil
function calculateProfileCompletion(user, profile, diplomas = []) {
  let score = 0;
  // 1. Nom & Prénom obligatoires (10%)
  if (user && user.nom && user.prenom && user.nom.trim() && user.prenom.trim()) score += 10;
  // 2. Email obligatoire (10%)
  if (user && user.email && user.email.includes('@')) score += 10;
  // 3. Téléphone obligatoire (10%)
  const phone = (profile && profile.phone) || (user && user.phone) || '';
  if (phone.trim().length >= 8) score += 10;
  // 4. Localisation / Ville / Région obligatoire (10%)
  const loc = (profile && (profile.region || profile.address)) || (user && (user.region || user.ville)) || '';
  if (loc.trim().length >= 3) score += 10;
  // 5. Photo de profil / Avatar (10%)
  if (user && user.avatar_url && user.avatar_url.trim()) score += 10;
  // 6. Titre / Domaine d'expertise en highlight (15%)
  if (profile && profile.title && profile.title.trim() && profile.title !== 'Nouveau Candidat') score += 15;
  else if (profile && profile.title && profile.title.trim()) score += 8;
  // 7. Bio / Pitch de présentation obligatoire (15%)
  if (profile && profile.bio && profile.bio.trim().length >= 20) score += 15;
  else if (profile && profile.bio && profile.bio.trim()) score += 7;
  // 8. Compétences clés obligatoires (10%)
  if (profile && profile.skills && Array.isArray(profile.skills) && profile.skills.length >= 2) score += 10;
  else if (profile && profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) score += 5;
  // 9. Diplômes & Certifications vérifiés (10%)
  if (diplomas && diplomas.length > 0) score += 10;

  return Math.min(100, Math.max(0, score));
}

app.get('/api/candidate/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRes = await pool.query('SELECT id,nom,prenom,email,role,avatar_url,region,ville,phone,address FROM users WHERE id=$1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    const user = userRes.rows[0];

    const profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    let profile = profRes.rows[0] || { user_id: userId, title: 'Candidat Polyvalent', skills: [] };

    const diplomasRes = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1 ORDER BY year DESC, created_at DESC', [userId]);
    const diplomas = diplomasRes.rows;

    const completion = calculateProfileCompletion(user, profile, diplomas);

    const docsRes = await pool.query('SELECT * FROM documents WHERE user_id=$1 ORDER BY uploaded_at DESC', [userId]);
    res.json({
      user,
      profile: { ...profile, completion_percentage: completion },
      completionPercentage: completion,
      diplomas,
      documents: docsRes.rows
    });
  } catch (err) {
    console.error('Erreur profil:', err);
    res.status(500).json({ message: 'Erreur chargement profil.' });
  }
});

// ==========================================
// DIPLÔMES & CERTIFICATIONS CANDIDAT
// ==========================================

app.get('/api/candidate/diplomas/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1 ORDER BY year DESC, created_at DESC', [userId]);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur chargement diplômes:', err);
    res.status(500).json({ message: 'Erreur chargement diplômes.' });
  }
});

app.post('/api/candidate/diplomas', upload.single('file'), async (req, res) => {
  try {
    const { userId, title, institution, year, level } = req.body;
    if (!req.file || !userId || !title) {
      return res.status(400).json({ message: 'Fichier PDF, intitulé du diplôme et identifiant obligatoires.' });
    }
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO candidate_diplomas(user_id, title, institution, year, level, file_name, file_url)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userId,
        title.trim(),
        institution ? institution.trim() : 'Établissement académique',
        parseInt(year, 10) || new Date().getFullYear(),
        level || 'Licence / Master',
        req.file.originalname,
        fileUrl
      ]
    );

    // Recalculer le taux de complétion
    const userRes = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
    const profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    const allDiplomas = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1', [userId]);
    const completion = calculateProfileCompletion(userRes.rows[0], profRes.rows[0] || {}, allDiplomas.rows);
    await pool.query('UPDATE candidate_profiles SET completion_percentage=$1 WHERE user_id=$2', [completion, userId]);

    res.status(201).json({
      message: 'Diplôme / Certification enregistré avec succès !',
      diploma: result.rows[0],
      completionPercentage: completion
    });
  } catch (err) {
    console.error('Erreur enregistrement diplôme:', err);
    res.status(500).json({ message: 'Erreur lors de l enregistrement du diplôme.' });
  }
});

app.post('/api/candidate/upload-multiple-diplomas', upload.array('files', 10), async (req, res) => {
  try {
    const { userId, defaultLevel, defaultInstitution } = req.body;
    if (!req.files || req.files.length === 0 || !userId) {
      return res.status(400).json({ message: 'Aucun fichier sélectionné ou identifiant manquant.' });
    }

    const inserted = [];
    for (const file of req.files) {
      const fileUrl = `http://localhost:5000/uploads/${file.filename}`;
      // Formater le nom du fichier pour en faire un titre propre
      const rawTitle = file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

      const r = await pool.query(
        `INSERT INTO candidate_diplomas(user_id, title, institution, year, level, file_name, file_url)
         VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          userId,
          cleanTitle,
          defaultInstitution || 'Université / Institut',
          new Date().getFullYear(),
          defaultLevel || 'Diplôme / Certification',
          file.originalname,
          fileUrl
        ]
      );
      inserted.push(r.rows[0]);
    }

    // Recalculer le taux de complétion
    const userRes = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
    const profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    const allDiplomas = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1', [userId]);
    const completion = calculateProfileCompletion(userRes.rows[0], profRes.rows[0] || {}, allDiplomas.rows);
    await pool.query('UPDATE candidate_profiles SET completion_percentage=$1 WHERE user_id=$2', [completion, userId]);

    res.status(201).json({
      message: `${inserted.length} document(s) de diplôme / certification téléversé(s) avec succès !`,
      diplomas: inserted,
      completionPercentage: completion
    });
  } catch (err) {
    console.error('Erreur upload multiple diplômes:', err);
    res.status(500).json({ message: 'Erreur lors du téléversement multiple des diplômes.' });
  }
});

app.delete('/api/candidate/diplomas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    await pool.query('DELETE FROM candidate_diplomas WHERE id=$1', [id]);

    let completion = 85;
    if (userId) {
      const userRes = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
      const profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
      const allDiplomas = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1', [userId]);
      completion = calculateProfileCompletion(userRes.rows[0], profRes.rows[0] || {}, allDiplomas.rows);
      await pool.query('UPDATE candidate_profiles SET completion_percentage=$1 WHERE user_id=$2', [completion, userId]);
    }

    res.json({ message: 'Diplôme supprimé avec succès !', completionPercentage: completion });
  } catch (err) {
    console.error('Erreur suppression diplôme:', err);
    res.status(500).json({ message: 'Erreur suppression diplôme.' });
  }
});

app.post('/api/candidate/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file || !userId) return res.status(400).json({ message: 'Fichier ou userId manquant.' });
    const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const result = await pool.query('UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id,nom,prenom,email,role,avatar_url,region,ville,phone,address', [avatarUrl, userId]);
    const user = result.rows[0];

    const profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    const profile = profRes.rows[0] || {};
    const allDiplomas = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1', [userId]);
    const completion = calculateProfileCompletion(user, profile, allDiplomas.rows);

    await pool.query('UPDATE candidate_profiles SET completion_percentage=$1 WHERE user_id=$2', [completion, userId]);

    res.json({
      message: 'Photo de profil mise à jour !',
      avatarUrl,
      user,
      completionPercentage: completion
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur upload avatar.' });
  }
});

// ==========================================
// 3. TABLEAU DE BORD CANDIDAT & MATCHING INTELLIGENT (DIPLÔMES & COMPÉTENCES)
// ==========================================

function getJobTheme(title) {
  const l = (title || '').toLowerCase();
  if (l.includes('développeur') || l.includes('web') || l.includes('informatique')) return { icon: 'fa-code', color: '#e0e7ff', iconColor: '#3b82f6' };
  if (l.includes('rh') || l.includes('ressources humaines')) return { icon: 'fa-user-group', color: '#dcfce7', iconColor: '#16a34a' };
  if (l.includes('projet') || l.includes('chargé')) return { icon: 'fa-briefcase', color: '#f3e8ff', iconColor: '#9333ea' };
  if (l.includes('données') || l.includes('data')) return { icon: 'fa-chart-line', color: '#fef3c7', iconColor: '#d97706' };
  if (l.includes('communication')) return { icon: 'fa-bullhorn', color: '#e0f2fe', iconColor: '#0284c7' };
  return { icon: 'fa-briefcase', color: '#f1f5f9', iconColor: '#475569' };
}

app.get('/api/candidate/dashboard-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRes = await pool.query('SELECT id,nom,prenom,email,role,avatar_url,region,ville,phone,address FROM users WHERE id=$1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    const user = userRes.rows[0];

    let profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    let profile;
    if (profRes.rows.length === 0) {
      profile = (await pool.query(
        `INSERT INTO candidate_profiles(user_id,title,skills,experience_years,education_level,completion_percentage)
         VALUES($1,'Candidat Polyvalent',ARRAY['Communication','Gestion de projet'],2,'Licence / Master',85) RETURNING *`,
        [userId]
      )).rows[0];
    } else { profile = profRes.rows[0]; }

    // Récupérer les diplômes réels vérifiés du candidat
    const candidateDiplomasRes = await pool.query('SELECT * FROM candidate_diplomas WHERE user_id=$1 ORDER BY year DESC', [userId]);
    const candidateDiplomas = candidateDiplomasRes.rows;

    const jobs = (await pool.query("SELECT * FROM jobs WHERE status='actif' ORDER BY created_at DESC")).rows;
    const candidateSkills = (profile.skills || ['Communication']).map(s => s.toLowerCase().trim());
    const expYears = profile.experience_years || 1;
    let totalScoreSum = 0;

    const recommendedJobs = jobs.map(job => {
      const jobTitle = (job.title || '').toLowerCase();
      const jobDept = (job.department || '').toLowerCase();
      const jobSkills = job.skills_required || [];

      // 1. Ratio compétences requises
      let skillMatches = 0;
      jobSkills.forEach(js => {
        if (candidateSkills.some(cs => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs))) skillMatches++;
      });
      const skillRatio = jobSkills.length > 0 ? skillMatches / jobSkills.length : 0.6;

      // 2. Bonus réel basé sur les diplômes et certifications téléversés
      let diplomaMatchBonus = 0;
      let matchingDiplomaTitle = null;

      candidateDiplomas.forEach(dip => {
        const dipTitle = (dip.title || '').toLowerCase();
        if (
          (jobTitle.includes('développeur') || jobTitle.includes('informatique') || jobDept.includes('informatique')) &&
          (dipTitle.includes('informatique') || dipTitle.includes('logiciel') || dipTitle.includes('système') || dipTitle.includes('web') || dipTitle.includes('réseau') || dipTitle.includes('génie'))
        ) {
          diplomaMatchBonus = Math.max(diplomaMatchBonus, 28);
          matchingDiplomaTitle = dip.title;
        } else if (
          (jobTitle.includes('rh') || jobTitle.includes('ressources humaines') || jobDept.includes('rh')) &&
          (dipTitle.includes('ressources humaines') || dipTitle.includes('management') || dipTitle.includes('droit') || dipTitle.includes('administration'))
        ) {
          diplomaMatchBonus = Math.max(diplomaMatchBonus, 28);
          matchingDiplomaTitle = dip.title;
        } else if (
          (jobTitle.includes('comptab') || jobTitle.includes('financ') || jobDept.includes('financ')) &&
          (dipTitle.includes('comptab') || dipTitle.includes('financ') || dipTitle.includes('gestion') || dipTitle.includes('économie'))
        ) {
          diplomaMatchBonus = Math.max(diplomaMatchBonus, 28);
          matchingDiplomaTitle = dip.title;
        } else if (
          (jobTitle.includes('civil') || jobTitle.includes('travaux') || jobTitle.includes('urbanisme')) &&
          (dipTitle.includes('génie civil') || dipTitle.includes('bâtiment') || dipTitle.includes('urbanisme') || dipTitle.includes('topographie'))
        ) {
          diplomaMatchBonus = Math.max(diplomaMatchBonus, 28);
          matchingDiplomaTitle = dip.title;
        } else if (
          (jobTitle.includes('communication') || jobDept.includes('communication')) &&
          (dipTitle.includes('communication') || dipTitle.includes('journalisme') || dipTitle.includes('marketing') || dipTitle.includes('lettres'))
        ) {
          diplomaMatchBonus = Math.max(diplomaMatchBonus, 28);
          matchingDiplomaTitle = dip.title;
        }
      });

      // Calcul du score global : base 38% + compétences (jusqu'à 32%) + diplôme vérifié (jusqu'à 28%) + expérience (jusqu'à 8%)
      let matchScore = Math.round(38 + (skillRatio * 30) + diplomaMatchBonus + Math.min(expYears * 2, 8));
      if (matchScore > 98) matchScore = 98;
      if (matchScore < 45) matchScore = 45;

      totalScoreSum += matchScore;
      const theme = getJobTheme(job.title);
      return {
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location || 'Mairie de Soa',
        type: job.type || 'CDI',
        salary_range: job.salary_range,
        matchPercentage: matchScore,
        match: `${matchScore}%`,
        matchingDiploma: matchingDiplomaTitle,
        skills_required: jobSkills,
        description: job.description,
        missions: job.missions,
        requirements: job.requirements,
        deadline: job.deadline,
        icon: theme.icon,
        color: theme.color,
        iconColor: theme.iconColor
      };
    });

    recommendedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const overallCompatibility = recommendedJobs.length > 0 ? Math.round(totalScoreSum / recommendedJobs.length) : 80;
    const completion = calculateProfileCompletion(user, profile, candidateDiplomas);

    const userAppsRes = await pool.query(
      `SELECT a.*,COALESCE(j.title,'Stage') as job_title,COALESCE(j.department,'Service RH') as department
       FROM applications a LEFT JOIN jobs j ON a.job_id=j.id WHERE a.user_id=$1 ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json({
      user,
      profile: { ...profile, completion_percentage: completion },
      completionPercentage: completion,
      diplomas: candidateDiplomas,
      compatibilityScore: overallCompatibility,
      recommendedJobs,
      myApplications: userAppsRes.rows
    });
  } catch (err) {
    console.error('Erreur dashboard:', err);
    res.status(500).json({ message: 'Erreur.' });
  }
});

app.put('/api/candidate/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { nom, prenom, title, bio, skills, experience_years, education_level, phone, address, region, ville, portfolio_url, linkedin_url, github_url } = req.body;
  try {
    // 1. Mettre à jour les informations d'identité dans users si fournies
    let userRes = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    await pool.query(
      `UPDATE users SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        phone = COALESCE($3, phone),
        region = COALESCE($4, region),
        ville = COALESCE($5, ville),
        address = COALESCE($6, address)
       WHERE id = $7`,
      [nom || null, prenom || null, phone || null, region || null, ville || null, address || null, userId]
    );
    userRes = await pool.query('SELECT id,nom,prenom,email,role,avatar_url,region,ville,phone,address FROM users WHERE id=$1', [userId]);
    const user = userRes.rows[0];

    // Parser skills en tableau
    const skillsArray = Array.isArray(skills)
      ? skills
      : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

    // Calculer le taux de complétion réel
    const tempProfile = {
      title, bio, skills: skillsArray, experience_years, education_level,
      phone: phone || user.phone, address: address || user.address,
      region: region || user.region, ville: ville || user.ville,
      portfolio_url, linkedin_url, github_url
    };
    const completion = calculateProfileCompletion(user, tempProfile);

    // 2. Mettre à jour candidate_profiles avec toutes les colonnes
    const p = await pool.query(
      `INSERT INTO candidate_profiles(user_id,title,bio,skills,experience_years,education_level,phone,address,region,ville,portfolio_url,linkedin_url,github_url,completion_percentage,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
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
      [
        userId,
        title || 'Candidat Polyvalent',
        bio || '',
        skillsArray,
        parseInt(experience_years, 10) || 0,
        education_level || 'Licence / Master',
        phone || user.phone || '',
        address || user.address || '',
        region || user.region || 'Centre (Soa / Yaoundé)',
        ville || user.ville || 'Soa',
        portfolio_url || '',
        linkedin_url || '',
        github_url || '',
        completion
      ]
    );

    res.json({
      message: 'Profil enregistré avec succès !',
      user,
      profile: p.rows[0],
      completionPercentage: completion
    });
  } catch (err) {
    console.error('Erreur mise à jour profil:', err);
    res.status(500).json({ message: 'Erreur mise à jour profil.' });
  }
});

app.post('/api/candidate/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file || !userId) return res.status(400).json({ message: 'Fichier ou userId manquant.' });
    const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const result = await pool.query('UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id,nom,prenom,email,role,avatar_url,region,ville,phone', [avatarUrl, userId]);
    const user = result.rows[0];

    const profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    const profile = profRes.rows[0] || {};
    const completion = calculateProfileCompletion(user, profile);

    await pool.query('UPDATE candidate_profiles SET completion_percentage=$1 WHERE user_id=$2', [completion, userId]);

    res.json({
      message: 'Photo de profil mise à jour !',
      avatarUrl,
      user,
      completionPercentage: completion
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur upload avatar.' });
  }
});

app.post('/api/candidate/upload-document', upload.single('file'), async (req, res) => {
  try {
    const { userId, docType, applicationId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier.' });
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const effectiveType = docType || 'Autre';
    const docRes = await pool.query(
      `INSERT INTO documents(user_id,application_id,doc_type,document_type,file_name,file_url,mime_type)
       VALUES($1,$2,$3,$3,$4,$5,$6) RETURNING *`,
      [userId, applicationId || null, effectiveType, req.file.originalname, fileUrl, req.file.mimetype]
    );
    res.json({ message: 'Document téléversé !', document: docRes.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur upload document.' }); }
});


// ==========================================
// 3. TABLEAU DE BORD CANDIDAT & MATCHING
// ==========================================

function getJobTheme(title) {
  const l = (title || '').toLowerCase();
  if (l.includes('développeur') || l.includes('web') || l.includes('informatique')) return { icon: 'fa-code', color: '#e0e7ff', iconColor: '#3b82f6' };
  if (l.includes('rh') || l.includes('ressources humaines')) return { icon: 'fa-user-group', color: '#dcfce7', iconColor: '#16a34a' };
  if (l.includes('projet') || l.includes('chargé')) return { icon: 'fa-briefcase', color: '#f3e8ff', iconColor: '#9333ea' };
  if (l.includes('données') || l.includes('data')) return { icon: 'fa-chart-line', color: '#fef3c7', iconColor: '#d97706' };
  if (l.includes('communication')) return { icon: 'fa-bullhorn', color: '#e0f2fe', iconColor: '#0284c7' };
  return { icon: 'fa-briefcase', color: '#f1f5f9', iconColor: '#475569' };
}

app.get('/api/candidate/dashboard-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRes = await pool.query('SELECT id,nom,prenom,email,role,avatar_url,region,ville FROM users WHERE id=$1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    const user = userRes.rows[0];

    let profRes = await pool.query('SELECT * FROM candidate_profiles WHERE user_id=$1', [userId]);
    let profile;
    if (profRes.rows.length === 0) {
      profile = (await pool.query(
        `INSERT INTO candidate_profiles(user_id,title,skills,experience_years,education_level,completion_percentage)
         VALUES($1,'Candidat Polyvalent',ARRAY['JavaScript','React','HTML/CSS','Communication'],2,'Licence / Master',85) RETURNING *`,
        [userId]
      )).rows[0];
    } else { profile = profRes.rows[0]; }

    const jobs = (await pool.query("SELECT * FROM jobs WHERE status='actif' ORDER BY created_at DESC")).rows;
    const candidateSkills = (profile.skills || ['Communication']).map(s => s.toLowerCase().trim());
    const expYears = profile.experience_years || 1;
    let totalScoreSum = 0;

    const recommendedJobs = jobs.map(job => {
      const jobSkills = job.skills_required || [];
      let matches = 0;
      jobSkills.forEach(js => { if (candidateSkills.some(cs => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs))) matches++; });
      const skillRatio = jobSkills.length > 0 ? matches / jobSkills.length : 0.7;
      let matchScore = Math.round(50 + skillRatio * 38 + Math.min(expYears * 2.5, 10));
      if (matchScore > 98) matchScore = 98;
      totalScoreSum += matchScore;
      const theme = getJobTheme(job.title);
      return { id: job.id, title: job.title, department: job.department, location: job.location || 'Mairie de Soa', type: job.type || 'CDI', salary_range: job.salary_range, matchPercentage: matchScore, match: `${matchScore}%`, skills_required: jobSkills, description: job.description, missions: job.missions, requirements: job.requirements, deadline: job.deadline, icon: theme.icon, color: theme.color, iconColor: theme.iconColor };
    });
    recommendedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const overallCompatibility = recommendedJobs.length > 0 ? Math.round(totalScoreSum / recommendedJobs.length) : 80;
    const completion = calculateProfileCompletion(user, profile);

    const userAppsRes = await pool.query(
      `SELECT a.*,COALESCE(j.title,'Stage') as job_title,COALESCE(j.department,'Service RH') as department
       FROM applications a LEFT JOIN jobs j ON a.job_id=j.id WHERE a.user_id=$1 ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json({ user, profile: { ...profile, completion_percentage: completion }, completionPercentage: completion, compatibilityScore: overallCompatibility, recommendedJobs, myApplications: userAppsRes.rows });
  } catch (err) { console.error('Erreur dashboard:', err); res.status(500).json({ message: 'Erreur.' }); }
});

// ==========================================
// 4. OFFRES D'EMPLOI (CRUD)
// ==========================================

app.get('/api/jobs', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM jobs WHERE status='actif' ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur chargement offres.' }); }
});

app.get('/api/jobs/all', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

app.post('/api/jobs', async (req, res) => {
  const { title, department, location, type, skills_required, description, salary_range, deadline, missions, requirements } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO jobs(title,department,location,type,skills_required,description,salary_range,deadline,missions,requirements)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, department, location || 'Mairie de Soa • Yaoundé, Cameroun', type || 'CDI',
       skills_required || [], description, salary_range || 'Selon grille', deadline || null, missions || null, requirements || null]
    );
    res.status(201).json({ message: 'Offre publiée !', job: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur création offre.' }); }
});

app.put('/api/jobs/:id', async (req, res) => {
  const { title, department, location, type, skills_required, description, salary_range, status, deadline, missions, requirements } = req.body;
  try {
    const r = await pool.query(
      `UPDATE jobs SET title=$1,department=$2,location=$3,type=$4,skills_required=$5,description=$6,salary_range=$7,status=$8,deadline=$9,missions=$10,requirements=$11 WHERE id=$12 RETURNING *`,
      [title, department, location, type, skills_required, description, salary_range, status || 'actif', deadline, missions, requirements, req.params.id]
    );
    res.json({ message: 'Offre mise à jour !', job: r.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Offre supprimée.' });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

// ==========================================
// 5. SOUMISSION DOSSIER COMPLET (MULTI-PDF)
// ==========================================

app.post('/api/applications/submit-dossier', dossierUpload.fields(allDocFields), async (req, res) => {
  try {
    const { userId, jobId, applicationType, stageType, coverLetter } = req.body;
    const files = req.files || {};

    if (!userId || !applicationType) return res.status(400).json({ message: 'Données manquantes.' });

    let requiredDocs, appType;
    if (applicationType === 'emploi') { requiredDocs = DOCS_EMPLOI; appType = 'emploi'; }
    else if (applicationType === 'stage' && stageType === 'academique') { requiredDocs = DOCS_STAGE_ACADEMIQUE; appType = 'stage_academique'; }
    else if (applicationType === 'stage' && stageType === 'professionnel') { requiredDocs = DOCS_STAGE_PRO; appType = 'stage_professionnel'; }
    else if (applicationType === 'stage' && stageType === 'vacances') { requiredDocs = DOCS_STAGE_PRO; appType = 'stage_vacances'; }
    else return res.status(400).json({ message: 'Type de demande invalide.' });

    const missing = requiredDocs.filter(k => !files[k] || files[k].length === 0);
    if (missing.length > 0) return res.status(400).json({ message: `Documents manquants : ${missing.map(k => k.replace(/_/g, ' ')).join(', ')}. Tous doivent être en PDF.` });

    let effectiveJobId = (applicationType === 'emploi' && jobId) ? jobId : null;

    if (effectiveJobId) {
      const ex = await pool.query('SELECT id FROM applications WHERE user_id=$1 AND job_id=$2', [userId, effectiveJobId]);
      if (ex.rows.length > 0) return res.status(400).json({ message: 'Vous avez déjà postulé à cette offre.' });
    }

    const appQuery = effectiveJobId
      ? `INSERT INTO applications(user_id,job_id,application_type,compatibility_score,status,cover_letter) VALUES($1,$2,$3,75,'soumis',$4) RETURNING *`
      : `INSERT INTO applications(user_id,application_type,compatibility_score,status,cover_letter) VALUES($1,$2,0,'soumis',$3) RETURNING *`;
    const appParams = effectiveJobId ? [userId, effectiveJobId, appType, coverLetter || ''] : [userId, appType, coverLetter || ''];

    const appRes = await pool.query(appQuery, appParams);
    const application = appRes.rows[0];

    for (const docKey of requiredDocs) {
      const f = (files[docKey] || [])[0];
      if (f) {
        await pool.query(
          `INSERT INTO documents(user_id,application_id,doc_type,document_type,file_name,file_url,mime_type,status) VALUES($1,$2,$3,$3,$4,$5,$6,'valide')`,
          [userId, application.id, docKey, f.originalname, `/uploads/${f.filename}`, f.mimetype]
        );
      }
    }

    const u = (await pool.query('SELECT email,nom,prenom FROM users WHERE id=$1', [userId])).rows[0];
    if (u) {
      const typeLabel = appType === 'emploi' ? 'demande d\'emploi' : (appType === 'stage_academique' ? 'demande de stage académique' : (appType === 'stage_vacances' ? 'demande de stage de vacances' : 'demande de stage professionnel'));
      try {
        await transporter.sendMail({
          from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
          to: u.email,
          subject: ' Dossier reçu — Mairie de Soa',
          html: `<p>Bonjour <b>${u.prenom} ${u.nom}</b>,</p><p>Votre <b>${typeLabel}</b> a bien été soumise. Réf : <b>#HB-${application.id}-${new Date().getFullYear()}</b>.</p><p>Vous recevrez une décharge officielle dès validation par le Service RH.</p>`
        });
      } catch (e) { console.error('Email confirmation:', e.message); }

      // Notification automatique pour l'équipe RH
      try {
        const candName = `${u.prenom} ${u.nom}`;
        await notifyHrAdmins(
          ` Nouveau Dossier de Candidature Transmis !`,
          `Dossier complet (${typeLabel}) transmis par ${candName}. Réf : #HB-${application.id}-${new Date().getFullYear()}.`,
          'candidature',
          'applications',
          'fa-solid fa-folder-plus'
        );
      } catch (hrNotifErr) { console.error('Erreur notifyHrAdmins submit-dossier:', hrNotifErr.message); }
    }

    res.status(201).json({
      message: 'Dossier soumis avec succès ! Le Service RH accusera réception sous peu.',
      application,
      dossierRef: `#HB-${application.id}-${new Date().getFullYear()}`
    });
  } catch (err) {
    console.error('Erreur soumission dossier:', err);
    if (err.message && err.message.includes('PDF')) return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Erreur soumission dossier.' });
  }
});

// ==========================================
// 6. ACCUSÉ DE RÉCEPTION, DÉCHARGE OFFICIELLE & EXAMEN APPROFONDI DU DOSSIER
// ==========================================

// Récupérer le dossier complet de candidature (Poste, profil candidat, pièces téléversées, diplômes)
app.get('/api/applications/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const appQ = await pool.query(`
      SELECT 
        a.id, a.user_id, a.job_id, a.application_type, a.compatibility_score, a.status,
        a.cover_letter, a.created_at, a.acknowledged_at, a.discharge_sent, a.discharge_content,
        COALESCE(j.title, CASE 
          WHEN a.application_type = 'stage_academique' THEN 'Stage Académique'
          WHEN a.application_type = 'stage_professionnel' THEN 'Stage Professionnel'
          WHEN a.application_type = 'stage_vacances' THEN 'Stage de Vacances'
          ELSE 'Candidature Municipale'
        END) as job_title,
        COALESCE(j.department, 'Direction des Ressources Humaines') as department,
        COALESCE(j.type, 'CDI') as job_type,
        COALESCE(j.location, 'Mairie de Soa • Yaoundé, Cameroun') as job_location,
        COALESCE(j.salary_range, 'Selon grille municipale') as salary_range,
        j.skills_required as job_skills_required,
        j.description as job_description,
        u.nom, u.prenom, u.email, u.phone, u.avatar_url, u.region, u.ville, u.address,
        cp.title as candidate_title, cp.bio as candidate_bio, cp.skills as candidate_skills,
        cp.experience_years, cp.education_level, cp.portfolio_url, cp.linkedin_url, cp.github_url,
        cp.completion_percentage
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `, [id]);

    if (appQ.rows.length === 0) {
      return res.status(404).json({ message: 'Candidature non trouvée.' });
    }
    const appData = appQ.rows[0];

    // Récupérer les pièces justificatives téléversées
    const docsQ = await pool.query(`
      SELECT * FROM documents 
      WHERE application_id = $1 OR (user_id = $2 AND application_id IS NULL)
      ORDER BY uploaded_at DESC
    `, [id, appData.user_id]);

    // Récupérer les diplômes enregistrés par le candidat
    const dipsQ = await pool.query(`
      SELECT * FROM candidate_diplomas 
      WHERE user_id = $1 
      ORDER BY year DESC, created_at DESC
    `, [appData.user_id]);

    res.json({
      application: appData,
      documents: docsQ.rows,
      diplomas: dipsQ.rows
    });
  } catch (err) {
    console.error('Erreur GET /api/applications/:id/details:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des détails du dossier.' });
  }
});

// Récupérer tous les documents et pièces justificatives reçus des candidats (Stockage Interne RH & GED Municipale)
app.get('/api/documents/admin/all', async (req, res) => {
  try {
    const docsQuery = await pool.query(`
      SELECT 
        d.id,
        d.user_id,
        d.application_id,
        COALESCE(d.document_type, d.doc_type, 'Pièce Justificative') as doc_type,
        d.file_name,
        d.file_url,
        COALESCE(d.mime_type, 'application/pdf') as mime_type,
        d.uploaded_at,
        u.nom as candidate_nom,
        u.prenom as candidate_prenom,
        u.email as candidate_email,
        u.phone as candidate_phone,
        u.avatar_url as candidate_avatar,
        COALESCE(j.title, a.application_type, 'Candidature Municipale') as job_title,
        COALESCE(j.department, 'Services Municipaux de Soa') as department,
        COALESCE(a.status, 'en_examen') as application_status
      FROM documents d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN applications a ON d.application_id = a.id
      LEFT JOIN jobs j ON a.job_id = j.id
      ORDER BY d.uploaded_at DESC;
    `);

    // Récupérer également les diplômes uploadés
    const dipsQuery = await pool.query(`
      SELECT 
        cd.id,
        cd.user_id,
        NULL as application_id,
        'DIPLÔME / CERTIFICATION' as doc_type,
        cd.title as file_name,
        cd.file_url,
        'application/pdf' as mime_type,
        cd.created_at as uploaded_at,
        u.nom as candidate_nom,
        u.prenom as candidate_prenom,
        u.email as candidate_email,
        u.phone as candidate_phone,
        u.avatar_url as candidate_avatar,
        cd.institution as job_title,
        cd.level as department,
        'authentifié' as application_status
      FROM candidate_diplomas cd
      JOIN users u ON cd.user_id = u.id
      WHERE cd.file_url IS NOT NULL AND cd.file_url != ''
      ORDER BY cd.created_at DESC;
    `);

    const allDocs = [...docsQuery.rows, ...dipsQuery.rows];
    allDocs.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));

    res.json({
      total: allDocs.length,
      documents: allDocs
    });
  } catch (err) {
    console.error('Erreur GET /api/documents/admin/all:', err);
    res.status(500).json({ message: 'Erreur lors du chargement des documents du stockage interne.' });
  }
});

// Validation du dossier et émission de la décharge officielle + message automatique + email + notifications
const handleValidateAndDischarge = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote, status, rhId } = req.body;

    const appRes = await pool.query(`
      SELECT a.*, u.nom, u.prenom, u.email, u.phone,
             COALESCE(j.title, CASE 
               WHEN a.application_type = 'stage_academique' THEN 'Stage Académique'
               WHEN a.application_type = 'stage_professionnel' THEN 'Stage Professionnel'
               WHEN a.application_type = 'stage_vacances' THEN 'Stage de Vacances'
               ELSE 'Candidature Municipale'
             END) as job_title,
             COALESCE(j.department, 'Direction des Ressources Humaines') as department
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `, [id]);

    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Candidature introuvable.' });
    const d = appRes.rows[0];

    // Trouver l'ID RH expéditeur
    let adminRhId = rhId ? parseInt(rhId, 10) : null;
    if (!adminRhId) {
      const defRh = await pool.query("SELECT id FROM users WHERE role IN ('admin_rh', 'super_admin') ORDER BY id ASC LIMIT 1");
      if (defRh.rows.length > 0) adminRhId = defRh.rows[0].id;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const ref = `HB-SOA-${d.id}-${now.getFullYear()}`;
    const newStatus = status || 'en_examen';

    // Design institutionnel haut de gamme de la décharge
    const dischargeHTML = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 2px solid #074696; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #074696 0%, #0b3269 50%, #1b8a53 100%); color: #ffffff; padding: 26px 30px; text-align: center;">
          <div style="font-size: 0.78rem; font-weight: 800; letter-spacing: 1.5px; opacity: 0.95;">RÉPUBLIQUE DU CAMEROUN • RÉGION DU CENTRE</div>
          <h1 style="margin: 6px 0 0 0; font-size: 1.5rem; letter-spacing: 0.5px;">COMMUNE DE SOA</h1>
          <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px;">Direction des Ressources Humaines • Bureau des Recrutements &amp; Stages</div>
        </div>

        <div style="padding: 28px 32px; color: #1e293b; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #f0fdf4; border: 2px solid #16a34a; border-radius: 30px; padding: 8px 24px;">
              <span style="color: #15803d; font-weight: 900; font-size: 1.05rem; letter-spacing: 0.5px;">
                DÉCHARGE OFFICIELLE DE RÉCEPTION DE DOSSIER
              </span>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #64748b; font-weight: 700;">
              Réf. Dossier : <span style="color: #074696; font-family: monospace; font-size: 0.95rem;">${ref}</span>
            </div>
          </div>

          <p style="font-size: 0.95rem; margin-top: 0;">
            Le Service des Ressources Humaines de la <strong>Mairie de Soa</strong> certifie par la présente avoir bien reçu et instruit le dossier complet de candidature de :
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem;">
            <tr>
              <td style="padding: 10px 16px; color: #64748b; font-weight: 700; width: 35%; border-bottom: 1px solid #e2e8f0;">Candidat(e) :</td>
              <td style="padding: 10px 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${d.prenom} ${d.nom}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Objet / Poste Visé :</td>
              <td style="padding: 10px 16px; font-weight: 800; color: #074696; border-bottom: 1px solid #e2e8f0;">${d.job_title}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Département :</td>
              <td style="padding: 10px 16px; color: #334155; border-bottom: 1px solid #e2e8f0;">${d.department}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">Date de dépôt en ligne :</td>
              <td style="padding: 10px 16px; color: #334155; border-bottom: 1px solid #e2e8f0;">${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #64748b; font-weight: 700;">Date de validation &amp; émission :</td>
              <td style="padding: 10px 16px; font-weight: 800; color: #16a34a;">${dateStr}</td>
            </tr>
          </table>

          <div style="background: #f0fdf4; border-left: 5px solid #16a34a; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 0.9rem; color: #166534;">
            <strong>Statut du dossier :</strong> Votre dossier a été déclaré <strong>COMPLET et RECEVABLE</strong>. Il est actuellement en cours d'examen par la commission de recrutement. Vous serez convoqué(e) aux étapes suivantes (entretien vidéo ou présentiel) par courrier électronique et via la plateforme.
          </div>

          ${adminNote ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 0.85rem; color: #1e40af;">
              <strong>Note de la Direction RH :</strong> ${adminNote}
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1.5px solid #e2e8f0;">
            <div style="text-align: center; width: 45%;">
              <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block;">Le Candidat</span>
              <div style="margin-top: 24px; font-size: 0.85rem; font-weight: 800; color: #0f172a; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                ${d.prenom} ${d.nom}
              </div>
            </div>
            <div style="text-align: center; width: 45%;">
              <span style="font-size: 0.8rem; color: #64748b; font-weight: 700; display: block;">Le Service des Ressources Humaines</span>
              <div style="margin-top: 24px; font-size: 0.85rem; font-weight: 800; color: #074696; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                Cachet Numérique Mairie de Soa
              </div>
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 0.74rem; color: #64748b;">
          Document officiel généré par HireBridge Soa • Fait foi d'accusé de réception légal • ${dateStr}
        </div>
      </div>
    `;

    // 1. Mettre à jour la base de données
    await pool.query(`
      UPDATE applications 
      SET status = $1, acknowledged_at = NOW(), discharge_sent = true, discharge_content = $2 
      WHERE id = $3
    `, [newStatus, dischargeHTML, id]);

    // 2. Envoyer l'Email avec la Décharge officielle
    try {
      await transporter.sendMail({
        from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
        to: d.email,
        subject: ` Accusé de Réception & Décharge Officielle — ${d.job_title} (Réf. ${ref})`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 680px; margin: 0 auto;">
            <p>Bonjour <strong>${d.prenom} ${d.nom}</strong>,</p>
            <p>Nous vous confirmons la bonne réception de votre dossier de candidature pour le poste de <strong>${d.job_title}</strong>.</p>
            <p>Votre dossier est complet et en cours de traitement par la commission municipale. Vous trouverez ci-dessous votre décharge officielle :</p>
            ${dischargeHTML}
            <p style="margin-top: 20px; font-size: 0.85rem; color: #64748b;">
              Vous pouvez également consulter cette décharge à tout moment dans votre espace candidat sur <a href="http://localhost:3000/candidat/dashboard">HireBridge Soa</a>.
            </p>
          </div>
        `
      });
      console.log(`Décharge envoyée avec succès par email à ${d.email}`);
    } catch (mailErr) {
      console.warn('Erreur envoi email décharge:', mailErr.message);
    }

    // 3. Créer la notification in-app pour le candidat (signalant la réception par e-mail)
    try {
      await createNotification(
        d.user_id,
        'Décharge officielle reçue par e-mail',
        `Votre décharge officielle de candidature pour "${d.job_title}" (Réf. ${ref}) vous a été envoyée par e-mail. Vous pouvez également la consulter et la télécharger à tout moment dans votre espace candidat.`,
        'recrutement',
        'applications',
        'fa-solid fa-envelope-open-text'
      );
    } catch (notifErr) {
      console.error('Erreur notification décharge:', notifErr);
    }

    res.json({
      message: `Dossier validé ! La décharge officielle a été transmise par e-mail à ${d.email}.`,
      ref,
      status: newStatus,
      dischargeHTML
    });
  } catch (err) {
    console.error('Erreur validate-and-discharge:', err);
    res.status(500).json({ message: 'Erreur lors de la validation du dossier et émission de la décharge.' });
  }
};

app.post('/api/applications/:id/validate-and-discharge', handleValidateAndDischarge);
app.put('/api/applications/:id/acknowledge', handleValidateAndDischarge);

// Rejet d'une candidature / dossier avec fiche de motif explicite + email officiel + message RH + notification
const handleRejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReasonCategory, rejectionReasonDetails, allowResubmission, rhId } = req.body;

    if (!rejectionReasonDetails || !rejectionReasonDetails.trim()) {
      return res.status(400).json({ message: 'Les raisons explicites du rejet sont requises.' });
    }

    const appRes = await pool.query(`
      SELECT a.*, u.nom, u.prenom, u.email, u.phone,
             COALESCE(j.title, CASE 
               WHEN a.application_type = 'stage_academique' THEN 'Stage Académique'
               WHEN a.application_type = 'stage_professionnel' THEN 'Stage Professionnel'
               WHEN a.application_type = 'stage_vacances' THEN 'Stage de Vacances'
               ELSE 'Candidature Municipale'
             END) as job_title,
             COALESCE(j.department, 'Direction des Ressources Humaines') as department
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1
    `, [id]);

    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Candidature introuvable.' });
    const d = appRes.rows[0];

    // S'assurer que les colonnes de rejet existent
    await pool.query(`
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_category VARCHAR(255);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN DEFAULT false;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
    `).catch(() => {});

    // Trouver l'ID RH expéditeur
    let adminRhId = rhId ? parseInt(rhId, 10) : null;
    if (!adminRhId) {
      const defRh = await pool.query("SELECT id FROM users WHERE role IN ('admin_rh', 'super_admin') ORDER BY id ASC LIMIT 1");
      if (defRh.rows.length > 0) adminRhId = defRh.rows[0].id;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const ref = `HB-SOA-${d.id}-${now.getFullYear()}`;
    const categoryLabel = rejectionReasonCategory || 'Motif Administratif';
    const detailsText = rejectionReasonDetails.trim();
    const isResubmissionAllowed = Boolean(allowResubmission);

    // 1. Mettre à jour la candidature dans la base de données
    await pool.query(`
      UPDATE applications 
      SET status = 'rejete', 
          rejection_reason = $1, 
          rejection_category = $2, 
          allow_resubmission = $3, 
          rejected_at = NOW() 
      WHERE id = $4
    `, [detailsText, categoryLabel, isResubmissionAllowed, id]);

    // 2. Modèle HTML haut de gamme de la notification officielle de rejet
    const rejectionHTML = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 2px solid #dc2626; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 60%, #0f172a 100%); color: #ffffff; padding: 26px 30px; text-align: center;">
          <div style="font-size: 0.78rem; font-weight: 800; letter-spacing: 1.5px; opacity: 0.95;">RÉPUBLIQUE DU CAMEROUN • RÉGION DU CENTRE</div>
          <h1 style="margin: 6px 0 0 0; font-size: 1.5rem; letter-spacing: 0.5px;">COMMUNE DE SOA</h1>
          <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px;">Direction des Ressources Humaines • Bureau des Recrutements &amp; Stages</div>
        </div>

        <div style="padding: 28px 32px; color: #1e293b; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #fef2f2; border: 2px solid #dc2626; border-radius: 30px; padding: 8px 24px;">
              <span style="color: #991b1b; font-weight: 900; font-size: 1.05rem; letter-spacing: 0.5px;">
                NOTIFICATION OFFICIELLE DE DÉCISION RH
              </span>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #64748b; font-weight: 700;">
              Réf. Candidature : <span style="color: #074696; font-family: monospace; font-size: 0.95rem;">${ref}</span>
            </div>
          </div>

          <p style="font-size: 0.95rem; margin-top: 0;">
            Bonjour <strong>${d.prenom} ${d.nom}</strong>,
          </p>

          <p style="font-size: 0.95rem;">
            Le Service des Ressources Humaines de la <strong>Mairie de Soa</strong> vous informe que votre dossier de candidature déposé pour le poste / stage de <strong>« ${d.job_title} »</strong> a été examiné par la commission de sélection.
          </p>

          <div style="background: #fef2f2; border-left: 5px solid #dc2626; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 6px; color: #991b1b; font-size: 0.95rem; font-weight: 800;">
              Motif &amp; Raisons Officiels du Rejet :
            </h4>
            <div style="font-size: 0.88rem; color: #7f1d1d; font-weight: 700; margin-bottom: 6px;">
              • Catégorie : ${categoryLabel}
            </div>
            <div style="font-size: 0.9rem; color: #1e293b; white-space: pre-wrap; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #fca5a5;">
              ${detailsText}
            </div>
          </div>

          ${isResubmissionAllowed ? `
            <div style="background: #f0fdf4; border: 1.5px solid #16a34a; padding: 16px; border-radius: 10px; margin: 20px 0; font-size: 0.9rem; color: #15803d;">
              <strong>Possibilité de régularisation :</strong> La commission vous autorise à corriger votre dossier (mise à jour des pièces justificatives, diplômes ou CV) et à soumettre à nouveau votre candidature depuis votre espace candidat sur HireBridge Soa.
            </div>
          ` : `
            <p style="font-size: 0.9rem; color: #475569;">
              Nous vous remercions pour l'intérêt que vous portez à l'administration municipale de Soa et vous souhaitons pleine réussite dans la poursuite de votre parcours professionnel.
            </p>
          `}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1.5px solid #e2e8f0; text-align: center; font-size: 0.82rem; color: #64748b;">
            Direction des Ressources Humaines • Mairie de la Commune de Soa • ${dateStr}
          </div>
        </div>
      </div>
    `;

    // 3. Envoyer l'Email au candidat via Nodemailer
    try {
      await transporter.sendMail({
        from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
        to: d.email,
        subject: ` Notification concernant votre candidature : ${d.job_title} (Réf. ${ref})`,
        html: rejectionHTML
      });
      console.log(`Email de rejet de candidature envoyé avec succès à ${d.email}`);
    } catch (mailErr) {
      console.warn('Erreur envoi email rejet:', mailErr.message);
    }

    // 4. Envoyer le Message Automatique RH dans la messagerie interne
    try {
      const msgContent = `Bonjour ${d.prenom} ${d.nom},\n\n` +
        `Nous avons le regret de vous informer que votre candidature pour le poste / stage de "${d.job_title}" (Service : ${d.department}) n'a pas été retenue par la commission de sélection de la Mairie de Soa.\n\n` +
        `MOTIF ET EXPLICATIONS DU REJET :\n` +
        `• Catégorie : ${categoryLabel}\n` +
        `• Explications : ${detailsText}\n\n` +
        (isResubmissionAllowed 
          ? `Remarque : Vous êtes autorisé(e) à mettre à jour vos pièces justificatives et à régulariser votre dossier depuis votre espace candidat.\n\n`
          : `Nous vous remercions pour votre intérêt envers la Commune de Soa et vous souhaitons bon succès dans vos démarches.\n\n`) +
        `Cordialement,\nLe Service des Ressources Humaines • Mairie de la Commune de Soa`;

      await pool.query(`
        INSERT INTO messages (sender_id, receiver_id, content, subject, is_read, created_at)
        VALUES ($1, $2, $3, $4, false, NOW())
      `, [
        adminRhId,
        d.user_id,
        msgContent,
        `Notification RH : Décision concernant votre candidature (${d.job_title})`
      ]);
    } catch (msgErr) {
      console.error('Erreur insertion message rejet RH:', msgErr);
    }

    // 5. Créer les notifications in-app pour le candidat
    try {
      await createNotification(
        d.user_id,
        'Candidature Non Retenue',
        `Votre candidature pour "${d.job_title}" n'a pas été retenue par la commission RH. Raisons : ${categoryLabel}. Consultez vos messages pour plus de détails.`,
        'recrutement',
        'applications',
        'fa-solid fa-xmark'
      );
    } catch (notifErr) {
      console.error('Erreur notification rejet:', notifErr);
    }

    res.json({
      success: true,
      message: `La candidature de ${d.prenom} ${d.nom} a été rejetée. Un email officiel contenant les raisons explicites et un message interne ont été transmis au candidat.`,
      status: 'rejete'
    });
  } catch (err) {
    console.error('Erreur handleRejectApplication:', err);
    res.status(500).json({ message: 'Erreur lors du rejet de la candidature.' });
  }
};

app.post('/api/applications/:id/reject', handleRejectApplication);

// ==========================================
// 7. CANDIDATURES (CRUD + SUIVI)
// ==========================================

// Postuler à une offre avec support de téléversement de pièces PDF sur-mesure
const applyDocFields = [
  { name: 'cv', maxCount: 1 },
  { name: 'lettre_motivation', maxCount: 1 },
  { name: 'diplome', maxCount: 1 },
  { name: 'cni', maxCount: 1 },
  { name: 'autre_piece', maxCount: 1 }
];

app.post('/api/applications/apply', dossierUpload.fields(applyDocFields), async (req, res) => {
  const { userId, jobId, compatibilityScore, coverLetter } = req.body;
  const files = req.files || {};
  try {
    if (!userId || !jobId) {
      return res.status(400).json({ message: 'Identifiant d\'utilisateur ou d\'offre manquant.' });
    }
    const ex = await pool.query('SELECT id FROM applications WHERE user_id=$1 AND job_id=$2', [userId, jobId]);
    if (ex.rows.length > 0) return res.status(400).json({ message: 'Vous avez déjà postulé à cette offre.' });
    
    const r = await pool.query(
      `INSERT INTO applications(user_id,job_id,application_type,compatibility_score,status,cover_letter) VALUES($1,$2,'emploi',$3,'soumis',$4) RETURNING *`,
      [userId, jobId, compatibilityScore || 75, coverLetter || '']
    );
    const application = r.rows[0];

    // Enregistrer les pièces justificatives PDF spécifiques à cette offre
    const fieldMapping = {
      cv: 'CV Spécifique Offre (PDF)',
      lettre_motivation: 'Lettre de Motivation PDF',
      diplome: 'Diplôme / Certification PDF',
      cni: 'Copie CNI PDF',
      autre_piece: 'Pièce Complémentaire PDF'
    };

    for (const fieldName of Object.keys(fieldMapping)) {
      const f = (files[fieldName] || [])[0];
      if (f) {
        await pool.query(
          `INSERT INTO documents(user_id, application_id, doc_type, document_type, file_name, file_url, mime_type, status)
           VALUES($1, $2, $3, $4, $5, $6, $7, 'valide')`,
          [userId, application.id, fieldName, fieldMapping[fieldName], f.originalname, `/uploads/${f.filename}`, f.mimetype]
        );
      }
    }

    // Notification automatique pour l'équipe RH
    try {
      const candInfo = (await pool.query('SELECT nom, prenom FROM users WHERE id=$1', [userId])).rows[0];
      const jobInfo = (await pool.query('SELECT title FROM jobs WHERE id=$1', [jobId])).rows[0];
      const candName = candInfo ? `${candInfo.prenom} ${candInfo.nom}` : 'Un candidat';
      const jobTitle = jobInfo ? jobInfo.title : 'une offre d\'emploi';
      
      await notifyHrAdmins(
        ` Nouvelle Candidature Reçue !`,
        `${candName} vient de postuler pour l'offre « ${jobTitle} ». Dossier en attente d'examen.`,
        'candidature',
        'applications',
        'fa-solid fa-user-plus'
      );
    } catch (hrNotifErr) { console.error('Erreur notifyHrAdmins apply:', hrNotifErr.message); }

    res.status(201).json({ message: 'Candidature transmise avec succès !', application });
  } catch (err) {
    console.error('Erreur POST /api/applications/apply:', err);
    res.status(500).json({ message: 'Erreur lors de la transmission de la candidature.' });
  }
});

// GET candidatures d'un candidat (avec décharge)
app.get('/api/applications/candidate/:userId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.id,a.user_id,a.job_id,a.application_type,a.compatibility_score,a.status,a.cover_letter,
              a.created_at,a.acknowledged_at,a.discharge_sent,a.discharge_content,
              COALESCE(j.title,'Stage') as job_title,COALESCE(j.department,'Service RH') as department,
              COALESCE(j.type,'') as job_type,COALESCE(j.location,'Mairie de Soa') as location
       FROM applications a LEFT JOIN jobs j ON a.job_id=j.id
       WHERE a.user_id=$1 ORDER BY a.created_at DESC`,
      [req.params.userId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur chargement candidatures.' }); }
});

// GET toutes les candidatures (admin)
app.get('/api/applications/admin', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.id,a.user_id,a.job_id,a.application_type,a.compatibility_score,a.status,
              a.created_at,a.acknowledged_at,a.discharge_sent,
              u.nom,u.prenom,u.email,u.avatar_url,
              COALESCE(j.title,'Stage') as job_title,COALESCE(j.department,'Service RH') as department
       FROM applications a JOIN users u ON a.user_id=u.id LEFT JOIN jobs j ON a.job_id=j.id
       ORDER BY a.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur candidatures admin.' }); }
});

app.put('/api/applications/:id/status', async (req, res) => {
  try {
    const r = await pool.query('UPDATE applications SET status=$1 WHERE id=$2 RETURNING *', [req.body.status, req.params.id]);
    res.json({ message: 'Statut mis à jour.', application: r.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

// GET /api/admin/analytics (Global Dashboard RH Analytics)
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const [appsRes, jobsRes, candRes, trainRes] = await Promise.all([
      pool.query("SELECT a.compatibility_score, a.job_id, u.region, j.title FROM applications a JOIN users u ON a.user_id = u.id LEFT JOIN jobs j ON a.job_id = j.id"),
      pool.query("SELECT COUNT(*) FROM jobs"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'candidat'"),
      pool.query("SELECT COUNT(*) FROM training_applications")
    ]);

    const apps = appsRes.rows;
    const totalApps = apps.length;

    const geoMap = {};
    apps.forEach(a => {
      const reg = a.region || 'Soa / Centre';
      geoMap[reg] = (geoMap[reg] || 0) + 1;
    });

    const jobMap = {};
    apps.forEach(a => {
      const title = a.title || 'Demande de Stage Communal';
      jobMap[title] = (jobMap[title] || 0) + 1;
    });

    res.json({
      totalApplications: totalApps,
      totalJobs: parseInt(jobsRes.rows[0].count, 10),
      totalCandidates: parseInt(candRes.rows[0].count, 10),
      totalTrainings: parseInt(trainRes.rows[0].count, 10),
      geographicDistribution: Object.keys(geoMap).map(r => ({ region: r, count: geoMap[r] })),
      topAttractiveJobs: Object.keys(jobMap).map(t => ({ title: t, total_applications: jobMap[t] })).sort((a, b) => b.total_applications - a.total_applications).slice(0, 5)
    });
  } catch (err) {
    console.error('Erreur analytics:', err);
    res.status(500).json({ message: 'Erreur analytics RH.' });
  }
});

// GET /api/admin/audit-monthly (Rapport d'Audit Mensuel RH par Mois)
app.get('/api/admin/audit-monthly', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1 à 12

    const monthsList = [];
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Générer la liste dynamique des mois de Janvier jusqu'au mois actuel (ex: Août 2026)
    for (let m = 1; m <= currentMonth; m++) {
      const monthStr = String(m).padStart(2, '0');
      monthsList.push({
        year: currentYear,
        month: m,
        monthKey: `${currentYear}-${monthStr}`,
        monthLabel: `${monthNames[m - 1]} ${currentYear}`
      });
    }

    // Récupérer toutes les données de la base de données
    const [appsRes, trAppsRes, ticketsRes, usersRes, eventsRes] = await Promise.all([
      pool.query(`
        SELECT a.id, a.user_id, a.application_type, a.status, a.created_at,
               u.region, u.ville, COALESCE(j.title, 'Stage') as job_title
        FROM applications a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN jobs j ON a.job_id = j.id
      `),
      pool.query(`
        SELECT ta.id, ta.user_id, ta.status, ta.created_at, u.region, u.ville
        FROM training_applications ta
        JOIN users u ON ta.user_id = u.id
      `),
      pool.query(`
        SELECT st.id, st.category, st.status, st.priority, st.created_at, u.region, u.ville
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
      `),
      pool.query("SELECT id, region, ville, created_at FROM users WHERE role = 'candidat'"),
      pool.query("SELECT id, title, event_date FROM municipal_events")
    ]);

    const allApps = appsRes.rows;
    const allTrApps = trAppsRes.rows;
    const allTickets = ticketsRes.rows;
    const allCandidates = usersRes.rows;
    const allEvents = eventsRes.rows;

    const monthlyReports = monthsList.map(mObj => {
      const targetPrefix = mObj.monthKey;

      const mApps = allApps.filter(a => a.created_at && new Date(a.created_at).toISOString().startsWith(targetPrefix));
      const mTrApps = allTrApps.filter(t => t.created_at && new Date(t.created_at).toISOString().startsWith(targetPrefix));
      const mTickets = allTickets.filter(t => t.created_at && new Date(t.created_at).toISOString().startsWith(targetPrefix));
      const mCandidates = allCandidates.filter(u => u.created_at && new Date(u.created_at).toISOString().startsWith(targetPrefix));
      const mEvents = allEvents.filter(e => e.event_date && new Date(e.event_date).toISOString().startsWith(targetPrefix));

      const totalApplications = mApps.length;
      const stagesCount = mApps.filter(a => a.application_type === 'stage' || a.application_type === 'stage_academique' || a.application_type === 'stage_professionnel').length;
      const emploisCount = mApps.filter(a => a.application_type === 'emploi' || a.application_type === 'candidature').length;
      const totalTrainings = mTrApps.length;
      const totalTickets = mTickets.length;

      const statusCounts = {
        en_attente: mApps.filter(a => a.status === 'en_attente' || a.status === 'depose').length,
        entretien: mApps.filter(a => a.status === 'entretien' || a.status === 'convoque').length,
        accepte: mApps.filter(a => a.status === 'accepte' || a.status === 'valide').length,
        rejete: mApps.filter(a => a.status === 'rejete').length
      };

      const ticketCategoryMap = {};
      mTickets.forEach(t => {
        const cat = t.category || 'Information RH';
        ticketCategoryMap[cat] = (ticketCategoryMap[cat] || 0) + 1;
      });
      const ticketsByCategory = Object.keys(ticketCategoryMap).map(cat => ({
        category: cat,
        count: ticketCategoryMap[cat]
      }));

      const geoMap = {};
      const totalGeo = mApps.length || mCandidates.length || 1;
      const geoSource = mApps.length > 0 ? mApps : mCandidates;
      geoSource.forEach(item => {
        const reg = item.region || item.ville || 'Soa / Centre';
        geoMap[reg] = (geoMap[reg] || 0) + 1;
      });
      const geographicDistribution = Object.keys(geoMap).map(reg => ({
        region: reg,
        count: geoMap[reg],
        percentage: Math.round((geoMap[reg] / totalGeo) * 100)
      }));

      const jobMap = {};
      mApps.forEach(a => {
        const title = a.job_title || 'Demande de Stage Communal';
        jobMap[title] = (jobMap[title] || 0) + 1;
      });
      const topJobs = Object.keys(jobMap).map(title => ({
        title,
        count: jobMap[title]
      })).sort((a, b) => b.count - a.count).slice(0, 5);

      return {
        ...mObj,
        totalApplications,
        stagesCount,
        emploisCount,
        totalTrainings,
        totalTickets,
        statusCounts,
        ticketsByCategory,
        geographicDistribution,
        topJobs,
        eventsCount: mEvents.length
      };
    });

    res.json({
      current_month_key: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      reports: monthlyReports.reverse()
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/audit-monthly:', err);
    res.status(500).json({ message: 'Erreur génération du rapport d audit mensuel RH.' });
  }
});

// ==========================================
// 8. ENTRETIENS VISIO
// ==========================================

// ==========================================
// 8. ENTRETIENS VISIO & CONVOCATIONS OFFICIELLES RH
// ==========================================

// Programmer un entretien visio (Admin RH -> Candidat)
app.post('/api/interviews/schedule', async (req, res) => {
  try {
    const { userId, candidateId, applicationId, scheduledAt, visioLink, notes, rhId } = req.body;
    const targetUserId = parseInt(userId || candidateId, 10);

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ message: 'Identifiant du candidat requis.' });
    }
    if (!scheduledAt) {
      return res.status(400).json({ message: 'Date et heure de l entretien requises.' });
    }

    // 1. Récupérer les informations du candidat
    const candRes = await pool.query('SELECT id, nom, prenom, email, phone FROM users WHERE id = $1', [targetUserId]);
    if (candRes.rows.length === 0) {
      return res.status(404).json({ message: 'Candidat introuvable.' });
    }
    const candidate = candRes.rows[0];

    // 2. Récupérer les informations du poste / stage si applicationId est fourni
    let jobTitle = 'Poste / Demande de Stage';
    let department = 'Services Municipaux';
    if (applicationId) {
      const appRes = await pool.query(`
        SELECT a.id, a.application_type, j.title as job_title, j.department
        FROM applications a
        LEFT JOIN jobs j ON a.job_id = j.id
        WHERE a.id = $1
      `, [applicationId]);
      if (appRes.rows.length > 0) {
        const aData = appRes.rows[0];
        jobTitle = aData.job_title || (aData.application_type === 'stage_academique' ? 'Stage Académique' : (aData.application_type === 'stage_vacances' ? 'Stage de Vacances' : (aData.application_type === 'stage_professionnel' ? 'Stage Professionnel' : 'Candidature Municipale')));
        if (aData.department) department = aData.department;
      }
    }

    // 3. Résoudre l'Admin RH expéditeur
    let adminRhId = rhId ? parseInt(rhId, 10) : null;
    let rhRes = null;
    if (adminRhId) {
      const rQuery = await pool.query('SELECT id, nom, prenom, role FROM users WHERE id = $1', [adminRhId]);
      if (rQuery.rows.length > 0) rhRes = rQuery.rows[0];
    }
    if (!rhRes) {
      const defRh = await pool.query("SELECT id, nom, prenom, role FROM users WHERE role IN ('admin_rh', 'super_admin') ORDER BY id ASC LIMIT 1");
      if (defRh.rows.length > 0) {
        rhRes = defRh.rows[0];
        adminRhId = defRh.rows[0].id;
      }
    }

    // 4. Générer l'identifiant unique de la salle visio
    const roomId = 'visio-soa-' + Math.random().toString(36).substring(2, 8) + '-' + Date.now().toString(36);
    const internalVisioLink = visioLink || `http://localhost:3000/candidat/dashboard?tab=interviews&room=${roomId}`;

    // 5. Insérer l'entretien en base de données
    const ins = await pool.query(`
      INSERT INTO interviews (
        user_id, candidate_id, application_id, rh_id, 
        scheduled_at, meeting_link, visio_link, room_id, status, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'programme', $9, NOW())
      RETURNING *;
    `, [
      targetUserId,
      targetUserId,
      applicationId || null,
      adminRhId,
      scheduledAt,
      internalVisioLink,
      internalVisioLink,
      roomId,
      notes || 'Entretien d évaluation des compétences et motivation pour le poste communal.'
    ]);
    const createdInterview = ins.rows[0];

    // 6. Mettre à jour le statut de la candidature le cas échéant
    if (applicationId) {
      await pool.query("UPDATE applications SET status = 'en_examen' WHERE id = $1", [applicationId]);
    }

    // Formater la date et l'heure pour l'affichage officiel
    const schedDateObj = new Date(scheduledAt);
    const dateFormatted = schedDateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeFormatted = schedDateObj.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // 7. ENVOI DE L'EMAIL OFFICIEL AU CANDIDAT VIA NODEMAILER
    const emailSubject = `[Mairie de Soa - RH] Convocation Officielle à votre Entretien Vidéo (${jobTitle})`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #074696 0%, #1b8a53 100%); color: #ffffff; padding: 24px; text-align: center;">
          <div style="font-size: 0.78rem; font-weight: 800; letter-spacing: 1.5px; opacity: 0.9;">RÉPUBLIQUE DU CAMEROUN • MAIRIE DE SOA</div>
          <h2 style="margin: 8px 0 0 0; font-size: 1.35rem;">Convocation Officielle à un Entretien Vidéo</h2>
          <div style="font-size: 0.85rem; opacity: 0.95; margin-top: 4px;">Service des Ressources Humaines &amp; Commission de Recrutement</div>
        </div>
        
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 1rem; margin-top: 0;">Bonjour <strong>${candidate.prenom} ${candidate.nom}</strong>,</p>
          <p>
            Nous avons le plaisir de vous informer que votre dossier de candidature pour le poste / stage <strong>« ${jobTitle} »</strong> (Département : <em>${department}</em>) a retenu l'attention de la commission municipale.
          </p>
          
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-left: 5px solid #074696; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #074696; font-size: 0.95rem;">DÉTAILS DE VOTRE RENDEZ-VOUS EN LIGNE</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 35%;"><strong>Date :</strong></td>
                <td style="padding: 4px 0; font-weight: 700; color: #0f172a; text-transform: capitalize;">${dateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Heure :</strong></td>
                <td style="padding: 4px 0; font-weight: 700; color: #1b8a53; font-size: 1rem;">${timeFormatted} (Heure de Yaoundé / GMT+1)</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Format :</strong></td>
                <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">Visioconférence Sécurisée HireBridge Soa</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Réf. Salle :</strong></td>
                <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #2563eb;">${roomId}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${internalVisioLink}" style="display: inline-block; background: #074696; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 800; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(7, 70, 150, 0.3);">
              Rejoindre la Salle Visio sur la Plateforme
            </a>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 8px;">
              Lien direct : <a href="${internalVisioLink}" style="color: #074696;">${internalVisioLink}</a>
            </div>
          </div>

          <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-left: 5px solid #dc2626; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 0.85rem; color: #991b1b;">
            <strong>CONSIGNES IMPORTANTES DU SERVICE RH :</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 20px;">
              <li>Veuillez vous connecter <strong>5 à 10 minutes avant l'heure prévue</strong> muni(e) d'une pièce d'identité valide (CNI ou Passeport).</li>
              <li>Assurez-vous d'avoir une connexion Internet stable, un microphone fonctionnel et votre webcam activée.</li>
              <li><strong>Prévenance obligatoire :</strong> En cas de préoccupation, empêchement majeur ou besoin de report, vous devez impérativement prévenir le Service RH via la messagerie interne de votre espace candidat <strong>au moins 24 heures avant l'horaire fixé</strong>.</li>
            </ul>
          </div>

          <p style="font-size: 0.88rem; color: #475569; margin-bottom: 0;">
            Dans l'attente de cet échange, nous vous prions d'agréer nos salutations républicaines distinguées.
          </p>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 0.75rem; color: #64748b;">
          <strong>Mairie de la Commune de Soa</strong> • Service des Ressources Humaines<br />
          Plateforme Numérique de Recrutement &amp; Gestion des Stages HireBridge Soa
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
        to: candidate.email,
        subject: emailSubject,
        html: emailHtml
      });
      console.log(`Email de convocation visio envoyé avec succès à ${candidate.email}`);
    } catch (mailErr) {
      console.warn('Notification email (visio) non distribuée (mode hors-ligne ou configuration SMTP locale) :', mailErr.message);
    }

    // 8. ENVOI DU MESSAGE AUTOMATIQUE DANS LA MESSAGERIE RH INTERNE
    try {
      const msgContent = `Bonjour ${candidate.prenom} ${candidate.nom},\n\n` +
        `Votre entretien en visioconférence pour le poste / stage de "${jobTitle}" a été programmé par le Service des Ressources Humaines pour le ${dateFormatted} à ${timeFormatted}.\n\n` +
        `Vous pouvez accéder directement à la salle de visioconférence sécurisée depuis l'onglet "Mes Entretiens" de votre espace candidat.\n\n` +
        `Réf. de votre salle visio : ${roomId}\nLien direct : ${internalVisioLink}\n\n` +
        `IMPORTANT : Si vous avez une préoccupation, un empêchement ou un besoin de report concernant cet entretien, vous devez impérativement prévenir le Service RH dans cette messagerie au moins 24h avant la tenue de la visioconférence.\n\n` +
        `Cordialement,\nLe Service des Ressources Humaines — Mairie de Soa`;

      await pool.query(`
        INSERT INTO messages (sender_id, receiver_id, content, subject, is_read, created_at)
        VALUES ($1, $2, $3, $4, false, NOW())
      `, [
        adminRhId,
        targetUserId,
        msgContent,
        'Convocation Officielle à votre Entretien Vidéo — Mairie de Soa'
      ]);
    } catch (msgErr) {
      console.error('Erreur insertion message automatique RH visio:', msgErr);
    }

    // 9. CRÉATION DES NOTIFICATIONS INTERNES IN-APP POUR LE CANDIDAT
    try {
      // Notification 1 : Convocation Entretien
      await createNotification(
        targetUserId,
        'Convocation à un Entretien Vidéo',
        `Votre entretien pour "${jobTitle}" est fixé au ${dateFormatted} à ${timeFormatted}. Accédez à la salle depuis l'onglet Mes Entretiens.`,
        'recrutement',
        'interviews',
        'fa-solid fa-video'
      );

      // Notification 2 : Alerte Email Important
      await createNotification(
        targetUserId,
        'Email officiel important envoyé',
        `Un email de convocation avec tous les détails et consignes pour votre entretien vidéo a été envoyé à votre adresse (${candidate.email}).`,
        'information',
        'interviews',
        'fa-solid fa-envelope'
      );
    } catch (notifErr) {
      console.error('Erreur notifications visio:', notifErr);
    }

    res.status(201).json({
      message: 'Entretien vidéo programmé avec succès ! L email de convocation, le message dans la messagerie et les notifications ont été transmis.',
      interview: createdInterview,
      room_id: roomId,
      visio_link: internalVisioLink
    });

  } catch (err) {
    console.error('Erreur POST /api/interviews/schedule:', err);
    res.status(500).json({ message: 'Erreur lors de la programmation de l entretien.', error: err.message });
  }
});

// Liste des entretiens pour un candidat
app.get('/api/interviews/candidate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Auto-clôturer les entretiens programmés dont la date/heure est dépassée de plus de 3h
    await pool.query(`
      UPDATE interviews 
      SET status = 'termine', notes = COALESCE(notes, '') || ' [Clôturé automatiquement suite à expiration de la date]'
      WHERE status = 'programme' AND scheduled_at < NOW() - INTERVAL '3 hours';
    `).catch(() => {});

    const r = await pool.query(`
      SELECT 
        i.*,
        COALESCE(j.title, a.application_type, 'Candidature Municipale') as job_title,
        COALESCE(j.department, 'Service Municipal') as department,
        u_rh.nom as rh_nom,
        u_rh.prenom as rh_prenom
      FROM interviews i
      LEFT JOIN applications a ON i.application_id = a.id
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN users u_rh ON i.rh_id = u_rh.id
      WHERE (i.user_id = $1 OR i.candidate_id = $1)
      ORDER BY i.scheduled_at DESC;
    `, [userId]);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/interviews/candidate:', err);
    res.status(500).json({ message: 'Erreur récupération entretiens.' });
  }
});

// Liste de tous les entretiens pour l'Admin RH
app.get('/api/interviews/admin', async (req, res) => {
  try {
    // Auto-clôturer les entretiens programmés dont la date/heure est dépassée de plus de 3h
    await pool.query(`
      UPDATE interviews 
      SET status = 'termine', notes = COALESCE(notes, '') || ' [Clôturé automatiquement suite à expiration de la date]'
      WHERE status = 'programme' AND scheduled_at < NOW() - INTERVAL '3 hours';
    `).catch(() => {});

    const r = await pool.query(`
      SELECT 
        i.*,
        c.nom as candidate_nom,
        c.prenom as candidate_prenom,
        c.email as candidate_email,
        c.phone as candidate_phone,
        COALESCE(j.title, a.application_type, 'Candidature Municipale') as job_title,
        COALESCE(j.department, 'Service Municipal') as department,
        u_rh.nom as rh_nom,
        u_rh.prenom as rh_prenom
      FROM interviews i
      LEFT JOIN users c ON (COALESCE(i.candidate_id, i.user_id) = c.id)
      LEFT JOIN applications a ON i.application_id = a.id
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN users u_rh ON i.rh_id = u_rh.id
      ORDER BY i.scheduled_at DESC;
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/interviews/admin:', err);
    res.status(500).json({ message: 'Erreur récupération entretiens RH.' });
  }
});

// Récupérer les détails d'une salle visio par roomId
app.get('/api/interviews/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const r = await pool.query(`
      SELECT 
        i.*,
        c.id as candidate_user_id,
        c.nom as candidate_nom,
        c.prenom as candidate_prenom,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.avatar_url as candidate_avatar,
        COALESCE(j.title, a.application_type, 'Candidature Municipale') as job_title,
        COALESCE(j.department, 'Service Municipal') as department,
        u_rh.nom as rh_nom,
        u_rh.prenom as rh_prenom
      FROM interviews i
      LEFT JOIN users c ON (COALESCE(i.candidate_id, i.user_id) = c.id)
      LEFT JOIN applications a ON i.application_id = a.id
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN users u_rh ON i.rh_id = u_rh.id
      WHERE i.room_id = $1 OR i.meeting_link LIKE $2 OR i.visio_link LIKE $2
      LIMIT 1;
    `, [roomId, `%${roomId}%`]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Salle d entretien introuvable.' });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error('Erreur GET /api/interviews/room:', err);
    res.status(500).json({ message: 'Erreur récupération salle visio.' });
  }
});

// Mettre à jour le statut d'un entretien (en_cours, termine, annule)
app.put('/api/interviews/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const r = await pool.query(`
      UPDATE interviews
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *;
    `, [status, notes, id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Entretien introuvable.' });
    }

    res.json({ message: 'Statut de l entretien mis à jour !', interview: r.rows[0] });
  } catch (err) {
    console.error('Erreur PUT /api/interviews/status:', err);
    res.status(500).json({ message: 'Erreur mise à jour statut entretien.' });
  }
});

// ==========================================
// 8.1 VISIOCONFÉRENCE EN TEMPS RÉEL (PRÉSENCE RÉELLE & MESSAGERIE DE SÉANCE)
// ==========================================
const visioRoomsPresence = new Map(); // roomId -> { participants: Map(userId -> participantData), messages: [] }

// Endpoint Heartbeat & Présence Réelle de salle
app.post('/api/visio/presence', (req, res) => {
  try {
    const { roomId, userId, userName, userAvatar, role, isSpeaking, cameraActive, micActive } = req.body;
    if (!roomId || !userId) {
      return res.status(400).json({ message: 'roomId et userId requis.' });
    }

    if (!visioRoomsPresence.has(roomId)) {
      visioRoomsPresence.set(roomId, {
        participants: new Map(),
        messages: []
      });
    }

    const room = visioRoomsPresence.get(roomId);
    const now = Date.now();

    // Mettre à jour ce participant
    room.participants.set(String(userId), {
      userId: String(userId),
      userName: userName || 'Utilisateur',
      userAvatar: userAvatar || null,
      role: role || 'candidate',
      isSpeaking: Boolean(isSpeaking),
      cameraActive: cameraActive !== false,
      micActive: micActive !== false,
      lastSeen: now
    });

    // Purger les participants inactifs (déconnectés depuis plus de 6 secondes)
    for (const [pId, pData] of room.participants.entries()) {
      if (now - pData.lastSeen > 6000) {
        room.participants.delete(pId);
      }
    }

    const participantsList = Array.from(room.participants.values());

    res.json({
      roomId,
      activeCount: participantsList.length,
      participants: participantsList,
      messages: room.messages
    });
  } catch (err) {
    console.error('Erreur POST /api/visio/presence:', err);
    res.status(500).json({ message: 'Erreur présence visio.' });
  }
});

// Endpoint Quitter la salle
app.post('/api/visio/leave', (req, res) => {
  try {
    const { roomId, userId } = req.body;
    if (roomId && userId && visioRoomsPresence.has(roomId)) {
      const room = visioRoomsPresence.get(roomId);
      room.participants.delete(String(userId));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur déconnexion visio.' });
  }
});

// Endpoint Message Chat de salle
app.post('/api/visio/chat', (req, res) => {
  try {
    const { roomId, userId, userName, role, text } = req.body;
    if (!roomId || !text || !text.trim()) {
      return res.status(400).json({ message: 'Données invalides.' });
    }

    if (!visioRoomsPresence.has(roomId)) {
      visioRoomsPresence.set(roomId, {
        participants: new Map(),
        messages: []
      });
    }

    const room = visioRoomsPresence.get(roomId);
    const newMsg = {
      id: Date.now() + Math.random(),
      senderId: String(userId),
      senderName: userName || 'Participant',
      role: role || 'candidate',
      text: text.trim(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    room.messages.push(newMsg);
    if (room.messages.length > 150) room.messages.shift();

    res.json({ success: true, message: newMsg, messages: room.messages });
  } catch (err) {
    console.error('Erreur POST /api/visio/chat:', err);
    res.status(500).json({ message: 'Erreur envoi chat visio.' });
  }
});

// ==========================================
// 9. CONTRATS
// ==========================================

app.post('/api/contracts/send', async (req, res) => {
  try {
    const { userId, applicationId, contractType, content } = req.body;
    const r = await pool.query(
      `INSERT INTO contracts(user_id,application_id,contract_type,content,status) VALUES($1,$2,$3,$4,'en_attente') RETURNING *`,
      [userId, applicationId, contractType || 'CDI', content || '']
    );
    res.status(201).json({ message: 'Contrat envoyé !', contract: r.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

app.get('/api/contracts/candidate/:userId', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM contracts WHERE user_id=$1 ORDER BY created_at DESC', [req.params.userId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

app.post('/api/contracts/:id/sign', async (req, res) => {
  try {
    const r = await pool.query(`UPDATE contracts SET status='signé',signed_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    res.json({ message: 'Contrat signé !', contract: r.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

// ==========================================
// 10. ANALYTICS ADMIN
// ==========================================

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const [totalApps, totalJobs, totalUsers, pendingApps] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM applications'),
      pool.query("SELECT COUNT(*) as count FROM jobs WHERE status='actif'"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role='candidat'"),
      pool.query("SELECT COUNT(*) as count FROM applications WHERE status IN ('soumis','recu')")
    ]);
    const geoRes = await pool.query(`SELECT COALESCE(u.region,'Non précisé') as region,COUNT(a.id)::int as count FROM applications a JOIN users u ON a.user_id=u.id GROUP BY u.region ORDER BY count DESC LIMIT 8`);
    const topJobsRes = await pool.query(`SELECT j.title,j.department,COUNT(a.id)::int as app_count FROM applications a JOIN jobs j ON a.job_id=j.id WHERE a.job_id IS NOT NULL GROUP BY j.id,j.title,j.department ORDER BY app_count DESC LIMIT 5`);
    const statusRes = await pool.query(`SELECT status,COUNT(*)::int as count FROM applications GROUP BY status`);
    const typeRes = await pool.query(`SELECT COALESCE(application_type,'emploi') as type,COUNT(*)::int as count FROM applications GROUP BY application_type`);
    res.json({
      totalApplications: parseInt(totalApps.rows[0].count),
      activeJobs: parseInt(totalJobs.rows[0].count),
      totalCandidates: parseInt(totalUsers.rows[0].count),
      pendingReview: parseInt(pendingApps.rows[0].count),
      geographicData: geoRes.rows,
      topJobs: topJobsRes.rows,
      statusBreakdown: statusRes.rows,
      typeBreakdown: typeRes.rows
    });
  } catch (err) { console.error('Analytics:', err); res.status(500).json({ message: 'Erreur analytics.' }); }
});

// ==========================================
// 10. CALENDRIER MUNICIPAL & ÉVÉNEMENTS DE SOA
// ==========================================

// Liste des événements municipaux (avec statut d'inscription pour un utilisateur donné)
app.get('/api/events', async (req, res) => {
  try {
    const { userId, category, includePast } = req.query;

    let query = `
      SELECT me.*,
        ${userId ? `EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id = me.id AND er.user_id = $1) as is_registered,` : `false as is_registered,`}
        (SELECT COUNT(*) FROM event_registrations er2 WHERE er2.event_id = me.id) as real_registered_count
      FROM municipal_events me
      WHERE me.is_public = TRUE
    `;

    const params = [];
    if (userId) params.push(userId);

    // Les événements passés ne doivent plus apparaître
    if (includePast !== 'true') {
      query += ` AND me.event_date::date >= CURRENT_DATE`;
    }

    if (category && category !== 'TOUS') {
      params.push(category);
      query += ` AND me.category = $${params.length}`;
    }

    query += ` ORDER BY me.event_date ASC`;

    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/events:', err);
    res.status(500).json({ message: 'Erreur récupération événements.' });
  }
});

// Détails d'un événement
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('SELECT * FROM municipal_events WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Inscription citoyenne à un événement
app.post('/api/events/register', async (req, res) => {
  try {
    const { eventId, userId } = req.body;
    if (!eventId || !userId) {
      return res.status(400).json({ message: 'Identifiants événement et utilisateur requis.' });
    }

    const ins = await pool.query(
      'INSERT INTO event_registrations(event_id, user_id) VALUES($1, $2) ON CONFLICT DO NOTHING RETURNING id',
      [eventId, userId]
    );

    if (ins.rows.length > 0) {
      await pool.query('UPDATE municipal_events SET registered_count = registered_count + 1 WHERE id = $1', [eventId]);
    }

    res.json({ message: 'Votre participation à cet événement municipal a été enregistrée avec succès !' });
  } catch (err) {
    console.error('Erreur POST /api/events/register:', err);
    res.status(500).json({ message: 'Erreur lors de l\'inscription.' });
  }
});

// Annulation d'inscription
app.post('/api/events/unregister', async (req, res) => {
  try {
    const { eventId, userId } = req.body;
    const del = await pool.query(
      'DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2 RETURNING id',
      [eventId, userId]
    );

    if (del.rows.length > 0) {
      await pool.query('UPDATE municipal_events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = $1', [eventId]);
    }

    res.json({ message: 'Votre participation a été annulée.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Événements enregistrés par un candidat
app.get('/api/candidate/my-events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query(`
      SELECT me.*, er.registered_at, true as is_registered
      FROM event_registrations er
      JOIN municipal_events me ON er.event_id = me.id
      WHERE er.user_id = $1
      ORDER BY me.event_date ASC
    `, [userId]);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/candidate/my-events:', err);
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Création d'un événement (Admin RH / Municipal)
app.post('/api/admin/events', async (req, res) => {
  try {
    const {
      title, description, category, event_date, end_date,
      start_time, end_time, location, organizer, target_audience,
      access_type, is_public, capacity, banner_color
    } = req.body;

    const r = await pool.query(`
      INSERT INTO municipal_events (
        title, description, category, event_date, end_date,
        start_time, end_time, location, organizer, target_audience,
        access_type, is_public, capacity, banner_color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      title, description, category || 'institutionnel', event_date, end_date,
      start_time || '09h00', end_time || '15h00', location || 'Hôtel de Ville de Soa',
      organizer || 'Mairie de la Commune de Soa', target_audience || 'Grand Public',
      access_type || 'Entrée Libre & Gratuite', is_public !== undefined ? is_public : true,
      capacity || 150, banner_color || '#22c55e'
    ]);

    res.status(201).json({ message: 'Événement municipal créé avec succès !', event: r.rows[0] });
  } catch (err) {
    console.error('Erreur POST /api/admin/events:', err);
    res.status(500).json({ message: 'Erreur création événement.' });
  }
});

// Mise à jour d'un événement (Admin)
app.put('/api/admin/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, category, event_date, end_date,
      start_time, end_time, location, organizer, target_audience,
      access_type, is_public, capacity, banner_color
    } = req.body;

    const r = await pool.query(`
      UPDATE municipal_events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        event_date = COALESCE($4, event_date),
        end_date = COALESCE($5, end_date),
        start_time = COALESCE($6, start_time),
        end_time = COALESCE($7, end_time),
        location = COALESCE($8, location),
        organizer = COALESCE($9, organizer),
        target_audience = COALESCE($10, target_audience),
        access_type = COALESCE($11, access_type),
        is_public = COALESCE($12, is_public),
        capacity = COALESCE($13, capacity),
        banner_color = COALESCE($14, banner_color)
      WHERE id = $15
      RETURNING *
    `, [
      title, description, category, event_date, end_date,
      start_time, end_time, location, organizer, target_audience,
      access_type, is_public, capacity, banner_color, id
    ]);

    res.json({ message: 'Événement mis à jour !', event: r.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur mise à jour événement.' });
  }
});

// Suppression d'un événement (Admin)
app.delete('/api/admin/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM municipal_events WHERE id = $1', [id]);
    res.json({ message: 'Événement supprimé du calendrier municipal.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression événement.' });
  }
});

// ==========================================
// 11. GESTION DES FORMATIONS MUNICIPALES
// ==========================================

// Liste des formations ouvertes avec nombre de candidats
app.get('/api/trainings', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM training_applications ta WHERE ta.training_id = t.id) as applicants_count
      FROM trainings t 
      ORDER BY t.start_date ASC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/trainings:', err);
    res.status(500).json({ message: 'Erreur récupération formations.' });
  }
});

// Détails d'une formation
app.get('/api/trainings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('SELECT * FROM trainings WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Création d'une formation (Admin RH)
app.post('/api/trainings', async (req, res) => {
  try {
    const {
      title, category, description, prerequisites, trainer, location,
      format, duration, start_date, end_date, capacity, certification
    } = req.body;

    const cleanStartDate = (start_date && typeof start_date === 'string' && start_date.trim() !== '') ? start_date : null;
    const cleanEndDate = (end_date && typeof end_date === 'string' && end_date.trim() !== '') ? end_date : null;

    const r = await pool.query(`
      INSERT INTO trainings (
        title, category, description, prerequisites, trainer, location,
        format, duration, start_date, end_date, capacity, certification, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'OUVERTE')
      RETURNING *
    `, [
      title,
      category || 'Administration & Numérique',
      description || 'Formation municipale certifiante organisée par la Mairie de Soa.',
      prerequisites || 'Ouvert à tous les habitants de Soa',
      trainer || 'Cellule Municipale de Formation — Soa',
      location || 'Hôtel de Ville de Soa — Salle Multimédia',
      format || 'Présentiel & Ateliers Pratiques',
      duration || '3 Semaines (60h)',
      cleanStartDate,
      cleanEndDate,
      capacity || 30,
      certification || 'Certificat Officiel Commune de Soa'
    ]);

    res.status(201).json({ message: 'Formation créée avec succès !', training: r.rows[0] });
  } catch (err) {
    console.error('Erreur POST /api/trainings:', err);
    res.status(500).json({ message: 'Erreur création formation: ' + (err.message || 'Problème serveur') });
  }
});

// Mise à jour d'une formation (Admin RH)
app.put('/api/trainings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, category, description, prerequisites, trainer, location,
      format, duration, start_date, end_date, capacity, certification, status
    } = req.body;

    const cleanStartDate = (start_date && typeof start_date === 'string' && start_date.trim() !== '') ? start_date : null;
    const cleanEndDate = (end_date && typeof end_date === 'string' && end_date.trim() !== '') ? end_date : null;

    const r = await pool.query(`
      UPDATE trainings SET
        title = COALESCE($1, title),
        category = COALESCE($2, category),
        description = COALESCE($3, description),
        prerequisites = COALESCE($4, prerequisites),
        trainer = COALESCE($5, trainer),
        location = COALESCE($6, location),
        format = COALESCE($7, format),
        duration = COALESCE($8, duration),
        start_date = COALESCE($9, start_date),
        end_date = COALESCE($10, end_date),
        capacity = COALESCE($11, capacity),
        certification = COALESCE($12, certification),
        status = COALESCE($13, status)
      WHERE id = $14
      RETURNING *
    `, [
      title, category, description, prerequisites, trainer, location,
      format, duration, cleanStartDate, cleanEndDate, capacity, certification, status, id
    ]);

    res.json({ message: 'Formation mise à jour !', training: r.rows[0] });
  } catch (err) {
    console.error('Erreur PUT /api/trainings:', err);
    res.status(500).json({ message: 'Erreur mise à jour formation.' });
  }
});

// Supprimer une formation (Admin RH)
app.delete('/api/trainings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM trainings WHERE id = $1', [id]);
    res.json({ message: 'Formation supprimée avec succès.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression formation.' });
  }
});

// Mes candidatures / inscriptions aux formations (Candidat)
app.get('/api/candidate/trainings/my-applications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query(`
      SELECT ta.*, 
        t.title as training_title,
        t.category as training_category,
        t.duration as training_duration,
        t.trainer as training_trainer,
        t.location as training_location,
        t.format as training_format,
        t.start_date as training_start_date,
        t.end_date as training_end_date,
        t.certification as training_certification
      FROM training_applications ta
      JOIN trainings t ON ta.training_id = t.id
      WHERE ta.user_id = $1
      ORDER BY ta.created_at DESC
    `, [userId]);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/candidate/trainings/my-applications:', err);
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Postuler / Inscription à une demande (Formation Municipale) avec 4 documents (CV, Demande, Lettre, CNI)
app.post('/api/candidate/trainings/apply', upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'request_letter', maxCount: 1 },
  { name: 'cover_letter', maxCount: 1 },
  { name: 'identity_card', maxCount: 1 },
  { name: 'diploma', maxCount: 1 }
]), async (req, res) => {
  try {
    const { trainingId, userId, nom, prenom, email, phone, motivation_text } = req.body;

    if (!trainingId || !userId) {
      return res.status(400).json({ message: 'Identifiants formation et candidat requis.' });
    }

    const existing = await pool.query(
      'SELECT id FROM training_applications WHERE training_id = $1 AND user_id = $2',
      [trainingId, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Vous avez déjà soumis une demande pour ce programme.' });
    }

    const cvFile = req.files && req.files['cv'] ? req.files['cv'][0] : null;
    const requestLetterFile = req.files && req.files['request_letter'] ? req.files['request_letter'][0] : null;
    const coverLetterFile = req.files && req.files['cover_letter'] ? req.files['cover_letter'][0] : null;
    const identityCardFile = req.files && req.files['identity_card'] ? req.files['identity_card'][0] : null;
    const diplomaFile = req.files && req.files['diploma'] ? req.files['diploma'][0] : null;

    const cv_url = cvFile ? `http://localhost:5000/uploads/${cvFile.filename}` : null;
    const cv_filename = cvFile ? cvFile.originalname : null;

    const request_letter_url = requestLetterFile ? `http://localhost:5000/uploads/${requestLetterFile.filename}` : null;
    const request_letter_filename = requestLetterFile ? requestLetterFile.originalname : null;

    const cover_letter_url = coverLetterFile ? `http://localhost:5000/uploads/${coverLetterFile.filename}` : null;
    const cover_letter_filename = coverLetterFile ? coverLetterFile.originalname : null;

    const identity_card_url = identityCardFile ? `http://localhost:5000/uploads/${identityCardFile.filename}` : null;
    const identity_card_filename = identityCardFile ? identityCardFile.originalname : null;

    const diploma_url = diplomaFile ? `http://localhost:5000/uploads/${diplomaFile.filename}` : null;
    const diploma_filename = diplomaFile ? diplomaFile.originalname : null;

    // S'assurer que les colonnes existent dans la table training_applications
    await pool.query(`
      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS request_letter_url VARCHAR(500);
      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS request_letter_filename VARCHAR(255);
      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS identity_card_url VARCHAR(500);
      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS identity_card_filename VARCHAR(255);
    `);

    const r = await pool.query(`
      INSERT INTO training_applications (
        training_id, user_id, nom, prenom, email, phone, motivation_text,
        cv_url, cv_filename, request_letter_url, request_letter_filename,
        cover_letter_url, cover_letter_filename, identity_card_url, identity_card_filename,
        diploma_url, diploma_filename, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'EN_ATTENTE')
      RETURNING *
    `, [
      trainingId, userId, nom, prenom, email, phone, motivation_text || '',
      cv_url, cv_filename, request_letter_url, request_letter_filename,
      cover_letter_url, cover_letter_filename, identity_card_url, identity_card_filename,
      diploma_url, diploma_filename
    ]);

    await pool.query('UPDATE trainings SET enrolled_count = enrolled_count + 1 WHERE id = $1', [trainingId]);

    // Enregistrer également les pièces justificatives dans la table centrale documents
    const docsToInsert = [
      { file: cvFile, type: 'cv', label: 'Curriculum Vitae (CV)' },
      { file: requestLetterFile, type: 'demande_manuscrite', label: 'Demande de participation' },
      { file: coverLetterFile, type: 'lettre_motivation', label: 'Lettre de Motivation' },
      { file: identityCardFile, type: 'copie_cni', label: 'Copie Pièce d\'Identité (CNI)' }
    ];

    for (const d of docsToInsert) {
      if (d.file) {
        await pool.query(
          `INSERT INTO documents(user_id, doc_type, document_type, file_name, file_url, mime_type, status)
           VALUES($1, $2, $3, $4, $5, $6, 'valide')`,
          [userId, d.type, d.label, d.file.originalname, `/uploads/${d.file.filename}`, d.file.mimetype]
        );
      }
    }

    // Notification automatique pour l'équipe RH
    try {
      const trainingInfo = (await pool.query('SELECT title FROM trainings WHERE id=$1', [trainingId])).rows[0];
      const trTitle = trainingInfo ? trainingInfo.title : 'une formation';
      
      await notifyHrAdmins(
        ` Nouvelle Inscription Formation Municipale !`,
        `${prenom || ''} ${nom || ''} a soumis une demande d'inscription pour la formation « ${trTitle} ».`,
        'formation',
        'trainings',
        'fa-solid fa-graduation-cap'
      );
    } catch (hrNotifErr) { console.error('Erreur notifyHrAdmins training apply:', hrNotifErr.message); }

    res.status(201).json({
      message: 'Votre demande de participation a été transmise avec succès à la Mairie de Soa !',
      application: r.rows[0]
    });
  } catch (err) {
    console.error('Erreur POST /api/candidate/trainings/apply:', err);
    res.status(500).json({ message: 'Erreur lors de la soumission de la demande de participation.' });
  }
});

// ==========================================
// API DE TRADUCTION AUTOMATIQUE EN LIGNE (EN-LIGNE + SERVEUR CACHE)
// ==========================================
const translationCache = new Map();

app.post('/api/translate', async (req, res) => {
  try {
    const { text, from = 'fr', to = 'en' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.json({ translatedText: text || '' });
    }

    const cleanText = text.trim();
    const cacheKey = `${from}_${to}_${cleanText}`;

    if (translationCache.has(cacheKey)) {
      return res.json({ translatedText: translationCache.get(cacheKey) });
    }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${from}|${to}`;
    const response = await fetch(url);
    const data = await response.json();

    let translated = cleanText;
    if (data && data.responseData && data.responseData.translatedText) {
      translated = data.responseData.translatedText;
      if (translated.includes('MYMEMORY WARNING') || translated.includes('QUERY LENGTH LIMIT EXCEEDED')) {
        translated = cleanText;
      }
    }

    translationCache.set(cacheKey, translated);
    res.json({ translatedText: translated });
  } catch (err) {
    console.error('Erreur route /api/translate:', err);
    res.json({ translatedText: req.body.text || '' });
  }
});

// Toutes les candidatures de formations (Admin RH)
app.get('/api/admin/training-applications', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT ta.*,
        t.title as training_title,
        t.category as training_category,
        t.duration as training_duration,
        t.trainer as training_trainer,
        t.location as training_location,
        t.start_date as training_start_date,
        u.email as user_email,
        u.nom as user_nom,
        u.prenom as user_prenom
      FROM training_applications ta
      JOIN trainings t ON ta.training_id = t.id
      JOIN users u ON ta.user_id = u.id
      ORDER BY ta.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/admin/training-applications:', err);
    res.status(500).json({ message: 'Erreur récupération candidatures formations.' });
  }
});

// Mise à jour statut & Génération de Décharge officielle de formation (Admin RH)
app.put('/api/admin/training-applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    let receipt_number = null;
    let receipt_date = null;

    if (status === 'CONFIRMEE' || status === 'ACCEPTEE') {
      const year = new Date().getFullYear();
      receipt_number = `SOA-FORM-${year}-${String(id).padStart(5, '0')}`;
      receipt_date = new Date();
    }

    const r = await pool.query(`
      UPDATE training_applications SET
        status = $1,
        admin_notes = COALESCE($2, admin_notes),
        receipt_number = COALESCE($3, receipt_number),
        receipt_date = COALESCE($4, receipt_date)
      WHERE id = $5
      RETURNING *
    `, [status, admin_notes, receipt_number, receipt_date, id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Demande de formation introuvable.' });
    }

    // Récupération des détails complets pour envoi d'email & message interne
    const appDetails = await pool.query(`
      SELECT ta.*, 
             t.title as training_title, 
             t.category as training_category, 
             t.location as training_location, 
             t.start_date as training_start_date,
             u.id as candidate_user_id,
             u.email as candidate_email, 
             u.nom as candidate_nom, 
             u.prenom as candidate_prenom
      FROM training_applications ta
      JOIN trainings t ON ta.training_id = t.id
      JOIN users u ON ta.user_id = u.id
      WHERE ta.id = $1
    `, [id]);

    if (appDetails.rows.length > 0) {
      const candidate = appDetails.rows[0];
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const receiptNo = receipt_number || candidate.receipt_number || `SOA-FORM-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;

      // CAS 1 : DOSSIER ACCEPTÉ / CONFIRMÉ
      if (status === 'CONFIRMEE' || status === 'ACCEPTEE') {
        // A. Envoi de l'Email au candidat
        try {
          await transporter.sendMail({
            from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
            to: candidate.candidate_email,
            subject: ` Inscription Confirmée — Formation Municipale : ${candidate.training_title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; overflow: hidden;">
                <div style="background: #00a859; padding: 20px; text-align: center; color: #ffffff;">
                  <h2 style="margin: 0; font-size: 1.4rem;">MAIRIE DE LA COMMUNE DE SOA</h2>
                  <p style="margin: 4px 0 0 0; font-size: 0.9rem; opacity: 0.9;">Service des Ressources Humaines &bull; Formation Municipale</p>
                </div>
                
                <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
                  <p style="font-size: 1.05rem;">Bonjour <strong>${candidate.candidate_prenom} ${candidate.candidate_nom}</strong>,</p>
                  
                  <p>Nous avons le plaisir de vous informer que votre dossier de candidature pour la formation municipale intitulée <strong>« ${candidate.training_title} »</strong> a été officiellement <strong>ACCEPTÉ ET VALIDÉ</strong> par la Commission des Ressources Humaines de la Mairie de Soa.</p>
                  
                  <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 0.95rem;"> DÉTAILS DE VOTRE DÉCHARGE OFFICIELLE :</h4>
                    <p style="margin: 4px 0; font-size: 0.9rem;"><strong>• Numéro de Décharge :</strong> <span style="color: #00a859; font-weight: bold;">${receiptNo}</span></p>
                    <p style="margin: 4px 0; font-size: 0.9rem;"><strong>• Date d'Émission :</strong> ${dateStr}</p>
                    <p style="margin: 4px 0; font-size: 0.9rem;"><strong>• Statut du Dossier :</strong> Confirmé &amp; Conforme</p>
                  </div>
                  
                  <p>Votre accusé de réception / décharge officielle est désormais disponible au téléchargement direct dans votre espace candidat sur la plateforme <strong>HireBridge Soa</strong> (Onglet <em>« Mes Formations »</em>).</p>

                  ${admin_notes ? `<p style="background: #f8fafc; padding: 12px; border-left: 4px solid #0284c7; font-size: 0.88rem; color: #334155;"><strong>Note administrative :</strong> ${admin_notes}</p>` : ''}
                  
                  <p style="margin-top: 25px;">Félicitations et nous vous souhaitons un excellent parcours de formation au sein de notre commune.</p>
                </div>

                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 0.78rem; color: #64748b;">
                  <strong>COMMUNE DE SOA &bull; DIRECTION DES RESSOURCES HUMAINES</strong><br />
                  HireBridge-Mairie de Soa &bull; Plateforme Officielle de Recrutement &amp; Gestion des Formations
                </div>
              </div>
            `
          });
        } catch (mailErr) {
          console.error('Erreur envoi email acceptation formation:', mailErr.message);
        }

        // B. Notification In-App (signalant la réception de la décharge par e-mail)
        try {
          await createNotification(
            candidate.candidate_user_id,
            `Décharge de formation reçue par e-mail`,
            `Votre dossier pour la formation "${candidate.training_title}" a été accepté. Votre décharge officielle (N° ${receiptNo}) vous a été envoyée par e-mail !`,
            'formation',
            'trainings',
            'fa-solid fa-envelope-open-text'
          );
        } catch (notifErr) {
          console.error('Erreur notification in-app formation:', notifErr.message);
        }

      // CAS 2 : DOSSIER REFUSÉ / NON RETENU
      } else if (status === 'REFUSEE' || status === 'REJETEE') {
        try {
          await transporter.sendMail({
            from: `"HireBridge-Mairie de Soa" <${process.env.EMAIL_USER || 'no-reply@soa.cm'}>`,
            to: candidate.candidate_email,
            subject: ` Information concernant votre demande de formation : ${candidate.training_title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; overflow: hidden;">
                <div style="background: #0f172a; padding: 20px; text-align: center; color: #ffffff;">
                  <h2 style="margin: 0; font-size: 1.4rem;">MAIRIE DE LA COMMUNE DE SOA</h2>
                  <p style="margin: 4px 0 0 0; font-size: 0.9rem; opacity: 0.9;">Service des Ressources Humaines &bull; Formation Municipale</p>
                </div>
                
                <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
                  <p style="font-size: 1.05rem;">Bonjour <strong>${candidate.candidate_prenom} ${candidate.candidate_nom}</strong>,</p>
                  
                  <p>Nous vous informons que votre demande d'inscription pour la formation municipale <strong>« ${candidate.training_title} »</strong> n'a pas pu être retenue pour la présente session.</p>
                  
                  ${admin_notes ? `<p style="background: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; font-size: 0.88rem; color: #991b1b;"><strong>Motif / Remarque administrative :</strong> ${admin_notes}</p>` : ''}
                  
                  <p>Nous vous remercions pour votre intérêt pour les programmes de formation de la Commune de Soa et vous invitons à consulter nos prochaines offres sur la plateforme.</p>
                </div>

                <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 0.78rem; color: #64748b;">
                  <strong>COMMUNE DE SOA &bull; DIRECTION DES RESSOURCES HUMAINES</strong><br />
                  HireBridge-Mairie de Soa
                </div>
              </div>
            `
          });
        } catch (mErr) { console.error('Erreur email rejet formation:', mErr.message); }

        try {
          const rhAdminRes = await pool.query("SELECT id FROM users WHERE role = 'admin_rh' OR role = 'super_admin' ORDER BY id ASC LIMIT 1");
          const senderId = rhAdminRes.rows[0]?.id || 1;

          const msgSubject = ` Suite donnée à votre demande de formation : ${candidate.training_title}`;
          const msgContent = `Bonjour ${candidate.candidate_prenom} ${candidate.candidate_nom},\n\n` +
            `Votre demande d'inscription pour la formation municipale "${candidate.training_title}" n'a pas été retenue pour cette session.\n\n` +
            (admin_notes ? `Motif / Remarque RH : ${admin_notes}\n\n` : '') +
            `Cordialement,\nService des Ressources Humaines — Mairie de Soa`;

          await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, content, subject, is_read, created_at)
             VALUES ($1, $2, $3, $4, false, NOW())`,
            [senderId, candidate.candidate_user_id, msgContent, msgSubject]
          );
        } catch (mErr) { console.error('Erreur message interne rejet formation:', mErr.message); }
      }
    }

    res.json({
      message: (status === 'CONFIRMEE' || status === 'ACCEPTEE')
        ? 'Inscription confirmée et Décharge officielle envoyée par e-mail au candidat !'
        : 'Statut de la demande mis à jour.',
      application: r.rows[0]
    });
  } catch (err) {
    console.error('Erreur PUT /api/admin/training-applications/:id/status:', err);
    res.status(500).json({ message: 'Erreur mise à jour statut formation.' });
  }
});

app.get('/api/news', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM news ORDER BY published_at DESC')).rows); }
  catch (err) { res.status(500).json({ message: 'Erreur.' }); }
});

// ==========================================
// 12. CHATBOT IA 24/7
// ==========================================

app.post('/api/chatbot/query', async (req, res) => {
  try {
    const { message, userId } = req.body;
    const rawMsg = (message || '').trim();

    // Récupération éventuelle du prénom du candidat
    let userFirstName = '';
    if (userId) {
      try {
        const uRes = await pool.query('SELECT prenom FROM users WHERE id = $1', [userId]);
        if (uRes.rows.length > 0 && uRes.rows[0].prenom) {
          userFirstName = uRes.rows[0].prenom.trim();
        }
      } catch (e) {}
    }

    const nameLabel = userFirstName || '';

    if (!rawMsg) {
      return res.json({
        reply: nameLabel ? `Hello ${nameLabel}, que puis-je faire pour toi aujourd'hui ? ` : "Hello, que puis-je faire pour toi aujourd'hui ? ",
        options: ["Pièces à fournir", "Consulter les offres", "Demande de stage", "Horaires Mairie"]
      });
    }

    // Normalisation du texte (minuscules & suppression d'accents)
    const lower = rawMsg.toLowerCase();
    const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Détection d'une salutation explicite (bonjour, salut, hello, etc.)
    const isExplicitGreeting = 
      normalized === 'bonjour' || normalized === 'salut' || normalized === 'hello' || 
      normalized === 'hi' || normalized === 'coucou' || normalized === 'bonsoir' ||
      normalized.includes('ca va') || normalized.includes('comment vas') ||
      normalized.includes('qui es tu') || normalized.includes('presentation') || normalized.includes('presente toi');

    let reply = '';
    let options = [];

    // =========================================================================
    // 1. FILTRE DE CONFIDENTIALITÉ STRICT (Clair & Courtois)
    // =========================================================================

    const isSalaryConfidential = 
      (normalized.includes('salaire') || normalized.includes('remuneration') || normalized.includes('paie') || normalized.includes('gagne') || normalized.includes('revenu') || normalized.includes('prime')) &&
      (normalized.includes('maire') || normalized.includes('agent') || normalized.includes('rh') || normalized.includes('adjoint') || normalized.includes('directeur') || normalized.includes('personnel') || normalized.includes('estelle') || normalized.includes('mireille') || normalized.includes('employe') || normalized.includes('fonctionnaire'));

    const isSecurityConfidential = 
      normalized.includes('mot de passe') || normalized.includes('password') || normalized.includes('mdp') || 
      normalized.includes('code secret') || normalized.includes('base de donnees') || normalized.includes('database') ||
      normalized.includes('cle api') || normalized.includes('token secret') || normalized.includes('identifiant admin') || 
      normalized.includes('acces serveur') || normalized.includes('hack') || normalized.includes('faille');

    const isPrivacyConfidential = 
      (normalized.includes('autre candidat') || normalized.includes('autres candidat') || 
       normalized.includes('liste des candidat') || normalized.includes('liste des postulant') ||
       (normalized.includes('cni') && (normalized.includes('autre') || normalized.includes('candidat') || normalized.includes('gens') || normalized.includes('citoyen'))) ||
       ((normalized.includes('telephone') || normalized.includes('coordonnee') || normalized.includes('contact')) && (normalized.includes('autre') || normalized.includes('candidat') || normalized.includes('maire') || normalized.includes('personnel')))) &&
      !normalized.includes('mon dossier') && !normalized.includes('ma candidature') && !normalized.includes('mon profil') && !normalized.includes('mes candidature') && !normalized.includes('mes document');

    const isMunicipalClassified = 
      normalized.includes('huis clos') || normalized.includes('secret de la mairie') ||
      normalized.includes('deliberation secrete') || normalized.includes('marche secret') || 
      normalized.includes('document classifie') || normalized.includes('budget secret') ||
      normalized.includes('pots de vin') || normalized.includes('corruption');

    if (isSalaryConfidential) {
      reply = `Par mesure de confidentialité et conformément aux règles de la fonction publique communale, les rémunérations individuelles et fiches de paie des élus et agents municipaux sont strictement confidentielles.\n\nEn revanche, si tu postules à une opportunité, la tranche d'indemnité ou la grille budgétaire liée au poste t'est expliquée en toute transparence par la Direction des Ressources Humaines.`;
      options = ["Voir les offres d'emploi", "Grille des stages", "Messagerie RH"];
    } else if (isSecurityConfidential) {
      reply = `Pour des raisons de sécurité informatique, les mots de passe, clés d'accès et configurations de nos serveurs municipaux sont strictly protégés.\n\nSi tu as égaré ton mot de passe candidat, tu peux facilement le réinitialiser depuis la page de connexion ou contacter l'assistance.`;
      options = ["Mot de passe oublié", "Support Citoyen", "Mon Profil"];
    } else if (isPrivacyConfidential) {
      reply = `Afin de préserver la vie privée de chaque candidat, nous ne communiquons pas d'informations sur les dossiers des autres postulants.\n\nTes propres candidatures et documents sont traités de façon strictement confidentielle et tu peux les consulter dans la rubrique « Mes Candidatures ».`;
      options = ["Mes Candidatures", "Mon Profil", "Contacter le Service RH"];
    } else if (isMunicipalClassified) {
      reply = `Les délibérations à huis clos et documents d'instruction internes relèvent du secret administratif communal.\n\nCependant, toutes les décisions publiques, avis de concours et comptes-rendus du Conseil Municipal sont affichés à l'Hôtel de Ville et sur cette plateforme dans la rubrique « Événements ».`;
      options = ["Événements Municipaux", "Offres d'emploi", "Horaires Mairie"];
    }

    // =========================================================================
    // 2. RÉPONSE AUX SALUTATIONS EXPLICITES
    // =========================================================================
    else if (isExplicitGreeting) {
      reply = nameLabel 
        ? `Bonjour ${nameLabel} ! C'est un plaisir d'échanger avec toi. Que puis-je faire pour toi aujourd'hui ? ` 
        : `Bonjour ! C'est un plaisir d'échanger avec toi. Que puis-je faire pour toi aujourd'hui ? `;
      options = ["Pièces à fournir", "Consulter les offres", "Demande de stage", "Horaires Mairie"];
    }

    // =========================================================================
    // 3. COMPRÉHENSION DIRECTE & FLUIDE DES INTENTIONS MUNICIPALES (STYLE CLAUDE/CHATGPT)
    // =========================================================================

    // A. Maire, Conseil Municipal, Autorités & Direction
    else if (normalized.includes('maire') || normalized.includes('bourgmestre') || normalized.includes('conseil municipal') || normalized.includes('dirige') || normalized.includes('patron') || normalized.includes('gouverne') || normalized.includes('administration') || normalized.includes('executif')) {
      reply = `La Mairie de la Commune de Soa est sous l'autorité de Monsieur le Maire et de son Conseil Municipal. Ils s'investissent au quotidien pour le développement local, le soutien à la jeunesse et le rayonnement de notre belle commune universitaire.\n\nL'administration s'appuie sur la Direction des Ressources Humaines et les différents services techniques pour accueillir, former et insérer les jeunes citoyens et diplômés.`;
      options = ["Horaires Mairie", "Demander un renseignement", "Offres d'emploi"];
    }

    // B. État Civil, Légalisations, Actes de naissance & Certificats
    else if (normalized.includes('legalis') || normalized.includes('etat civil') || normalized.includes('acte de naissance') || normalized.includes('mariage') || normalized.includes('deces') || normalized.includes('certificat') || normalized.includes('timbre') || normalized.includes('duplicata') || normalized.includes('residence')) {
      reply = `Voici les infos clés pour tes démarches d'état civil et de légalisation à la Mairie de Soa :\n\n• Légalisations de documents : Présente l'original avec sa copie lisible, muni d'un timbre fiscal réglementaire.\n• Actes de naissance & Certificats : Délivrés au Bureau Central de l'État Civil à l'Hôtel de Ville (du Lundi au Vendredi, 07h30 — 15h30).\n• Permanence d'urgence : Une équipe d'astreinte est assurée le week-end pour les déclarations de naissance et décès.`;
      options = ["Horaires Mairie", "Localisation Mairie", "Messagerie RH"];
    }

    // C. Stages (Académiques, Professionnels, Vacances) & Gratifications/Transports
    else if (normalized.includes('stage') || normalized.includes('stagiaire') || normalized.includes('academique') || normalized.includes('professionnel') || normalized.includes('vacance') || normalized.includes('gratification') || normalized.includes('indemnite') || normalized.includes('transport') || normalized.includes('paye') || normalized.includes('remunere') || normalized.includes('remuneration') || normalized.includes('convention')) {
      reply = `La Mairie de Soa accueille avec enthousiasme les étudiants (notamment de l'Université de Yaoundé II Soa) et les jeunes diplômés :\n\n- Stage Académique : Pour valider un diplôme (BTS, Licence, Master) — durée de 1 à 6 mois.\n- Stage Professionnel : Pour acquérir une expérience pratique solide — durée de 3 à 12 mois.\n- Stage de Vacances : Dédié aux jeunes résidents de Soa en période estivale.\n\nGratification & Transports : Conformément au règlement municipal, les stagiaires peuvent bénéficier d'une prise en charge des indemnités de déplacement selon les missions attribuées.\n\nPour postuler, c'est très simple : clique sur « Demande de Stage » dans ton tableau de bord !`;
      options = ["Demande de Stage", "Pièces à fournir", "Suivi de dossier"];
    }

    // D. Offres d'emploi, concours, embauche & travail
    else if (normalized.includes('offre') || normalized.includes('emploi') || normalized.includes('poste') || normalized.includes('recrutement') || normalized.includes('concours') || normalized.includes('embauche') || normalized.includes('job') || normalized.includes('travail') || normalized.includes('travailler') || normalized.includes('vacant') || normalized.includes('postuler')) {
      let activeJobsCount = 0;
      try {
        const jRes = await pool.query("SELECT COUNT(*) as count FROM jobs WHERE status = 'actif'");
        activeJobsCount = parseInt(jRes.rows[0].count, 10);
      } catch (e) {}

      reply = `Il y a actuellement ${activeJobsCount > 0 ? activeJobsCount + ' offre(s) d\'emploi active(s)' : 'des opportunités régulières'} publiées par le Service des Ressources Humaines de la Mairie de Soa.\n\nSur HireBridge Soa :\n• Ton profil est analysé pour afficher automatiquement ton niveau d'adéquation avec le poste.\n• Tu postules en 1 clic avec tes pièces numériques.\n• Tu reçois immédiatement ta décharge officielle avec cachet électronique dès la soumission.`;
      options = ["Consulter les offres", "Déposer un dossier", "Mon Profil"];
    }

    // E. Pièces et documents requis
    else if (normalized.includes('piece') || normalized.includes('document') || normalized.includes('pdf') || normalized.includes('fournir') || normalized.includes('justificatif') || normalized.includes('dossier a fournir') || normalized.includes('constituer')) {
      reply = `Voici le récapitulatif clair des pièces à préparer selon ta démarche :\n\n 1. Pour un Emploi (CDD / CDI) :\n• Curriculum Vitae (CV) actualisé au format PDF\n• Lettre de motivation adressée à Monsieur le Maire\n• Copie lisible de ta Carte Nationale d'Identité (CNI)\n• Copies certifiées conformes des diplômes requis\n\n 2. Pour un Stage (Académique ou Professionnel) :\n• Demande manuscrite timbrée adressée à Monsieur le Maire de Soa\n• CV actualisé\n• Certificat de scolarité ou attestation d'inscription universitaire\n• Copie de la CNI\n\nTu peux téléverser tous tes fichiers en toute sécurité en PDF depuis ton espace candidat.`;
      options = ["Déposer ma demande", "Voir les offres", "Mon Profil"];
    }

    // F. Formations municipales gratuites
    else if (normalized.includes('formation') || normalized.includes('gratuit') || normalized.includes('atelier') || normalized.includes('attestation de formation') || normalized.includes('bureautique') || normalized.includes('salubrite') || normalized.includes('ville propre') || normalized.includes('apprentissage')) {
      let trCount = 0;
      try {
        const tRes = await pool.query("SELECT COUNT(*) as count FROM trainings WHERE is_active = true");
        trCount = parseInt(tRes.rows[0].count, 10);
      } catch (e) {}

      reply = `La Commune de Soa offre des programmes de formations gratuites pour développer les compétences de sa jeunesse (${trCount > 0 ? trCount + ' session(s) disponible(s)' : 'programmes réguliers'}) !\n\nDomaines couverts :\n• Bureautique & Outils Numériques Administratifs\n• Salubrité Communale & Soa Ville Propre\n• Procédures d'État Civil & Accueil des Usagers\n• Fiscalité Locale & Recouvrement Municipal\n\nUne Attestation Officielle de Formation Municipale te sera délivrée à l'issue de chaque session validée.`;
      options = ["Voir les Formations", "Mes Inscriptions", "Messagerie RH"];
    }

    // G. Suivi des dossiers & Décharge Officielle
    else if (normalized.includes('suivi') || normalized.includes('statut') || normalized.includes('decharge') || normalized.includes('accuse') || normalized.includes('delai') || normalized.includes('quand') || normalized.includes('avancement')) {
      if (userId) {
        let appCount = 0;
        let lastApp = null;
        try {
          const aRes = await pool.query(`
            SELECT a.status, a.application_type, a.created_at, a.discharge_sent,
                   COALESCE(j.title, CASE 
                     WHEN a.application_type = 'stage_academique' THEN 'Stage Académique'
                     WHEN a.application_type = 'stage_professionnel' THEN 'Stage Professionnel'
                     WHEN a.application_type = 'stage_vacances' THEN 'Stage de Vacances'
                     ELSE 'Candidature Municipale'
                   END) as job_title 
            FROM applications a 
            LEFT JOIN jobs j ON a.job_id = j.id 
            WHERE a.user_id = $1 
            ORDER BY a.created_at DESC LIMIT 1
          `, [userId]);

          if (aRes.rows.length > 0) {
            lastApp = aRes.rows[0];
            const cRes = await pool.query("SELECT COUNT(*) as count FROM applications WHERE user_id = $1", [userId]);
            appCount = parseInt(cRes.rows[0].count, 10);
          }
        } catch (e) {}

        if (lastApp) {
          const formattedDate = new Date(lastApp.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
          const statusMap = {
            'en_attente': 'Dossier transmis — En attente d\'examen',
            'valide': 'Validé & Décharge transmise par e-mail',
            'retenu': 'Candidature Retenue / Sélectionné',
            'rejete': 'Non retenu (Motifs explicites communiqués)'
          };
          const statusText = statusMap[lastApp.status] || lastApp.status;

          reply = `Voici le point exact sur tes démarches auprès de la Mairie de Soa :\n\nTu as au total ${appCount} candidature(s) enregistrée(s).\n\nDernier dossier enregistré :\n• Intitulé : ${lastApp.job_title}\n• Statut actuel : ${statusText}\n• Date de dépôt : ${formattedDate}\n\nTa décharge officielle horodatée est disponible à tout moment dans ton espace « Mes Candidatures ».`;
        } else {
          reply = `Tu n'as pas encore déposé de candidature ou de demande de stage sur ton compte.\n\nN'hésite pas à parcourir nos offres d'emploi ou à soumettre une demande de stage en quelques clics !`;
        }
      } else {
        reply = `Pour consulter l'état d'avancement exact de ton dossier et télécharger ta décharge officielle, connecte-toi à ton compte et clique sur « Mes Candidatures ».`;
      }
      options = ["Mes Candidatures", "Demande de Stage", "Messagerie RH"];
    }

    // H. Explication des rejets & possibilité de recours
    else if (normalized.includes('rejet') || normalized.includes('refus') || normalized.includes('motif') || normalized.includes('pourquoi') || normalized.includes('recours') || normalized.includes('resoumettre') || normalized.includes('corriger') || normalized.includes('echoue')) {
      reply = `Si ton dossier fait l'objet d'un rejet, voici la procédure transparente mise en place par la Mairie de Soa :\n\n1. Notification détaillée : Tu reçois un e-mail officiel et une notification in-app expliquant les motifs précis du rejet (ex: pièce manquante, diplôme non certifié, inadéquation).\n2. Droit à la régularisation : Si la commission RH l'autorise, tu peux corriger ton dossier et le soumettre à nouveau depuis « Mes Candidatures ».\n3. Échange direct : Tu peux écrire directement à un conseiller via notre messagerie interne.`;
      options = ["Mes Candidatures", "Messagerie RH", "Support Citoyen"];
    }

    // I. Horaires, Localisation, Transport & Accès (Campus UY2 / Soa)
    else if (normalized.includes('horaire') || normalized.includes('heure') || normalized.includes('ouverture') || normalized.includes('fermeture') || normalized.includes('adresse') || normalized.includes('localisation') || normalized.includes('situer') || normalized.includes('ou se trouve') || normalized.includes('contact') || normalized.includes('telephone') || normalized.includes('email') || normalized.includes('mail') || normalized.includes('ouvert') || normalized.includes('transport') || normalized.includes('venir') || normalized.includes('universite') || normalized.includes('uy2')) {
      reply = `Voici les coordonnées et accès pratiques à l'Hôtel de Ville de Soa :\n\n Localisation :\n• Située au cœur de Soa (Mèfou-et-Afamba, Région du Centre).\n• Juste en face du Campus Principal de l'Université de Yaoundé II Soa (à 15-20 min de Yaoundé en taxi/brousse).\n\n Horaires :\n• Du Lundi au Vendredi : 07h30 — 15h30 (Journée continue).\n• Samedi & Dimanche : Bureaux administratifs fermés (Service d'astreinte État Civil pour déclarations de naissances/décès).\n\n Contact Direct : contact@mairie-soa.cm / rh@soa.cm`;
      options = ["Messagerie RH", "Voir les offres", "Événements Municipaux"];
    }

    // J. Messagerie RH & Discussion Directe
    else if (normalized.includes('rh') || normalized.includes('messagerie') || normalized.includes('ecrire') || normalized.includes('agent') || normalized.includes('parler') || normalized.includes('discuter') || normalized.includes('permanence') || normalized.includes('joindre')) {
      reply = `Tu peux dialoguer en direct avec nos chargés de recrutement et agents administratifs !\n\nRends-toi dans la rubrique « Messagerie RH » de ton tableau de bord :\n• En journée (07h30 — 15h30) : Réponses en temps réel par l'équipe d'astreinte.\n• En dehors de ces heures : Laisse ton message, il sera traité dès la réouverture des bureaux.`;
      options = ["Ouvrir la Messagerie RH", "Horaires Mairie", "Support Citoyen"];
    }

    // K. Support Technique, Bugs & Tickets
    else if (normalized.includes('bug') || normalized.includes('erreur') || normalized.includes('bloque') || normalized.includes('marche pas') || normalized.includes('fonctionne pas') || normalized.includes('probleme') || normalized.includes('ticket') || normalized.includes('reclamation') || normalized.includes('support') || normalized.includes('aide')) {
      reply = `Si tu rencontres le moindre souci technique sur la plateforme :\n\n1. Ouvre l'onglet « Aide & Support ».\n2. Remplis le formulaire en décrivant le problème.\n3. Un ticket unique (#TKT-XXXX) te sera attribué et nos techniciens prendront en charge ta demande.`;
      options = ["Aide & Support", "Messagerie RH", "Mon Profil"];
    }

    // L. Événements Municipaux
    else if (normalized.includes('evenement') || normalized.includes('agenda') || normalized.includes('calendrier') || normalized.includes('conseil') || normalized.includes('foire') || normalized.includes('fete') || normalized.includes('actualite') || normalized.includes('action')) {
      reply = `Retrouve l'agenda de la commune dans la rubrique « Événements & Actualités » :\n• Conseils municipaux ouverts au public\n• Forums de l'emploi étudiant & carrefours des métiers\n• Journées citoyennes « Soa Ville Propre »`;
      options = ["Événements Municipaux", "Formations Gratuites", "Offres d'emploi"];
    }

    // M. Profil & CV
    else if (normalized.includes('profil') || normalized.includes('compte') || normalized.includes('modifier') || normalized.includes('diplome') || normalized.includes('photo') || normalized.includes('avatar') || normalized.includes('fiche candidate')) {
      reply = `Depuis l'onglet « Mon Profil », tu peux :\n• Mettre à jour tes diplômes et attestations certifiées\n• Ajuster tes compétences et tes expériences\n• Télécharger ta Fiche Officielle du Candidat certifiée (PDF A4)`;
      options = ["Mon Profil", "Mes Candidatures", "Consulter les offres"];
    }

    // N. DYNAMIQUE FALLBACK CHALEUREUX & FLUIDE (STYLE CLAUDE / CHATGPT)
    else {
      let topicHint = "sur les services de la Mairie de Soa";
      if (normalized.includes('delai') || normalized.includes('temps') || normalized.includes('duree') || normalized.includes('quand') || normalized.includes('combien de temps')) {
        topicHint = "concernant les délais de traitement des dossiers communaux";
      } else if (normalized.includes('prix') || normalized.includes('cout') || normalized.includes('payant') || normalized.includes('frais') || normalized.includes('combien')) {
        topicHint = "concernant les tarifs et frais de démarches à la Mairie de Soa";
      } else if (normalized.includes('urbanisme') || normalized.includes('terrain') || normalized.includes('permis') || normalized.includes('construction')) {
        topicHint = "concernant l'urbanisme ou l'aménagement à Soa";
      } else if (normalized.includes('etudiant') || normalized.includes('ecole') || normalized.includes('universite') || normalized.includes('fac') || normalized.includes('uy2')) {
        topicHint = "concernant la vie étudiante et les services aux jeunes à Soa";
      }

      reply = `C'est une très bonne question ${topicHint} !\n\nConcernant ta demande (« ${rawMsg.length > 60 ? rawMsg.substring(0, 60) + '...' : rawMsg} ») :\n\n• Pour une démarche administrative ou un renseignement sur place, les bureaux de la Mairie de Soa t'accueillent du lundi au vendredi (07h30 — 15h30).\n• Pour tes candidatures ou un échange direct avec l'équipe RH, tu peux écrire via l'onglet « Messagerie RH ».\n• Si tu as besoin d'une assistance technique, utilise la rubrique « Aide & Support ».\n\nN'hésite pas si tu souhaites préciser ta question !`;
      options = ["Messagerie RH", "Aide & Support", "Consulter les offres", "Horaires Mairie"];
    }

    res.json({ reply, options });
  } catch (err) {
    console.error('Erreur /api/chatbot/query:', err);
    res.json({ 
      reply: "Bonjour ! Excusez-moi, une petite baisse de réseau est survenue. Veuillez m'excuser et poser à nouveau votre question, je me ferai une joie de vous répondre !",
      options: ["Pièces à fournir", "Consulter les offres", "Demande de Stage", "Horaires Mairie"]
    });
  }
});

// ==========================================
// 12. MESSAGERIE INTERNE RH & CANDIDATS (AVEC STATUT DISPONIBILITÉ & NOTICE)
// ==========================================

// Obtenir le statut de permanence RH et la notice
app.get('/api/rh/status', async (req, res) => {
  try {
    const rhUser = await pool.query("SELECT id, nom, prenom, email FROM users WHERE role = 'admin_rh' OR role = 'super_admin' ORDER BY id ASC LIMIT 1");
    const rhSettings = await pool.query("SELECT * FROM rh_settings ORDER BY id ASC LIMIT 1");
    
    const settings = rhSettings.rows[0] || {
      is_available: true,
      status_text: 'En ligne & Disponible',
      working_hours: 'Du Lundi au Vendredi, 07h30 — 15h30',
      notice_text: 'Ce service de messagerie est strictement et exclusivement réservé aux échanges professionnels relatifs à vos candidatures, demandes de stage et formations auprès de la Mairie de Soa. Tout abus ou propos déplacé entraînera la clôture définitive du dossier.',
      auto_reply: 'Bonjour. Votre message a bien été transmis au Service RH de la Mairie de Soa. Un agent examinera votre demande durant les heures de service (07h30 - 15h30).'
    };

    res.json({
      ...settings,
      rh_agent: rhUser.rows[0] || { id: 6, nom: 'Service RH', prenom: 'Administrateur' }
    });
  } catch (err) {
    console.error('Erreur GET /api/rh/status:', err);
    res.status(500).json({ message: 'Erreur statut RH.' });
  }
});

// Mettre à jour le statut de disponibilité (Admin RH)
app.put('/api/rh/status', async (req, res) => {
  try {
    const { is_available, status_text, auto_reply } = req.body;
    const r = await pool.query(`
      UPDATE rh_settings SET
        is_available = COALESCE($1, is_available),
        status_text = COALESCE($2, status_text),
        auto_reply = COALESCE($3, auto_reply),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM rh_settings ORDER BY id ASC LIMIT 1)
      RETURNING *
    `, [is_available, status_text, auto_reply]);

    res.json({ message: 'Statut de disponibilité RH mis à jour !', settings: r.rows[0] });
  } catch (err) {
    console.error('Erreur PUT /api/rh/status:', err);
    res.status(500).json({ message: 'Erreur mise à jour statut RH.' });
  }
});


// 1. Compteur de messages non lus pour un utilisateur
app.get('/api/messages/unread-count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const uId = parseInt(userId, 10);
    if (!uId || isNaN(uId)) return res.json({ unread_count: 0 });

    const r = await pool.query(
      "SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false",
      [uId]
    );
    res.json({ unread_count: parseInt(r.rows[0].count, 10) || 0 });
  } catch (err) {
    res.status(500).json({ unread_count: 0 });
  }
});

// 2. Historique conversation côté Candidat
app.get('/api/messages/candidate-conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const uId = parseInt(userId, 10);
    if (!uId || isNaN(uId)) return res.json([]);

    // Marquer comme lus les messages reçus par ce candidat
    await pool.query('UPDATE messages SET is_read = true WHERE receiver_id = $1', [uId]);

    const msgs = await pool.query(`
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.subject,
        m.attachment_url,
        m.is_read,
        m.created_at,
        s.nom as sender_nom, s.prenom as sender_prenom, s.role as sender_role,
        r.nom as receiver_nom, r.prenom as receiver_prenom, r.role as receiver_role
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = $1) OR (m.receiver_id = $1)
      ORDER BY m.created_at ASC;
    `, [uId]);

    res.json(msgs.rows);
  } catch (err) {
    console.error('Erreur GET /api/messages/candidate-conversation:', err);
    res.status(500).json({ message: 'Erreur historique messagerie candidat.' });
  }
});

// 3. Envoi d'un message (RH -> Candidat ou Candidat -> RH)
app.post('/api/messages/send', upload.single('attachment'), async (req, res) => {
  try {
    let { sender_id, receiver_id, content, subject } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Le contenu du message ne peut pas être vide.' });
    }

    let senderId = parseInt(sender_id, 10);
    let receiverId = parseInt(receiver_id, 10);

    // Vérifier et résoudre l'expéditeur
    let checkSender = null;
    if (senderId && !isNaN(senderId)) {
      const q = await pool.query('SELECT id, role, nom, prenom FROM users WHERE id = $1', [senderId]);
      if (q.rows.length > 0) checkSender = q.rows[0];
    }
    if (!checkSender) {
      const defaultSender = await pool.query("SELECT id, role, nom, prenom FROM users WHERE role IN ('admin_rh', 'super_admin') ORDER BY id ASC LIMIT 1");
      if (defaultSender.rows.length > 0) {
        checkSender = defaultSender.rows[0];
        senderId = defaultSender.rows[0].id;
      }
    }

    // Vérifier et résoudre le destinataire
    let checkReceiver = null;
    if (receiverId && !isNaN(receiverId)) {
      const q = await pool.query('SELECT id, role, nom, prenom FROM users WHERE id = $1', [receiverId]);
      if (q.rows.length > 0) checkReceiver = q.rows[0];
    }
    if (!checkReceiver) {
      // Si l'expéditeur est un candidat, trouver un agent RH à qui transmettre
      if (checkSender && (checkSender.role === 'candidat' || checkSender.role === 'candidate')) {
        const lastRh = await pool.query(`
          SELECT sender_id FROM messages 
          WHERE receiver_id = $1 AND sender_id IN (SELECT id FROM users WHERE role IN ('admin_rh', 'super_admin'))
          ORDER BY created_at DESC LIMIT 1
        `, [senderId]);
        if (lastRh.rows.length > 0) {
          const rhQ = await pool.query('SELECT id, role, nom, prenom FROM users WHERE id = $1', [lastRh.rows[0].sender_id]);
          if (rhQ.rows.length > 0) checkReceiver = rhQ.rows[0];
        }
      }
      if (!checkReceiver) {
        const defaultReceiver = await pool.query("SELECT id, role, nom, prenom FROM users WHERE role IN ('admin_rh', 'super_admin') ORDER BY id ASC LIMIT 1");
        if (defaultReceiver.rows.length > 0) {
          checkReceiver = defaultReceiver.rows[0];
          receiverId = defaultReceiver.rows[0].id;
        }
      }
    }

    if (checkSender) {
      senderId = checkSender.id;
    }
    if (checkReceiver) {
      receiverId = checkReceiver.id;
    }

    if (!senderId || isNaN(senderId) || !receiverId || isNaN(receiverId)) {
      return res.status(400).json({ message: 'Impossible d identifier l expéditeur ou le destinataire.' });
    }

    let attachment_url = null;
    if (req.file) {
      attachment_url = `http://localhost:5000/uploads/${req.file.filename}`;
    } else if (req.body.attachment_url) {
      attachment_url = req.body.attachment_url;
    }

    const ins = await pool.query(`
      INSERT INTO messages (sender_id, receiver_id, content, subject, attachment_url, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
      RETURNING *;
    `, [senderId, receiverId, content.trim(), subject || 'Général', attachment_url]);

    const newMsg = ins.rows[0];

    // Notification automatique pour le destinataire
    try {
      const senderData = checkSender || { nom: 'Service RH', prenom: 'Mairie de Soa', role: 'admin_rh' };
      const isSenderRh = senderData.role === 'admin_rh' || senderData.role === 'super_admin';
      const notifTitle = isSenderRh ? 'Nouveau message officiel du Service RH' : `Nouveau message de ${senderData.prenom} ${senderData.nom}`;
      const notifMsg = `Sujet : ${subject || 'Information RH'} — "${content.trim().slice(0, 75)}${content.trim().length > 75 ? '...' : ''}"`;
      await createNotification(receiverId, notifTitle, notifMsg, 'message_rh', 'messages', 'fa-solid fa-comments');
    } catch (notifErr) {
      console.log('Info notification message:', notifErr.message);
    }

    // Gestion de la réponse automatique si RH hors permanence
    let autoReplied = false;
    const rhSettings = await pool.query("SELECT is_available, auto_reply FROM rh_settings ORDER BY id ASC LIMIT 1");
    if (rhSettings.rows.length > 0 && !rhSettings.rows[0].is_available) {
      if (checkSender && (checkSender.role === 'candidat' || checkSender.role === 'candidate')) {
        await pool.query(`
          INSERT INTO messages (sender_id, receiver_id, content, subject, is_read, created_at)
          VALUES ($1, $2, $3, $4, false, NOW() + INTERVAL '1 second');
        `, [
          receiverId,
          senderId,
          rhSettings.rows[0].auto_reply || 'Bonjour. Le Service RH est actuellement hors permanence. Votre demande sera traitée dès la reprise de service.',
          'Réponse Automatique • Permanence RH'
        ]);
        autoReplied = true;
      }
    }

    res.status(201).json({
      message: 'Message transmis avec succès !',
      sent_message: newMsg,
      data: newMsg,
      auto_replied: autoReplied
    });
  } catch (err) {
    console.error('Erreur POST /api/messages/send:', err);
    res.status(500).json({ message: 'Erreur lors de l envoi du message.', error: err.message });
  }
});

// 4. Liste de toutes les conversations actives (Vue Admin RH)
app.get('/api/admin/messages/conversations', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT 
        c.id as candidate_id,
        c.nom,
        c.prenom,
        c.email,
        c.phone,
        c.role,
        c.avatar_url,
        cp.title as candidate_title,
        sub.content as last_message,
        sub.created_at as last_message_date,
        sub.subject as last_subject,
        COALESCE(unread.count, 0) as unread_count
      FROM users c
      LEFT JOIN candidate_profiles cp ON cp.user_id = c.id
      LEFT JOIN LATERAL (
        SELECT content, created_at, subject
        FROM messages
        WHERE sender_id = c.id OR receiver_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) sub ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as count
        FROM messages
        WHERE sender_id = c.id AND is_read = false
      ) unread ON true
      WHERE c.role IN ('candidat', 'candidate')
      ORDER BY sub.created_at DESC NULLS LAST, c.created_at DESC;
    `);

    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/admin/messages/conversations:', err);
    res.status(500).json({ message: 'Erreur chargement conversations RH.' });
  }
});

// Détail conversation pour Admin RH avec un candidat spécifique
app.get('/api/admin/messages/conversation/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candId = parseInt(candidateId, 10);

    // Marquer les messages envoyés par ce candidat comme lus
    await pool.query('UPDATE messages SET is_read = true WHERE sender_id = $1', [candId]);

    const msgs = await pool.query(`
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.subject,
        m.attachment_url,
        m.is_read,
        m.created_at,
        s.nom as sender_nom, s.prenom as sender_prenom, s.role as sender_role,
        r.nom as receiver_nom, r.prenom as receiver_prenom, r.role as receiver_role
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.receiver_id = r.id
      WHERE (m.sender_id = $1) OR (m.receiver_id = $1)
      ORDER BY m.created_at ASC;
    `, [candId]);

    res.json(msgs.rows);
  } catch (err) {
    console.error('Erreur GET /api/admin/messages/conversation:', err);
    res.status(500).json({ message: 'Erreur historique conversation.' });
  }
});

// ==========================================
// 13. CENTRE DE NOTIFICATIONS & ALERTES CITOYENNES
// ==========================================

// Fonction utilitaire pour générer des notifications
async function createNotification(userId, title, message, type = 'information', actionTab = 'dashboard', icon = 'fa-solid fa-bell') {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, action_tab, is_read, icon)
      VALUES ($1, $2, $3, $4, $5, false, $6)
    `, [userId, title, message, type, actionTab, icon]);
  } catch (err) {
    console.error('Erreur createNotification:', err.message);
  }
}

// Fonction utilitaire pour notifier tous les administrateurs RH & SuperAdmins
async function notifyHrAdmins(title, message, type = 'candidature', actionTab = 'applications', icon = 'fa-solid fa-user-plus') {
  try {
    const hrUsers = await pool.query(
      "SELECT id FROM users WHERE role = 'admin_rh' OR role = 'super_admin'"
    );
    for (const hr of hrUsers.rows) {
      await createNotification(hr.id, title, message, type, actionTab, icon);
    }
  } catch (err) {
    console.error('Erreur notifyHrAdmins:', err.message);
  }
}

// Récupérer toutes les notifications d'un utilisateur
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const unreadCount = r.rows.filter(n => !n.is_read).length;
    res.json({
      notifications: r.rows,
      unread_count: unreadCount
    });
  } catch (err) {
    console.error('Erreur GET /api/notifications:', err);
    res.status(500).json({ notifications: [], unread_count: 0 });
  }
});

// Marquer une notification comme lue
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Marquer toutes les notifications d'un utilisateur comme lues
app.put('/api/notifications/mark-all-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Supprimer une notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ message: 'Notification supprimée.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Supprimer toutes les notifications lues d'un utilisateur
app.delete('/api/notifications/clear-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('DELETE FROM notifications WHERE user_id = $1 AND is_read = true', [userId]);
    res.json({ message: 'Notifications lues supprimées.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// Envoi d'une notification officielle personnalisée par l'Admin RH
app.post('/api/admin/notifications/broadcast', async (req, res) => {
  try {
    const { target, userId, title, message, type, actionTab, icon } = req.body;

    if (target === 'all_candidates') {
      const candRes = await pool.query("SELECT id FROM users WHERE role = 'candidate' OR role = 'candidat'");
      for (const cand of candRes.rows) {
        await createNotification(
          cand.id,
          title || 'Annonce Officielle de la Mairie de Soa',
          message,
          type || 'actualite',
          actionTab || 'dashboard',
          icon || 'fa-solid fa-bullhorn'
        );
      }
      res.json({ message: `Notification transmise à ${candRes.rows.length} candidat(s).` });
    } else if (userId) {
      await createNotification(
        userId,
        title || 'Information Personnalisée RH',
        message,
        type || 'information',
        actionTab || 'dashboard',
        icon || 'fa-solid fa-bell'
      );
      res.json({ message: 'Notification transmise avec succès au candidat.' });
    } else {
      res.status(400).json({ message: 'Cible de notification non spécifiée.' });
    }
  } catch (err) {
    console.error('Erreur broadcast notification:', err);
    res.status(500).json({ message: 'Erreur lors de la diffusion.' });
  }
});

// ==========================================
// 14. PARAMÈTRES DU COMPTE & PRÉFÉRENCES UTILISATEUR
// ==========================================

// Récupérer les paramètres d'un utilisateur
app.get('/api/user/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let r = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);

    if (r.rows.length === 0) {
      await pool.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
      r = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    }

    res.json(r.rows[0] || {});
  } catch (err) {
    console.error('Erreur GET /api/user/settings:', err);
    res.status(500).json({ message: 'Erreur récupération paramètres.' });
  }
});

// Mettre à jour les préférences de notifications et confidentialité
app.put('/api/user/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      email_notif_jobs,
      email_notif_applications,
      email_notif_trainings,
      email_notif_messages,
      email_notif_events,
      push_notif_enabled,
      background_notif_enabled,
      sms_notif_enabled,
      profile_visibility,
      allow_ai_matching,
      theme_mode,
      language
    } = req.body;

    const r = await pool.query(`
      UPDATE user_settings SET
        email_notif_jobs = COALESCE($1, email_notif_jobs),
        email_notif_applications = COALESCE($2, email_notif_applications),
        email_notif_trainings = COALESCE($3, email_notif_trainings),
        email_notif_messages = COALESCE($4, email_notif_messages),
        email_notif_events = COALESCE($5, email_notif_events),
        push_notif_enabled = COALESCE($6, push_notif_enabled),
        background_notif_enabled = COALESCE($7, background_notif_enabled),
        sms_notif_enabled = COALESCE($8, sms_notif_enabled),
        profile_visibility = COALESCE($9, profile_visibility),
        allow_ai_matching = COALESCE($10, allow_ai_matching),
        theme_mode = COALESCE($11, theme_mode),
        language = COALESCE($12, language),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $13
      RETURNING *
    `, [
      email_notif_jobs,
      email_notif_applications,
      email_notif_trainings,
      email_notif_messages,
      email_notif_events,
      push_notif_enabled,
      background_notif_enabled,
      sms_notif_enabled,
      profile_visibility,
      allow_ai_matching,
      theme_mode,
      language,
      userId
    ]);

    // Enregistrer une notification
    await createNotification(
      userId,
      'Préférences mises à jour',
      'Vos paramètres de notifications et de confidentialité ont été enregistrés avec succès.',
      'compte_securite',
      'settings',
      'fa-solid fa-gear'
    );

    res.json({ message: 'Paramètres mis à jour avec succès !', settings: r.rows[0] });
  } catch (err) {
    console.error('Erreur PUT /api/user/settings:', err);
    res.status(500).json({ message: 'Erreur mise à jour paramètres.' });
  }
});

// Modification sécurisée du mot de passe
app.put('/api/user/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Veuillez renseigner tous les champs obligatoires.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    const uRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (uRes.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const match = await bcrypt.compare(currentPassword, uRes.rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ message: 'Le mot de passe actuel renseigné est incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    await createNotification(
      userId,
      'Mot de passe modifié',
      'Le mot de passe de votre compte citoyen a été mis à jour avec succès.',
      'compte_securite',
      'settings',
      'fa-solid fa-lock'
    );

    res.json({ message: 'Votre mot de passe a été modifié avec succès !' });
  } catch (err) {
    console.error('Erreur change-password:', err);
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe.' });
  }
});

// Export complet des données personnelles (Format JSON téléchargeable)
app.get('/api/user/export-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [userRes, profRes, appsRes, diplRes, trAppsRes, evRes, msgRes] = await Promise.all([
      pool.query('SELECT id, nom, prenom, email, phone, role, region, ville, created_at FROM users WHERE id = $1', [userId]),
      pool.query('SELECT * FROM candidate_profiles WHERE user_id = $1', [userId]),
      pool.query('SELECT a.*, j.title as job_title FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.user_id = $1', [userId]),
      pool.query('SELECT * FROM candidate_diplomas WHERE user_id = $1', [userId]),
      pool.query('SELECT ta.*, t.title as training_title FROM training_applications ta JOIN trainings t ON ta.training_id = t.id WHERE ta.user_id = $1', [userId]),
      pool.query('SELECT er.*, me.title as event_title, me.event_date FROM event_registrations er JOIN municipal_events me ON er.event_id = me.id WHERE er.user_id = $1', [userId]),
      pool.query('SELECT id, content, subject, created_at, sender_id, receiver_id FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId])
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const exportData = {
      export_date: new Date().toISOString(),
      institution: 'Mairie de la Commune de Soa — République du Cameroun',
      user: userRes.rows[0],
      profile: profRes.rows[0] || null,
      diplomas_and_certifications: diplRes.rows,
      job_and_internship_applications: appsRes.rows,
      training_applications: trAppsRes.rows,
      municipal_events_registered: evRes.rows,
      messages_history: msgRes.rows
    };

    res.json(exportData);
  } catch (err) {
    console.error('Erreur export-data:', err);
    res.status(500).json({ message: 'Erreur lors de l\'export des données.' });
  }
});

// Suppression définitive du compte avec vérification de sécurité
app.delete('/api/user/delete-account', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ message: 'Veuillez saisir votre mot de passe pour confirmer la suppression.' });
    }

    const uRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (uRes.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const match = await bcrypt.compare(password, uRes.rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ message: 'Mot de passe incorrect. Suppression refusée.' });
    }

    // Suppression en cascade automatique grâce aux clés étrangères
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Votre compte et l\'intégralité de vos dossiers communaux ont été définitivement supprimés.' });
  } catch (err) {
    console.error('Erreur delete-account:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression du compte.' });
  }
});

// ==========================================
// 15. AIDE, SUPPORT & RÉCLAMATIONS CITOYENNES
// ==========================================

// Récupérer les tickets d'un candidat
app.get('/api/support/tickets/candidate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const r = await pool.query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/support/tickets/candidate:', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des tickets.' });
  }
});

// Créer un nouveau ticket de support citoyen
app.post('/api/support/tickets', async (req, res) => {
  try {
    const { userId, category, subject, message, priority } = req.body;
    if (!userId || !category || !message) {
      return res.status(400).json({ message: 'Veuillez renseigner tous les champs obligatoires du ticket.' });
    }

    const finalSubject = subject && subject.trim() 
      ? subject.trim() 
      : `${category || 'Demande'} - ${message.trim().substring(0, 40)}${message.trim().length > 40 ? '...' : ''}`;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `SOA-TICKET-${new Date().getFullYear()}-${randomSuffix}`;

    const r = await pool.query(`
      INSERT INTO support_tickets (user_id, ticket_number, category, subject, message, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'en_attente')
      RETURNING *
    `, [
      userId,
      ticketNumber,
      category || 'Dossier & Candidature',
      finalSubject,
      message.trim(),
      priority || 'normale'
    ]);

    const newTicket = r.rows[0];

    // Notification automatique pour le candidat
    await createNotification(
      userId,
      `Ticket de support ouvert (${ticketNumber})`,
      `Votre demande d'assistance concernant "${finalSubject}" a été transmise aux services municipaux de Soa.`,
      'information',
      'support',
      'fa-solid fa-headset'
    );

    // Notification automatique pour les admins RH
    try {
      await notifyHrAdmins(
        `Nouveau ticket support (${ticketNumber})`,
        `Un nouveau ticket de support (${category}) a été ouvert : "${finalSubject}".`,
        'support',
        'support',
        'fa-solid fa-headset'
      );
    } catch (hrNotifErr) {
      console.error('Erreur notifyHrAdmins ticket:', hrNotifErr.message);
    }

    res.status(201).json({
      message: 'Votre ticket d\'assistance a été enregistré avec succès ! Un agent municipal traitera votre demande dans les plus brefs délais.',
      ticket: newTicket
    });
  } catch (err) {
    console.error('Erreur POST /api/support/tickets:', err);
    res.status(500).json({ message: 'Erreur lors de la création du ticket d\'assistance.' });
  }
});

// Récupérer tous les tickets pour l'administration RH
app.get('/api/admin/support/tickets', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT st.*, u.nom as user_nom, u.prenom as user_prenom, u.email as user_email, u.phone as user_phone
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/admin/support/tickets:', err);
    res.status(500).json({ message: 'Erreur récupération des tickets support.' });
  }
});

// Réponse administrative à un ticket de support
app.put('/api/admin/support/tickets/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_response, status } = req.body;

    const r = await pool.query(`
      UPDATE support_tickets SET
        admin_response = $1,
        status = COALESCE($2, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [admin_response, status || 'resolu', id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket introuvable.' });
    }

    const updatedTicket = r.rows[0];

    // Alerter le candidat par notification
    await createNotification(
      updatedTicket.user_id,
      `Réponse à votre ticket ${updatedTicket.ticket_number}`,
      `Le Support Municipal a répondu à votre demande : "${updatedTicket.subject}". Consultez les détails dans l'onglet Aide & Support.`,
      'information',
      'support',
      'fa-solid fa-headset'
    );

    res.json({ message: 'Réponse transmise au citoyen avec succès !', ticket: updatedTicket });
  } catch (err) {
    console.error('Erreur reply support ticket:', err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de la réponse.' });
  }
});

// ==========================================
// 16. SUPER ADMIN & CONTRÔLE TOTAL DU SYSTÈME
// ==========================================

// 1. Métriques globales et surveillance système
app.get('/api/superadmin/metrics', async (req, res) => {
  try {
    const [
      usersCount,
      candidatesCount,
      adminsRhCount,
      superAdminsCount
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'candidat'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin_rh' OR role = 'admin' OR role = 'rh'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'")
    ]);

    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
      total_users: parseInt(usersCount.rows[0].count, 10),
      total_candidates: parseInt(candidatesCount.rows[0].count, 10),
      total_admins_rh: parseInt(adminsRhCount.rows[0].count, 10),
      total_super_admins: parseInt(superAdminsCount.rows[0].count, 10),
      system_status: 'online',
      database_status: 'connected',
      uptime_seconds: Math.floor(uptimeSeconds),
      memory_rss_mb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      environment: process.env.NODE_ENV || 'production',
      server_time: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur GET /api/superadmin/metrics:', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des métriques système.' });
  }
});

// 2. Liste de tous les comptes Admin RH
app.get('/api/superadmin/admins-rh', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, nom, prenom, email, phone, role, region, ville, created_at, status
      FROM users
      WHERE role = 'admin_rh' OR role = 'admin' OR role = 'rh'
      ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Erreur GET /api/superadmin/admins-rh:', err);
    res.status(500).json({ message: 'Erreur chargement des comptes RH.' });
  }
});

// 3. Créer un nouveau compte Admin RH à la volée
app.post('/api/superadmin/admins-rh', async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, department } = req.body;
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: 'Nom, prénom, e-mail et mot de passe sont obligatoires.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [emailNorm]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Un utilisateur avec cette adresse e-mail existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const r = await pool.query(`
      INSERT INTO users (nom, prenom, genre, email, password_hash, role, region, ville, phone, status)
      VALUES ($1, $2, 'Autre', $3, $4, 'admin_rh', $5, 'Soa', $6, 'actif')
      RETURNING id, nom, prenom, email, role, region, ville, phone, created_at, status
    `, [
      nom.trim(),
      prenom.trim(),
      emailNorm,
      passwordHash,
      department ? `Service RH • ${department}` : 'Direction des Ressources Humaines',
      phone || '+237 677 00 00 00'
    ]);

    const newAdmin = r.rows[0];

    // Créer les paramètres initiaux
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [newAdmin.id]);

    res.status(201).json({
      message: `Compte Admin RH créé avec succès pour ${newAdmin.prenom} ${newAdmin.nom} (${newAdmin.email}) !`,
      admin: newAdmin
    });
  } catch (err) {
    console.error('Erreur POST /api/superadmin/admins-rh:', err);
    res.status(500).json({ message: 'Erreur lors de la création du compte Admin RH.' });
  }
});

// 4. Modifier un compte Admin RH (ou réinitialiser son mot de passe)
app.put('/api/superadmin/admins-rh/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, phone, department, status, password } = req.body;

    if (password && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
    }

    const r = await pool.query(`
      UPDATE users SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        email = COALESCE(LOWER($3), email),
        phone = COALESCE($4, phone),
        region = COALESCE($5, region),
        status = COALESCE($6, status)
      WHERE id = $7
      RETURNING id, nom, prenom, email, role, region, ville, phone, created_at, status
    `, [
      nom ? nom.trim() : null,
      prenom ? prenom.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      department ? `Service RH • ${department}` : null,
      status || null,
      id
    ]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Compte Admin RH introuvable.' });
    }

    res.json({ message: 'Compte Admin RH mis à jour avec succès !', admin: r.rows[0] });
  } catch (err) {
    console.error('Erreur PUT /api/superadmin/admins-rh:', err);
    res.status(500).json({ message: 'Erreur mise à jour compte RH.' });
  }
});

// 5. Supprimer un compte Admin RH
app.delete('/api/superadmin/admins-rh/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT role, email FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (check.rows[0].role === 'super_admin') {
      return res.status(403).json({ message: 'Impossible de supprimer un compte Super Admin principal.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: `Compte ${check.rows[0].email} supprimé avec succès.` });
  } catch (err) {
    console.error('Erreur DELETE /api/superadmin/admins-rh:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
});

// Créer N'IMPORTE QUEL compte depuis le Cockpit Super Admin (Candidat, Admin RH, Super Admin)
app.post('/api/superadmin/create-account', async (req, res) => {
  try {
    const { nom, prenom, email, password, role, phone, region, ville } = req.body;
    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ message: 'Nom, prénom, email, mot de passe et rôle sont obligatoires.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [emailNorm]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Un utilisateur avec cette adresse e-mail existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const validRole = ['candidat', 'admin_rh', 'super_admin'].includes(role) ? role : 'candidat';

    const r = await pool.query(`
      INSERT INTO users (nom, prenom, genre, email, password_hash, role, region, ville, phone, status)
      VALUES ($1, $2, 'Autre', $3, $4, $5, $6, $7, $8, 'actif')
      RETURNING id, nom, prenom, email, role, region, ville, phone, created_at, status
    `, [
      nom.trim(),
      prenom.trim(),
      emailNorm,
      passwordHash,
      validRole,
      region || (validRole === 'candidat' ? 'Soa / Centre' : 'Administration Municipale'),
      ville || 'Soa',
      phone || '+237 600 00 00 00'
    ]);

    const newUser = r.rows[0];
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [newUser.id]);

    res.status(201).json({
      message: `Compte ${validRole.toUpperCase()} créé avec succès pour ${newUser.prenom} ${newUser.nom} (${newUser.email}) !`,
      user: newUser
    });
  } catch (err) {
    console.error('Erreur POST /api/superadmin/create-account:', err);
    res.status(500).json({ message: 'Erreur lors de la création du compte.' });
  }
});

// Supprimer n'importe quel compte utilisateur (Super Admin)
app.delete('/api/superadmin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id, role, email, nom, prenom FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (check.rows[0].role === 'super_admin' && parseInt(id, 10) === 1) {
      return res.status(403).json({ message: 'Impossible de supprimer le compte Super Admin racine (ID 1).' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: `Le compte ${check.rows[0].prenom} ${check.rows[0].nom} (${check.rows[0].email}) a été supprimé définitivement.` });
  } catch (err) {
    console.error('Erreur DELETE /api/superadmin/users/:id:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression du compte.' });
  }
});

// 6. Tous les utilisateurs (super admin)
app.get('/api/admin/users', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nom, prenom, email, role, region, ville, phone, created_at, status FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// 7. Changer le rôle d'un utilisateur
app.put('/api/admin/users/:id/role', async (req, res) => {
  try {
    const r = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, nom, prenom, email, role, status', [req.body.role, req.params.id]);
    res.json({ message: 'Rôle mis à jour !', user: r.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur.' });
  }
});

// 8. Basculer le statut d'un utilisateur (Actif / Suspendu)
app.put('/api/superadmin/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const r = await pool.query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id, nom, prenom, email, role, status', [status || 'actif', id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({ message: `Statut mis à jour (${status})`, user: r.rows[0] });
  } catch (err) {
    console.error('Erreur status user:', err);
    res.status(500).json({ message: 'Erreur mise à jour statut.' });
  }
});

// 9. Mise à jour des identifiants Super Admin (email, nom, mot de passe)
app.put('/api/superadmin/profile', async (req, res) => {
  try {
    const { userId, nom, prenom, email, newPassword } = req.body;
    if (!userId) return res.status(400).json({ message: 'ID utilisateur requis.' });

    if (newPassword && newPassword.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    }

    const r = await pool.query(`
      UPDATE users SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        email = COALESCE(LOWER($3), email)
      WHERE id = $4 AND role = 'super_admin'
      RETURNING id, nom, prenom, email, role, status
    `, [nom ? nom.trim() : null, prenom ? prenom.trim() : null, email ? email.trim().toLowerCase() : null, userId]);

    if (r.rows.length === 0) return res.status(404).json({ message: 'Super Admin introuvable.' });
    res.json({ message: 'Profil Super Admin mis à jour avec succès !', user: r.rows[0] });
  } catch (err) {
    console.error('Erreur superadmin/profile:', err);
    res.status(500).json({ message: 'Erreur mise à jour profil Super Admin.' });
  }
});

// 10. Journal d'audit et logs d'activité système (100% Technique & Sécurité - Sans candidatures ni données RH)
app.get('/api/superadmin/audit-logs', async (req, res) => {
  try {
    const recentUsers = await pool.query(
      "SELECT id, nom, prenom, email, role, created_at, status FROM users ORDER BY created_at DESC LIMIT 20"
    );

    const logs = [];

    recentUsers.rows.forEach(u => {
      logs.push({
        id: `user-creation-${u.id}`,
        timestamp: u.created_at,
        type: 'user_registration',
        icon: 'fa-solid fa-user-plus',
        title: `Création de compte : ${u.prenom} ${u.nom}`,
        description: `Rôle Système : ${u.role.toUpperCase()} • Identifiant : ${u.email} • Statut : ${u.status || 'actif'}`,
        badge: u.role
      });
    });

    logs.push({
      id: 'sys-health-check',
      timestamp: new Date().toISOString(),
      type: 'system_health',
      icon: 'fa-solid fa-server',
      title: 'Vérification de l\'infrastructure serveur',
      description: 'PostgreSQL connecté • Services API fonctionnels • Mémoire système optimale',
      badge: 'Sécurité'
    });

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(logs);
  } catch (err) {
    console.error('Erreur audit-logs:', err);
    res.status(500).json({ message: 'Erreur logs.' });
  }
});

// ==========================================
// LANCEMENT SERVEUR + MIGRATIONS
// ==========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Serveur backend HireBridge démarré sur le port ${PORT} (Écoute sur 0.0.0.0)`);
  // Migrations automatiques (IF NOT EXISTS = idempotent)
  pool.query(`
    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS application_type VARCHAR(30) DEFAULT 'emploi',
      ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS discharge_sent BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS discharge_content TEXT;
    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'actif',
      ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Mairie de Soa • Yaoundé, Cameroun',
      ADD COLUMN IF NOT EXISTS salary_range VARCHAR(100) DEFAULT 'Selon grille',
      ADD COLUMN IF NOT EXISTS deadline DATE,
      ADD COLUMN IF NOT EXISTS missions TEXT,
      ADD COLUMN IF NOT EXISTS requirements TEXT;
    ALTER TABLE applications ALTER COLUMN job_id DROP NOT NULL;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'valide';
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Centre (Soa / Yaoundé)';
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS ville VARCHAR(100) DEFAULT 'Soa';
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
    ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ville VARCHAR(100) DEFAULT 'Soa';
    ALTER TABLE documents ALTER COLUMN doc_type DROP NOT NULL;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'valide';
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

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

    CREATE TABLE IF NOT EXISTS rh_settings (
      id SERIAL PRIMARY KEY,
      is_available BOOLEAN DEFAULT true,
      status_text VARCHAR(100) DEFAULT 'En ligne & Disponible',
      working_hours VARCHAR(100) DEFAULT 'Du Lundi au Vendredi, 07h30 — 15h30',
      notice_text TEXT DEFAULT 'Ce service de messagerie est strictement réservé aux échanges professionnels.',
      auto_reply TEXT DEFAULT 'Bonjour. Votre message a bien été transmis au Service RH de la Mairie de Soa.',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  .then(() => {
    console.log(' Migrations appliquées');
    // Supprimer l'ancienne contrainte UNIQUE(user_id, job_id) sur applications
    // qui bloque les dépôts de stage (job_id NULL)
    return pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'applications_user_id_job_id_key'
        ) THEN
          ALTER TABLE applications DROP CONSTRAINT applications_user_id_job_id_key;
          RAISE NOTICE 'Contrainte UNIQUE user_id/job_id supprimée.';
        END IF;
      END $$;
    `);
  })
  .then(async () => {
    // Seed permanent du compte Super Admin
    const superEmail = 'estellemono5@gmail.com';
    const superPass = 'Estelle#235';
    const checkSuper = await pool.query('SELECT id, role FROM users WHERE email = $1', [superEmail]);
    const hash = await bcrypt.hash(superPass, 10);
    if (checkSuper.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (nom, prenom, email, password_hash, role, region, ville, phone, status) VALUES ('Mono', 'Estelle', $1, $2, 'super_admin', 'Direction Générale • Super Administration', 'Soa', '+237 600 00 00 00', 'actif')",
        [superEmail, hash]
      );
      console.log(' Compte Super Admin créé : ' + superEmail);
    } else if (checkSuper.rows[0].role !== 'super_admin') {
      await pool.query(
        "UPDATE users SET role = 'super_admin', status = 'actif', password_hash = $1, nom = 'Mono', prenom = 'Estelle' WHERE email = $2",
        [hash, superEmail]
      );
      console.log(' Compte promu Super Admin : ' + superEmail);
    }
  })
  .catch(e => console.log('[Migration info]:', e.message));
});