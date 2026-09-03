const fs = require('fs');
const path = require('path');

const strings = JSON.parse(fs.readFileSync('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/scratch/extracted_strings.json', 'utf8'));

// Dictionnaire pré-existant
const EXISTING_PHRASES = {
  "Portail Candidat — Mairie de Soa": "Candidate Portal — Soa Council",
  "Tableau de Bord Analytique & Décisionnel — Mairie de Soa": "Analytical & Decision Dashboard — Soa Council",
  "Commune de Soa — Contrôle Global du Système": "Soa Municipality — Global System Control",
  "Ravi de vous revoir": "Glad to see you again",
  "Bienvenue sur votre espace candidat": "Welcome to your candidate space",
  "Consultez les offres, déposez vos demandes de stage et suivez vos dossiers en temps réel.": "Browse offers, submit internship requests and track your applications in real time.",
  "Mon score de compatibilité": "My Compatibility Score",
  "Calculé en fonction de vos compétences et des offres de Soa": "Calculated based on your skills and Soa job openings",
  "Postes Recommandés": "Recommended Positions",
  "Dossiers en instruction": "Applications Under Review",
  "Taux de complétion": "Profile Completion Rate",
  "Score moyen d'adéquation": "Average Compatibility Score",
  "Score d'adéquation": "Compatibility Score",
  "Offres & Stages ouverts": "Open Jobs & Internships",
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
  "Hôtel de Ville de Soa": "Mairie de la Commune de Soa",
  "Ville de Soa": "Commune de Soa"
};

async function translateSingle(text) {
  if (EXISTING_PHRASES[text]) return EXISTING_PHRASES[text];
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`);
    const data = await res.json();
    if (data && data.responseData && data.responseData.translatedText) {
      const trans = data.responseData.translatedText;
      if (!trans.includes('MYMEMORY WARNING') && !trans.includes('QUERY LENGTH LIMIT')) {
        return trans;
      }
    }
  } catch (err) {
    // Fail
  }
  return null;
}

async function run() {
  const dictionary = { ...EXISTING_PHRASES };
  let count = 0;
  console.log(`Début de la traduction des ${strings.length} chaînes...`);

  // Traduire par lots de 10
  for (let i = 0; i < strings.length; i += 10) {
    const batch = strings.slice(i, i + 10);
    await Promise.all(batch.map(async (str) => {
      if (!dictionary[str]) {
        const trans = await translateSingle(str);
        if (trans) {
          dictionary[str] = trans;
          count++;
        }
      }
    }));
    if ((i + 10) % 100 === 0) {
      console.log(`Avancement : ${i + 10} / ${strings.length} (Nouvelles traductions: ${count})`);
    }
  }

  console.log(`Total dictionnaire final: ${Object.keys(dictionary).length} entrées.`);
  fs.writeFileSync('c:/Users/Phoenix InformatiK/OneDrive/Desktop/HBsoa/scratch/final_dictionary.json', JSON.stringify(dictionary, null, 2), 'utf8');
}

run();
