// =========================================================================
// GÉNÉRATEUR ET TÉLÉCHARGEUR DE DOCUMENTS OFFICIELS DE LA COMMUNE DE SOA
// Conforme aux normes administratives de la République du Cameroun
// =========================================================================

const CAMEROON_HEADER_HTML = `
  <div class="official-doc-header">
    <div class="header-left">
      <p class="republic-text">RÉPUBLIQUE DU CAMEROUN</p>
      <p class="motto-text">Paix — Travail — Patrie</p>
      <div class="separator-line"></div>
      <p class="ministry-text">RÉGION DU CENTRE</p>
      <p class="ministry-text">DÉPARTEMENT DE LA MEFOU-ET-AFAMBA</p>
      <p class="municipality-text">COMMUNE DE SOA</p>
      <p class="service-text">Secrétariat Général / Pôle des Ressources Humaines</p>
    </div>

    <div class="header-center">
      <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg" alt="Armoiries de la République du Cameroun" class="coat-img" />
      <span class="motto-seal">HIREBRIDGE SOA</span>
    </div>

    <div class="header-right">
      <p class="republic-text">REPUBLIC OF CAMEROON</p>
      <p class="motto-text">Peace — Work — Fatherland</p>
      <div class="separator-line"></div>
      <p class="ministry-text">CENTRE REGION</p>
      <p class="ministry-text">MEFOU AND AFAMBA DIVISION</p>
      <p class="municipality-text">SOA COUNCIL</p>
      <p class="service-text">General Secretariat / Human Resources Service</p>
    </div>
  </div>
  <div class="national-tricolor-bar"></div>
`;

const DOCUMENT_STYLES = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
      padding: 30px;
    }
    .page-container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 35px 40px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 5rem;
      font-weight: 900;
      color: rgba(7, 70, 150, 0.03);
      text-transform: uppercase;
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
    }
    .official-doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      text-align: center;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .header-left, .header-right { width: 38%; }
    .header-center {
      width: 20%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .republic-text { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; }
    .motto-text { font-size: 0.68rem; font-style: italic; color: #475569; margin-bottom: 4px; }
    .separator-line { width: 45px; height: 1.5px; background: #074696; margin: 3px auto; }
    .ministry-text { font-size: 0.7rem; font-weight: 700; color: #334155; }
    .municipality-text { font-size: 0.76rem; font-weight: 800; color: #074696; }
    .service-text { font-size: 0.65rem; color: #64748b; }
    .coat-img { width: 55px; height: 55px; object-fit: contain; margin-bottom: 4px; }
    .motto-seal { font-size: 0.62rem; font-weight: 800; color: #1b8a53; letter-spacing: 1px; }
    
    .national-tricolor-bar {
      height: 4px;
      background: linear-gradient(90deg, #007a3d 33.33%, #ce1126 33.33%, #ce1126 66.66%, #fcd116 66.66%);
      margin: 12px 0 24px 0;
      border-radius: 2px;
    }
    
    .doc-title-box {
      text-align: center;
      margin: 20px 0 26px 0;
      padding: 14px;
      background: linear-gradient(135deg, rgba(7, 70, 150, 0.05), rgba(27, 138, 83, 0.05));
      border: 1.5px solid #074696;
      border-radius: 8px;
      position: relative;
      z-index: 1;
    }
    .doc-ref { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .doc-title { font-size: 1.25rem; font-weight: 900; color: #074696; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-subtitle { font-size: 0.85rem; font-weight: 600; color: #1b8a53; margin-top: 4px; }

    .timbre-box {
      float: right;
      width: 140px;
      height: 90px;
      border: 2px dashed #d97706;
      border-radius: 6px;
      background: #fffbeb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 6px;
      margin-left: 20px;
      margin-bottom: 15px;
    }
    .timbre-box span { font-size: 0.65rem; font-weight: 800; color: #b45309; }
    .timbre-box strong { font-size: 0.72rem; color: #92400e; margin-top: 3px; }

    .doc-section { margin-bottom: 22px; position: relative; z-index: 1; }
    .section-heading {
      font-size: 0.98rem;
      font-weight: 800;
      color: #074696;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-heading span {
      background: #074696;
      color: #ffffff;
      font-size: 0.75rem;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .doc-paragraph { font-size: 0.86rem; color: #334155; margin-bottom: 10px; text-align: justify; }
    
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 0.82rem;
    }
    .doc-table th, .doc-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    .doc-table th {
      background: #074696;
      color: #ffffff;
      font-weight: 700;
    }
    .doc-table tr:nth-child(even) { background: #f8fafc; }

    .doc-signatures-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      position: relative;
      z-index: 1;
    }
    .sig-col { width: 45%; text-align: center; }
    .sig-role { font-size: 0.82rem; font-weight: 800; color: #0f172a; margin-bottom: 40px; }
    .sig-name { font-size: 0.82rem; font-weight: 700; color: #074696; text-decoration: underline; }
    .sig-seal { font-size: 0.68rem; color: #64748b; margin-top: 4px; }

    .print-actions {
      text-align: center;
      margin-top: 25px;
      padding: 15px;
      background: #f1f5f9;
      border-radius: 8px;
    }
    .btn-print {
      background: #074696;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.9rem;
      margin: 0 5px;
    }
    .btn-close {
      background: #64748b;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.9rem;
      margin: 0 5px;
    }

    @media print {
      body { padding: 0; background: #ffffff; }
      .page-container { border: none; box-shadow: none; padding: 15px 20px; max-width: 100%; }
      .print-actions { display: none !important; }
    }
  </style>
`;

// Helper de téléchargement et ouverture
function triggerDownloadOrPrint(title, htmlContent, fileName) {
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${DOCUMENT_STYLES}
    </head>
    <body>
      <div class="page-container">
        <div class="watermark">COMMUNE DE SOA</div>
        ${htmlContent}
        <div class="print-actions">
          <button class="btn-print" onclick="window.print()"><i class="fa-solid fa-print"></i> Imprimer / Enregistrer en PDF</button>
          <button class="btn-close" onclick="window.close()">Fermer</button>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Créer le Blob et déclencher le téléchargement automatique du fichier HTML/Document
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 2. Ouvrir aussi la fenêtre d'impression haute fidélité
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  }
}

// 1. GUIDE OFFICIEL DU CANDIDAT (2026)
export function downloadGuideCandidat() {
  const content = `
    ${CAMEROON_HEADER_HTML}

    <div class="doc-title-box">
      <p class="doc-ref">RÉF : GDC-2026/CS-RH/SOA-01</p>
      <h1 class="doc-title">Guide Officiel du Candidat & Recrutements</h1>
      <p class="doc-subtitle">Édition Officielle 2026 — Commune de Soa (Région du Centre)</p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>1</span> Objet & Champ d'Application</h3>
      <p class="doc-paragraph">
        Le présent guide définit les règles et modalités régissant le recrutement du personnel contractuel et décisionnaire, ainsi que l'admission des stagiaires au sein des services administratifs, techniques et financiers de l'Hôtel de Ville de la Commune de Soa, conformément aux lois de décentralisation et aux directives de l'autorité municipale.
      </p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>2</span> Conditions Générales d'Éligibilité</h3>
      <p class="doc-paragraph">Tout candidat postulant auprès de la Mairie de Soa doit satisfaire aux exigences républicaines suivantes :</p>
      <ul style="margin-left: 20px; font-size: 0.86rem; color: #334155; line-height: 1.8;">
        <li>Être de nationalité camerounaise et jouir de ses droits civiques.</li>
        <li>Être âgé d'au moins 18 ans révolus au moment du dépôt de dossier.</li>
        <li>Justifier des qualifications académiques ou techniques requises pour l'emploi ou le stage sollicité.</li>
        <li>Faire preuve d'une intégrité morale éprouvée et d'un dévouement au service de la collectivité communale.</li>
      </ul>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>3</span> Barème d'Évaluation & Commission de Sélection</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Critère d'Évaluation</th>
            <th>Pondération</th>
            <th>Modalité de Vérification</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Diplômes & Adéquation Académique</strong></td>
            <td>35%</td>
            <td>Vérification des diplômes certifiés conformes (BTS, Licence, Master)</td>
          </tr>
          <tr>
            <td><strong>Expérience Pratique & Compétences</strong></td>
            <td>30%</td>
            <td>Certificats de travail, attestations et portfolios professionnels</td>
          </tr>
          <tr>
            <td><strong>Résidence ou Liens avec Soa</strong></td>
            <td>15%</td>
            <td>Certificat de domicile ou scolarité à l'Université de Yaoundé II</td>
          </tr>
          <tr>
            <td><strong>Entretien avec la Commission RH</strong></td>
            <td>20%</td>
            <td>Aisance professionnelle, sens du service public et motivation</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>4</span> Délivrance de la Décharge Officielle Horodatée</h3>
      <p class="doc-paragraph">
        Tout dossier déposé via la plateforme numérique <strong>HireBridge SOA</strong> génère instantanément un récépissé officiel avec horodatage électronique et QR Code unique de traçabilité garantissant l'instruction de la demande.
      </p>
    </div>

    <div class="doc-signatures-grid">
      <div class="sig-col">
        <p class="sig-role">Le Chef de Service des Ressources Humaines</p>
        <p class="sig-name">M. EBANG Rolande</p>
        <p class="sig-seal">Sceau du Service RH</p>
      </div>
      <div class="sig-col">
        <p class="sig-role">Pour le Maire et par Délégation,<br />Le Secrétaire Général</p>
        <p class="sig-name">Secrétariat Général de Soa</p>
        <p class="sig-seal">Hôtel de Ville de Soa</p>
      </div>
    </div>
  `;

  triggerDownloadOrPrint("Guide Officiel du Candidat — Mairie de Soa", content, "Guide_Officiel_Candidat_Mairie_Soa.html");
}

// 2. CHARTE OFFICIELLE DES STAGES
export function downloadCharteStages() {
  const content = `
    ${CAMEROON_HEADER_HTML}

    <div class="doc-title-box">
      <p class="doc-ref">RÉF : STR-2026/CS-RH/SOA-02</p>
      <h1 class="doc-title">Charte Officielle des Stages Académiques & Professionnels</h1>
      <p class="doc-subtitle">Réglementation, Encadrement & Obligations du Stagiaire à la Mairie de Soa</p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>1</span> Objet & Champ d'Application</h3>
      <p class="doc-paragraph">
        La présente charte fixe les conditions d'accueil, d'encadrement et d'évaluation des stagiaires (académiques, professionnels ou de vacances) au sein des directions et services municipaux de la Commune de Soa.
      </p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>2</span> Droits & Devoirs du Stagiaire</h3>
      <p class="doc-paragraph">
        • <strong>Horaire de Service :</strong> Le stagiaire est tenu de respecter scrupuleusement les horaires officiels de service communal (07h30 — 15h30).<br />
        • <strong>Secret Professionnel :</strong> Confidentialité absolue concernant les données citoyennes et dossiers administratifs.<br />
        • <strong>Encadrement :</strong> Un tuteur municipal est désigné au sein du service d'affectation pour assurer le suivi pédagogique.<br />
        • <strong>Attestation :</strong> Une attestation officielle numérotée est délivrée à l'issue du stage après dépôt du rapport.
      </p>
    </div>

    <div class="doc-signatures-grid">
      <div class="sig-col">
        <p class="sig-role">Le Directeur des Ressources Humaines</p>
        <p class="sig-name">M. EBANG Rolande</p>
        <p class="sig-seal">Direction RH</p>
      </div>
      <div class="sig-col">
        <p class="sig-role">Le Maire de la Commune de Soa</p>
        <p class="sig-name">Hôtel de Ville de Soa</p>
        <p class="sig-seal">Sceau Municipal Officiel</p>
      </div>
    </div>
  `;

  triggerDownloadOrPrint("Charte des Stages — Mairie de Soa", content, "Charte_Officielle_Stages_Mairie_Soa.html");
}

// 3. MODÈLE OFFICIEL DE DEMANDE MANUSCRITE
export function downloadModeleDemande() {
  const content = `
    ${CAMEROON_HEADER_HTML}

    <div style="margin-bottom: 25px; margin-top: 20px;">
      <p style="font-size: 0.88rem; font-weight: 700; color: #0f172a;">NOM & PRÉNOM DU CANDIDAT : ................................................................</p>
      <p style="font-size: 0.86rem; color: #334155;">Niveau d'Études / Spécialité : ........................................................................</p>
      <p style="font-size: 0.86rem; color: #334155;">Établissement (ex: Univ. Yaoundé II) : .........................................................</p>
      <p style="font-size: 0.86rem; color: #334155;">Téléphone : .......................................... | Email : .............................................</p>
      <p style="font-size: 0.86rem; color: #334155;">Adresse / Quartier : ......................................................... Soa, Cameroun</p>
    </div>

    <div style="text-align: right; margin-bottom: 25px;">
      <p style="font-size: 0.88rem; font-weight: 800; color: #074696;">À Monsieur le Maire de la Commune de Soa</p>
      <p style="font-size: 0.84rem; font-weight: 600; color: #334155;">Hôtel de Ville de Soa — Département de la Mefou-et-Afamba</p>
      <p style="font-size: 0.84rem; color: #64748b;">Soa, le ......................................... 2026</p>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #074696; padding: 10px 15px; margin-bottom: 20px;">
      <p style="font-size: 0.92rem; font-weight: 800; color: #074696;">
        OBJET : Demande d'admission en Stage Académique / Professionnel / Vacances au sein des Services Municipaux
      </p>
    </div>

    <div class="doc-section">
      <p class="doc-paragraph"><strong>Monsieur le Maire,</strong></p>
      <p class="doc-paragraph">
        J'ai l'honneur et le profond respect de solliciter auprès de votre haute et bienveillante autorité une place de stage au sein de votre prestigieuse institution communale, pour la période allant du ....................................... au ....................................... 2026.
      </p>
      <p class="doc-paragraph">
        Actuellement étudiant(e) / diplômé(e) en ..........................................................................., ce stage me permettra d'approfondir mes compétences pratiques dans le domaine de ................................................................................. et de contribuer activement à l'essor des services municipaux de la Commune de Soa.
      </p>
      <p class="doc-paragraph">
        Je joins à la présente les pièces justificatives requises : mon Curriculum Vitae, mon certificat de scolarité / attestation de diplôme, ainsi qu'une copie de ma Carte Nationale d'Identité.
      </p>
      <p class="doc-paragraph">
        Dans l'attente d'une suite favorable à ma requête, je vous prie d'agréer, <strong>Monsieur le Maire</strong>, l'expression de ma très haute considération républicaine.
      </p>
    </div>

    <div style="text-align: right; margin-top: 40px; padding-right: 30px;">
      <p style="font-size: 0.84rem; font-weight: 700; color: #0f172a; margin-bottom: 50px;">Signature du Candidat :</p>
      <p style="font-size: 0.84rem; font-weight: 600; color: #64748b;">[Nom & Prénom]</p>
    </div>
  `;

  triggerDownloadOrPrint("Modèle Officiel de Demande Manuscrite — Mairie de Soa", content, "Modele_Demande_Manuscrite_Mairie_Soa.html");
}

// 4. RÈGLEMENT INTÉRIEUR DES FORMATIONS MUNICIPALES
export function downloadReglementFormations() {
  const content = `
    ${CAMEROON_HEADER_HTML}

    <div class="doc-title-box">
      <p class="doc-ref">RÉF : RIF-2026/CS-FORM/SOA-03</p>
      <h1 class="doc-title">Règlement Intérieur du Centre de Formation</h1>
      <p class="doc-subtitle">Modalités Pédagogiques & Gratuité pour la Jeunesse et les Citoyens de Soa</p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>1</span> Gratuité & Accès Ouvert</h3>
      <p class="doc-paragraph">
        Les formations municipales organisées par la Commune de Soa sont <strong>entièrement gratuites</strong>. Elles sont prioritaires pour les résidents de la commune, les étudiants de l'Université de Yaoundé II et les jeunes diplômés en quête de qualification professionnelle.
      </p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>2</span> Assiduité & Ponctualité Obligatoires</h3>
      <p class="doc-paragraph">
        Tout apprenant admis s'engage à suivre l'intégralité du volume horaire programmé (minimum 80% de présence certifiée). Tout retard non justifié ou plus de 2 absences consécutives entraîne l'exclusion de la session.
      </p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>3</span> Délivrance du Certificat Communal d'Aptitude</h3>
      <p class="doc-paragraph">
        Une évaluation pratique sanctionne la fin de chaque session. Les apprenants ayant obtenu la moyenne réglementaire reçoivent une <strong>Attestation Officielle de Formation Municipale</strong> co-signée par le Responsable Pédagogique et Monsieur le Maire de Soa.
      </p>
    </div>

    <div class="doc-signatures-grid">
      <div class="sig-col">
        <p class="sig-role">Le Responsable des Formations</p>
        <p class="sig-name">M. EBANG Rolande</p>
      </div>
      <div class="sig-col">
        <p class="sig-role">Vu et Approuvé,<br />Le Maire de la Commune de Soa</p>
        <p class="sig-name">Hôtel de Ville de Soa</p>
      </div>
    </div>
  `;

  triggerDownloadOrPrint("Règlement Intérieur des Formations — Mairie de Soa", content, "Reglement_Formations_Mairie_Soa.html");
}

// 5. CHECKLIST DES PIÈCES À FOURNIR
export function downloadChecklistPieces() {
  const content = `
    ${CAMEROON_HEADER_HTML}

    <div class="doc-title-box">
      <p class="doc-ref">RÉF : CKP-2026/CS-DOC/SOA-04</p>
      <h1 class="doc-title">Guide des Pièces à Fournir & Checklist</h1>
      <p class="doc-subtitle">Normes Documentaires pour Recrutements, Stages et Formations à la Mairie de Soa</p>
    </div>

    <div class="doc-section">
      <table class="doc-table">
        <thead>
          <tr>
            <th>Type de Candidature</th>
            <th>Pièces Obligatoires (Format PDF lisible < 5 Mo)</th>
            <th>Délai Moyen d'Instruction</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Emploi Contractuel / Décisionnaire (CDD / CDI)</strong></td>
            <td>
              • CV actualisé et détaillé<br />
              • Lettre de motivation adressée à Monsieur le Maire<br />
              • Copie certifiée conforme de la CNI<br />
              • Copies certifiées des diplômes requis
            </td>
            <td>10 à 15 jours ouvrés</td>
          </tr>
          <tr>
            <td><strong>Stage Académique (Validation diplôme)</strong></td>
            <td>
              • Demande manuscrite<br />
              • CV actualisé<br />
              • Certificat de scolarité ou attestation d'inscription (Univ. Yaoundé II / autre)<br />
              • Copie lisible de la CNI
            </td>
            <td>3 à 5 jours ouvrés</td>
          </tr>
          <tr>
            <td><strong>Stage Professionnel d'Insertion / Vacances</strong></td>
            <td>
              • Demande manuscrite<br />
              • CV complet avec projets réalisés<br />
              • Copie du diplôme le plus élevé<br />
              • Copie CNI
            </td>
            <td>5 à 7 jours ouvrés</td>
          </tr>
          <tr>
            <td><strong>Formation Municipale Gratuite</strong></td>
            <td>
              • Formulaire d'inscription numérique rempli<br />
              • Copie CNI ou carte d'étudiant
            </td>
            <td>Validation immédiate selon places</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="doc-section">
      <p class="doc-paragraph" style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 10px; font-size: 0.82rem; color: #166534;">
        <strong>Dépôt 100% Numérique :</strong> Tous vos documents peuvent être téléversés directement sur votre espace candidat HireBridge Soa. Aucun déplacement physique n'est requis avant la convocation officielle.
      </p>
    </div>

    <div class="doc-signatures-grid">
      <div class="sig-col">
        <p class="sig-role">Le Chef de Service Administratif</p>
        <p class="sig-name">Mairie de Soa</p>
      </div>
      <div class="sig-col">
        <p class="sig-role">Le Secrétaire Général</p>
        <p class="sig-name">Commune de Soa</p>
      </div>
    </div>
  `;

  triggerDownloadOrPrint("Checklist des Pièces à Fournir — Mairie de Soa", content, "Checklist_Pieces_Mairie_Soa.html");
}

// =========================================================================
// IMPRESSION / GÉNÉRATION DE LA FICHE OFFICIELLE DU BILAN MENSUEL RH
// =========================================================================
export function printBilanMensuelRH(reportData, rhUser) {
  if (!reportData) {
    alert("Aucune donnée disponible pour le bilan mensuel sélectionné.");
    return;
  }

  const monthLabel = reportData.monthLabel || 'Mois Courant (2026)';
  const monthKey = reportData.monthKey || '2026-08';
  const emploisCount = reportData.emploisCount || 0;
  const stagesCount = reportData.stagesCount || 0;
  const totalTrainings = reportData.totalTrainings || 0;
  const totalTickets = reportData.totalTickets || 0;
  const totalGlobal = emploisCount + stagesCount + totalTrainings;

  const rhName = rhUser ? `${rhUser.prenom || ''} ${rhUser.nom || ''}`.trim() : 'Service des Ressources Humaines';
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Lignes pour la Répartition Géographique
  const geoRowsHtml = (reportData.geographicDistribution && reportData.geographicDistribution.length > 0)
    ? reportData.geographicDistribution.map(g => `
        <tr>
          <td><strong>${g.region}</strong></td>
          <td style="text-align: center; font-weight: 700;">${g.count} candidat(s)</td>
          <td style="text-align: center; color: #15803d; font-weight: 800;">${g.percentage}%</td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="text-align: center; color: #64748b;">Aucune donnée géographique enregistrée ce mois-ci.</td></tr>`;

  // Lignes pour le Top des Offres
  const topJobsRowsHtml = (reportData.topJobs && reportData.topJobs.length > 0)
    ? reportData.topJobs.map((tj, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 800; color: #041430;">#${idx + 1}</td>
          <td><strong>${tj.title}</strong></td>
          <td style="text-align: center; font-weight: 800; color: #00a859;">${tj.count} dossier(s) déposé(s)</td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="text-align: center; color: #64748b;">Aucune offre souscrite ce mois-ci.</td></tr>`;

  // Lignes pour le Support Citoyen
  const ticketsRowsHtml = (reportData.ticketsByCategory && reportData.ticketsByCategory.length > 0)
    ? reportData.ticketsByCategory.map(t => `
        <tr>
          <td><strong>${t.category}</strong></td>
          <td style="text-align: center; font-weight: 800; color: #b91c1c;">${t.count} réclamation(s)</td>
          <td style="text-align: center; font-weight: 700; color: #15803d;">Pris en charge RH</td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="text-align: center; color: #64748b;">Aucun ticket de réclamation ce mois-ci.</td></tr>`;

  const content = `
    ${CAMEROON_HEADER_HTML}

    <div class="doc-title-box">
      <p class="doc-ref">RÉF : SOA/SG/RH/RAP-2026/${monthKey.replace('-', '')}</p>
      <h1 class="doc-title">BILAN D'ACTIVITÉ &amp; RAPPORT STATISTIQUE MENSUEL RH</h1>
      <p class="doc-subtitle">Bilan Synthétique des Recrutements, Stages, Formations &amp; Support Citoyen — ${monthLabel}</p>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>I</span> SYNTHÈSE GLOBALE DES DOSSIERS TRAITÉS</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Nature de la Démarche Administrative</th>
            <th style="text-align: center;">Volume des Dossiers Reçus</th>
            <th style="text-align: center;">Statut d'Instruction</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Candidatures Emplois Contractuels / CDD / CDI</strong></td>
            <td style="text-align: center; font-size: 1rem; font-weight: 900; color: #041430;">${emploisCount}</td>
            <td style="text-align: center; color: #15803d; font-weight: 700;">Enregistré &amp; Évalué par la Commission</td>
          </tr>
          <tr>
            <td><strong>Demandes de Stages Académiques &amp; Professionnels</strong></td>
            <td style="text-align: center; font-size: 1rem; font-weight: 900; color: #00a859;">${stagesCount}</td>
            <td style="text-align: center; color: #15803d; font-weight: 700;">Instruction &amp; Affectation dans les Services</td>
          </tr>
          <tr>
            <td><strong>Inscriptions aux Formations Municipales Gratuites</strong></td>
            <td style="text-align: center; font-size: 1rem; font-weight: 900; color: #d97706;">${totalTrainings}</td>
            <td style="text-align: center; color: #15803d; font-weight: 700;">Décharges &amp; Attestations de Formation</td>
          </tr>
          <tr>
            <td><strong>Tickets d'Assistance &amp; Réclamations Citoyennes</strong></td>
            <td style="text-align: center; font-size: 1rem; font-weight: 900; color: #b91c1c;">${totalTickets}</td>
            <td style="text-align: center; color: #15803d; font-weight: 700;">Pris en charge par le Secrétariat Général</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: 900;">
            <td><strong>TOTAL CUMULÉ DES SOUSCRIPTIONS DE L'ESPACE CITOYEN</strong></td>
            <td style="text-align: center; font-size: 1.1rem; color: #041430;">${totalGlobal}</td>
            <td style="text-align: center; color: #041430;">Bilan Mensuel Consolidé 2026</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>II</span> PROVENANCE GÉOGRAPHIQUE DES POSTULANTS (${monthLabel})</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Région / Territoire de Provenance</th>
            <th style="text-align: center;">Nombre de Candidats</th>
            <th style="text-align: center;">Proportion (%)</th>
          </tr>
        </thead>
        <tbody>
          ${geoRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>III</span> OFFRES ET RECRUTEMENTS LES PLUS SOLLICITÉS</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th style="text-align: center; width: 60px;">Rang</th>
            <th>Intitulé du Poste / Domaine de Stage</th>
            <th style="text-align: center;">Nombre de Dossiers</th>
          </tr>
        </thead>
        <tbody>
          ${topJobsRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="doc-section">
      <h3 class="section-heading"><span>IV</span> ASSISTANCE CITOYENNE &amp; RÈGLEMENT DES RÉCLAMATIONS</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Catégorie de la Demande Citoyenne</th>
            <th style="text-align: center;">Nombre de Tickets</th>
            <th style="text-align: center;">État d'Avancement</th>
          </tr>
        </thead>
        <tbody>
          ${ticketsRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="doc-section" style="margin-top: 15px;">
      <p class="doc-paragraph" style="background: #f0fdf4; border-left: 4px solid #00a859; padding: 10px 14px; font-size: 0.82rem; color: #14532d;">
        <strong>Certifié Conforme :</strong> Le présent rapport d'activité statistique est généré automatiquement par la plateforme numérique HireBridge SOA et certifié exact conformément aux registres électroniques du Pôle RH de la Mairie de Soa au ${todayStr}.
      </p>
    </div>

    <div class="doc-signatures-grid">
      <div class="sig-col">
        <p class="sig-role">Le Responsable RH / Rédacteur du Rapport</p>
        <p class="sig-name">${rhName}</p>
        <p class="sig-seal">Visa &amp; Signature Électronique RH</p>
      </div>
      <div class="sig-col">
        <p class="sig-role">Pour la Mairie de Soa — Le Secrétaire Général</p>
        <p class="sig-name">M. EBANG Rolande</p>
        <p class="sig-seal">Cachet Officiel &amp; Vu pour Approbation</p>
      </div>
    </div>
  `;

  triggerDownloadOrPrint(`Bilan_Mensuel_RH_${monthKey}_Mairie_Soa`, content, `Bilan_Mensuel_RH_${monthKey}_Mairie_Soa.html`);
}
