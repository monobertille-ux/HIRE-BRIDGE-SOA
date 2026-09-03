const fs = require('fs');

const strings = JSON.parse(fs.readFileSync('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/scratch/extracted_strings.json', 'utf8'));

// Dictionnaire étendu de base
const PHRASES = {
  "Ravi de vous revoir": "Glad to see you again",
  "Ravi de vous revoir !": "Glad to see you again !",
  "Ravi de vous revoir,": "Glad to see you again,",
  "Voici les opportunités recommandées en temps réel par notre algorithme de matching municipal.": "Here are the opportunities recommended in real time by our municipal matching algorithm.",
  "Bienvenue sur votre espace candidat": "Welcome to your candidate space",
  "Consultez les offres, déposez vos demandes de stage et suivez vos dossiers en temps réel.": "Browse offers, submit internship requests and track your applications in real time.",
  "Mon score de compatibilité": "My Compatibility Score",
  "Calculé en fonction de vos compétences et des offres de Soa": "Calculated based on your skills and Soa job openings",
  "Taux de compatibilité": "Compatibility Rate",
  "Postes Recommandés (Algorithme de Compatibilité)": "Recommended Positions (Compatibility Algorithm)",
  "Postes Recommandés": "Recommended Positions",
  "Dossiers en instruction": "Applications Under Review",
  "Taux de complétion": "Profile Completion Rate",
  "Score moyen d'adéquation": "Average Compatibility Score",
  "Score d'adéquation": "Compatibility Score",
  "Offres & Stages ouverts": "Open Jobs & Internships",
  "Portail Candidat — Mairie de Soa": "Candidate Portal — Soa Council",
  "Tableau de Bord Analytique & Décisionnel — Mairie de Soa": "Analytical & Decision Dashboard — Soa Council",
  "Commune de Soa — Contrôle Global du Système": "Soa Municipality — Global System Control",
  "Tableau de bord": "Dashboard",
  "Découvrir la Mairie": "Discover Soa Council",
  "Formations Municipales": "Municipal Trainings",
  "Calendrier & Événements": "Calendar & Events",
  "Offres d'Emploi & Stages": "Job Offers & Internships",
  "Mes candidatures": "My Applications",
  "Mes entretiens": "My Interviews",
  "Mon Contrat": "My Contract",
  "Messagerie RH": "HR Messaging",
  "Notifications": "Notifications",
  "Paramètres": "Settings",
  "Aide & Support": "Help & Support",
  "Mon profil": "My Profile",
  "Déconnexion": "Logout",
  "Quitter": "Exit",
  "Candidat": "Candidate",
  "Responsable RH": "HR Manager",
  "Super Admin": "Super Admin",
  "Tableau Analytique": "Analytics Dashboard",
  "Journal Audit Mensuel RH": "Monthly HR Audit Log",
  "Candidatures": "Applications",
  "Entretiens Vidéo": "Video Interviews",
  "Formations": "Trainings",
  "Événements": "Events",
  "Messagerie": "Messaging",
  "Stockage Documents": "Document Storage",
  "Support & Réclamations": "Support & Complaints",
  "Mon Profil RH": "My HR Profile",
  "JOURNAL D'AUDIT & RAPPORTS MENSUELS RH": "HR MONTHLY AUDIT LOG & REPORTS",
  "Rapport d'Activité & Statistique Mensuelle Mairie de Soa": "Monthly Activity & Statistical Report Soa Council",
  "Imprimer / Exporter le Bilan Mensuel (PDF)": "Print / Export Monthly Report (PDF)",
  "Sélectionnez le mois à consulter :": "Select month to view:",
  "Candidatures Emplois": "Job Applications",
  "Demandes de Stages": "Internship Applications",
  "Inscriptions Formations": "Training Enrolments",
  "Tickets Support Citoyen": "Citizen Support Tickets",
  "Recrutements reçus": "Recruitments received",
  "Académiques & Pro": "Academic & Pro",
  "Ateliers communaux": "Municipal workshops",
  "Réclamations enregistrées": "Complaints recorded",
  "Provenance Géographique des Postulants": "Geographical Provenance of Applicants",
  "Offres & Demandes de Stages les plus Sollicitées": "Most Sollicited Job & Internship Offers",
  "Répartition des Billets & Support du mois de": "Tickets & Support Breakdown for",
  "Hôtel de Ville de Soa": "Soa Council",
  "Ville de Soa": "Commune de Soa"
};

const WORD_MAP = {
  "accueil": "welcome", "candidat": "candidate", "candidats": "candidates", "candidature": "application",
  "candidatures": "applications", "dossier": "file", "dossiers": "files", "document": "document",
  "documents": "documents", "formation": "training", "formations": "trainings", "événement": "event",
  "événements": "events", "offre": "offer", "offres": "offers", "stage": "internship",
  "stages": "internships", "entretien": "interview", "entretiens": "interviews", "message": "message",
  "messages": "messages", "profil": "profile", "paramètres": "settings", "aide": "help",
  "support": "support", "déconnexion": "logout", "connexion": "login", "inscription": "registration",
  "inscriptions": "registrations", "municipal": "municipal", "municipale": "municipal", "municipaux": "municipal",
  "municipales": "municipal", "mairie": "council", "commune": "municipality", "maire": "mayor",
  "valider": "approve", "rejeter": "reject", "supprimer": "delete", "modifier": "edit",
  "enregistrer": "save", "annuler": "cancel", "confirmer": "confirm", "imprimer": "print",
  "télécharger": "download", "rechercher": "search", "filtrer": "filter", "envoyer": "send",
  "soumettre": "submit", "postuler": "apply", "statut": "status", "date": "date",
  "heure": "time", "lieu": "location", "salle": "room", "action": "action",
  "actions": "actions", "reçu": "received", "attente": "pending", "résolu": "resolved",
  "en cours": "in progress", "urgent": "urgent", "urgente": "urgent", "normale": "normal",
  "haute": "high", "basse": "low", "gratuit": "free", "gratuite": "free",
  "officiel": "official", "officielle": "official", "score": "score", "compatibilité": "compatibility"
};

function autoTranslatePhrase(str) {
  if (PHRASES[str]) return PHRASES[str];
  
  let translated = str;
  Object.keys(PHRASES).forEach(fr => {
    if (translated.includes(fr)) {
      translated = translated.replace(new RegExp(fr, 'gi'), PHRASES[fr]);
    }
  });

  const words = translated.split(/(\s+|[.,!?;:()"—•/])/);
  const result = words.map(w => {
    const lower = w.toLowerCase().replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, '');
    if (WORD_MAP[lower]) {
      const tr = WORD_MAP[lower];
      if (w === w.toUpperCase() && w.length > 1) return tr.toUpperCase();
      if (w[0] === w[0].toUpperCase()) return tr.charAt(0).toUpperCase() + tr.slice(1);
      return tr;
    }
    return w;
  }).join('');

  return result;
}

const finalDict = {};
strings.forEach(s => {
  finalDict[s] = autoTranslatePhrase(s);
});

console.log(`Génération rapide terminée ! Total expressions traduites : ${Object.keys(finalDict).length}`);
fs.writeFileSync('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/scratch/full_phrases_dictionary.json', JSON.stringify(finalDict, null, 2), 'utf8');
