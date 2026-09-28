import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AccessibilityToolbar from '../../components/AccessibilityToolbar';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import './OffresEmploi.css';

// ── Libellés des documents requis par type ─────────────────────────────────
const DOC_LABELS = {
  cv: { label: 'Curriculum Vitae (CV)', hint: 'Votre CV à jour' },
  demande_manuscrite: { label: 'Demande manuscrite', hint: 'Lettre de demande écrite à la main, adressée à M. le Maire' },
  lettre_motivation: { label: 'Lettre de motivation', hint: 'Lettre expliquant votre motivation pour ce poste' },
  copie_cni: { label: 'Copie de la CNI / Passeport', hint: 'Pièce d\'identité valide (recto-verso)' },
  certificat_scolarite: { label: 'Certificat de scolarité (année en cours)', hint: 'Certificat prouvant votre inscription actuelle' },
  attestation_ecole: { label: 'Attestation de besoin de stage (école)', hint: 'Document officiel de votre établissement' },
  copie_diplome: { label: 'Copie du diplôme le plus récent', hint: 'Dernier diplôme certifié ou attestation de réussite' },
};

const REQUIRED_DOCS = {
  emploi:              ['cv', 'demande_manuscrite', 'lettre_motivation', 'copie_cni'],
  stage_academique:    ['cv', 'demande_manuscrite', 'certificat_scolarite', 'attestation_ecole', 'copie_cni'],
  stage_professionnel: ['cv', 'demande_manuscrite', 'lettre_motivation', 'copie_diplome', 'copie_cni'],
  stage_vacances:      ['cv', 'demande_manuscrite', 'lettre_motivation', 'copie_cni'],
};

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const OffresEmploi = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { language, t, tp } = useLanguage();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // ── État principal ────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState('emplois'); // 'emplois' | 'stages'
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // ── Offre sélectionnée & modal détail ────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // ── Formulaire de candidature emploi ────────────────────────────────────
  const [applyJob, setApplyJob] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);

  // ── Formulaire demande de stage ──────────────────────────────────────────
  const [stageType, setStageType] = useState(''); // '' | 'academique' | 'professionnel'

  // ── Documents uploadés (par clé) ─────────────────────────────────────────
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [coverLetter, setCoverLetter] = useState('');

  // ── Statut soumission ────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ text: '', type: '' }); // type: success | error
  const [successData, setSuccessData] = useState(null);

  // ── Filter emplois ────────────────────────────────────────────────────────
  const [jobFilter, setJobFilter] = useState('tous'); // 'tous' | 'CDI' | 'CDD'

  const fileRefs = useRef({});

  // ── Chargement des offres ─────────────────────────────────────────────────
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`);
      if (res.ok) setJobs(await res.json());
    } catch (err) {
      console.error('Erreur chargement offres:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // ── Ouvrir modal détail offre ─────────────────────────────────────────────
  const openJobDetail = (job) => {
    setSelectedJob(job);
    setShowJobModal(true);
    setShowApplyForm(false);
  };

  // ── Démarrer candidature emploi ───────────────────────────────────────────
  const startApply = (job) => {
    if (!user) { navigate('/auth'); return; }
    setApplyJob(job);
    setShowJobModal(false);
    setShowApplyForm(true);
    setUploadedDocs({});
    setCoverLetter('');
    setSubmitStatus({ text: '', type: '' });
    setSuccessData(null);
  };

  // ── Démarrer demande de stage ─────────────────────────────────────────────
  const startStage = (type) => {
    if (!user) { navigate('/auth'); return; }
    setStageType(type);
    setUploadedDocs({});
    setCoverLetter('');
    setSubmitStatus({ text: '', type: '' });
    setSuccessData(null);
  };

  // ── Validation PDF d'un fichier ───────────────────────────────────────────
  const validatePDF = (file) => {
    if (!file) return false;
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    return isPDF;
  };

  // ── Gérer l'upload d'un document ─────────────────────────────────────────
  const handleDocChange = (docKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validatePDF(file)) {
      setUploadedDocs(prev => ({ ...prev, [docKey]: { file: null, valid: false, error: 'Ce fichier n\'est pas un PDF.' } }));
      e.target.value = '';
      return;
    }

    setUploadedDocs(prev => ({ ...prev, [docKey]: { file, valid: true, error: null, name: file.name } }));
  };

  // ── Vérifier si tous les docs requis sont présents et valides ────────────
  const isReadyToSubmit = (requiredDocs) => {
    return requiredDocs.every(key => uploadedDocs[key]?.valid === true);
  };

  // ── Soumettre candidature emploi ──────────────────────────────────────────
  const submitEmploi = async () => {
    if (!user || !applyJob) return;
    const required = REQUIRED_DOCS.emploi;
    if (!isReadyToSubmit(required)) {
      setSubmitStatus({ text: 'Veuillez uploader tous les documents requis en format PDF.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setSubmitStatus({ text: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('jobId', applyJob.id);
      formData.append('applicationType', 'emploi');
      formData.append('coverLetter', coverLetter);
      required.forEach(key => formData.append(key, uploadedDocs[key].file));

      const res = await fetch(`${API_BASE_URL}/api/applications/submit-dossier`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessData(data);
        setSubmitStatus({ text: data.message, type: 'success' });
        setUploadedDocs({});
      } else {
        setSubmitStatus({ text: data.message || 'Erreur lors de la soumission.', type: 'error' });
      }
    } catch (err) {
      setSubmitStatus({ text: 'Erreur réseau. Vérifiez votre connexion.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Soumettre demande de stage ────────────────────────────────────────────
  const submitStage = async () => {
    if (!user || !stageType) return;
    const appTypeKey = `stage_${stageType}`;
    const required = REQUIRED_DOCS[appTypeKey];
    if (!isReadyToSubmit(required)) {
      setSubmitStatus({ text: 'Veuillez uploader tous les documents requis en format PDF.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setSubmitStatus({ text: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('applicationType', 'stage');
      formData.append('stageType', stageType);
      formData.append('coverLetter', coverLetter);
      required.forEach(key => formData.append(key, uploadedDocs[key].file));

      const res = await fetch(`${API_BASE_URL}/api/applications/submit-dossier`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessData(data);
        setSubmitStatus({ text: data.message, type: 'success' });
        setUploadedDocs({});
        setStageType('');
      } else {
        setSubmitStatus({ text: data.message || 'Erreur.', type: 'error' });
      }
    } catch (err) {
      setSubmitStatus({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Composant upload d'un document ───────────────────────────────────────
  const DocUploadSlot = ({ docKey }) => {
    const info = DOC_LABELS[docKey];
    const state = uploadedDocs[docKey];
    if (!fileRefs.current[docKey]) fileRefs.current[docKey] = React.createRef();

    return (
      <div className={`doc-slot ${state?.valid ? 'uploaded' : state?.error ? 'error' : ''}`}>
        <div className="doc-slot-icon">
          {state?.valid ? (
            <i className="fa-solid fa-circle-check" style={{ color: '#22c55e', fontSize: '1.4rem' }} />
          ) : state?.error ? (
            <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', fontSize: '1.4rem' }} />
          ) : (
            <i className="fa-regular fa-file-pdf" style={{ color: '#94a3b8', fontSize: '1.4rem' }} />
          )}
        </div>
        <div className="doc-slot-info">
          <span className="doc-slot-label">{info.label}</span>
          <span className="doc-slot-hint">{state?.valid ? ` ${state.name}` : (state?.error || info.hint)}</span>
        </div>
        <input
          ref={fileRefs.current[docKey]}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleDocChange(docKey, e)}
        />
        <button
          className={`doc-upload-btn ${state?.valid ? 'replace' : ''}`}
          onClick={() => fileRefs.current[docKey].current?.click()}
        >
          <i className={`fa-solid ${state?.valid ? 'fa-arrow-rotate-right' : 'fa-upload'}`} />
          {state?.valid ? 'Remplacer' : 'Choisir PDF'}
        </button>
      </div>
    );
  };

  // ── Filtrage des offres ───────────────────────────────────────────────────
  const filteredJobs = jobs.filter(j => jobFilter === 'tous' || j.type === jobFilter);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className={`offres-page ${embedded ? 'embedded-in-dashboard' : ''}`}>
      {/* Header (uniquement si page standalone hors dashboard) */}
      {!embedded && (
        <div className="offres-header">
          <button className="back-btn" onClick={() => navigate(user ? '/candidat/dashboard' : '/')}>
            <i className="fa-solid fa-arrow-left" /> {tp('Retour', 'Back')}
          </button>
          <div className="offres-header-content">
            <div className="offres-header-icon">
              <i className="fa-solid fa-briefcase" />
            </div>
            <div>
              <h1>{tp("Offres d'Emploi & Stages", "Job Offers & Internships")}</h1>
              <p>{tp("Mairie de Soa — Service des Ressources Humaines", "Soa Council — Human Resources Department")}</p>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LanguageSwitcher />
            <AccessibilityToolbar />
          </div>
        </div>
      )}

      {/* Onglets principaux */}
      <div className="main-tabs-container">
        <div className="main-tabs">
          <button
            className={`main-tab ${mainTab === 'emplois' ? 'active' : ''}`}
            onClick={() => { setMainTab('emplois'); setShowApplyForm(false); setShowJobModal(false); }}
          >
            <i className="fa-solid fa-briefcase" />
            Offres d'Emploi
            <span className="tab-count">{jobs.length}</span>
          </button>
          <button
            className={`main-tab ${mainTab === 'stages' ? 'active' : ''}`}
            onClick={() => { setMainTab('stages'); setShowApplyForm(false); setStageType(''); }}
          >
            <i className="fa-solid fa-graduation-cap" />
            Demandes de Stage
          </button>
        </div>
      </div>

      <div className="offres-body">

        {/* ═══════════════════════════════════════════ */}
        {/* ONGLET OFFRES D'EMPLOI                     */}
        {/* ═══════════════════════════════════════════ */}
        {mainTab === 'emplois' && (
          <div className="tab-content fade-in">
            {!showApplyForm ? (
              <>
                {/* Filtres */}
                <div className="jobs-toolbar">
                  <h2 className="section-title">
                    <i className="fa-solid fa-list" /> Offres publiées par la Mairie de Soa
                  </h2>
                  <div className="filter-tabs">
                    {['tous', 'CDI', 'CDD'].map(f => (
                      <button
                        key={f}
                        className={`filter-btn ${jobFilter === f ? 'active' : ''}`}
                        onClick={() => setJobFilter(f)}
                      >
                        {f === 'tous' ? 'Toutes' : f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grille des offres */}
                {loadingJobs ? (
                  <div className="loading-state">
                    <i className="fa-solid fa-circle-notch fa-spin" /> Chargement des offres...
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="empty-state">
                    <i className="fa-solid fa-inbox" />
                    <p>{t("Aucune offre disponible pour le moment.")}</p>
                    <span>{t("Revenez bientôt, de nouvelles offres sont publiées régulièrement.")}</span>
                  </div>
                ) : (
                  <div className="jobs-grid">
                    {filteredJobs.map(job => (
                      <div key={job.id} className="job-card" onClick={() => openJobDetail(job)}>
                        <div className="job-card-top">
                          <div className="job-card-icon">
                            <i className="fa-solid fa-building-columns" />
                          </div>
                          <span className={`contract-badge ${job.type?.toLowerCase()}`}>{job.type || 'CDI'}</span>
                        </div>
                        <h3 className="job-card-title">{job.title}</h3>
                        <p className="job-card-dept">
                          <i className="fa-solid fa-sitemap" /> {job.department}
                        </p>
                        <p className="job-card-loc">
                          <i className="fa-solid fa-location-dot" /> {job.location || 'Mairie de Soa • Yaoundé'}
                        </p>
                        {job.deadline && (
                          <p className="job-card-deadline">
                            <i className="fa-regular fa-calendar-xmark" /> Clôture : {new Date(job.deadline).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        <div className="job-card-footer">
                          <span className="salary-tag">
                            <i className="fa-solid fa-coins" /> {job.salary_range || 'Selon grille'}
                          </span>
                          <button className="view-btn" onClick={(e) => { e.stopPropagation(); openJobDetail(job); }}>
                            Voir détail <i className="fa-solid fa-arrow-right" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Formulaire de candidature emploi ── */
              <div className="apply-form-container fade-in">
                <div className="apply-form-header">
                  <button className="back-link" onClick={() => { setShowApplyForm(false); setSubmitStatus({ text: '', type: '' }); setSuccessData(null); }}>
                    <i className="fa-solid fa-arrow-left" /> Retour aux offres
                  </button>
                  <h2>Dossier de candidature — <span style={{ color: '#22c55e' }}>{applyJob?.title}</span></h2>
                  <p>{applyJob?.department} • {applyJob?.type}</p>
                </div>

                {successData ? (
                  <SuccessCard data={successData} onBack={() => { setShowApplyForm(false); setSuccessData(null); }} />
                ) : (
                  <div className="dossier-form">
                    <div className="dossier-info-box">
                      <i className="fa-solid fa-circle-info" />
                      <p>{t("Pour postuler à ce poste, veuillez fournir les")}<strong>4 documents obligatoires</strong> ci-dessous, <strong>tous en format PDF</strong>. Toute soumission incomplète ou dans un format autre que PDF sera rejetée.</p>
                    </div>

                    <div className="docs-upload-list">
                      {REQUIRED_DOCS.emploi.map(key => (
                        <DocUploadSlot key={key} docKey={key} />
                      ))}
                    </div>

                    <div className="form-group">
                      <label>Message / Lettre d'accompagnement <span style={{ color: '#94a3b8' }}>(optionnel)</span></label>
                      <textarea
                        rows={4}
                        placeholder="Ajoutez un message personnel à l'attention du Service RH..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    {submitStatus.text && (
                      <div className={`submit-status ${submitStatus.type}`}>
                        <i className={`fa-solid ${submitStatus.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        {submitStatus.text}
                      </div>
                    )}

                    <div className="submit-row">
                      <div className="docs-progress">
                        {REQUIRED_DOCS.emploi.filter(k => uploadedDocs[k]?.valid).length} / {REQUIRED_DOCS.emploi.length} documents uploadés
                      </div>
                      <button
                        className="submit-dossier-btn"
                        disabled={!isReadyToSubmit(REQUIRED_DOCS.emploi) || submitting}
                        onClick={submitEmploi}
                      >
                        {submitting ? (
                          <><i className="fa-solid fa-circle-notch fa-spin" />{t("Soumission en cours...")}</>
                        ) : (
                          <><i className="fa-solid fa-paper-plane" />{t("Soumettre mon dossier")}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ONGLET DEMANDES DE STAGE                   */}
        {/* ═══════════════════════════════════════════ */}
        {mainTab === 'stages' && (
          <div className="tab-content fade-in">
            {!stageType ? (
              /* ── Choix du type de stage ── */
              <div className="stage-type-selector">
                <h2 className="section-title">
                  <i className="fa-solid fa-graduation-cap" /> Quelle est la nature de votre demande de stage ?
                </h2>
                <p className="stage-intro">{t("Sélectionnez le type de stage pour accéder au formulaire correspondant avec la liste des documents requis.")}</p>

                <div className="stage-cards-grid">
                  <div className="stage-type-card academique" onClick={() => startStage('academique')}>
                    <div className="stage-card-icon"><i className="fa-solid fa-graduation-cap" style={{ fontSize: '2rem', color: '#074696' }} /></div>
                    <h3>Stage Académique</h3>
                    <p>{t("Pour les étudiants en cours de scolarité ayant besoin d'un stage imposé par leur établissement.")}</p>
                    <ul className="stage-docs-preview">
                      <li><i className="fa-solid fa-file-pdf" /> CV</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Demande manuscrite")}</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Certificat de scolarité")}</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Attestation de l'école")}</li>
                      <li><i className="fa-solid fa-file-pdf" /> Copie CNI</li>
                    </ul>
                    <button className="stage-choose-btn">
                      Choisir ce type <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>

                  <div className="stage-type-card professionnel" onClick={() => startStage('professionnel')}>
                    <div className="stage-card-icon"><i className="fa-solid fa-briefcase" style={{ fontSize: '2rem', color: '#1b8a53' }} /></div>
                    <h3>Stage Professionnel</h3>
                    <p>{t("Pour les personnes déjà sur le marché du travail cherchant à enrichir leur expérience professionnelle.")}</p>
                    <ul className="stage-docs-preview">
                      <li><i className="fa-solid fa-file-pdf" /> CV</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Demande manuscrite")}</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Lettre de motivation")}</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Copie diplôme récent")}</li>
                      <li><i className="fa-solid fa-file-pdf" /> Copie CNI</li>
                    </ul>
                    <button className="stage-choose-btn">
                      Choisir ce type <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>

                  <div className="stage-type-card vacances" onClick={() => startStage('vacances')}>
                    <div className="stage-card-icon"><i className="fa-solid fa-umbrella-beach" style={{ fontSize: '2rem', color: '#ea580c' }} /></div>
                    <h3>Stage de Vacances</h3>
                    <p>{t("Pour les élèves et étudiants souhaitant effectuer un stage pendant les vacances scolaires et universitaires.")}</p>
                    <ul className="stage-docs-preview">
                      <li><i className="fa-solid fa-file-pdf" /> CV</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Demande manuscrite")}</li>
                      <li><i className="fa-solid fa-file-pdf" />{t("Lettre de motivation")}</li>
                      <li><i className="fa-solid fa-file-pdf" /> Copie CNI</li>
                    </ul>
                    <button className="stage-choose-btn">
                      Choisir ce type <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Formulaire stage ── */
              <div className="apply-form-container fade-in">
                <div className="apply-form-header">
                  <button className="back-link" onClick={() => { setStageType(''); setSubmitStatus({ text: '', type: '' }); setSuccessData(null); }}>
                    <i className="fa-solid fa-arrow-left" /> Retour au choix de stage
                  </button>
                  <h2>
                    <i className={stageType === 'academique' ? "fa-solid fa-graduation-cap" : (stageType === 'vacances' ? "fa-solid fa-umbrella-beach" : "fa-solid fa-briefcase")} style={{ marginRight: '8px', color: stageType === 'vacances' ? '#ea580c' : 'inherit' }} />
                    {stageType === 'academique' ? 'Stage Académique' : (stageType === 'vacances' ? 'Stage de Vacances' : 'Stage Professionnel')}
                  </h2>
                  <p>Mairie de Soa — Service des Ressources Humaines</p>
                </div>

                {successData ? (
                  <SuccessCard data={successData} onBack={() => { setStageType(''); setSuccessData(null); }} />
                ) : (
                  <div className="dossier-form">
                    <div className="dossier-info-box">
                      <i className="fa-solid fa-circle-info" />
                      <p>
                        Fournissez les <strong>{REQUIRED_DOCS[`stage_${stageType}`].length} documents obligatoires</strong> ci-dessous, <strong>tous en format PDF</strong>.
                        Toute soumission incomplète ou dans un autre format sera rejetée automatiquement.
                      </p>
                    </div>

                    <div className="docs-upload-list">
                      {REQUIRED_DOCS[`stage_${stageType}`].map(key => (
                        <DocUploadSlot key={key} docKey={key} />
                      ))}
                    </div>

                    <div className="form-group">
                      <label>{t("Message d'accompagnement")}<span style={{ color: '#94a3b8' }}>(optionnel)</span></label>
                      <textarea
                        rows={4}
                        placeholder="Présentez-vous brièvement et exprimez votre intérêt pour un stage à la Mairie de Soa..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    {submitStatus.text && (
                      <div className={`submit-status ${submitStatus.type}`}>
                        <i className={`fa-solid ${submitStatus.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        {submitStatus.text}
                      </div>
                    )}

                    <div className="submit-row">
                      <div className="docs-progress">
                        {REQUIRED_DOCS[`stage_${stageType}`].filter(k => uploadedDocs[k]?.valid).length} / {REQUIRED_DOCS[`stage_${stageType}`].length} documents uploadés
                      </div>
                      <button
                        className="submit-dossier-btn"
                        disabled={!isReadyToSubmit(REQUIRED_DOCS[`stage_${stageType}`]) || submitting}
                        onClick={submitStage}
                      >
                        {submitting ? (
                          <><i className="fa-solid fa-circle-notch fa-spin" />{t("Soumission en cours...")}</>
                        ) : (
                          <><i className="fa-solid fa-paper-plane" />{t("Soumettre ma demande de stage")}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL DÉTAIL OFFRE                         */}
      {/* ═══════════════════════════════════════════ */}
      {showJobModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowJobModal(false)}>
          <div className="job-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJobModal(false)}>
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="modal-job-header">
              <div className="modal-job-icon">
                <i className="fa-solid fa-building-columns" />
              </div>
              <div>
                <span className={`contract-badge ${selectedJob.type?.toLowerCase()}`}>{selectedJob.type || 'CDI'}</span>
                <h2>{selectedJob.title}</h2>
                <p>
                  <i className="fa-solid fa-sitemap" /> {selectedJob.department} &nbsp;|&nbsp;
                  <i className="fa-solid fa-location-dot" /> {selectedJob.location || 'Mairie de Soa'}
                </p>
              </div>
            </div>

            <div className="modal-job-meta">
              <span><i className="fa-solid fa-coins" /> {selectedJob.salary_range || 'Selon grille salariale'}</span>
              {selectedJob.deadline && <span><i className="fa-regular fa-calendar-xmark" /> Clôture : {new Date(selectedJob.deadline).toLocaleDateString('fr-FR')}</span>}
            </div>

            <div className="modal-job-body">
              {selectedJob.description && (
                <div className="modal-section">
                  <h4><i className="fa-solid fa-align-left" />{t("Description du poste")}</h4>
                  <p>{selectedJob.description}</p>
                </div>
              )}

              {selectedJob.missions && (
                <div className="modal-section">
                  <h4><i className="fa-solid fa-list-check" />{t("Missions principales")}</h4>
                  <p style={{ whiteSpace: 'pre-line' }}>{selectedJob.missions}</p>
                </div>
              )}

              {selectedJob.requirements && (
                <div className="modal-section">
                  <h4><i className="fa-solid fa-user-check" />{t("Profil recherché")}</h4>
                  <p style={{ whiteSpace: 'pre-line' }}>{selectedJob.requirements}</p>
                </div>
              )}

              {selectedJob.skills_required && selectedJob.skills_required.length > 0 && (
                <div className="modal-section">
                  <h4><i className="fa-solid fa-tags" />{t("Compétences requises")}</h4>
                  <div className="skills-tags">
                    {selectedJob.skills_required.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
                  </div>
                </div>
              )}

              <div className="modal-section docs-required-section">
                <h4><i className="fa-solid fa-folder-open" /> Documents à fournir (PDF obligatoire)</h4>
                <ul className="modal-docs-list">
                  {REQUIRED_DOCS.emploi.map(key => (
                    <li key={key}>
                      <i className="fa-regular fa-file-pdf" style={{ color: '#ef4444' }} />
                      {DOC_LABELS[key].label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="modal-job-actions">
              <button className="modal-cancel-btn" onClick={() => setShowJobModal(false)}>
                Fermer
              </button>
              <button className="modal-apply-btn" onClick={() => startApply(selectedJob)}>
                <i className="fa-solid fa-paper-plane" /> Postuler à cette offre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Carte de succès après soumission ─────────────────────────────────────────
const SuccessCard = ({ data, onBack }) => {
  const { t } = useLanguage();
  return (
  <div className="success-card">
    <div className="success-icon">
      <i className="fa-solid fa-circle-check" />
    </div>
    <h3>{t("Dossier soumis avec succès !")}</h3>
    <p>{data.message}</p>
    <div className="dossier-ref-box">
      <span>{t("Référence de votre dossier")}</span>
      <strong>{data.dossierRef}</strong>
    </div>
    <div className="success-info-grid">
      <div className="success-info-item">
        <i className="fa-solid fa-hourglass-half" />
        <div>
          <span>{t("Prochaine étape")}</span>
          <p>Le Service RH de la Mairie de Soa va vérifier votre dossier et accuser réception. Vous recevrez une <strong>décharge officielle</strong> par email.</p>
        </div>
      </div>
      <div className="success-info-item">
        <i className="fa-solid fa-eye" />
        <div>
          <span>{t("Suivi en temps réel")}</span>
          <p>{t("Consultez l'avancement de votre dossier dans la section")}<strong>«Mes Candidatures»</strong> de votre espace candidat.</p>
        </div>
      </div>
    </div>
    <div className="success-actions">
      <button className="success-back-btn" onClick={onBack}>
        <i className="fa-solid fa-arrow-left" /> Retour
      </button>
      <a href="/candidat/dashboard" className="success-track-btn">
        <i className="fa-solid fa-chart-line" /> Suivre mes candidatures
      </a>
    </div>
  </div>
  );
};

export default OffresEmploi;
