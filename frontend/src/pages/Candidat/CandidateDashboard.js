import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatbotWidget from '../../components/ChatbotWidget';
import AccessibilityToolbar from '../../components/AccessibilityToolbar';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import VisioRoomModal from '../../components/VisioRoomModal';
import { useLanguage } from '../../context/LanguageContext';
import {
  downloadGuideCandidat,
  downloadCharteStages,
  downloadModeleDemande,
  downloadReglementFormations,
  downloadChecklistPieces
} from '../../utils/officialDocuments';
import { getDynamicGreeting } from '../../utils/timeGreeting';
import './CandidateDashboard.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const avatarInputRef = useRef(null);
  const diplomaFileInputRef = useRef(null);
  const multiDiplomaInputRef = useRef(null);

  // Utilisateur connecté
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      if (u) return u;
    } catch (e) {}
    return { prenom: 'Candidat', nom: 'Soa' };
  });

  // Salutation dynamique traquant l'heure en temps réel (Bonjour le matin, Bon après-midi l'aprèm, Bonsoir le soir)
  const [currentGreeting, setCurrentGreeting] = useState(() => getDynamicGreeting(user?.prenom || '', language));

  useEffect(() => {
    setCurrentGreeting(getDynamicGreeting(user?.prenom || '', language));
    const timer = setInterval(() => {
      setCurrentGreeting(getDynamicGreeting(user?.prenom || '', language));
    }, 15000);
    return () => clearInterval(timer);
  }, [user?.prenom, language]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    sessionStorage.clear();
    window.location.href = '/auth';
  };

  // Onglet actif
  const [activeTab, setActiveTab] = useState('dashboard');

  // Visioconférence en direct
  const [selectedInterviewForVisio, setSelectedInterviewForVisio] = useState(null);
  const [showVisioModal, setShowVisioModal] = useState(false);

  // Écouteur des paramètres d'URL (pour accès direct via lien email visio)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const roomParam = params.get('room');
    if (tabParam) setActiveTab(tabParam);
    if (roomParam) {
      fetch(`http://localhost:5000/api/interviews/room/${roomParam}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            setSelectedInterviewForVisio(data);
            setShowVisioModal(true);
            setActiveTab('interviews');
          }
        })
        .catch(err => console.error('Erreur chargement salle visio URL:', err));
    }
  }, []);

  // Données dynamiques
  const [dashboardData, setDashboardData] = useState({
    completionPercentage: 85,
    compatibilityScore: 82,
    recommendedJobs: [],
    myApplications: []
  });

  const [myInterviews, setMyInterviews] = useState([]);
  const [myDiplomas, setMyDiplomas] = useState([]);

  // Pôle Calendrier & Événements Municipaux
  const [eventsList, setEventsList] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [eventCategoryFilter, setEventCategoryFilter] = useState('TOUS');
  const [calendarViewMode, setCalendarViewMode] = useState('month'); // 'month' | 'agenda' | 'my_events'
  const [eventRegistering, setEventRegistering] = useState(false);

  // Pôle Formations Municipales
  const [trainingsList, setTrainingsList] = useState([]);
  const [myTrainingApplications, setMyTrainingApplications] = useState([]);
  const [trainingTabMode, setTrainingTabMode] = useState('catalogue'); // 'catalogue' | 'my_applications'
  const [selectedTrainingToView, setSelectedTrainingToView] = useState(null);
  const [selectedTrainingToApply, setSelectedTrainingToApply] = useState(null);
  const [trainingAppForm, setTrainingAppForm] = useState({
    motivation_text: '',
    phone: ''
  });
  const [trainingCvFile, setTrainingCvFile] = useState(null);
  const [trainingRequestFile, setTrainingRequestFile] = useState(null);
  const [trainingCoverLetterFile, setTrainingCoverLetterFile] = useState(null);
  const [trainingCniFile, setTrainingCniFile] = useState(null);
  const [trainingDiplomaFile, setTrainingDiplomaFile] = useState(null);
  const [submittingTrainingApp, setSubmittingTrainingApp] = useState(false);
  const [selectedTrainingReceipt, setSelectedTrainingReceipt] = useState(null);
  const [trainingCategoryFilter, setTrainingCategoryFilter] = useState('TOUTES');
  const [trainingSearchQuery, setTrainingSearchQuery] = useState('');

  // Pôle Messagerie Interne RH / Candidat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSubject, setChatSubject] = useState('Suivi de Candidature Emploi');
  const [chatAttachment, setChatAttachment] = useState(null);
  const [rhStatus, setRhStatus] = useState({
    is_available: true,
    status_text: 'En ligne & Disponible',
    working_hours: 'Du Lundi au Vendredi, 07h30 — 15h30',
    notice_text: 'Ce service de messagerie est strictement et exclusivement réservé aux échanges professionnels relatifs à vos candidatures, demandes de stage et formations auprès de la Mairie de Soa. Tout abus ou propos déplacé entraînera la clôture définitive du dossier.',
    auto_reply: ''
  });
  const [sendingChatMsg, setSendingChatMsg] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Pôle Notifications & Alertes Citoyennes
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState('TOUTES');

  // Pôle Paramètres & Gestion du Compte
  const [userSettings, setUserSettings] = useState({
    email_notif_jobs: true,
    email_notif_applications: true,
    email_notif_trainings: true,
    email_notif_messages: true,
    email_notif_events: true,
    push_notif_enabled: true,
    background_notif_enabled: true,
    sms_notif_enabled: false,
    profile_visibility: 'public_rh',
    allow_ai_matching: true,
    theme_mode: 'light',
    language: 'fr'
  });
  const [settingsSubTab, setSettingsSubTab] = useState('notifications'); // 'notifications' | 'security' | 'privacy' | 'display' | 'danger'
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  // Pôle Aide, Support & Réclamations Citoyennes
  const [supportTicketsList, setSupportTicketsList] = useState([]);
  const [supportSubTab, setSupportSubTab] = useState('faq'); // 'faq' | 'tickets' | 'new_ticket' | 'contact' | 'guides'
  const [dynamicGuides, setDynamicGuides] = useState([]);

  const fetchDynamicGuides = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/guides`);
      if (res.ok) {
        const data = await res.json();
        setDynamicGuides(data);
      }
    } catch (err) {
      console.error('Erreur chargement guides dynamiques:', err);
    }
  };

  useEffect(() => {
    fetchDynamicGuides();
  }, []);
  const [faqSearchTerm, setFaqSearchTerm] = useState('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('TOUTES');
  const [openFaqId, setOpenFaqId] = useState(1);
  const [newTicketForm, setNewTicketForm] = useState({
    category: 'Dossier & Candidature',
    subject: '',
    message: '',
    priority: 'normale'
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Gestion des diplômes & certifications
  const [showAddDiplomaModal, setShowAddDiplomaModal] = useState(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [uploadingDiploma, setUploadingDiploma] = useState(false);
  const [newDiploma, setNewDiploma] = useState({
    title: '',
    institution: 'Université de Yaoundé II - Soa',
    year: new Date().getFullYear(),
    level: 'Licence / Bachelor (Bac+3)'
  });

  // Sous-onglets de l'espace Découvrir la Mairie
  const [mairieSubTab, setMairieSubTab] = useState('histoire'); // 'histoire' | 'maires' | 'missions' | 'organigramme'
  const [showOrganigrammeModal, setShowOrganigrammeModal] = useState(false);

  // Mode de vue du profil : 'preview' (Aperçu Public RH) ou 'edit' (Formulaire de modification)
  const [profileViewMode, setProfileViewMode] = useState('preview');

  // Formulaire d'édition du profil
  const [profileForm, setProfileForm] = useState({
    nom: 'Candidat',
    prenom: 'Soa',
    title: 'Développeur Web Fullstack',
    bio: 'Passionné par le développement d\'applications innovantes et l\'amélioration continue des services publics municipaux à Soa.',
    skills: 'JavaScript, React, Node.js, SQL, Communication, Gestion de Projet',
    experience_years: 2,
    education_level: 'Licence / Master',
    phone: '+237 690 00 00 00',
    address: 'Soa Centre, Rue Principale',
    region: 'Centre (Soa / Yaoundé)',
    ville: 'Soa',
    portfolio_url: '',
    linkedin_url: '',
    github_url: ''
  });

  // Modale de candidature & Fiche Détaillée
  const [selectedJobToApply, setSelectedJobToApply] = useState(null);
  const [jobModalTab, setJobModalTab] = useState('details'); // 'details' | 'apply'
  const [coverLetter, setCoverLetter] = useState('');
  const [selectedDischarge, setSelectedDischarge] = useState(null);
  const [applyCvFile, setApplyCvFile] = useState(null);
  const [applyCoverLetterFile, setApplyCoverLetterFile] = useState(null);
  const [applyDiplomaFile, setApplyDiplomaFile] = useState(null);
  const [submittingApply, setSubmittingApply] = useState(false);

  const [, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Auto-effacement automatique des notifications d'action après 4 secondes
  useEffect(() => {
    if (statusMsg.text) {
      const timer = setTimeout(() => {
        setStatusMsg({ text: '', type: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg.text]);

  useEffect(() => {
    if (user && user.id) {
      fetchData(); // eslint-disable-line react-hooks/exhaustive-deps
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, intRes, profRes, trRes, myTrRes, evRes, rhRes, chatRes, unreadRes, notifRes, setRes, supRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/candidate/dashboard-data/${user.id}`),
        fetch(`${API_BASE_URL}/api/interviews/candidate/${user.id}`),
        fetch(`${API_BASE_URL}/api/candidate/profile/${user.id}`),
        fetch(`${API_BASE_URL}/api/trainings`),
        fetch(`${API_BASE_URL}/api/candidate/trainings/my-applications/${user.id}`),
        fetch(`${API_BASE_URL}/api/events?userId=${user.id}`),
        fetch(`${API_BASE_URL}/api/rh/status`),
        fetch(`${API_BASE_URL}/api/messages/candidate-conversation/${user.id}`),
        fetch(`${API_BASE_URL}/api/messages/unread-count/${user.id}`),
        fetch(`${API_BASE_URL}/api/notifications/${user.id}`),
        fetch(`${API_BASE_URL}/api/user/settings/${user.id}`),
        fetch(`${API_BASE_URL}/api/support/tickets/candidate/${user.id}`)
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashboardData(d);
        if (d.user) {
          setUser(d.user);
          localStorage.setItem('user', JSON.stringify(d.user));
        }
      }

      if (intRes.ok) setMyInterviews(await intRes.json());
      if (profRes.ok) {
        const pData = await profRes.json();
        if (pData.profile && pData.user) {
          setProfileForm({
            nom: pData.user.nom || '',
            prenom: pData.user.prenom || '',
            title: pData.profile.title || 'Candidat Polyvalent',
            bio: pData.profile.bio || '',
            skills: Array.isArray(pData.profile.skills) ? pData.profile.skills.join(', ') : (pData.profile.skills || ''),
            experience_years: pData.profile.experience_years || 1,
            education_level: pData.profile.education_level || 'Licence / Master',
            phone: pData.user.phone || pData.profile.phone || '',
            address: pData.profile.address || 'Soa',
            region: pData.user.region || pData.profile.region || 'Centre (Soa / Yaoundé)',
            ville: pData.user.ville || 'Soa',
            portfolio_url: pData.profile.portfolio_url || '',
            linkedin_url: pData.profile.linkedin_url || '',
            github_url: pData.profile.github_url || ''
          });
        }
        if (pData.diplomas) setMyDiplomas(pData.diplomas);
      }

      if (trRes.ok) setTrainingsList(await trRes.json());
      if (myTrRes.ok) setMyTrainingApplications(await myTrRes.json());
      if (evRes.ok) setEventsList(await evRes.json());
      if (rhRes.ok) setRhStatus(await rhRes.json());
      if (chatRes.ok) setChatMessages(await chatRes.json());
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        setUnreadMessagesCount(unreadData.unread_count || 0);
      }
      if (notifRes.ok) {
        const nData = await notifRes.json();
        setNotificationsList(nData.notifications || []);
        setUnreadNotifsCount(nData.unread_count || 0);
      }
      if (setRes.ok) {
        const sData = await setRes.json();
        setUserSettings(prev => ({ ...prev, ...sData }));
      }
      if (supRes.ok) {
        setSupportTicketsList(await supRes.json());
      }

    } catch (err) {
      console.error('Erreur chargement espace candidat :', err);
    } finally {
      setLoading(false);
    }
  };

  // Upload d'avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', user.id);

    try {
      const res = await fetch('http://localhost:5000/api/candidate/avatar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, avatar_url: data.avatarUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setStatusMsg({ text: 'Photo de profil mise à jour avec succès.', type: 'success' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur lors du téléversement de la photo.', type: 'error' });
    }
  };

  // Ajout structuré d'un Diplôme / Certification
  const handleSingleDiplomaSubmit = async (e) => {
    e.preventDefault();
    const file = diplomaFileInputRef.current?.files[0];
    if (!file) {
      setStatusMsg({ text: 'Veuillez sélectionner le fichier PDF de votre diplôme ou certification.', type: 'error' });
      return;
    }
    if (!newDiploma.title.trim()) {
      setStatusMsg({ text: 'Veuillez saisir l\'intitulé officiel du diplôme.', type: 'error' });
      return;
    }

    setUploadingDiploma(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);
    formData.append('title', newDiploma.title.trim());
    formData.append('institution', newDiploma.institution.trim());
    formData.append('year', newDiploma.year);
    formData.append('level', newDiploma.level);

    try {
      const res = await fetch('http://localhost:5000/api/candidate/diplomas', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: 'Diplôme / Certification enregistré avec succès dans votre dossier académique.', type: 'success' });
        setShowAddDiplomaModal(false);
        setNewDiploma({
          title: '',
          institution: 'Université de Yaoundé II - Soa',
          year: new Date().getFullYear(),
          level: 'Licence / Bachelor (Bac+3)'
        });
        if (diplomaFileInputRef.current) diplomaFileInputRef.current.value = '';
        fetchData();
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de l enregistrement.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau lors de l envoi du diplôme.', type: 'error' });
    } finally {
      setUploadingDiploma(false);
    }
  };

  // Téléversement multiple rapide de plusieurs diplômes/certificats
  const handleMultiDiplomasUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('userId', user.id);
    formData.append('defaultInstitution', 'Établissement académique');
    formData.append('defaultLevel', 'Diplôme / Certification');

    setUploadingDiploma(true);
    try {
      const res = await fetch('http://localhost:5000/api/candidate/upload-multiple-diplomas', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: `${files.length} diplôme(s) téléversé(s) avec succès. Vos recommandations d'emploi ont été actualisées.`, type: 'success' });
        if (multiDiplomaInputRef.current) multiDiplomaInputRef.current.value = '';
        fetchData();
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors du téléversement multiple.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau lors du téléversement multiple.', type: 'error' });
    } finally {
      setUploadingDiploma(false);
    }
  };

  // Suppression d'un diplôme
  const handleDeleteDiploma = async (diplomaId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce diplôme de votre dossier ?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/candidate/diplomas/${diplomaId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMyDiplomas(prev => prev.filter(d => d.id !== diplomaId));
        setStatusMsg({ text: 'Diplôme supprimé de votre dossier.', type: 'success' });
        fetchData();
      } else {
        setStatusMsg({ text: 'Erreur lors de la suppression.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau lors de la suppression.', type: 'error' });
    }
  };

  // Soumission de candidature à une formation municipale
  const handleTrainingApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrainingToApply) return;

    if (!trainingCvFile || !trainingRequestFile || !trainingCoverLetterFile || !trainingCniFile) {
      setStatusMsg({
        text: 'Veuillez joindre les 4 documents obligatoires (CV, Demande de participation, Lettre de motivation, Copie de pièce d\'identité).',
        type: 'error'
      });
      return;
    }

    setSubmittingTrainingApp(true);
    const formData = new FormData();
    formData.append('trainingId', selectedTrainingToApply.id);
    formData.append('userId', user.id);
    formData.append('nom', user.nom || profileForm.nom);
    formData.append('prenom', user.prenom || profileForm.prenom);
    formData.append('email', user.email);
    formData.append('phone', trainingAppForm.phone || profileForm.phone || user.phone || '');
    formData.append('motivation_text', trainingAppForm.motivation_text || '');
    formData.append('cv', trainingCvFile);
    formData.append('request_letter', trainingRequestFile);
    formData.append('cover_letter', trainingCoverLetterFile);
    formData.append('identity_card', trainingCniFile);
    if (trainingDiplomaFile) formData.append('diploma', trainingDiplomaFile);

    try {
      const res = await fetch('http://localhost:5000/api/candidate/trainings/apply', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: data.message, type: 'success' });
        setSelectedTrainingToApply(null);
        setTrainingCvFile(null);
        setTrainingRequestFile(null);
        setTrainingCoverLetterFile(null);
        setTrainingCniFile(null);
        setTrainingDiplomaFile(null);
        setTrainingAppForm({ motivation_text: '', phone: '' });
        fetchData();
        setTrainingTabMode('my_applications');
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de la soumission.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau lors de la soumission de la demande.', type: 'error' });
    } finally {
      setSubmittingTrainingApp(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GESTIONNAIRES DU CALENDRIER MUNICIPAL & ÉVÉNEMENTS
  // ══════════════════════════════════════════════════════════════

  // Inscription citoyenne à un événement municipal
  const handleEventRegister = async (eventId) => {
    setEventRegistering(true);
    try {
      const res = await fetch('http://localhost:5000/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: data.message || 'Participation confirmée !', type: 'success' });
        setEventsList(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_registered: true, registered_count: (ev.registered_count || 0) + 1 } : ev));
        if (selectedEventDetails && selectedEventDetails.id === eventId) {
          setSelectedEventDetails(prev => ({ ...prev, is_registered: true, registered_count: (prev.registered_count || 0) + 1 }));
        }
      } else {
        setStatusMsg({ text: data.message || 'Erreur inscription.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau lors de l\'inscription.', type: 'error' });
    } finally {
      setEventRegistering(false);
    }
  };

  // Annulation de participation
  const handleEventUnregister = async (eventId) => {
    setEventRegistering(true);
    try {
      const res = await fetch('http://localhost:5000/api/events/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: data.message || 'Participation annulée.', type: 'info' });
        setEventsList(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_registered: false, registered_count: Math.max(0, (ev.registered_count || 1) - 1) } : ev));
        if (selectedEventDetails && selectedEventDetails.id === eventId) {
          setSelectedEventDetails(prev => ({ ...prev, is_registered: false, registered_count: Math.max(0, (prev.registered_count || 1) - 1) }));
        }
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setEventRegistering(false);
    }
  };

  // Télécharger le fichier de rappel de calendrier (.ics)
  const handleDownloadIcs = (event) => {
    if (!event) return;
    const startDate = new Date(event.event_date);
    const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 3 * 3600 * 1000);

    const formatIcsDate = (d) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mairie de Soa//Calendrier Municipal HireBridge//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:soa-event-${event.id}@mairie-soa.cm`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${(event.title || '').replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${(event.location || 'Hôtel de Ville de Soa').replace(/[,;]/g, ' ')}`,
      `ORGANIZER;CN="Mairie de Soa":MAILTO:contact@mairie-soa.cm`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Evenement_Soa_${event.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusMsg({ text: 'Rappel téléchargé (.ics) ! Vous pouvez l\'importer dans votre calendrier.', type: 'success' });
  };

  // Navigation par mois
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  // Helper : Vérifie si une date d'événement est aujourd'hui ou dans le futur (les événements passés sont exclus)
  const isEventUpcoming = (evDateStr) => {
    if (!evDateStr) return false;
    const evDate = new Date(evDateStr);
    const evMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return evMidnight >= todayMidnight;
  };

  // Calcul de la grille mensuelle (7 colonnes: Lun -> Dim)
  const getDaysInMonthGrid = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
    const startOffset = (firstDayIndex + 6) % 7; // Convert to Monday=0, Sunday=6

    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];

    // Jours du mois précédent
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, dayNum);
      grid.push({
        dayNumber: dayNum,
        date: dateObj,
        isCurrentMonth: false,
        isPrevMonth: true,
        events: []
      });
    }

    // Jours du mois en cours
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateMidnight = new Date(year, month, d).getTime();
      const isPastDate = dateMidnight < todayMidnight;
      const isToday =
        dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear();

      // RÈGLE COMMUNE : Les événements passés ne doivent plus jamais apparaître sur le calendrier
      const dayEvents = isPastDate ? [] : eventsList.filter(ev => {
        if (!isEventUpcoming(ev.event_date)) return false;
        const evDate = new Date(ev.event_date);
        const matchesCategory = eventCategoryFilter === 'TOUS' || ev.category === eventCategoryFilter;
        const matchesDate =
          evDate.getDate() === d &&
          evDate.getMonth() === month &&
          evDate.getFullYear() === year;
        return matchesCategory && matchesDate;
      });

      grid.push({
        dayNumber: d,
        date: dateObj,
        isCurrentMonth: true,
        isToday,
        isPastDate,
        events: dayEvents
      });
    }

    // Jours du mois suivant
    const totalCells = grid.length <= 35 ? 35 : 42;
    const remaining = totalCells - grid.length;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      const dateObj = new Date(year, month + 1, nextD);
      grid.push({
        dayNumber: nextD,
        date: dateObj,
        isCurrentMonth: false,
        isNextMonth: true,
        events: []
      });
    }

    return grid;
  };

  // ══════════════════════════════════════════════════════════════
  // GESTIONNAIRE DE MESSAGERIE RH / CANDIDAT
  // ══════════════════════════════════════════════════════════════

  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !chatAttachment) return;

    const currentUserId = user?.id || (JSON.parse(localStorage.getItem('user'))?.id);
    if (!currentUserId) {
      setStatusMsg({ text: 'Session expirée. Veuillez vous reconnecter.', type: 'error' });
      return;
    }

    setSendingChatMsg(true);
    try {
      const formData = new FormData();
      formData.append('sender_id', currentUserId);
      formData.append('content', chatInput.trim());
      formData.append('subject', chatSubject);
      if (chatAttachment) {
        formData.append('attachment', chatAttachment);
      }

      const res = await fetch('http://localhost:5000/api/messages/send', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setChatInput('');
        setChatAttachment(null);
        // Rafraîchir immédiatement les messages
        const convRes = await fetch(`http://localhost:5000/api/messages/candidate-conversation/${currentUserId}`);
        if (convRes.ok) {
          const freshMsgs = await convRes.json();
          setChatMessages(freshMsgs);
        }
        if (data.auto_replied) {
          setStatusMsg({ text: 'Message transmis. Le Service RH étant actuellement hors permanence, votre demande sera traitée à la réouverture des bureaux.', type: 'info' });
        } else {
          setStatusMsg({ text: 'Message transmis au Service RH avec succès !', type: 'success' });
        }
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de l\'envoi.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Erreur réseau lors de l\'envoi du message.', type: 'error' });
    } finally {
      setSendingChatMsg(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GESTIONNAIRE DES NOTIFICATIONS CITOYENNES
  // ══════════════════════════════════════════════════════════════

  const handleMarkNotifAsRead = async (notifId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notifId}/read`, { method: 'PUT' });
      setNotificationsList(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadNotifsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsAsRead = async () => {
    try {
      await fetch(`http://localhost:5000/api/notifications/mark-all-read/${user.id}`, { method: 'PUT' });
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifsCount(0);
      setStatusMsg({ text: 'Toutes les notifications ont été marquées comme lues.', type: 'info' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotif = async (notifId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notifId}`, { method: 'DELETE' });
      setNotificationsList(prev => prev.filter(n => n.id !== notifId));
      const notif = notificationsList.find(n => n.id === notifId);
      if (notif && !notif.is_read) {
        setUnreadNotifsCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearReadNotifs = async () => {
    try {
      await fetch(`http://localhost:5000/api/notifications/clear-read/${user.id}`, { method: 'DELETE' });
      setNotificationsList(prev => prev.filter(n => !n.is_read));
      setStatusMsg({ text: 'Notifications lues supprimées avec succès.', type: 'info' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    handleMarkNotifAsRead(notif.id);
    setShowNotifDropdown(false);
    if (notif.action_tab) {
      if (notif.action_tab === 'offres') {
        navigate('/candidat/offres');
      } else {
        setActiveTab(notif.action_tab);
      }
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GESTIONNAIRE DES PARAMÈTRES & DU COMPTE
  // ══════════════════════════════════════════════════════════════

  const handleUpdateSetting = async (key, val) => {
    const updated = { ...userSettings, [key]: val };
    setUserSettings(updated);
    try {
      await fetch(`http://localhost:5000/api/user/settings/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      setStatusMsg({ text: 'Préférence enregistrée avec succès !', type: 'success' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('Votre navigateur ne prend pas en charge les notifications Web Push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        handleUpdateSetting('push_notif_enabled', true);
        handleUpdateSetting('background_notif_enabled', true);
        new Notification('Mairie de Soa • Notifications Activées', {
          body: 'Vous recevrez désormais les alertes officielles d\'offres, stages et convocations même lorsque l\'application est fermée.',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg'
        });
        setStatusMsg({ text: 'Notifications Web Push autorisées avec succès !', type: 'success' });
      } else {
        handleUpdateSetting('push_notif_enabled', false);
        setStatusMsg({ text: 'Autorisation des notifications refusée par le navigateur.', type: 'info' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMsg({ text: 'Les deux nouveaux mots de passe ne correspondent pas.', type: 'error' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setStatusMsg({ text: 'Le nouveau mot de passe doit comporter au moins 6 caractères.', type: 'error' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('http://localhost:5000/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setStatusMsg({ text: 'Votre mot de passe a été modifié avec succès !', type: 'success' });
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de la modification.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExportPersonalData = async () => {
    setExportingData(true);
    try {
      const res = await fetch(`http://localhost:5000/api/user/export-data/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `dossier_citoyen_mairie_soa_${user.id}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setStatusMsg({ text: 'Vos données personnelles ont été exportées avec succès (JSON).', type: 'success' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur lors de l\'export des données.', type: 'error' });
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    if (deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER MON COMPTE') {
      setStatusMsg({ text: 'Veuillez saisir exactement "SUPPRIMER MON COMPTE" pour confirmer.', type: 'error' });
      return;
    }

    if (!deleteAccountPassword) {
      setStatusMsg({ text: 'Veuillez renseigner votre mot de passe actuel.', type: 'error' });
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetch('http://localhost:5000/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          password: deleteAccountPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Votre compte a été définitivement supprimé. Merci d\'avoir utilisé la plateforme municipale de Soa.');
        localStorage.clear();
        navigate('/auth');
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de la suppression.', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setDeletingAccount(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GESTIONNAIRE D'AIDE & SUPPORT CITOYEN
  // ══════════════════════════════════════════════════════════════

  const handleCreateSupportTicket = async (e) => {
    if (e) e.preventDefault();

    const messageText = newTicketForm.message ? newTicketForm.message.trim() : '';
    if (!messageText) {
      setStatusMsg({ text: 'Veuillez saisir une description détaillée de votre demande.', type: 'error' });
      return;
    }

    const activeUserId = user?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
    if (!activeUserId) {
      setStatusMsg({ text: 'Session expirée. Veuillez vous reconnecter.', type: 'error' });
      return;
    }

    const finalSubject = newTicketForm.subject && newTicketForm.subject.trim()
      ? newTicketForm.subject.trim()
      : `${newTicketForm.category || 'Demande'} - ${messageText.substring(0, 40)}${messageText.length > 40 ? '...' : ''}`;

    setSubmittingTicket(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          category: newTicketForm.category || 'Dossier & Candidature',
          subject: finalSubject,
          message: messageText,
          priority: newTicketForm.priority || 'normale'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSupportTicketsList(prev => [data.ticket, ...prev]);
        setNewTicketForm({ category: 'Dossier & Candidature', subject: '', message: '', priority: 'normale' });
        setSupportSubTab('tickets');
        setStatusMsg({ text: `Ticket ${data.ticket.ticket_number} ouvert avec succès !`, type: 'success' });
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de la création.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur submission ticket:', err);
      setStatusMsg({ text: 'Erreur réseau lors de la création du ticket.', type: 'error' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Postuler à une offre avec pièces PDF spécifiques
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobToApply) return;
    setSubmittingApply(true);

    try {
      const activeUserId = user?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (!activeUserId) {
        setStatusMsg({ text: 'Session expirée. Veuillez vous reconnecter.', type: 'error' });
        setSubmittingApply(false);
        return;
      }

      const formData = new FormData();
      formData.append('userId', activeUserId);
      formData.append('jobId', selectedJobToApply.id);
      formData.append('compatibilityScore', selectedJobToApply.matchPercentage || 85);
      formData.append('coverLetter', coverLetter || '');

      if (applyCvFile) formData.append('cv', applyCvFile);
      if (applyCoverLetterFile) formData.append('lettre_motivation', applyCoverLetterFile);
      if (applyDiplomaFile) formData.append('diplome', applyDiplomaFile);

      const res = await fetch(`${API_BASE_URL}/api/applications/apply`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: 'Votre candidature et vos pièces PDF ont été soumises avec succès au Service RH !', type: 'success' });
        setSelectedJobToApply(null);
        setCoverLetter('');
        setApplyCvFile(null);
        setApplyCoverLetterFile(null);
        setApplyDiplomaFile(null);
        fetchData();
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de la candidature.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur candidature:', err);
      setStatusMsg({ text: 'Erreur réseau lors du téléversement.', type: 'error' });
    } finally {
      setSubmittingApply(false);
    }
  };

  // Enregistrer profil complet avec validation et persistance immédiate
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const activeUserId = user?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (!activeUserId) {
        setStatusMsg({ text: 'Session utilisateur introuvable. Veuillez vous reconnecter.', type: 'error' });
        setSavingProfile(false);
        return;
      }

      const res = await fetch(`http://localhost:5000/api/candidate/profile/${activeUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: profileForm.nom,
          prenom: profileForm.prenom,
          title: profileForm.title,
          bio: profileForm.bio,
          skills: profileForm.skills,
          experience_years: parseInt(profileForm.experience_years, 10) || 0,
          education_level: profileForm.education_level,
          phone: profileForm.phone,
          address: profileForm.address,
          region: profileForm.region,
          ville: profileForm.ville,
          portfolio_url: profileForm.portfolio_url,
          linkedin_url: profileForm.linkedin_url,
          github_url: profileForm.github_url
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ text: language === 'en' ? 'Your profile has been successfully updated!' : 'Votre profil a été enregistré et mis à jour avec succès !', type: 'success' });
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        if (data.profile) {
          setProfileForm(prev => ({
            ...prev,
            nom: data.user?.nom || prev.nom,
            prenom: data.user?.prenom || prev.prenom,
            title: data.profile?.title || prev.title,
            bio: data.profile?.bio || prev.bio,
            skills: Array.isArray(data.profile?.skills) ? data.profile.skills.join(', ') : (data.profile?.skills || prev.skills),
            experience_years: data.profile?.experience_years ?? prev.experience_years,
            education_level: data.profile?.education_level || prev.education_level,
            phone: data.user?.phone || data.profile?.phone || prev.phone,
            address: data.user?.address || data.profile?.address || prev.address,
            region: data.user?.region || data.profile?.region || prev.region,
            ville: data.user?.ville || data.profile?.ville || prev.ville,
            portfolio_url: data.profile?.portfolio_url || prev.portfolio_url,
            linkedin_url: data.profile?.linkedin_url || prev.linkedin_url,
            github_url: data.profile?.github_url || prev.github_url
          }));
        }
        if (data.completionPercentage !== undefined) {
          setDashboardData(prev => ({ ...prev, completionPercentage: data.completionPercentage }));
        }
        setProfileViewMode('preview'); // Bascule automatique vers l'aperçu pour voir le résultat
        fetchData();
      } else {
        setStatusMsg({ text: data.message || 'Erreur lors de l enregistrement.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Erreur réseau lors de la mise à jour.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const defaultAvatar = 'https://i.pravatar.cc/150?img=68';
  const currentAvatar = (user && user.avatar_url) ? user.avatar_url : defaultAvatar;

  const score = dashboardData.compatibilityScore || 82;
  const strokeOffset = Math.max(0, Math.min(180, 180 - (180 * score) / 100));

  return (
    <div className="candidate-container">
      <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
      <input type="file" ref={multiDiplomaInputRef} onChange={handleMultiDiplomasUpload} multiple accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg" alt="Coat" />
            <div className="sidebar-logo-text">MAIRIE DE <span>SOA</span></div>
          </div>
          <div className="app-brand">HIRE <span>BRIDGE</span></div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <i className="fa-solid fa-house"></i> {t('nav_dashboard', 'Tableau de bord')}
          </button>
          <button className={`nav-item ${activeTab === 'about-mairie' ? 'active' : ''}`} onClick={() => setActiveTab('about-mairie')}>
            <i className="fa-solid fa-landmark-flag"></i> {t('nav_about_mairie', 'Découvrir la Mairie')}
          </button>
          <button className={`nav-item ${activeTab === 'trainings' ? 'active' : ''}`} onClick={() => setActiveTab('trainings')}>
            <i className="fa-solid fa-graduation-cap"></i> {t('nav_trainings', 'Formations Municipales')}
            {trainingsList.length > 0 && <span className="nav-badge-pill">{trainingsList.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <i className="fa-regular fa-calendar-days"></i> {t('nav_events', 'Calendrier & Événements')}
            {eventsList.length > 0 && <span className="nav-badge-pill blue">{eventsList.length}</span>}
          </button>
          <button className="nav-item nav-item-highlight" onClick={() => navigate('/candidat/offres')}>
            <i className="fa-solid fa-briefcase"></i> {t('nav_jobs', "Offres d'Emploi & Stages")}
          </button>
          <button className={`nav-item ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
            <i className="fa-regular fa-clipboard"></i> {t('nav_applications', 'Mes candidatures')}
            {dashboardData.myApplications && dashboardData.myApplications.length > 0 && (
              <span className="nav-badge-pill">{dashboardData.myApplications.length}</span>
            )}
          </button>
          <button className={`nav-item ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>
            <i className="fa-solid fa-video"></i> {t('nav_interviews', 'Mes entretiens')}
            {myInterviews.length > 0 && <span className="nav-badge-pill">{myInterviews.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <i className="fa-solid fa-comments"></i> {t('nav_messages', 'Messagerie RH')}
            {unreadMessagesCount > 0 && <span className="nav-badge-pill red">{unreadMessagesCount}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <i className="fa-regular fa-bell"></i> {t('nav_notifications', 'Notifications')}
            {unreadNotifsCount > 0 && <span className="nav-badge-pill red">{unreadNotifsCount}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <i className="fa-solid fa-gear"></i> {t('nav_settings', 'Paramètres')}
          </button>
          <button className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
            <i className="fa-solid fa-circle-question"></i> {t('nav_support', 'Aide & Support')}
            {supportTicketsList && supportTicketsList.length > 0 && (
              <span className="nav-badge-pill">{supportTicketsList.length}</span>
            )}
          </button>
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <i className="fa-regular fa-user"></i> {t('nav_profile', 'Mon profil')}
          </button>
        </nav>


        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar-wrapper" onClick={() => avatarInputRef.current.click()} title="Changer la photo de profil">
              <img src={currentAvatar} alt="Avatar" />
              <div className="avatar-upload-overlay"><i className="fa-solid fa-camera"></i></div>
            </div>
            <div className="user-info">
              <span className="user-name">{user.prenom} {user.nom}</span>
              <span className="user-role">{language === 'en' ? 'Candidate' : 'Candidat'}</span>
            </div>
          </div>

          <div className="profile-progress-bar">
            <div className="progress-label">{t('profile_completion_label', 'Profil complété à')} {dashboardData.completionPercentage}%</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${dashboardData.completionPercentage}%` }}></div>
            </div>
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            <i className="fa-solid fa-arrow-right-from-bracket"></i> {t('logout', 'Déconnexion')}
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-welcome-title">
            <div className="civic-portal-header-badge">
              <div className="civic-portal-icon-box">
                <i className="fa-solid fa-landmark"></i>
              </div>
              <div className="civic-portal-text-group">
                <div className="civic-portal-kicker">
                  <span className="civic-pulse-dot"></span> PORTAIL OFFICIEL CANDIDAT
                </div>
                <h2 className="civic-portal-main-heading">
                  Portail Candidat <span className="title-dash">—</span> <span className="mairie-highlight">{t("Mairie de")}<span className="soa-green-glow">SOA</span></span>
                </h2>
              </div>
            </div>
          </div>
          <div className="topbar-right">

            {/* SÉLECTEUR DE LANGUE BILINGUE (FR / EN) */}
            <LanguageSwitcher />

            {/* BOUTON ACCESSIBILITÉ & AFFICHAGE (EN HAUT À CÔTÉ DES NOTIFICATIONS) */}
            <AccessibilityToolbar />

            {/* BOUTON NOTIFICATIONS CLOCHE & POPOVER */}
            <div className="topbar-notif-wrapper">
              <button
                type="button"
                className={`btn-notif-bell ${showNotifDropdown ? 'active' : ''}`}
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                title="Centre de notifications"
              >
                <i className="fa-regular fa-bell" />
                {unreadNotifsCount > 0 && (
                  <span className="bell-badge-pill">{unreadNotifsCount}</span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="notif-dropdown-popover">
                  <div className="notif-popover-header">
                    <div>
                      <h5>{t("Notifications")}</h5>
                      <span className="notif-popover-count">{unreadNotifsCount} non lue(s)</span>
                    </div>
                    {unreadNotifsCount > 0 && (
                      <button
                        type="button"
                        className="btn-popover-mark-all"
                        onClick={handleMarkAllNotifsAsRead}
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>

                  <div className="notif-popover-list">
                    {notificationsList.length === 0 ? (
                      <div className="notif-popover-empty">
                        <i className="fa-regular fa-bell-slash" />
                        <p>{t("Aucune notification")}</p>
                      </div>
                    ) : (
                      notificationsList.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          className={`notif-popover-item ${!n.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className={`notif-item-icon ${n.type || 'information'}`}>
                            <i className={n.icon || 'fa-solid fa-bell'} />
                          </div>
                          <div className="notif-item-content">
                            <strong className="notif-item-title">{n.title}</strong>
                            <p className="notif-item-desc">{n.message}</p>
                            <span className="notif-item-time">
                              {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="notif-popover-footer">
                    <button
                      type="button"
                      className="btn-view-all-notifs"
                      onClick={() => {
                        setShowNotifDropdown(false);
                        setActiveTab('notifications');
                      }}
                    >
                      <i className="fa-solid fa-layer-group" /> Voir toutes les notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-user" onClick={() => avatarInputRef.current.click()}>
              <span>{user.prenom} {user.nom}</span>
              <img src={currentAvatar} alt="Avatar" className="topbar-avatar" />
            </div>
          </div>
        </header>

        {statusMsg.text && (
          <div className={`status-alert ${statusMsg.type}`}>
            <span>{statusMsg.text}</span>
            <button
              type="button"
              className="status-alert-close"
              onClick={() => setStatusMsg({ text: '', type: '' })}
              title="Fermer"
            >
              &times;
            </button>
          </div>
        )}

        {/* ONGLET 1 : DASHBOARD OVERVIEW — COMPOSITION INSTITUTIONNELLE ÉPURÉE */}
        {activeTab === 'dashboard' && (
          <div className="tab-fade candidate-dashboard-overview">
            
            {/* 1. EN-TÊTE DE PAGE ÉLÉGANTE (SANS BANNIÈRE CARTE GÉANTE) */}
            <div className="dashboard-header-simple">
              <span className="dash-kicker">{language === 'en' ? 'DASHBOARD' : 'TABLEAU DE BORD'}</span>
              <h1 className="dash-greeting">{currentGreeting}</h1>
              <p className="dash-subtext">
                {language === 'en'
                  ? 'Here are the opportunities that match your candidate profile.'
                  : 'Voici les opportunités qui correspondent à votre profil.'}
              </p>
            </div>

            <hr className="dash-divider" />

            {/* 2. PANNEAU SYNTHÈSE DE PROFIL & QUALIFICATION (COMPACT & NATUREL) */}
            <div className="profile-status-panel">
              <div className="status-col completion-col">
                <span className="col-label">{language === 'en' ? 'Your profile' : 'Votre profil'}</span>
                <strong className="col-value">
                  {t('profile_completion_label', 'Profil complété à')} {dashboardData.completionPercentage || 0}%
                </strong>
                <div className="dash-progress-track">
                  <div className="dash-progress-fill" style={{ width: `${dashboardData.completionPercentage || 0}%` }}></div>
                </div>
                <button type="button" className="btn-link-edit" onClick={() => setActiveTab('profile')}>
                  <i className="fa-regular fa-pen-to-square"></i> {language === 'en' ? 'Update profile' : 'Mettre à jour mon profil'}
                </button>
              </div>

              <div className="status-divider-vertical"></div>

              <div className="status-col score-col">
                <span className="col-label">
                  {language === 'en' ? 'Your compatibility with current opportunities' : 'Votre compatibilité avec les opportunités actuelles'}
                </span>
                <div className="score-big-group">
                  <span className="score-big-number">{score}%</span>
                  <span className="score-qualifier-badge">
                    {score >= 75 ? (language === 'en' ? 'Very good profile' : 'Très bon profil') : (language === 'en' ? 'Good profile' : 'Bon profil')}
                  </span>
                </div>
              </div>
            </div>

            <hr className="dash-divider" />

            {/* 3. OPPORTUNITÉS RECOMMANDÉES (LISTE STRUCTURÉE EN LIGNES NETTES) */}
            <div className="opportunities-section">
              <div className="opportunities-header">
                <h2>{language === 'en' ? 'Recommended opportunities' : 'Opportunités recommandées'}</h2>
                <button type="button" className="btn-see-all-jobs" onClick={() => navigate('/candidat/offres')}>
                  {language === 'en' ? 'View all offers' : 'Voir toutes les offres'} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }} />
                </button>
              </div>

              <div className="opportunities-structured-list">
                {(dashboardData.recommendedJobs || []).map(job => (
                  <div key={job.id} className="opp-row-item" onClick={() => setSelectedJobToApply(job)}>
                    <div className="opp-main-info">
                      <h4 className="opp-title">
                        {language === 'en' ? (
                          job.title === 'Assistant Ressources Humaines' ? 'Human Resources Assistant' :
                          job.title === 'Analyste de Données' ? 'Data Analyst' :
                          job.title === 'Chargé de Communication' ? 'Communications Officer' :
                          job.title === 'Stagiaire Académique en Droit Public / Informatique' ? 'Academic Intern in Public Law / IT' :
                          job.title
                        ) : job.title}
                      </h4>
                      <p className="opp-org">
                        <i className="fa-solid fa-landmark" /> {language === 'en' ? 'Soa Council • Yaounde, Cameroon' : 'Mairie de Soa'}
                      </p>
                    </div>

                    <div className="opp-meta-group">
                      <span className={`opp-type-badge ${job.type?.toLowerCase()}`}>{job.type}</span>
                      <div className="opp-compat-info">
                        <small>{language === 'en' ? 'Compatibility:' : 'Compatibilité :'}</small>
                        <strong>{job.match}</strong>
                      </div>
                    </div>

                    <div className="opp-action-side">
                      <button
                        type="button"
                        className="btn-view-job-row"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJobToApply(job);
                        }}
                      >
                        {language === 'en' ? 'View offer' : 'Voir l\'offre'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ONGLET 2 : MES CANDIDATURES */}
        {activeTab === 'applications' && (
          <div className="tab-fade">
            <div className="section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>{language === 'en' ? 'Live Tracking of My Applications' : 'Suivi en Temps Réel de Mes Candidatures'}</h3>
                <button
                  className="apply-btn-mini"
                  style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', borderRadius: '20px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => navigate('/candidat/offres')}
                >
                  <i className="fa-solid fa-plus" /> {language === 'en' ? 'New Application' : 'Nouveau dossier'}
                </button>
              </div>
              <div className="apps-list">
                {(dashboardData.myApplications || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-inbox" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }} />
                    <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#64748b' }}>{language === 'en' ? 'No applications submitted yet' : 'Aucune candidature soumise'}</p>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 16px' }}>{language === 'en' ? 'Browse our job openings and submit your first application.' : "Consultez nos offres d'emploi et déposez votre premier dossier."}</p>
                    <button style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/candidat/offres')}>
                      {language === 'en' ? 'View Offers' : 'Voir les offres'} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }} />
                    </button>
                  </div>
                ) : (dashboardData.myApplications || []).map(app => (
                  <div key={app.id} className="app-row-card">
                    <div className="app-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0 }}>{app.job_title || (language === 'en' ? 'Internship Request' : 'Demande de stage')}</h4>
                        {app.application_type && app.application_type !== 'emploi' && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '20px' }}>
                            <i className={app.application_type === 'stage_academique' ? "fa-solid fa-graduation-cap" : (app.application_type === 'stage_vacances' ? "fa-solid fa-umbrella-beach" : "fa-solid fa-briefcase")} style={{ marginRight: '5px' }} />
                            {app.application_type === 'stage_academique' ? (language === 'en' ? 'Academic Internship' : 'Stage Académique') : (app.application_type === 'stage_vacances' ? (language === 'en' ? 'Holiday Internship' : 'Stage de Vacances') : (language === 'en' ? 'Professional Internship' : 'Stage Pro'))}
                          </span>
                        )}
                      </div>
                      <p className="dept-sub">{app.department} • {language === 'en' ? 'Submitted on' : 'Soumis le'} {new Date(app.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</p>
                      {/* Référence dossier */}
                      <p style={{ margin: '2px 0', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {language === 'en' ? 'Ref' : 'Réf'} : #HB-{app.id}-{new Date(app.created_at).getFullYear()}
                      </p>
                    </div>
                    <div className="app-score">
                      {app.application_type === 'emploi' && (
                        <span>{language === 'en' ? 'Compatibility' : 'Compatibilité'} : <strong>{app.compatibility_score}%</strong></span>
                      )}
                    </div>
                    <div className="app-status" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <span className={`status-pill ${app.status}`}>
                        {app.status === 'soumis' && <><i className="fa-solid fa-clock" style={{ marginRight: '5px' }} />{language === 'en' ? 'Forwarded to HR' : 'Transmis aux RH'}</>}
                        {app.status === 'recu' && <><i className="fa-solid fa-check" style={{ marginRight: '5px' }} />{language === 'en' ? 'Received — Receipt Issued' : 'Reçu — Décharge émise'}</>}
                        {app.status === 'en_examen' && <><i className="fa-solid fa-magnifying-glass" style={{ marginRight: '5px' }} />{language === 'en' ? "Under Review" : "En cours d'examen"}</>}
                        {app.status === 'entretien_programme' && <><i className="fa-solid fa-calendar-check" style={{ marginRight: '5px' }} />{language === 'en' ? 'Interview Scheduled' : 'Entretien Programmé'}</>}
                        {app.status === 'accepte' && <><i className="fa-solid fa-circle-check" style={{ marginRight: '5px' }} />{language === 'en' ? 'Selected / Hired' : 'Retenu / Embauché'}</>}
                        {app.status === 'refuse' && <><i className="fa-solid fa-circle-xmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Not Selected' : 'Non retenu'}</>}
                      </span>
                      {/* Badge décharge & bouton visualiser */}
                      {app.discharge_sent && (
                        <button
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #22c55e',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setSelectedDischarge(app.discharge_content || '<p>{t("Décharge disponible")}</p>')}
                          title={language === 'en' ? "Click to view or print official receipt" : "Cliquer pour afficher ou imprimer la décharge officielle"}
                        >
                          <i className="fa-solid fa-stamp" /> {language === 'en' ? 'View My Official Receipt' : 'Voir ma Décharge Officielle'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}





        {/* =========================================================
            ONGLET : DÉCOUVRIR LA MAIRIE DE SOA (HISTOIRE & INSTITUTION)
            ========================================================= */}
        {activeTab === 'about-mairie' && (
          <div className="tab-fade about-mairie-container">

            {/* 1. GRANDE BANNIÈRE INSTITUTIONNELLE */}
            <div className="mairie-hero-banner">
              <div className="mairie-banner-overlay"></div>
              <div className="mairie-banner-content">
                <div className="mairie-badge-institution">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
                    alt="Armoiries du Cameroun"
                    className="mairie-coat-arms"
                  />
                  <div>
                    <span className="mairie-republic-text">RÉPUBLIQUE DU CAMEROUN • RÉGION DU CENTRE</span>
                    <h1 className="mairie-official-title">Commune de Soa</h1>
                  </div>
                </div>

                <h2 className="mairie-tagline">
                  « Une Commune au Service de la Jeunesse et de l'Avenir »
                </h2>
                <p className="mairie-desc-hero">
                  Découvrez l'histoire fascinante de la Commune de Soa, ses illustres bâtisseurs depuis 1959,
                  sa vision stratégique de développement local et son organigramme administratif complet.
                </p>

                {/* 4 Chiffres Clés */}
                <div className="mairie-stats-grid">
                  <div className="mairie-stat-box">
                    <span className="stat-number">1959</span>
                    <span className="stat-label">Création Officielle</span>
                  </div>
                  <div className="mairie-stat-box">
                    <span className="stat-number">+75 000</span>
                    <span className="stat-label">Habitants &amp; Étudiants</span>
                  </div>
                  <div className="mairie-stat-box">
                    <span className="stat-number">1ère</span>
                    <span className="stat-label">Cité Universitaire (UY II)</span>
                  </div>
                  <div className="mairie-stat-box">
                    <span className="stat-number">15 km</span>
                    <span className="stat-label">De la Capitale Yaoundé</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SOUS-NAVIGATION PAR ONGLETS INTERNES */}
            <div className="mairie-subtabs-bar">
              <button
                className={`mairie-subtab-btn ${mairieSubTab === 'histoire' ? 'active' : ''}`}
                onClick={() => setMairieSubTab('histoire')}
              >
                <i className="fa-solid fa-scroll" /> La Belle Histoire de Soa
              </button>
              <button
                className={`mairie-subtab-btn ${mairieSubTab === 'maires' ? 'active' : ''}`}
                onClick={() => setMairieSubTab('maires')}
              >
                <i className="fa-solid fa-user-tie" /> Les Maires &amp; Exécutif Actuel
              </button>
              <button
                className={`mairie-subtab-btn ${mairieSubTab === 'missions' ? 'active' : ''}`}
                onClick={() => setMairieSubTab('missions')}
              >
                <i className="fa-solid fa-bullseye" /> Missions &amp; Objectifs (PCD)
              </button>
              <button
                className={`mairie-subtab-btn ${mairieSubTab === 'organigramme' ? 'active' : ''}`}
                onClick={() => setMairieSubTab('organigramme')}
              >
                <i className="fa-solid fa-sitemap" /> Organigramme Intégral
              </button>
            </div>

            {/* 3. CONTENU : SOUS-ONGLET 1 — HISTOIRE & GENÈSE */}
            {mairieSubTab === 'histoire' && (
              <div className="mairie-content-pane">
                <div className="pane-header-box">
                  <div className="header-icon-box green">
                    <i className="fa-solid fa-book-open-reader" />
                  </div>
                  <div>
                    <h3 className="pane-title">La Belle Histoire de la Commune de Soa</h3>
                    <p className="pane-subtitle">L'épopée d'une terre hospitalière devenue le cœur intellectuel et universitaire du Cameroun.</p>
                  </div>
                </div>

                <div className="mairie-timeline-list">
                  {/* Étape 1 */}
                  <div className="timeline-card">
                    <div className="timeline-era-col">
                      <div className="era-badge green">Fin XVIIIe Siècle</div>
                      <div className="era-icon-circle"><i className="fa-solid fa-compass" /></div>
                    </div>
                    <div className="timeline-content-col">
                      <h4>La Genèse : Une terre de migrations</h4>
                      <p>
                        L’histoire de Soa plonge ses racines profondes dans les grands mouvements migratoires du peuple Béti.
                        Venus du Nord pour fuir les conflits et instabilités régionales (notamment l'expansion des royaumes environnants),
                        les premiers occupants s'installent dans cette zone de transition forestière de la région du Centre.
                        À cette époque, le territoire est constitué d'une vaste savane sauvage et giboyeuse.
                      </p>
                      <div className="timeline-tag">
                        <i className="fa-solid fa-tree" /> Terroir Ancestral Béti
                      </div>
                    </div>
                  </div>

                  {/* Étape 2 */}
                  <div className="timeline-card">
                    <div className="timeline-era-col">
                      <div className="era-badge blue">1959 – 1964</div>
                      <div className="era-icon-circle"><i className="fa-solid fa-building-columns" /></div>
                    </div>
                    <div className="timeline-content-col">
                      <h4>La Naissance Administrative</h4>
                      <p>
                        La structure institutionnelle naît officiellement le <strong>22 décembre 1959</strong> avec la création de la <em>Commune mixte rurale de Djoungolo-Nord</em>.
                        En <strong>1964</strong>, l'entité prend officiellement son nom historique de <strong>Commune rurale de Soa</strong>.
                        C’est à cette période que se dessinent le centre administratif, les routes principales et les premiers bâtiments publics (mairie, sous-préfecture, hôpital).
                        Le travail des pionniers se fait presque entièrement à la main, transformant radicalement le paysage communal.
                      </p>
                      <div className="timeline-tag">
                        <i className="fa-solid fa-monument" /> Décret Fondateur &amp; Bâtisseurs Pionniers
                      </div>
                    </div>
                  </div>

                  {/* Étape 3 */}
                  <div className="timeline-card highlight-step">
                    <div className="timeline-era-col">
                      <div className="era-badge gold">1993 – Aujourd'hui</div>
                      <div className="era-icon-circle"><i className="fa-solid fa-graduation-cap" /></div>
                    </div>
                    <div className="timeline-content-col">
                      <h4>La Métamorphose en Cité Universitaire de Référence</h4>
                      <p>
                        L'année <strong>1993</strong> marque le tournant le plus crucial de l'histoire moderne de la commune : la création de la prestigieuse <strong>Université de Yaoundé II à Soa</strong>.
                        En accueillant cette institution académique majeure, le petit bourg rural s'est métamorphosé en une métropole cosmopolite, vibrante et dynamique.
                        En deux décennies, la population est passée de quelques milliers d'habitants à plus de <strong>75 000 âmes</strong>.
                        Aujourd'hui, Soa est une ville en pleine expansion économique, unissant harmonieusement sa jeunesse estudiantine à son fort potentiel agricole et industriel.
                      </p>
                      <div className="timeline-tag gold">
                        <i className="fa-solid fa-star" /> Université de Yaoundé II • Rayonnement International
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CONTENU : SOUS-ONGLET 2 — LES MAIRES & EXÉCUTIF */}
            {mairieSubTab === 'maires' && (
              <div className="mairie-content-pane">
                <div className="pane-header-box">
                  <div className="header-icon-box blue">
                    <i className="fa-solid fa-users-gear" />
                  </div>
                  <div>
                    <h3 className="pane-title">Les Magistrats Municipaux : Bâtisseurs de Soa</h3>
                    <p className="pane-subtitle">Le développement de Soa est le fruit de la continuité républicaine et du dévouement de ses maires successifs.</p>
                  </div>
                </div>

                {/* FOCUS EXÉCUTIF ACTUEL */}
                <div className="executive-current-box">
                  <div className="exec-header">
                    <span className="exec-badge-live">
                      <i className="fa-solid fa-circle" /> MANDAT EN COURS (DEPUIS 2007)
                    </span>
                    <h3>Exécutif Municipal Actuel</h3>
                  </div>

                  <div className="exec-grid">
                    {/* Le Maire */}
                    <div className="exec-card mayor-card">
                      <div className="exec-avatar-icon mayor">
                        <i className="fa-solid fa-crown" />
                      </div>
                      <div className="exec-info">
                        <span className="exec-role">Maire de la Commune de Soa</span>
                        <h4 className="exec-name">M. ESSAMA EMBOLO</h4>
                        <p className="exec-bio">
                          Magistrat municipal réélu, pilote engagé de la décentralisation, de l'aménagement urbain durable, du partenariat avec l'Université et de la modernisation numérique de l'administration.
                        </p>
                      </div>
                    </div>

                    {/* 1ère Adjointe */}
                    <div className="exec-card">
                      <div className="exec-avatar-icon deputy">
                        <i className="fa-solid fa-compass-drafting" />
                      </div>
                      <div className="exec-info">
                        <span className="exec-role">1ère Adjointe au Maire</span>
                        <h4 className="exec-name">Mme Anne–Marie Michelle ZOGO</h4>
                        <p className="exec-bio">
                          Architecte de profession, en charge de la planification urbaine, du suivi architectural et des grands projets d'infrastructures communales.
                        </p>
                      </div>
                    </div>

                    {/* 2e Adjoint */}
                    <div className="exec-card">
                      <div className="exec-avatar-icon deputy">
                        <i className="fa-solid fa-users" />
                      </div>
                      <div className="exec-info">
                        <span className="exec-role">2e Adjoint au Maire</span>
                        <h4 className="exec-name">M. Séverin Bienvenue AKAMBE EFFA</h4>
                        <p className="exec-bio">
                          Coordonnateur des affaires sociales, du développement communautaire, de la jeunesse et de l'encadrement de la communauté estudiantine.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GALERIE HISTORIQUE DES MAIRES */}
                <h4 className="table-section-title">
                  <i className="fa-solid fa-landmark" /> Historique des Mandatures Municipales (1959 à Nos Jours)
                </h4>

                <div className="maires-table-wrapper">
                  <table className="maires-table">
                    <thead>
                      <tr>
                        <th>{t("Période")}</th>
                        <th>Maire Principal</th>
                        <th>Adjoints Marquants / Faits Majeurs</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="period-pill">1959 – 1975</span></td>
                        <td><strong>Prosper ELOUMDÉNÉ</strong></td>
                        <td>Le maire fondateur historique. Il a bâti la commune à partir d'une tabula rasa (routes, hôpital, premiers édifices).</td>
                      </tr>
                      <tr>
                        <td><span className="period-pill trans">1975 – 1985</span></td>
                        <td><strong>Gestion Transitoire</strong></td>
                        <td>Période administrée directement par les Chefs de District puis les Sous-Préfets de Soa.</td>
                      </tr>
                      <tr>
                        <td><span className="period-pill">1985 – 1987</span></td>
                        <td><strong>Jean MESSI</strong></td>
                        <td>{t("Consolidation et extension des infrastructures de base et du réseau d'accès routier.")}</td>
                      </tr>
                      <tr>
                        <td><span className="period-pill">1987 – 1995</span></td>
                        <td><strong>Pascal NKODO ABOMO</strong></td>
                        <td>Gestion de la transition stratégique vers le statut de ville universitaire (accueil du campus UY II en 1993).</td>
                      </tr>
                      <tr>
                        <td><span className="period-pill">1996 – 2002</span></td>
                        <td><strong>ESSAMA EMBOLO</strong></td>
                        <td>{t("Premier mandat axé sur la modernisation urbaine et la structuration de l'accueil massif des étudiants.")}</td>
                      </tr>
                      <tr>
                        <td><span className="period-pill">2002 – 2007</span></td>
                        <td><strong>Mme Laurentine MBEDE</strong></td>
                        <td>{t("Impulsion majeure des projets sociaux, de l'autonomisation des femmes et du développement communautaire.")}</td>
                      </tr>
                      <tr className="current-row">
                        <td><span className="period-pill current">{t("Depuis 2007")}</span></td>
                        <td><strong>ESSAMA EMBOLO</strong></td>
                        <td>
                          Maire en exercice. Réélu pour piloter la décentralisation intégrale, l'attractivité économique et les services numériques.
                          <br /><small>• 1ère Adjointe : Anne-Marie Michelle ZOGO • 2e Adjoint : Séverin Bienvenue AKAMBE EFFA</small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. CONTENU : SOUS-ONGLET 3 — MISSIONS & OBJECTIFS (PCD) */}
            {mairieSubTab === 'missions' && (
              <div className="mairie-content-pane">
                <div className="pane-header-box">
                  <div className="header-icon-box purple">
                    <i className="fa-solid fa-flag-checkered" />
                  </div>
                  <div>
                    <h3 className="pane-title">Missions et Objectifs Stratégiques de la Commune</h3>
                    <p className="pane-subtitle">La vision politique de la Mairie s'inscrit résolument dans son Plan Communal de Développement (PCD).</p>
                  </div>
                </div>

                {/* MISSION PRINCIPALE */}
                <div className="mission-core-box">
                  <div className="mission-core-header">
                    <i className="fa-solid fa-bullseye" />
                    <h4>La Grande Mission Principale</h4>
                  </div>
                  <blockquote className="pcd-quote">
                    « Garantir le bien-être économique, social et culturel de l'ensemble des populations de Soa en favorisant un développement local inclusif, participatif et durable. La Mairie s'efforce de transformer la proximité géographique avec la capitale Yaoundé en un puissant levier d'opportunités pour tous. »
                  </blockquote>
                </div>

                {/* LES 4 OBJECTIFS MAJEURS */}
                <h4 className="table-section-title" style={{ marginTop: '24px' }}>
                  <i className="fa-solid fa-compass" /> Les 4 Objectifs Majeurs du Plan Communal
                </h4>

                <div className="pcd-objectives-grid">
                  <div className="pcd-card">
                    <div className="pcd-icon-box blue">
                      <i className="fa-solid fa-road" />
                    </div>
                    <h4>1. Modernisation des Infrastructures</h4>
                    <p>
                      Améliorer la mobilité urbaine (routes secondaires, interconnexions avec les grands projets autoroutiers) et étendre les réseaux d'eau potable et d'électrification publique dans tous les quartiers et villages.
                    </p>
                  </div>

                  <div className="pcd-card">
                    <div className="pcd-icon-box green">
                      <i className="fa-solid fa-graduation-cap" />
                    </div>
                    <h4>2. Synergie Universitaire</h4>
                    <p>
                      Créer des synergies fortes entre l'Université de Yaoundé II, les résidences estudiantines (mini-cités), les centres de recherche et le tissu économique de la commune pour valoriser l'économie du savoir.
                    </p>
                  </div>

                  <div className="pcd-card">
                    <div className="pcd-icon-box orange">
                      <i className="fa-solid fa-wheat-awn" />
                    </div>
                    <h4>3. Soutien Agricole &amp; Économie Locale</h4>
                    <p>
                      Valoriser le fort potentiel agricole de la commune (cultures du manioc, maïs, maraîchers) tout en modernisant les marchés communaux pour soutenir les commerçants et petits producteurs.
                    </p>
                  </div>

                  <div className="pcd-card">
                    <div className="pcd-icon-box teal">
                      <i className="fa-solid fa-tree" />
                    </div>
                    <h4>4. Rayonnement &amp; Numérique</h4>
                    <p>
                      Aménager des espaces verts de qualité, encourager l'implantation de structures hôtelières et d'écotourisme, et moderniser les services numériques pour les citoyens (portail d'emploi municipal HireBridge).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CONTENU : SOUS-ONGLET 4 — ORGANIGRAMME INTÉGRAL EN SCHÉMA VISUEL */}
            {mairieSubTab === 'organigramme' && (
              <div className="mairie-content-pane">
                <div className="pane-header-styled-between">
                  <div className="header-icon-title">
                    <div className="header-icon-box gold">
                      <i className="fa-solid fa-sitemap" />
                    </div>
                    <div>
                      <h3 className="pane-title">Organigramme Officiel de la Commune de Soa</h3>
                      <p className="pane-subtitle">Arborescence visuelle complète des directions, services techniques, régies et bureaux spécialisés de la Mairie de Soa.</p>
                    </div>
                  </div>

                  <a
                    href="/organigramme_soa.svg"
                    download="Organigramme_Officiel_Commune_de_Soa.svg"
                    className="action-btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-download" /> Télécharger l'Organigramme (PDF / Vectoriel)
                  </a>
                </div>

                {/* CONTENEUR VISUEL DE L'ORGANIGRAMME AVEC APERÇU ET ACTIONS */}
                <div className="organigramme-visual-container">
                  <div className="organigramme-toolbar-top">
                    <span><i className="fa-solid fa-file-pdf" /> Document Officiel — Mairie de Soa</span>
                    <a
                      href="/organigramme_soa.svg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-view-fullscreen"
                    >
                      <i className="fa-solid fa-up-right-from-square" /> Ouvrir en Plein Écran
                    </a>
                  </div>

                  <div className="organigramme-chart-wrapper">
                    <img
                      src="/organigramme_soa.svg"
                      alt="Organigramme Officiel de la Commune de Soa"
                      className="organigramme-chart-img"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* =========================================================
            ONGLET : FORMATIONS MUNICIPALES (CATALOGUE & DÉCHARGES)
            ========================================================= */}
        {activeTab === 'trainings' && (
          <div className="tab-fade trainings-module-container">

            {/* 1. HERO BANNER FORMATIONS */}
            <div className="trainings-hero-card">
              <div className="trainings-hero-badge">
                <i className="fa-solid fa-graduation-cap" />
                <span>Pôle de Formation Professionnelle &amp; Certifications</span>
              </div>
              <h2 className="trainings-hero-title">
                Formations Municipales de la Commune de Soa
              </h2>
              <p className="trainings-hero-subtitle">
                Renforcez vos compétences grâce aux programmes certifiants pris en charge et encadrés par la Mairie de Soa.
                Postulez en ligne avec votre CV, diplôme récent et lettre de motivation, et recevez votre décharge officielle d'inscription dès validation RH.
              </p>

              {/* SWITCH ENTRE CATALOGUE ET MES INSCRIPTIONS */}
              <div className="trainings-nav-tabs">
                <button
                  type="button"
                  className={`training-nav-tab-btn ${trainingTabMode === 'catalogue' ? 'active' : ''}`}
                  onClick={() => setTrainingTabMode('catalogue')}
                >
                  <i className="fa-solid fa-list-check" /> Catalogue des Formations ({trainingsList.length})
                </button>
                <button
                  type="button"
                  className={`training-nav-tab-btn ${trainingTabMode === 'my_applications' ? 'active' : ''}`}
                  onClick={() => setTrainingTabMode('my_applications')}
                >
                  <i className="fa-solid fa-file-signature" /> Mes Inscriptions &amp; Décharges ({myTrainingApplications.length})
                </button>
              </div>
            </div>

            {/* VUE 1 : CATALOGUE DES FORMATIONS */}
            {trainingTabMode === 'catalogue' && (
              <div className="trainings-catalogue-view">

                {/* BARRE DE FILTRES ET RECHERCHE */}
                <div className="trainings-filter-bar">
                  <div className="training-search-input-box">
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                      type="text"
                      placeholder="Rechercher une formation par mot-clé, compétence ou formateur..."
                      value={trainingSearchQuery}
                      onChange={e => setTrainingSearchQuery(e.target.value)}
                    />
                    {trainingSearchQuery && (
                      <button className="clear-search-btn" onClick={() => setTrainingSearchQuery('')}>
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>

                  <div className="training-category-select-box">
                    <i className="fa-solid fa-layer-group" />
                    <select
                      value={trainingCategoryFilter}
                      onChange={e => setTrainingCategoryFilter(e.target.value)}
                    >
                      <option value="TOUTES">Toutes les Catégories</option>
                      <option value="Administration & Digital">Administration &amp; Digital</option>
                      <option value="Affaires Juridiques & Citoyenneté">Affaires Juridiques &amp; Citoyenneté</option>
                      <option value="Environnement & Santé Publique">Environnement &amp; Santé Publique</option>
                      <option value="Finances Locales & Fiscalité">Finances Locales &amp; Fiscalité</option>
                      <option value="Développement Économique Local">Développement Économique Local</option>
                    </select>
                  </div>
                </div>

                {/* GRILLE DES FORMATIONS */}
                {(() => {
                  const filteredTrainings = trainingsList.filter(t => {
                    const matchesCategory = trainingCategoryFilter === 'TOUTES' || t.category === trainingCategoryFilter;
                    const query = trainingSearchQuery.toLowerCase();
                    const matchesQuery = !trainingSearchQuery || 
                      (t.title && t.title.toLowerCase().includes(query)) ||
                      (t.description && t.description.toLowerCase().includes(query)) ||
                      (t.trainer && t.trainer.toLowerCase().includes(query)) ||
                      (t.category && t.category.toLowerCase().includes(query));
                    return matchesCategory && matchesQuery;
                  });

                  if (filteredTrainings.length === 0) {
                    return (
                      <div className="empty-trainings-card">
                        <i className="fa-solid fa-book-open" />
                        <h4>{t("Aucune formation ne correspond à vos critères")}</h4>
                        <p>{t("Essayez d'ajuster vos termes de recherche ou de réinitialiser le filtre de catégorie.")}</p>
                        <button
                          type="button"
                          className="reset-filter-btn"
                          onClick={() => { setTrainingSearchQuery(''); setTrainingCategoryFilter('TOUTES'); }}
                        >
                          <i className="fa-solid fa-rotate-left" /> Réinitialiser les filtres
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="trainings-cards-grid">
                      {filteredTrainings.map(training => {
                        const isApplied = myTrainingApplications.some(app => app.training_id === training.id);
                        const appData = myTrainingApplications.find(app => app.training_id === training.id);

                        return (
                          <div key={training.id} className="training-card">
                            <div className="training-card-header">
                              <span className="training-category-pill">
                                {training.category || 'Formation Municipale'}
                              </span>
                              <span className="training-duration-badge">
                                <i className="fa-regular fa-clock" /> {training.duration || '3 Semaines'}
                              </span>
                            </div>

                            <h3 className="training-card-title">{training.title}</h3>

                            <p className="training-card-desc">
                              {training.description}
                            </p>

                            <div className="training-meta-list">
                              <div className="training-meta-item">
                                <i className="fa-solid fa-user-tie" />
                                <div>
                                  <small>Formateur / Organisme</small>
                                  <span>{training.trainer || 'Mairie de Soa'}</span>
                                </div>
                              </div>

                              <div className="training-meta-item">
                                <i className="fa-solid fa-location-dot" />
                                <div>
                                  <small>Lieu &amp; Modalités</small>
                                  <span>{training.location || 'Commune de Soa'} • {training.format || 'Présentiel'}</span>
                                </div>
                              </div>

                              <div className="training-meta-item">
                                <i className="fa-solid fa-award" />
                                <div>
                                  <small>{t("Attestation délivrée")}</small>
                                  <span className="certif-highlight">{training.certification || 'Certificat Officiel Commune de Soa'}</span>
                                </div>
                              </div>
                            </div>

                            {/* DATES & CAPACITÉ */}
                            <div className="training-timing-box">
                              <div className="timing-dates">
                                <i className="fa-regular fa-calendar-check" />
                                <span>
                                  Début : <strong>{training.start_date ? new Date(training.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'À venir'}</strong>
                                </span>
                              </div>
                              <div className="timing-places">
                                <span className="places-pill">
                                  <i className="fa-solid fa-users" /> {training.capacity ? `${training.capacity} places max` : 'Places limitées'}
                                </span>
                              </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="training-card-footer">
                              <button
                                type="button"
                                className="btn-training-details"
                                onClick={() => setSelectedTrainingToView(training)}
                              >
                                <i className="fa-solid fa-circle-info" /> Détails complets
                              </button>

                              {isApplied ? (
                                <button
                                  type="button"
                                  className="btn-training-applied"
                                  onClick={() => {
                                    if (appData && (appData.status === 'CONFIRMEE' || appData.status === 'ACCEPTEE')) {
                                      setSelectedTrainingReceipt(appData);
                                    } else {
                                      setTrainingTabMode('my_applications');
                                    }
                                  }}
                                >
                                  {appData && (appData.status === 'CONFIRMEE' || appData.status === 'ACCEPTEE') ? (
                                    <><i className="fa-solid fa-stamp" /> Voir Décharge Officielle</>
                                  ) : (
                                    <><i className="fa-solid fa-check-circle" />{t("Demande en cours d'examen")}</>
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-training-apply"
                                  onClick={() => {
                                    setSelectedTrainingToApply(training);
                                    setTrainingAppForm({
                                      motivation_text: '',
                                      phone: profileForm.phone || user.phone || ''
                                    });
                                  }}
                                >
                                  <i className="fa-solid fa-paper-plane" /> Participer à cette formation
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VUE 2 : MES INSCRIPTIONS & DÉCHARGES */}
            {trainingTabMode === 'my_applications' && (
              <div className="trainings-my-applications-view">
                <div className="my-apps-header-bar">
                  <div>
                    <h3 className="section-title-sub">Suivi de mes Demandes de Formation</h3>
                    <p className="section-subtitle-sub">
                      Dès que la commission RH de la Mairie de Soa confirme votre dossier, votre Décharge Officielle avec référence d'enregistrement est instantanément générée.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-browse-more"
                    onClick={() => setTrainingTabMode('catalogue')}
                  >
                    <i className="fa-solid fa-plus" /> Découvrir d'autres formations
                  </button>
                </div>

                {myTrainingApplications.length === 0 ? (
                  <div className="empty-my-trainings-card">
                    <i className="fa-solid fa-file-lines" />
                    <h4>{t("Vous n'avez pas encore soumis de demande de formation")}</h4>
                    <p>Parcourez notre catalogue et postulez aux programmes certifiants de la Mairie de Soa.</p>
                    <button
                      type="button"
                      className="btn-action-primary"
                      onClick={() => setTrainingTabMode('catalogue')}
                    >
                      <i className="fa-solid fa-graduation-cap" /> Explorer le catalogue des formations
                    </button>
                  </div>
                ) : (
                  <div className="my-training-apps-list">
                    {myTrainingApplications.map(app => {
                      const isConfirmed = app.status === 'CONFIRMEE' || app.status === 'ACCEPTEE';
                      const isPending = app.status === 'EN_ATTENTE' || !app.status;
                      const isRefused = app.status === 'REFUSEE';

                      return (
                        <div key={app.id} className={`my-training-row-card ${isConfirmed ? 'confirmed' : ''}`}>
                          <div className="training-row-left">
                            <div className="training-row-category-badge">
                              {app.training_category || 'Formation Municipale'}
                            </div>
                            <h4 className="training-row-title">{app.training_title}</h4>
                            <div className="training-row-meta">
                              <span><i className="fa-regular fa-clock" /> {app.training_duration || 'Durée officielle'}</span>
                              <span><i className="fa-solid fa-location-dot" /> {app.training_location || 'Mairie de Soa'}</span>
                              <span><i className="fa-regular fa-calendar" /> Soumis le {new Date(app.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>

                            {/* PIÈCES JOINTES SOUMISES */}
                            <div className="training-row-docs-attached">
                              <small>Dossier PDF téléversé :</small>
                              {app.cv_url && (
                                <a href={app.cv_url} target="_blank" rel="noreferrer" className="doc-link-pill">
                                  <i className="fa-solid fa-file-pdf" /> CV
                                </a>
                              )}
                              {app.cv_url && (
                                <a href={app.cv_url} target="_blank" rel="noreferrer" className="doc-link-pill">
                                  <i className="fa-solid fa-file-pdf" /> CV
                                </a>
                              )}
                              {app.request_letter_url && (
                                <a href={app.request_letter_url} target="_blank" rel="noreferrer" className="doc-link-pill">
                                  <i className="fa-solid fa-file-signature" /> Demande de participation
                                </a>
                              )}
                              {app.cover_letter_url && (
                                <a href={app.cover_letter_url} target="_blank" rel="noreferrer" className="doc-link-pill">
                                  <i className="fa-solid fa-envelope-open-text" /> Lettre Motivation
                                </a>
                              )}
                              {app.identity_card_url && (
                                <a href={app.identity_card_url} target="_blank" rel="noreferrer" className="doc-link-pill">
                                  <i className="fa-solid fa-id-card" /> Pièce d'Identité
                                </a>
                              )}
                              {app.diploma_url && (
                                <a href={app.diploma_url} target="_blank" rel="noreferrer" className="doc-link-pill">
                                  <i className="fa-solid fa-graduation-cap" /> Diplôme
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="training-row-right">
                            {/* STATUT BADGE */}
                            <div className="training-status-badge-box">
                              {isPending && (
                                <span className="status-pill-trainings pending">
                                  <i className="fa-solid fa-hourglass-half" /> En cours d'examen par la Commission RH
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="status-pill-trainings confirmed">
                                  <i className="fa-solid fa-circle-check" /> Inscription Confirmée — Décharge Disponible
                                </span>
                              )}
                              {isRefused && (
                                <span className="status-pill-trainings refused">
                                  <i className="fa-solid fa-circle-xmark" /> Candidature Non Retenue
                                </span>
                              )}
                            </div>

                            {/* BOUTON DÉCHARGE OFFICIELLE */}
                            {isConfirmed ? (
                              <button
                                type="button"
                                className="btn-open-discharge"
                                onClick={() => setSelectedTrainingReceipt(app)}
                              >
                                <i className="fa-solid fa-stamp" /> Voir ma Décharge Officielle (PDF)
                              </button>
                            ) : (
                              <p className="pending-discharge-note">
                                <i className="fa-solid fa-shield-halved" /> Votre accusé de réception / décharge certifié sera débloqué ici dès validation par les RH de la Mairie.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* =========================================================
            ONGLET : CALENDRIER MUNICIPAL & ÉVÉNEMENTS DE SOA
            ========================================================= */}
        {activeTab === 'events' && (
          <div className="tab-fade municipal-calendar-container">

            {/* 1. BANNIÈRE HERO DU CALENDRIER */}
            <div className="events-hero-header">
              <div className="events-hero-top-meta">
                <div className="agenda-tag-pill">
                  <i className="fa-regular fa-calendar-check" />
                  <span>Agenda Officiel des Services Municipaux</span>
                </div>
                <div className="today-live-pill">
                  <i className="fa-solid fa-clock" /> Aujourd'hui : {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              <h2 className="calendar-hero-title">
                Calendrier Municipal &amp; Événements Citoyens de Soa
              </h2>
              <p className="calendar-hero-subtitle">
                Consultez en temps réel les conseils municipaux, cérémonies universitaires, journées éco-citoyennes, foires agropastorales et forums pour l'emploi organisés par la Mairie de Soa.
              </p>

              {/* SWITCH DE VUE */}
              <div className="calendar-view-switchers">
                <button
                  type="button"
                  className={`cal-switch-btn ${calendarViewMode === 'month' ? 'active' : ''}`}
                  onClick={() => setCalendarViewMode('month')}
                >
                  <i className="fa-solid fa-calendar-days" /> Vue Calendrier Mensuel
                </button>
                <button
                  type="button"
                  className={`cal-switch-btn ${calendarViewMode === 'agenda' ? 'active' : ''}`}
                  onClick={() => setCalendarViewMode('agenda')}
                >
                  <i className="fa-solid fa-list-ul" /> {language === 'en' ? `Chronological List (${eventsList.filter(e => isEventUpcoming(e.event_date)).length})` : `Vue Liste Chronologique (${eventsList.filter(e => isEventUpcoming(e.event_date)).length})`}
                </button>
                <button
                  type="button"
                  className={`cal-switch-btn ${calendarViewMode === 'my_events' ? 'active' : ''}`}
                  onClick={() => setCalendarViewMode('my_events')}
                >
                  <i className="fa-solid fa-bookmark" /> {language === 'en' ? `My Registrations (${eventsList.filter(e => e.is_registered && isEventUpcoming(e.event_date)).length})` : `Mes Participations (${eventsList.filter(e => e.is_registered && isEventUpcoming(e.event_date)).length})`}
                </button>
              </div>
            </div>

            {/* 2. BARRE D'OUTILS ET FILTRES DU CALENDRIER */}
            <div className="calendar-toolbar-card">
              <div className="cal-nav-controls">
                <button type="button" className="cal-nav-btn" onClick={handlePrevMonth} title="Mois précédent">
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button type="button" className="cal-today-btn" onClick={handleToday}>
                  Aujourd'hui
                </button>
                <button type="button" className="cal-nav-btn" onClick={handleNextMonth} title="Mois suivant">
                  <i className="fa-solid fa-chevron-right" />
                </button>

                <h3 className="cal-current-month-label">
                  {calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </h3>
              </div>

              {/* FILTRES PAR CATÉGORIE D'ÉVÉNEMENT */}
              <div className="cal-filter-select-wrapper">
                <i className="fa-solid fa-filter" />
                <select
                  value={eventCategoryFilter}
                  onChange={e => setEventCategoryFilter(e.target.value)}
                >
                  <option value="TOUS">{language === 'en' ? 'All Categories' : 'Toutes les Catégories'}</option>
                  <option value="institutionnel">{language === 'en' ? 'Institutional & Municipal Council' : 'Institutionnel & Conseil Municipal'}</option>
                  <option value="universitaire">{language === 'en' ? 'University & UY II Ceremonies' : 'Universitaire & Cérémonies UY II'}</option>
                  <option value="ecologie">{language === 'en' ? 'Ecology & Clean Soa City' : 'Écologie & Soa Ville Propre'}</option>
                  <option value="terroir">{language === 'en' ? 'Fairs, Markets & Local Products' : 'Foires, Marchés & Terroir'}</option>
                  <option value="emploi_jeunesse">{language === 'en' ? 'Jobs & Recruitment Fairs' : 'Emploi & Salons de Recrutement'}</option>
                  <option value="culture_sport">{language === 'en' ? 'Culture, Sport & Traditions' : 'Culture, Sport & Traditions'}</option>
                </select>
              </div>
            </div>

            {/* 3. VUE 1 : GRILLE MENSUELLE INTERACTIVE & COMPACTE */}
            {calendarViewMode === 'month' && (
              <div className="calendar-compact-container">

                {/* EN-TÊTE DES JOURS DE LA SEMAINE */}
                <div className="calendar-weekdays-header-compact">
                  <span>{language === 'en' ? 'Mon' : 'Lun'}</span>
                  <span>{language === 'en' ? 'Tue' : 'Mar'}</span>
                  <span>{language === 'en' ? 'Wed' : 'Mer'}</span>
                  <span>{language === 'en' ? 'Thu' : 'Jeu'}</span>
                  <span>{language === 'en' ? 'Fri' : 'Ven'}</span>
                  <span>{language === 'en' ? 'Sat' : 'Sam'}</span>
                  <span>{language === 'en' ? 'Sun' : 'Dim'}</span>
                </div>

                {/* GRILLE DES CASES DE JOURS COMPACTES */}
                <div className="calendar-days-grid-compact">
                  {getDaysInMonthGrid().map((cell, idx) => {
                    const hasEvents = cell.events && cell.events.length > 0;

                    return (
                      <div
                        key={idx}
                        className={`compact-day-cell ${cell.isCurrentMonth ? 'current-month' : 'other-month'} ${cell.isToday ? 'is-today' : ''} ${hasEvents ? 'has-events' : ''}`}
                        onClick={() => setSelectedCalendarDay(cell)}
                        title={hasEvents ? (language === 'en' ? `${cell.events.length} event(s) scheduled — Click to view details` : `${cell.events.length} événement(s) programmé(s) — Cliquez pour afficher les détails`) : (cell.isToday ? (language === 'en' ? "Today" : "Aujourd'hui") : "")}
                      >
                        <div className="compact-day-top-row">
                          <span className={`compact-day-number ${cell.isToday ? 'today-pill' : ''}`}>
                            {cell.dayNumber}
                          </span>

                          {/* ICÔNE INTERACTIVE LORSQU'IL Y A UN ÉVÉNEMENT */}
                          {hasEvents && (
                            <div
                              className="scintillating-event-beacon"
                              title={language === 'en' ? `${cell.events.length} event(s) — Click to view` : `${cell.events.length} événement(s) — Cliquez pour ouvrir`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendarDay(cell);
                              }}
                            >
                              <i className="fa-solid fa-calendar-day beacon-icon" />
                              <span className="beacon-count-badge">{cell.events.length}</span>
                              <span className="beacon-pulse-ring" />
                            </div>
                          )}
                        </div>

                        {/* MINI PASTILLES DE CATÉGORIES EN BAS */}
                        {hasEvents && (
                          <div className="compact-category-dots">
                            {cell.events.slice(0, 3).map((ev, i) => (
                              <span 
                                key={i} 
                                className={`category-micro-dot ${ev.category || 'default'}`}
                                title={ev.title}
                              />
                            ))}
                            {cell.events.length > 3 && (
                              <span className="category-micro-more">+{cell.events.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* LÉGENDE DES CATÉGORIES EN BAS */}
                <div className="calendar-compact-legend">
                  <div className="legend-item"><span className="category-micro-dot institutionnel" /> <span>{language === 'en' ? 'Institutional' : 'Institutionnel'}</span></div>
                  <div className="legend-item"><span className="category-micro-dot universitaire" /> <span>{language === 'en' ? 'University & UY II' : 'Universitaire & UY II'}</span></div>
                  <div className="legend-item"><span className="category-micro-dot ecologie" /> <span>{language === 'en' ? 'Ecology & Clean City' : 'Écologie & Salubrité'}</span></div>
                  <div className="legend-item"><span className="category-micro-dot terroir" /> <span>{language === 'en' ? 'Fairs & Local Products' : 'Foires & Terroir'}</span></div>
                  <div className="legend-item"><span className="category-micro-dot emploi_jeunesse" /> <span>{language === 'en' ? 'Jobs & Recruitment' : 'Emploi & Recrutement'}</span></div>
                  <div className="legend-item"><span className="category-micro-dot culture_sport" /> <span>{language === 'en' ? 'Sport & Culture' : 'Sport & Culture'}</span></div>
                </div>

              </div>
            )}

            {/* 4. VUE 2 : AGENDA CHRONOLOGIQUE */}
            {calendarViewMode === 'agenda' && (
              <div className="calendar-agenda-view">
                {(() => {
                  const filtered = eventsList.filter(ev => {
                    if (!isEventUpcoming(ev.event_date)) return false;
                    return eventCategoryFilter === 'TOUS' || ev.category === eventCategoryFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="empty-calendar-card">
                        <i className="fa-regular fa-calendar-xmark" />
                        <h4>{language === 'en' ? 'No municipal events found' : 'Aucun événement municipal trouvé'}</h4>
                        <p>{language === 'en' ? 'No official program matches this filter.' : 'Aucune programmation officielle ne correspond à ce filtre.'}</p>
                        <button className="cal-today-btn" onClick={() => setEventCategoryFilter('TOUS')}>
                          {language === 'en' ? 'Show all events' : 'Afficher tous les événements'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="agenda-events-list">
                      {filtered.map(ev => {
                        const evDate = new Date(ev.event_date);

                        return (
                          <div key={ev.id} className="agenda-event-row-card">
                            {/* DATE BOX GAUCHE */}
                            <div className="agenda-date-box">
                              <span className="agenda-month-short">
                                {evDate.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'short' }).toUpperCase()}
                              </span>
                              <span className="agenda-day-num">{evDate.getDate()}</span>
                              <span className="agenda-weekday">
                                {evDate.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { weekday: 'short' })}
                              </span>
                            </div>

                            {/* CONTENU CENTRAL */}
                            <div className="agenda-info-col">
                              <div className="agenda-tag-row">
                                <span className={`agenda-cat-badge ${ev.category}`}>
                                  {ev.category === 'institutionnel' && <><i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Institutional' : 'Institutionnel'}</>}
                                  {ev.category === 'universitaire' && <><i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} />{language === 'en' ? 'University & UY II' : 'Universitaire & UY II'}</>}
                                  {ev.category === 'ecologie' && <><i className="fa-solid fa-leaf" style={{ marginRight: '5px' }} />{language === 'en' ? 'Ecology & Clean City' : 'Écologie & Salubrité'}</>}
                                  {ev.category === 'terroir' && <><i className="fa-solid fa-store" style={{ marginRight: '5px' }} />{language === 'en' ? 'Fairs & Local Products' : 'Foires & Terroir'}</>}
                                  {ev.category === 'emploi_jeunesse' && <><i className="fa-solid fa-briefcase" style={{ marginRight: '5px' }} />{language === 'en' ? 'Jobs & Recruitment' : 'Emploi & Insertion'}</>}
                                  {ev.category === 'culture_sport' && <><i className="fa-solid fa-trophy" style={{ marginRight: '5px' }} />{language === 'en' ? 'Sport & Culture' : 'Sport & Culture'}</>}
                                  {!ev.category && <><i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Municipal Event' : 'Événement Municipal'}</>}
                                </span>
                                <span className="agenda-time-pill">
                                  <i className="fa-regular fa-clock" /> {ev.start_time || '09h00'} - {ev.end_time || '15h00'}
                                </span>
                                <span className="agenda-access-pill">
                                  {ev.access_type || (language === 'en' ? 'Free Admission' : 'Entrée Libre')}
                                </span>
                              </div>

                              <h4 className="agenda-event-title">{ev.title}</h4>
                              <p className="agenda-event-desc">{ev.description}</p>

                              <div className="agenda-meta-row">
                                <span><i className="fa-solid fa-location-dot" /> {ev.location || 'Commune de Soa'}</span>
                                <span><i className="fa-solid fa-user-tie" /> {ev.organizer || 'Mairie de Soa'}</span>
                                <span><i className="fa-solid fa-users" /> {ev.registered_count || 0} participant(s)</span>
                              </div>
                            </div>

                            {/* ACTIONS DROITE */}
                            <div className="agenda-actions-col">
                              <button
                                type="button"
                                className="btn-agenda-details"
                                onClick={() => setSelectedEventDetails(ev)}
                              >
                                <i className="fa-solid fa-circle-info" /> Voir Détails
                              </button>

                              {ev.is_registered ? (
                                <button
                                  type="button"
                                  className="btn-agenda-registered"
                                  onClick={() => handleEventUnregister(ev.id)}
                                  disabled={eventRegistering}
                                >
                                  <i className="fa-solid fa-check" /> Inscrit (Annuler)
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-agenda-register"
                                  onClick={() => handleEventRegister(ev.id)}
                                  disabled={eventRegistering}
                                >
                                  <i className="fa-solid fa-ticket" /> Confirmer ma présence
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn-agenda-ics"
                                onClick={() => handleDownloadIcs(ev)}
                                title="Télécharger le fichier .ics pour l'agenda"
                              >
                                <i className="fa-regular fa-calendar-plus" /> Ajouter à l'agenda (.ics)
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 5. VUE 3 : MES ÉVÉNEMENTS ENREGISTRÉS */}
            {calendarViewMode === 'my_events' && (
              <div className="calendar-agenda-view">
                {(() => {
                  const myEvents = eventsList.filter(e => e.is_registered && isEventUpcoming(e.event_date));

                  if (myEvents.length === 0) {
                    return (
                      <div className="empty-calendar-card">
                        <i className="fa-regular fa-bookmark" />
                        <h4>{t("Vous n'êtes inscrit à aucun événement municipal pour le moment")}</h4>
                        <p>Parcourez le calendrier de la Mairie de Soa et confirmez votre participation aux événements qui vous intéressent.</p>
                        <button className="cal-today-btn" onClick={() => setCalendarViewMode('month')}>
                          <i className="fa-solid fa-calendar-days" /> Parcourir le calendrier
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="agenda-events-list">
                      {myEvents.map(ev => {
                        const evDate = new Date(ev.event_date);
                        return (
                          <div key={ev.id} className="agenda-event-row-card registered-highlight">
                            <div className="agenda-date-box">
                              <span className="agenda-month-short">
                                {evDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                              </span>
                              <span className="agenda-day-num">{evDate.getDate()}</span>
                              <span className="agenda-weekday">
                                {evDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
                              </span>
                            </div>

                            <div className="agenda-info-col">
                              <div className="agenda-tag-row">
                                <span className="registered-live-tag">
                                  <i className="fa-solid fa-circle-check" /> Participation Confirmée
                                </span>
                                <span className="agenda-time-pill">
                                  <i className="fa-regular fa-clock" /> {ev.start_time || '09h00'} - {ev.end_time || '15h00'}
                                </span>
                              </div>

                              <h4 className="agenda-event-title">{ev.title}</h4>
                              <p className="agenda-event-desc">{ev.description}</p>

                              <div className="agenda-meta-row">
                                <span><i className="fa-solid fa-location-dot" /> {ev.location || 'Commune de Soa'}</span>
                                <span><i className="fa-solid fa-user-tie" /> {ev.organizer || 'Mairie de Soa'}</span>
                              </div>
                            </div>

                            <div className="agenda-actions-col">
                              <button
                                type="button"
                                className="btn-agenda-ics"
                                onClick={() => handleDownloadIcs(ev)}
                              >
                                <i className="fa-regular fa-calendar-plus" /> Télécharger Rappel (.ics)
                              </button>
                              <button
                                type="button"
                                className="btn-cancel-reg"
                                onClick={() => handleEventUnregister(ev.id)}
                                disabled={eventRegistering}
                              >
                                <i className="fa-solid fa-xmark" /> Annuler ma participation
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        )}

        {/* =========================================================
            ONGLET : MES ENTRETIENS & VISIOCONFÉRENCES RH
            ========================================================= */}
        {activeTab === 'interviews' && (
          <div className="tab-fade interviews-module-container">

            {/* 1. HERO BANNER ENTRETIENS */}
            <div className="interviews-hero-card">
              <div className="interviews-hero-top">
                <div className="interviews-hero-badge">
                  <i className="fa-solid fa-video" />
                  <span>Service des Recrutements &amp; Visioconférences Sécurisées</span>
                </div>
                <div className="interviews-counter-pill">
                  <i className="fa-solid fa-calendar-check" />
                  <span>{myInterviews.length} entretien(s) programmé(s)</span>
                </div>
              </div>

              <h2 className="interviews-hero-title">
                {language === 'en' ? 'My Video Conference Interviews with HR' : 'Mes Entretiens & Convocations en Visioconférence'}
              </h2>
              <p className="interviews-hero-subtitle">
                {language === 'en'
                  ? 'Participate in your live job and internship evaluation interviews with the recruitment committee of the Soa Municipal Council directly on the platform.'
                  : 'Participez à vos entretiens d\'embauche et d\'évaluation de stage en visioconférence directe avec les membres de la commission RH de la Mairie de Soa.'}
              </p>
            </div>

            {/* 2. NOTICE OFFICIELLE DES CONSIGNES & PRÉVENANCE 24H */}
            <div className="interviews-notice-card">
              <div className="notice-icon-circle">
                <i className="fa-solid fa-shield-halved" />
              </div>
              <div className="notice-content-body">
                <h4>
                  {language === 'en' ? 'Official Interview Instructions & 24h Notice Requirement' : 'Consignes Officielles & Règle Impérative de Prévenance 24h'}
                </h4>
                <p>
                  {language === 'en'
                    ? 'All video interviews are conducted through our encrypted secure platform. Please test your camera and microphone in advance.'
                    : 'Les entretiens se déroulent via notre salle visio sécurisée chiffrée de bout en bout. Préparez votre pièce d\'identité (CNI ou Passeport) et connectez-vous 5 à 10 minutes avant l\'horaire fixé.'}
                </p>
                <div className="notice-highlight-alert">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>
                    <strong>{language === 'en' ? 'Important Requirement :' : 'Règle stricte de report :'}</strong>{' '}
                    {language === 'en'
                      ? 'If you have any concern, technical issue or need to reschedule your interview, you MUST inform the HR Department via the internal messaging at least 24 hours prior to the scheduled time.'
                      : 'Si vous avez une préoccupation, un empêchement ou un besoin de report concernant un entretien programmé, vous devez impérativement prévenir le Service RH via la messagerie interne au moins 24 heures avant l\'horaire fixé.'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. LISTE DES ENTRETIENS PROGRAMMÉS */}
            {(() => {
              const nowTime = Date.now();
              const activeUpcoming = myInterviews.filter(int => {
                const isPast = (new Date(int.scheduled_at).getTime() + (3 * 3600 * 1000)) < nowTime;
                return int.status !== 'termine' && int.status !== 'annule' && !isPast;
              });
              const pastOrCanceled = myInterviews.filter(int => {
                const isPast = (new Date(int.scheduled_at).getTime() + (3 * 3600 * 1000)) < nowTime;
                return int.status === 'termine' || int.status === 'annule' || isPast;
              });

              return (
                <div className="interviews-list-section">
                  {/* SECTION 1 : ENTRETIENS À VENIR & PROCHAINS RENDEZ-VOUS */}
                  <div className="section-title-row">
                    <div className="title-group">
                      <h3>
                        <i className="fa-solid fa-video" />
                        <span>{language === 'en' ? 'Upcoming & Live Video Interviews' : 'Entretiens Visio à Venir & En Cours'}</span>
                      </h3>
                      <span className="count-tag">{activeUpcoming.length}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-open-messaging-quick"
                      onClick={() => {
                        setChatSubject('Demande de report d entretien');
                        setChatInput('Bonjour Monsieur/Madame du Service RH, je vous contacte au sujet de mon entretien vidéo programmé...');
                        setActiveTab('messages');
                      }}
                    >
                      <i className="fa-solid fa-comments" /> {language === 'en' ? 'Contact HR / Reschedule Request' : 'Contacter RH / Signaler empêchement'}
                    </button>
                  </div>

                  {activeUpcoming.length === 0 ? (
                    <div className="empty-interviews-card">
                      <div className="empty-icon-box">
                        <i className="fa-solid fa-video-slash" />
                      </div>
                      <h4>{language === 'en' ? 'No active upcoming video interviews' : 'Aucun entretien visio à venir'}</h4>
                      <p>
                        {language === 'en'
                          ? 'You have no active video interviews scheduled at the moment. Past and completed interviews are archived below.'
                          : 'Vous n\'avez aucun entretien visio actif programmé pour le moment. Vos entretiens passés et clôturés sont archivés ci-dessous.'}
                      </p>
                      <button
                        type="button"
                        className="btn-view-my-apps"
                        onClick={() => setActiveTab('applications')}
                      >
                        <i className="fa-regular fa-clipboard" /> {language === 'en' ? 'Track My Applications' : 'Consulter mes candidatures'}
                      </button>
                    </div>
                  ) : (
                    <div className="interviews-cards-grid" style={{ marginBottom: '32px' }}>
                      {activeUpcoming.map(int => {
                        const intDate = new Date(int.scheduled_at);
                        const dateFormatted = intDate.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        });
                        const timeFormatted = intDate.toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={int.id} className="interview-item-card upcoming">
                            <div className="interview-card-header">
                              <div className="interview-date-box">
                                <span className="month-tag">{intDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</span>
                                <span className="day-tag">{intDate.getDate()}</span>
                                <span className="time-tag">{timeFormatted}</span>
                              </div>

                              <div className="interview-main-meta">
                                <div className="interview-status-row">
                                  <span className={`interview-status-tag ${int.status || 'programme'}`}>
                                    {int.status === 'programme' && <><i className="fa-solid fa-clock" /> {language === 'en' ? 'Scheduled' : 'Entretien Programmé'}</>}
                                    {int.status === 'en_cours' && <><i className="fa-solid fa-circle-dot live-icon" /> {language === 'en' ? 'Live Session Active' : 'Session Visio en cours'}</>}
                                  </span>
                                  <span className="interview-room-ref">
                                    Réf: #{int.room_id || `SOA-VISIO-${int.id}`}
                                  </span>
                                </div>

                                <h4 className="interview-job-title">{int.job_title || 'Poste / Demande de Stage'}</h4>
                                <p className="interview-dept">
                                  <i className="fa-solid fa-building-columns" /> {int.department || 'Services Municipaux de Soa'} • Recruteur : <strong>{int.rh_nom ? `${int.rh_prenom} ${int.rh_nom}` : 'Commission RH'}</strong>
                                </p>
                              </div>
                            </div>

                            {int.notes && (
                              <div className="interview-notes-box">
                                <i className="fa-solid fa-circle-info" />
                                <span><strong>Instructions RH :</strong> {int.notes}</span>
                              </div>
                            )}

                            <div className="interview-card-footer">
                              <div className="interview-timing-info">
                                <i className="fa-regular fa-calendar" />
                                <span style={{ textTransform: 'capitalize' }}>{dateFormatted} à {timeFormatted}</span>
                              </div>

                              <div className="interview-actions-group">
                                <button
                                  type="button"
                                  className="btn-prevent-24h"
                                  onClick={() => {
                                    setChatSubject('Demande de report d entretien');
                                    setChatInput(`Bonjour. Concernant mon entretien visio pour « ${int.job_title || 'le poste'} » prévu le ${dateFormatted} à ${timeFormatted}, je vous contacte au moins 24h à l'avance pour vous signaler...`);
                                    setActiveTab('messages');
                                  }}
                                  title="Signaler une préoccupation ou demander un report (au moins 24h avant)"
                                >
                                  <i className="fa-solid fa-clock-rotate-left" /> {language === 'en' ? 'Reschedule (24h Notice)' : 'Prévenir 24h avant'}
                                </button>

                                {/* BOUTON D'ACCÈS À LA SALLE VISIO — RÉSERVÉ UNIQUEMENT AUX ENTRETIENS ACTIFS */}
                                <button
                                  type="button"
                                  className="btn-launch-visio-live"
                                  onClick={() => {
                                    setSelectedInterviewForVisio(int);
                                    setShowVisioModal(true);
                                  }}
                                >
                                  <i className="fa-solid fa-video" />
                                  <span>{language === 'en' ? 'Join Video Room' : 'Accéder à la Salle Visio'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SECTION 2 : HISTORIQUE DES ENTRETIENS PASSÉS & CLÔTURÉS (AUCUN BOUTON D'ACCÈS VISIO) */}
                  {pastOrCanceled.length > 0 && (
                    <div style={{ marginTop: '36px', borderTop: '2px dashed #e2e8f0', paddingTop: '24px' }}>
                      <div className="section-title-row" style={{ marginBottom: '16px' }}>
                        <div className="title-group">
                          <h3 style={{ fontSize: '1.1rem', color: '#475569' }}>
                            <i className="fa-solid fa-folder-closed" style={{ color: '#64748b' }} />
                            <span>{language === 'en' ? 'Past & Completed Interviews History' : 'Historique des Entretiens Passés & Clôturés'}</span>
                          </h3>
                          <span className="count-tag" style={{ background: '#cbd5e1', color: '#475569' }}>{pastOrCanceled.length}</span>
                        </div>
                      </div>

                      <div className="interviews-cards-grid">
                        {pastOrCanceled.map(int => {
                          const intDate = new Date(int.scheduled_at);
                          const isExpiredDate = (intDate.getTime() + (3 * 3600 * 1000)) < nowTime;
                          const dateFormatted = intDate.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          });
                          const timeFormatted = intDate.toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <div key={int.id} className="interview-item-card past" style={{ opacity: 0.88, filter: 'grayscale(15%)', background: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
                              <div className="interview-card-header">
                                <div className="interview-date-box" style={{ background: '#e2e8f0', color: '#475569' }}>
                                  <span className="month-tag">{intDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</span>
                                  <span className="day-tag">{intDate.getDate()}</span>
                                  <span className="time-tag">{timeFormatted}</span>
                                </div>

                                <div className="interview-main-meta">
                                  <div className="interview-status-row">
                                    {int.status === 'termine' && (
                                      <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-circle-check" /> {language === 'en' ? 'Completed & Closed' : 'Entretien Effectué & Clôturé'}
                                      </span>
                                    )}
                                    {int.status === 'annule' && (
                                      <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-circle-xmark" /> {language === 'en' ? 'Interview Cancelled' : 'Entretien Annulé'}
                                      </span>
                                    )}
                                    {int.status !== 'termine' && int.status !== 'annule' && isExpiredDate && (
                                      <span style={{ background: '#e2e8f0', color: '#475569', border: '1px solid #94a3b8', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-clock-rotate-left" /> {language === 'en' ? 'Session Expired (Date Past)' : 'Session Expirée (Date Passée)'}
                                      </span>
                                    )}
                                    <span className="interview-room-ref">
                                      Réf: #{int.room_id || `SOA-VISIO-${int.id}`}
                                    </span>
                                  </div>

                                  <h4 className="interview-job-title" style={{ color: '#334155' }}>{int.job_title || 'Poste / Demande de Stage'}</h4>
                                  <p className="interview-dept">
                                    <i className="fa-solid fa-building-columns" /> {int.department || 'Services Municipaux de Soa'} • Recruteur : {int.rh_nom ? `${int.rh_prenom} ${int.rh_nom}` : 'Commission RH'}
                                  </p>
                                </div>
                              </div>

                              <div className="interview-card-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                <div className="interview-timing-info" style={{ color: '#64748b' }}>
                                  <i className="fa-regular fa-calendar-check" />
                                  <span style={{ textTransform: 'capitalize' }}>Programmé le {dateFormatted} à {timeFormatted}</span>
                                </div>

                                <div className="interview-actions-group">
                                  {/* AUCUN BOUTON D'ACCÈS VISIO ICI — INDICATION CLAIRE DE FIN DE SESSION */}
                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>
                                    <i className="fa-solid fa-lock" style={{ marginRight: '4px' }} />
                                    {language === 'en' ? 'Session closed (No access)' : 'Salle fermée (Session archivée)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        )}

        {/* MODAL SALLE DE VISIOCONFÉRENCE INTERACTIVE */}
        <VisioRoomModal
          isOpen={showVisioModal}
          onClose={() => setShowVisioModal(false)}
          interviewData={selectedInterviewForVisio}
          currentUser={user}
          isRh={false}
          onStatusUpdate={(intId, st) => fetchData()}
        />
        {activeTab === 'messages' && (
          <div className="tab-fade messaging-module-container">

            {/* 1. HERO BANNER DE LA MESSAGERIE */}
            <div className="messaging-hero-card">
              <div className="messaging-hero-top">
                <div className="messaging-hero-badge">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Canal Officiel de Communication RH</span>
                </div>

                {/* STATUT DE DISPONIBILITÉ DE L'AGENT RH */}
                <div className="messaging-status-pills">
                  {rhStatus.is_available ? (
                    <div className="rh-status-pill online">
                      <span className="live-pulse-dot online" />
                      <span> Agent RH en ligne &amp; disponible</span>
                    </div>
                  ) : (
                    <div className="rh-status-pill offline">
                      <span className="live-pulse-dot offline" />
                      <span> Service RH hors permanence</span>
                    </div>
                  )}

                  <div className="rh-hours-pill">
                    <i className="fa-regular fa-clock" />
                    <span>{rhStatus.working_hours || 'Lundi – Vendredi, 07h30 — 15h30'}</span>
                  </div>
                </div>
              </div>

              <h2 className="messaging-hero-title">
                Messagerie Directe avec le Service des Ressources Humaines
              </h2>
              <p className="messaging-hero-subtitle">
                Échangez en direct avec les agents de la Direction des Ressources Humaines de la Mairie de Soa pour le suivi de vos candidatures, demandes de stage et inscriptions aux formations communales.
              </p>
            </div>

            {/* 2. NOTICE OFFICIELLE & RÈGLEMENT D'USAGE STRICT */}
            <div className="official-rh-notice-card">
              <div className="notice-icon-box">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div className="notice-content-box">
                <h4>Notice Officielle &amp; Conditions d'Utilisation de la Messagerie</h4>
                <p>
                  Ce canal de discussion est <strong>strictement et exclusivement réservé aux échanges professionnels</strong> portant sur vos dossiers de recrutement (CDD/CDI), vos demandes de stage (académique ou professionnel) et vos participations aux formations municipales de la Commune de Soa.
                </p>
                <div className="notice-bullet-points">
                  <span>• <strong>Disponibilité RH :</strong>{t("Les agents répondent uniquement pendant les heures officielles de service communal (")}<strong>07h30 — 15h30</strong>) et selon leur disponibilité.</span>
                  <span>• <strong>Tenue &amp; Courtoisie :</strong> Tout propos injurieux, inapproprié ou harcelant entraînera la fermeture immédiate de la messagerie et l'exclusion définitive du candidat des fichiers de la Mairie.</span>
                  <span>• <strong>{t("Suivi des pièces :")}</strong> Vous pouvez joindre des justificatifs complémentaires ou documents PDF sur demande expresse des RH.</span>
                </div>
              </div>
            </div>

            {/* 3. FENÊTRE DE DISCUSSION (CHAT INTERACTIF) */}
            <div className="chat-interface-card">

              {/* EN-TÊTE DE LA CONVERSATION */}
              <div className="chat-header-bar">
                <div className="chat-agent-info">
                  <div className="chat-agent-avatar">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
                      alt="Sceau Mairie de Soa"
                    />
                    <span className={`status-indicator-dot ${rhStatus.is_available ? 'online' : 'offline'}`} />
                  </div>
                  <div>
                    <div className="chat-agent-name">
                      Direction des Ressources Humaines — Mairie de Soa
                    </div>
                    <div className="chat-agent-sub">
                      {rhStatus.is_available ? (
                        <span className="agent-status-live text-green">
                          <i className="fa-solid fa-circle" /> Agent en ligne • Réponse estimée sous 30 min
                        </span>
                      ) : (
                        <span className="agent-status-live text-muted">
                          <i className="fa-solid fa-circle" /> Bureaux fermés • Réponse à la réouverture des services
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-header-meta">
                  <span className="chat-ref-tag">
                    <i className="fa-solid fa-hashtag" /> Dossier Candidat #{user.id}
                  </span>
                  <button
                    type="button"
                    className="btn-refresh-chat"
                    onClick={async () => {
                      const res = await fetch(`http://localhost:5000/api/messages/candidate-conversation/${user.id}`);
                      if (res.ok) setChatMessages(await res.json());
                    }}
                    title="Actualiser la conversation"
                  >
                    <i className="fa-solid fa-rotate" />
                  </button>
                </div>
              </div>

              {/* FLUX DE DÉFILEMENT DES MESSAGES */}
              <div className="chat-messages-viewport">
                {chatMessages.length === 0 ? (
                  <div className="empty-chat-state">
                    <i className="fa-regular fa-comments" />
                    <h4>{t("Aucun message échangé pour le moment")}</h4>
                    <p>
                      Posez une question relative à votre candidature, à votre demande de stage ou à une formation municipale. Un agent RH vous répondra dans les plus brefs délais.
                    </p>
                  </div>
                ) : (
                  chatMessages.map(msg => {
                    const isFromCandidate = msg.sender_id === user.id;
                    const msgDate = new Date(msg.created_at);

                    return (
                      <div
                        key={msg.id}
                        className={`chat-bubble-row ${isFromCandidate ? 'from-candidate' : 'from-rh'}`}
                      >
                        {!isFromCandidate && (
                          <div className="bubble-avatar-rh">
                            <img
                              src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
                              alt="RH"
                            />
                          </div>
                        )}

                        <div className="chat-bubble-content">
                          <div className="bubble-meta-header">
                            <span className="bubble-sender-title">
                              {isFromCandidate ? 'Vous' : 'Service RH • Mairie de Soa'}
                            </span>
                            {msg.subject && (
                              <span className="bubble-subject-badge">
                                {msg.subject}
                              </span>
                            )}
                          </div>

                          <div className="bubble-text">
                            {msg.content}
                          </div>

                          {/* PIÈCE JOINTE SI PRÉSENTE */}
                          {msg.attachment_url && (
                            <div className="bubble-attachment-box">
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="attachment-link-pill"
                              >
                                <i className="fa-solid fa-paperclip" />
                                <span>{t("Voir le document joint")}</span>
                                <i className="fa-solid fa-arrow-up-right-from-square" />
                              </a>
                            </div>
                          )}

                          <div className="bubble-timestamp-footer">
                            <span>
                              {msgDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isFromCandidate && (
                              <span className="read-receipt-check">
                                {msg.is_read ? (
                                  <><i className="fa-solid fa-check-double text-blue" /> Lu</>
                                ) : (
                                  <><i className="fa-solid fa-check text-muted" />{t("Transmis")}</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {isFromCandidate && (
                          <div className="bubble-avatar-cand">
                            <img src={currentAvatar} alt="Vous" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* BANNIÈRE HORS LIGNE SI RH INDISPONIBLE */}
              {!rhStatus.is_available && (
                <div className="offline-notice-strip">
                  <i className="fa-solid fa-moon" />
                  <span>
                    <strong>Service RH actuellement hors permanence :</strong> Votre message sera placé en file d'attente prioritaire et traité dès la reprise des services communaux.
                  </span>
                </div>
              )}

              {/* BARRE DE SUGGESTIONS RAPIDES */}
              <div className="chat-quick-suggestions">
                <span className="quick-label">{t("Suggestions rapides :")}</span>
                <button
                  type="button"
                  className="quick-chip"
                  onClick={() => {
                    setChatSubject('Suivi de Candidature Emploi');
                    setChatInput('Bonjour Monsieur/Madame, je souhaiterais connaître l\'état d\'avancement de ma candidature déposée pour le poste municipal.');
                  }}
                >
                  <i className="fa-solid fa-list-check" style={{ marginRight: '5px' }} /> Suivi de candidature
                </button>
                <button
                  type="button"
                  className="quick-chip"
                  onClick={() => {
                    setChatSubject('Demande de Stage Académique / Pro');
                    setChatInput('Bonjour, je me permets de vous contacter pour m\'assurer de la bonne réception de mon dossier de demande de stage.');
                  }}
                >
                  <i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} /> Précision dossier de stage
                </button>
                <button
                  type="button"
                  className="quick-chip"
                  onClick={() => {
                    setChatSubject('Inscription Formation Municipale');
                    setChatInput('Bonjour, j\'aimerais avoir des détails complémentaires sur les dates et la convocation pour la session de formation.');
                  }}
                >
                  <i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} /> Renseignement formation
                </button>
              </div>

              {/* FORMULAIRE DE SAISIE DE MESSAGE */}
              <form onSubmit={handleSendChatMessage} className="chat-input-form-box">
                <div className="chat-form-top-row">
                  <div className="chat-subject-select">
                    <label><i className="fa-solid fa-tag" />{t("Objet de la demande :")}</label>
                    <select
                      value={chatSubject}
                      onChange={e => setChatSubject(e.target.value)}
                    >
                      <option value="Suivi de Candidature Emploi">Suivi de Candidature Emploi</option>
                      <option value="Demande de Stage Académique / Pro">Demande de Stage Académique / Pro</option>
                      <option value="Inscription Formation Municipale">Inscription Formation Municipale</option>
                      <option value="Précision sur les Diplômes & Justificatifs">Précision Diplômes &amp; Justificatifs</option>
                      <option value="Question Administrative Générale">Question Administrative Générale</option>
                    </select>
                  </div>

                  {/* BOUTON PIÈCE JOINTE */}
                  <label className="chat-attach-label" title="Joindre un document PDF ou justificatif">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setChatAttachment(e.target.files[0]);
                        }
                      }}
                    />
                    <i className="fa-solid fa-paperclip" />
                    <span>{chatAttachment ? chatAttachment.name.slice(0, 18) + '...' : 'Joindre un document (PDF)'}</span>
                    {chatAttachment && (
                      <button
                        type="button"
                        className="btn-remove-attachment"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setChatAttachment(null);
                        }}
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </label>
                </div>

                <div className="chat-input-main-row">
                  <textarea
                    rows="2"
                    placeholder="Écrivez votre message professionnel au Service RH... (Appuyez sur Entrée pour envoyer)"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                  />

                  <button
                    type="submit"
                    className="btn-send-message"
                    disabled={sendingChatMsg || (!chatInput.trim() && !chatAttachment)}
                  >
                    {sendingChatMsg ? (
                      <i className="fa-solid fa-circle-notch fa-spin" />
                    ) : (
                      <>
                        <span>{t("Envoyer")}</span>
                        <i className="fa-solid fa-paper-plane" />
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>

          </div>
        )}

        {/* =========================================================
            ONGLET : CENTRE DE NOTIFICATIONS & ALERTES CITOYENNES
            ========================================================= */}
        {activeTab === 'notifications' && (
          <div className="tab-fade notifs-module-container">

            {/* 1. HERO BANNER DE NOTIFICATIONS */}
            <div className="notifs-hero-card">
              <div className="notifs-hero-top">
                <div className="notifs-hero-badge">
                  <i className="fa-solid fa-bell" />
                  <span>Centre d'Alertes &amp; Notifications Citoyennes</span>
                </div>

                <div className="notifs-stats-pills">
                  <span className="stat-pill total">
                    <strong>{notificationsList.length}</strong> notification(s) au total
                  </span>
                  {unreadNotifsCount > 0 && (
                    <span className="stat-pill unread">
                      <strong>{unreadNotifsCount}</strong> non lue(s)
                    </span>
                  )}
                </div>
              </div>

              <h2 className="notifs-hero-title">
                Vos Notifications &amp; Suivis d'Actions Municipales
              </h2>
              <p className="notifs-hero-subtitle">
                Consultez l'historique complet de vos alertes concernant vos candidatures, examens de stage, convocations aux formations et événements de la Mairie de Soa.
              </p>
            </div>

            {/* 2. BARRE D'ACTIONS ET FILTRES THÉMATIQUES */}
            <div className="notifs-controls-bar">
              <div className="notifs-filter-chips">
                <button
                  type="button"
                  className={`notif-filter-btn ${notifCategoryFilter === 'TOUTES' ? 'active' : ''}`}
                  onClick={() => setNotifCategoryFilter('TOUTES')}
                >
                  <i className="fa-solid fa-list-check" /> Toutes ({notificationsList.length})
                </button>
                <button
                  type="button"
                  className={`notif-filter-btn ${notifCategoryFilter === 'non_lues' ? 'active' : ''}`}
                  onClick={() => setNotifCategoryFilter('non_lues')}
                >
                  <i className="fa-solid fa-envelope" /> Non lues ({unreadNotifsCount})
                </button>
                <button
                  type="button"
                  className={`notif-filter-btn ${notifCategoryFilter === 'recrutement' ? 'active' : ''}`}
                  onClick={() => setNotifCategoryFilter('recrutement')}
                >
                  <i className="fa-solid fa-briefcase" /> Recrutement &amp; Stages
                </button>
                <button
                  type="button"
                  className={`notif-filter-btn ${notifCategoryFilter === 'formation' ? 'active' : ''}`}
                  onClick={() => setNotifCategoryFilter('formation')}
                >
                  <i className="fa-solid fa-graduation-cap" /> Formations
                </button>
                <button
                  type="button"
                  className={`notif-filter-btn ${notifCategoryFilter === 'evenement' ? 'active' : ''}`}
                  onClick={() => setNotifCategoryFilter('evenement')}
                >
                  <i className="fa-regular fa-calendar-days" /> Calendrier
                </button>
                <button
                  type="button"
                  className={`notif-filter-btn ${notifCategoryFilter === 'message_rh' ? 'active' : ''}`}
                  onClick={() => setNotifCategoryFilter('message_rh')}
                >
                  <i className="fa-solid fa-comments" /> Messagerie RH
                </button>
              </div>

              <div className="notifs-bulk-actions">
                {unreadNotifsCount > 0 && (
                  <button
                    type="button"
                    className="btn-notif-action-pill mark-all"
                    onClick={handleMarkAllNotifsAsRead}
                  >
                    <i className="fa-solid fa-check-double" /> Tout marquer comme lu
                  </button>
                )}
                {notificationsList.some(n => n.is_read) && (
                  <button
                    type="button"
                    className="btn-notif-action-pill clear-read"
                    onClick={handleClearReadNotifs}
                  >
                    <i className="fa-solid fa-trash-can" /> Effacer les notifications lues
                  </button>
                )}
              </div>
            </div>

            {/* 3. LISTE DES NOTIFICATIONS */}
            <div className="notifs-feed-container">
              {(() => {
                const filteredNotifs = notificationsList.filter(n => {
                  if (notifCategoryFilter === 'non_lues') return !n.is_read;
                  if (notifCategoryFilter === 'TOUTES') return true;
                  if (notifCategoryFilter === 'recrutement') return n.type === 'recrutement' || n.type === 'stage';
                  return n.type === notifCategoryFilter;
                });

                if (filteredNotifs.length === 0) {
                  return (
                    <div className="empty-notifs-card">
                      <div className="empty-notifs-icon">
                        <i className="fa-regular fa-bell-slash" />
                      </div>
                      <h4>{t("Aucune notification dans cette catégorie")}</h4>
                      <p>
                        Vous êtes à jour ! Dès qu'une mise à jour interviendra sur votre dossier ou vos démarches communales, vous recevrez une notification instantanée ici.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="notifs-list-rows">
                    {filteredNotifs.map(n => {
                      const nDate = new Date(n.created_at);

                      return (
                        <div
                          key={n.id}
                          className={`notif-card-row ${!n.is_read ? 'is-unread-highlight' : ''}`}
                        >
                          {/* BADGE ICÔNE THÉMATIQUE */}
                          <div className={`notif-category-icon-box ${n.type || 'information'}`}>
                            <i className={n.icon || 'fa-solid fa-bell'} />
                          </div>

                          {/* CONTENU PRINCIPAL */}
                          <div className="notif-card-main-content">
                            <div className="notif-card-meta-header">
                              <span className={`notif-type-tag ${n.type || 'information'}`}>
                                {n.type === 'recrutement' && <><i className="fa-solid fa-briefcase" style={{ marginRight: '5px' }} />{language === 'en' ? 'Recruitment & Jobs' : 'Recrutement & Emploi'}</>}
                                {n.type === 'stage' && <><i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} />{language === 'en' ? 'Internship Request' : 'Demande de Stage'}</>}
                                {n.type === 'formation' && <><i className="fa-solid fa-book-open" style={{ marginRight: '5px' }} />{language === 'en' ? 'Municipal Training' : 'Formation Municipale'}</>}
                                {n.type === 'evenement' && <><i className="fa-solid fa-calendar-day" style={{ marginRight: '5px' }} />{language === 'en' ? 'Council Event' : 'Événement Mairie'}</>}
                                {n.type === 'message_rh' && <><i className="fa-solid fa-comments" style={{ marginRight: '5px' }} />{language === 'en' ? 'HR Messaging' : 'Messagerie RH'}</>}
                                {n.type === 'compte_securite' && <><i className="fa-solid fa-shield-halved" style={{ marginRight: '5px' }} />{language === 'en' ? 'Security & Account' : 'Sécurité & Compte'}</>}
                                {n.type === 'actualite' && <><i className="fa-solid fa-bullhorn" style={{ marginRight: '5px' }} />{language === 'en' ? 'Council News' : 'Actualité Communale'}</>}
                                {!['recrutement', 'stage', 'formation', 'evenement', 'message_rh', 'compte_securite', 'actualite'].includes(n.type) && <><i className="fa-solid fa-circle-info" style={{ marginRight: '5px' }} />{language === 'en' ? 'Information' : 'Information'}</>}
                              </span>

                              <div className="notif-time-status">
                                <span className="notif-date-string">
                                  <i className="fa-regular fa-clock" /> {nDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à {nDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {!n.is_read ? (
                                  <span className="notif-status-badge unread">{t("Non lue")}</span>
                                ) : (
                                  <span className="notif-status-badge read">{t("Lue")}</span>
                                )}
                              </div>
                            </div>

                            <h4 className="notif-card-title">{n.title}</h4>
                            <p className="notif-card-message">{n.message}</p>

                            {/* BOUTONS D'ACTION SUR LA NOTIFICATION */}
                            <div className="notif-card-actions-footer">
                              {n.action_tab && (
                                <button
                                  type="button"
                                  className="btn-notif-cta"
                                  onClick={() => handleNotificationClick(n)}
                                >
                                  {n.action_tab === 'applications' && <><i className="fa-regular fa-clipboard" />{t("Voir ma candidature")}</>}
                                  {n.action_tab === 'trainings' && <><i className="fa-solid fa-graduation-cap" />{t("Consulter la formation")}</>}
                                  {n.action_tab === 'events' && <><i className="fa-regular fa-calendar-days" />{t("Consulter l'événement")}</>}
                                  {n.action_tab === 'messages' && <><i className="fa-solid fa-comments" />{t("Répondre sur la messagerie")}</>}
                                  {n.action_tab === 'interviews' && <><i className="fa-solid fa-video" />{t("Accéder à mon entretien")}</>}
                                  {n.action_tab === 'profile' && <><i className="fa-regular fa-user" />{t("Voir mon profil")}</>}
                                  {n.action_tab === 'offres' && <><i className="fa-solid fa-briefcase" />{t("Voir les offres d'emploi")}</>}
                                  {n.action_tab === 'dashboard' && <><i className="fa-solid fa-arrow-right" />{t("Accéder au tableau de bord")}</>}
                                </button>
                              )}

                              {!n.is_read ? (
                                <button
                                  type="button"
                                  className="btn-notif-secondary"
                                  onClick={() => handleMarkNotifAsRead(n.id)}
                                  title="Marquer comme lue"
                                >
                                  <i className="fa-solid fa-check" /> Marquer lue
                                </button>
                              ) : null}

                              <button
                                type="button"
                                className="btn-notif-delete"
                                onClick={() => handleDeleteNotif(n.id)}
                                title="Supprimer la notification"
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* =========================================================
            ONGLET : PARAMÈTRES DU COMPTE & GESTION CITOYENNE
            ========================================================= */}
        {activeTab === 'settings' && (
          <div className="tab-fade settings-module-container">

            {/* 1. HERO BANNER PARAMÈTRES */}
            <div className="settings-hero-card">
              <div className="settings-hero-top">
                <div className="settings-hero-badge">
                  <i className="fa-solid fa-gear" />
                  <span>Paramètres &amp; Préférences du Compte</span>
                </div>
                <span className="settings-user-tag">
                  Compte #{user.id} • {user.email}
                </span>
              </div>

              <h2 className="settings-hero-title">
                Gestion du Compte, Notifications &amp; Sécurité
              </h2>
              <p className="settings-hero-subtitle">
                Personnalisez vos préférences de communication, la réception des alertes en arrière-plan, la sécurité de votre mot de passe et vos données personnelles.
              </p>
            </div>

            {/* 2. NAVIGATION PAR SOUS-ONGLETS */}
            <div className="settings-tabs-navbar">
              <button
                type="button"
                className={`settings-nav-tab ${settingsSubTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('notifications')}
              >
                <i className="fa-solid fa-bell" /> Notifications &amp; Alertes Push
              </button>
              <button
                type="button"
                className={`settings-nav-tab ${settingsSubTab === 'security' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('security')}
              >
                <i className="fa-solid fa-shield-halved" /> Sécurité &amp; Mot de Passe
              </button>
              <button
                type="button"
                className={`settings-nav-tab ${settingsSubTab === 'privacy' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('privacy')}
              >
                <i className="fa-solid fa-user-lock" /> Confidentialité &amp; Données
              </button>
              <button
                type="button"
                className={`settings-nav-tab ${settingsSubTab === 'display' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('display')}
              >
                <i className="fa-solid fa-palette" /> Affichage &amp; Langue
              </button>
              <button
                type="button"
                className={`settings-nav-tab danger ${settingsSubTab === 'danger' ? 'active' : ''}`}
                onClick={() => setSettingsSubTab('danger')}
              >
                <i className="fa-solid fa-triangle-exclamation" /> Déconnexion &amp; Clôture
              </button>
            </div>

            {/* 3. CONTENU DU SOUS-ONGLET SÉLECTIONNÉ */}

            {/* SOUS-ONGLET 1 : NOTIFICATIONS */}
            {settingsSubTab === 'notifications' && (
              <div className="settings-tab-pane">

                {/* NOTIFICATIONS PAR E-MAIL */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon email">
                      <i className="fa-solid fa-envelope" />
                    </div>
                    <div>
                      <h4>Préférences des Notifications par E-mail</h4>
                      <p>{t("Sélectionnez les communications que vous souhaitez recevoir sur")}<strong>{user.email}</strong>.</p>
                    </div>
                  </div>

                  <div className="settings-options-list">
                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>Offres d'emploi CDD / CDI recommandées</strong>
                        <span>{t("Alertes lorsqu'un poste vacant correspond à vos diplômes et compétences.")}</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.email_notif_jobs ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('email_notif_jobs', !userSettings.email_notif_jobs)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>{t("Suivi des candidatures et demandes de stage")}</strong>
                        <span>{t("Mises à jour du statut, passage en commission et accusés de réception.")}</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.email_notif_applications ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('email_notif_applications', !userSettings.email_notif_applications)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>Formations municipales &amp; Convocations</strong>
                        <span>{t("Validation des demandes de formation et émission des décharges officielles.")}</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.email_notif_trainings ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('email_notif_trainings', !userSettings.email_notif_trainings)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>Messages directs du Service des Ressources Humaines</strong>
                        <span>Alerte e-mail en cas de nouvelle réponse ou consigne officielle d'un agent RH.</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.email_notif_messages ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('email_notif_messages', !userSettings.email_notif_messages)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>Événements communaux &amp; Conseils municipaux</strong>
                        <span>Rappels des dates importantes du calendrier de la Commune de Soa.</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.email_notif_events ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('email_notif_events', !userSettings.email_notif_events)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ALERTES SMS */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon sms">
                      <i className="fa-solid fa-mobile-screen-button" />
                    </div>
                    <div>
                      <h4>Alertes SMS &amp; Urgences Communales</h4>
                      <p>{t("Réception de messages textuels pour les convocations urgentes aux entretiens.")}</p>
                    </div>
                  </div>

                  <div className="settings-options-list">
                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>Alertes SMS prioritaires</strong>
                        <span>Transmis au numéro : {user.phone || 'Non renseigné dans le profil'}</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.sms_notif_enabled ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('sms_notif_enabled', !userSettings.sms_notif_enabled)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 2 : SÉCURITÉ & MOT DE PASSE */}
            {settingsSubTab === 'security' && (
              <div className="settings-tab-pane">

                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon security">
                      <i className="fa-solid fa-lock" />
                    </div>
                    <div>
                      <h4>Changer votre Mot de Passe</h4>
                      <p>{t("Utilisez un mot de passe robuste d'au moins 6 caractères pour sécuriser vos données communales.")}</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePasswordSubmit} className="password-change-form">
                    <div className="form-group-custom">
                      <label>{t("Mot de passe actuel :")}</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                    </div>

                    <div className="form-row-dual">
                      <div className="form-group-custom">
                        <label>{t("Nouveau mot de passe :")}</label>
                        <input
                          type="password"
                          required
                          placeholder="Au moins 6 caractères"
                          value={passwordForm.newPassword}
                          onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                      </div>

                      <div className="form-group-custom">
                        <label>{t("Confirmer le nouveau mot de passe :")}</label>
                        <input
                          type="password"
                          required
                          placeholder="Répétez le mot de passe"
                          value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-save-password"
                      disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                    >
                      {savingPassword ? (
                        <i className="fa-solid fa-circle-notch fa-spin" />
                      ) : (
                        <><i className="fa-solid fa-key" />{t("Mettre à jour mon mot de passe")}</>
                      )}
                    </button>
                  </form>
                </div>

                {/* SESSIONS ACTIVES */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon session">
                      <i className="fa-solid fa-laptop-code" />
                    </div>
                    <div>
                      <h4>Sessions &amp; Appareils Actifs</h4>
                      <p>{t("Historique des connexions sécurisées à votre espace citoyen.")}</p>
                    </div>
                  </div>

                  <div className="sessions-list">
                    <div className="session-card current">
                      <div className="session-icon">
                        <i className="fa-solid fa-display" />
                      </div>
                      <div className="session-info">
                        <strong>Session Actuelle — Navigateur Web</strong>
                        <span>Soa / Yaoundé, Cameroun • Adresse IP locale sécurisée</span>
                        <div className="session-tag-current">
                          <span className="live-pulse-dot online" /> Connecté maintenant
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 3 : CONFIDENTIALITÉ & DONNÉES */}
            {settingsSubTab === 'privacy' && (
              <div className="settings-tab-pane">

                {/* VISIBILITÉ DU PROFIL */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon privacy">
                      <i className="fa-solid fa-eye" />
                    </div>
                    <div>
                      <h4>Visibilité de votre Dossier Candidat</h4>
                      <p>{t("Contrôlez qui peut consulter vos diplômes et vos informations de profil.")}</p>
                    </div>
                  </div>

                  <div className="privacy-options-list">
                    <label className="privacy-radio-card">
                      <input
                        type="radio"
                        name="profile_visibility"
                        value="public_rh"
                        checked={userSettings.profile_visibility === 'public_rh'}
                        onChange={() => handleUpdateSetting('profile_visibility', 'public_rh')}
                      />
                      <div className="radio-content">
                        <strong>Visible par l'ensemble des Services RH &amp; Recruteurs de Soa (Recommandé)</strong>
                        <p>Permet à la Mairie de vous proposer proactivement des postes en CDD/CDI ou des stages adaptés à vos diplômes.</p>
                      </div>
                    </label>

                    <label className="privacy-radio-card">
                      <input
                        type="radio"
                        name="profile_visibility"
                        value="restricted"
                        checked={userSettings.profile_visibility === 'restricted'}
                        onChange={() => handleUpdateSetting('profile_visibility', 'restricted')}
                      />
                      <div className="radio-content">
                        <strong>{t("Restreint uniquement à mes candidatures actives")}</strong>
                        <p>{t("Votre profil n'est accessible que pour les offres et formations auxquelles vous avez expressément postulé.")}</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ALGORITHME IA DE MATCHING MUNICIPAL */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon ai">
                      <i className="fa-solid fa-microchip" />
                    </div>
                    <div>
                      <h4>Algorithme de Matching Municipal</h4>
                      <p>{t("Calcul automatique de votre taux de compatibilité avec les offres communales.")}</p>
                    </div>
                  </div>

                  <div className="settings-options-list">
                    <div className="setting-toggle-row">
                      <div className="setting-toggle-info">
                        <strong>{t("Recommandations intelligentes basées sur mes diplômes")}</strong>
                        <span>{t("Active l'analyse automatique des certificats pour calculer votre score d'adéquation.")}</span>
                      </div>
                      <button
                        type="button"
                        className={`btn-toggle-switch ${userSettings.allow_ai_matching ? 'checked' : ''}`}
                        onClick={() => handleUpdateSetting('allow_ai_matching', !userSettings.allow_ai_matching)}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* EXPORTATION DES DONNÉES PERSONNELLES */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon export">
                      <i className="fa-solid fa-download" />
                    </div>
                    <div>
                      <h4>Exportation des Données Personnelles (Portabilité)</h4>
                      <p>Téléchargez une copie intégrale de votre dossier citoyen (candidatures, formations, diplômes, messages) au format standard JSON.</p>
                    </div>
                  </div>

                  <div className="export-action-row">
                    <button
                      type="button"
                      className="btn-export-data"
                      onClick={handleExportPersonalData}
                      disabled={exportingData}
                    >
                      {exportingData ? (
                        <i className="fa-solid fa-circle-notch fa-spin" />
                      ) : (
                        <><i className="fa-solid fa-file-arrow-down" /> Télécharger mon dossier complet (.JSON)</>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 4 : AFFICHAGE & LANGUE */}
            {settingsSubTab === 'display' && (
              <div className="settings-tab-pane">

                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon display">
                      <i className="fa-solid fa-circle-half-stroke" />
                    </div>
                    <div>
                      <h4>Thème &amp; Apparence Visuelle</h4>
                      <p>{t("Choisissez le thème d'affichage le plus adapté à votre confort visuel.")}</p>
                    </div>
                  </div>

                  <div className="theme-selector-grid">
                    <div
                      className={`theme-card ${userSettings.theme_mode === 'light' ? 'selected' : ''}`}
                      onClick={() => handleUpdateSetting('theme_mode', 'light')}
                    >
                      <div className="theme-preview light">
                        <div className="preview-bar" />
                        <div className="preview-box" />
                      </div>
                      <strong>Mode Clair Républicain</strong>
                      <span>{t("Palette officielle lumineuse et institutionnelle")}</span>
                    </div>

                    <div
                      className={`theme-card ${userSettings.theme_mode === 'dark' ? 'selected' : ''}`}
                      onClick={() => handleUpdateSetting('theme_mode', 'dark')}
                    >
                      <div className="theme-preview dark">
                        <div className="preview-bar" />
                        <div className="preview-box" />
                      </div>
                      <strong>Mode Sombre Éco-Énergie</strong>
                      <span>{t("Idéal pour une lecture prolongée de nuit")}</span>
                    </div>
                  </div>
                </div>

                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon lang">
                      <i className="fa-solid fa-language" />
                    </div>
                    <div>
                      <h4>Langue Officielle de l'Interface</h4>
                      <p>Langues de la République du Cameroun prises en charge par la plateforme municipale.</p>
                    </div>
                  </div>

                  <div className="lang-selector-row">
                    <button
                      type="button"
                      className={`btn-lang-choice ${userSettings.language === 'fr' ? 'active' : ''}`}
                      onClick={() => handleUpdateSetting('language', 'fr')}
                    >
                       Français (Officiel)
                    </button>
                    <button
                      type="button"
                      className={`btn-lang-choice ${userSettings.language === 'en' ? 'active' : ''}`}
                      onClick={() => handleUpdateSetting('language', 'en')}
                    >
                       English
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 5 : DÉCONNEXION & CLÔTURE DU COMPTE */}
            {settingsSubTab === 'danger' && (
              <div className="settings-tab-pane">

                {/* DÉCONNEXION SIMPLE */}
                <div className="settings-card-box">
                  <div className="settings-card-header">
                    <div className="settings-header-icon logout">
                      <i className="fa-solid fa-arrow-right-from-bracket" />
                    </div>
                    <div>
                      <h4>Déconnexion de la Session</h4>
                      <p>{t("Fermez votre session active en toute sécurité sur cet ordinateur.")}</p>
                    </div>
                  </div>

                  <div className="danger-action-row">
                    <button
                      type="button"
                      className="btn-logout-safe"
                      onClick={handleLogout}
                    >
                      <i className="fa-solid fa-power-off" /> Se déconnecter maintenant
                    </button>
                  </div>
                </div>

                {/* ZONE DE DANGER : SUPPRESSION DÉFINITIVE */}
                <div className="settings-card-box danger-zone">
                  <div className="settings-card-header">
                    <div className="settings-header-icon danger">
                      <i className="fa-solid fa-triangle-exclamation" />
                    </div>
                    <div>
                      <h4>Zone de Danger — Suppression Définitive du Compte</h4>
                      <p>{t("La suppression de votre compte est")}<strong>irréversible</strong>. Toutes vos candidatures, pièces jointes, décharges de formations et historiques de messages seront définitivement effacés des serveurs de la Mairie de Soa.</p>
                    </div>
                  </div>

                  <div className="danger-action-row">
                    <button
                      type="button"
                      className="btn-delete-account-trigger"
                      onClick={() => setShowDeleteAccountModal(true)}
                    >
                      <i className="fa-solid fa-trash-can" /> Supprimer définitivement mon compte
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* MODALE DE CONFIRMATION DE SUPPRESSION DU COMPTE */}
        {showDeleteAccountModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteAccountModal(false)}>
            <div className="modal-content modal-danger-account" onClick={e => e.stopPropagation()}>
              <div className="danger-modal-icon">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h3>Confirmer la Suppression Définitive</h3>
              <p className="danger-warning-text">
                Cette action supprimera irréversiblement votre compte, vos candidatures d'emploi et de stage, vos décharges de formation et vos messages.
              </p>

              <form onSubmit={handleDeleteAccountSubmit} className="delete-account-form">
                <div className="form-group-custom">
                  <label>{t("Saisissez votre mot de passe actuel :")}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={deleteAccountPassword}
                    onChange={e => setDeleteAccountPassword(e.target.value)}
                  />
                </div>

                <div className="form-group-custom">
                  <label>{t("Tapez")}<strong>SUPPRIMER MON COMPTE</strong> pour confirmer :</label>
                  <input
                    type="text"
                    required
                    placeholder="SUPPRIMER MON COMPTE"
                    value={deleteConfirmationText}
                    onChange={e => setDeleteConfirmationText(e.target.value)}
                  />
                </div>

                <div className="danger-modal-actions">
                  <button
                    type="button"
                    className="btn-cancel-modal"
                    onClick={() => {
                      setShowDeleteAccountModal(false);
                      setDeleteAccountPassword('');
                      setDeleteConfirmationText('');
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-confirm-delete"
                    disabled={deletingAccount || deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER MON COMPTE' || !deleteAccountPassword}
                  >
                    {deletingAccount ? (
                      <i className="fa-solid fa-circle-notch fa-spin" />
                    ) : (
                      <><i className="fa-solid fa-trash-can" />{t("Confirmer la suppression")}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            ONGLET : CENTRE D'AIDE, ASSISTANCE & SUPPORT CITOYEN
            ========================================================= */}
        {activeTab === 'support' && (
          <div className="tab-fade support-module-container">

            {/* 1. HERO BANNER AIDE & SUPPORT */}
            <div className="support-hero-card">
              <div className="support-hero-top">
                <div className="support-hero-badge">
                  <i className="fa-solid fa-headset" />
                  <span>Assistance &amp; Support Citoyen • Mairie de Soa</span>
                </div>
                <span className="support-hotline-pill">
                  <i className="fa-solid fa-phone" /> Ligne Directe : +237 222 2X XX XX
                </span>
              </div>

              <h2 className="support-hero-title">
                Centre d'Aide, FAQ &amp; Assistance Administrative
              </h2>
              <p className="support-hero-subtitle">
                Consultez nos guides et réponses aux questions fréquentes, suivez l'état de vos réclamations ou soumettez un ticket d'assistance aux agents municipaux de Soa.
              </p>
            </div>

            {/* 2. NAVIGATION PAR SOUS-ONGLETS SUPPORT */}
            <div className="support-tabs-navbar">
              <button
                type="button"
                className={`support-nav-tab ${supportSubTab === 'faq' ? 'active' : ''}`}
                onClick={() => setSupportSubTab('faq')}
              >
                <i className="fa-solid fa-circle-question" /> Foire Aux Questions (FAQ)
              </button>
              <button
                type="button"
                className={`support-nav-tab ${supportSubTab === 'tickets' ? 'active' : ''}`}
                onClick={() => setSupportSubTab('tickets')}
              >
                <i className="fa-solid fa-ticket" /> Mes Demandes &amp; Tickets
                {supportTicketsList.length > 0 && (
                  <span className="support-tab-badge">{supportTicketsList.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`support-nav-tab ${supportSubTab === 'new_ticket' ? 'active' : ''}`}
                onClick={() => setSupportSubTab('new_ticket')}
              >
                <i className="fa-solid fa-pen-to-square" /> Ouvrir un Ticket d'Assistance
              </button>
              <button
                type="button"
                className={`support-nav-tab ${supportSubTab === 'contact' ? 'active' : ''}`}
                onClick={() => setSupportSubTab('contact')}
              >
                <i className="fa-solid fa-building-columns" /> Coordonnées &amp; Accueil Mairie
              </button>
              <button
                type="button"
                className={`support-nav-tab ${supportSubTab === 'guides' ? 'active' : ''}`}
                onClick={() => setSupportSubTab('guides')}
              >
                <i className="fa-solid fa-book-bookmark" /> Guides &amp; Règlements PDF
              </button>
            </div>

            {/* 3. CONTENU DES SOUS-ONGLETS */}

            {/* SOUS-ONGLET 1 : FAQ INTERACTIVE */}
            {supportSubTab === 'faq' && (
              <div className="support-tab-pane">

                {/* BARRE DE RECHERCHE & FILTRES */}
                <div className="faq-search-box-card">
                  <div className="faq-search-input-wrapper">
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                      type="text"
                      placeholder="Rechercher une question, mot-clé (stage, décharge, diplôme, commission, formation)..."
                      value={faqSearchTerm}
                      onChange={e => setFaqSearchTerm(e.target.value)}
                    />
                    {faqSearchTerm && (
                      <button
                        type="button"
                        className="btn-clear-search"
                        onClick={() => setFaqSearchTerm('')}
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>

                  <div className="faq-filter-chips">
                    <button
                      type="button"
                      className={`faq-chip ${faqCategoryFilter === 'TOUTES' ? 'active' : ''}`}
                      onClick={() => setFaqCategoryFilter('TOUTES')}
                    >
                      <i className="fa-solid fa-layer-group" style={{ marginRight: '5px' }} />
                      {language === 'en' ? 'All Questions' : 'Toutes les questions'}
                    </button>
                    <button
                      type="button"
                      className={`faq-chip ${faqCategoryFilter === 'recrutement' ? 'active' : ''}`}
                      onClick={() => setFaqCategoryFilter('recrutement')}
                    >
                      <i className="fa-solid fa-briefcase" style={{ marginRight: '5px' }} />
                      {language === 'en' ? 'Recruitment' : 'Recrutement'}
                    </button>
                    <button
                      type="button"
                      className={`faq-chip ${faqCategoryFilter === 'stages' ? 'active' : ''}`}
                      onClick={() => setFaqCategoryFilter('stages')}
                    >
                      <i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} />
                      {language === 'en' ? 'Internships' : 'Stages'}
                    </button>
                    <button
                      type="button"
                      className={`faq-chip ${faqCategoryFilter === 'formations' ? 'active' : ''}`}
                      onClick={() => setFaqCategoryFilter('formations')}
                    >
                      <i className="fa-solid fa-book-open" style={{ marginRight: '5px' }} />
                      {language === 'en' ? 'Trainings' : 'Formations'}
                    </button>
                    <button
                      type="button"
                      className={`faq-chip ${faqCategoryFilter === 'compte' ? 'active' : ''}`}
                      onClick={() => setFaqCategoryFilter('compte')}
                    >
                      <i className="fa-solid fa-id-card" style={{ marginRight: '5px' }} />
                      {language === 'en' ? 'Diplomas & Profile' : 'Diplômes & Profil'}
                    </button>
                    <button
                      type="button"
                      className={`faq-chip ${faqCategoryFilter === 'administratif' ? 'active' : ''}`}
                      onClick={() => setFaqCategoryFilter('administratif')}
                    >
                      <i className="fa-solid fa-comments" style={{ marginRight: '5px' }} />
                      {language === 'en' ? 'HR & Administration' : 'RH & Administratif'}
                    </button>
                  </div>
                </div>

                {/* ACCORDÉONS FAQ */}
                <div className="faq-accordions-list">
                  {(() => {
                    const FAQ_ITEMS = [
                      {
                        id: 1,
                        category: 'recrutement',
                        categoryLabel: language === 'en' ? 'Recruitment & Applications' : 'Recrutement & Candidatures',
                        question: 'Comment se déroule la sélection des candidatures CDD / CDI à la Mairie de Soa ?',
                        answer: 'Toutes les candidatures déposées via la plateforme sont centralisées au Secrétariat Général et instruites par la Direction des Ressources Humaines. Les dossiers complets sont ensuite soumis à la Commission Municipale de Recrutement. Les candidats retenus reçoivent une convocation officielle par notification et e-mail pour un entretien d\'évaluation avec les responsables de service.'
                      },
                      {
                        id: 2,
                        category: 'stages',
                        categoryLabel: language === 'en' ? 'Internship Requests' : 'Demandes de Stage',
                        question: 'Quelles sont les pièces requises pour une demande de stage académique ou professionnel ?',
                        answer: 'Pour effectuer un stage à la Mairie de Soa, le dossier doit obligatoirement comporter : une lettre de motivation adressée à Monsieur le Maire de Soa, une convention ou lettre de recommandation officielle de votre établissement (ex: Université de Yaoundé II Soa), une copie de votre diplôme le plus récent et un CV. Une fois validé par les RH, une décharge officielle numérotée vous est directement délivrée.'
                      },
                      {
                        id: 3,
                        category: 'stages',
                        categoryLabel: language === 'en' ? 'Internship Requests' : 'Demandes de Stage',
                        question: 'Comment obtenir mon accusé de réception / décharge officielle de stage ?',
                        answer: 'Dès que la Direction des Ressources Humaines prend connaissance et valide votre demande de stage, le système génère automatiquement votre document officiel avec la référence unique SOA-STAGE-2026-XXXX et le sceau républicain de la Mairie. Vous pouvez le télécharger et l\'imprimer à tout moment dans l\'onglet "Mes Candidatures".'
                      },
                      {
                        id: 4,
                        category: 'formations',
                        categoryLabel: language === 'en' ? 'Municipal Trainings' : 'Formations Municipales',
                        question: 'Qui peut participer aux programmes de formation municipale organisés par la Mairie ?',
                        answer: 'Les sessions de formation municipale sont ouvertes en priorité aux résidents de la Commune de Soa, aux étudiants de l\'Université de Yaoundé II Soa et aux jeunes professionnels souhaitant renforcer leurs compétences en gestion communale, hygiène publique, numérique et administration.'
                      },
                      {
                        id: 5,
                        category: 'formations',
                        categoryLabel: language === 'en' ? 'Municipal Trainings' : 'Formations Municipales',
                        question: 'Comment recevoir l\'attestation ou l\'accusé d\'inscription à une session de formation ?',
                        answer: 'Après avoir postulé via l\'onglet "Formations Municipales" et renseigné vos justificatifs, vous recevrez une notification de validation ainsi qu\'une décharge officielle téléchargeable au format officiel de la Mairie.'
                      },
                      {
                        id: 6,
                        category: 'compte',
                        categoryLabel: language === 'en' ? 'Diplomas & Profile' : 'Diplômes & Profil',
                        question: 'Comment l\'algorithme municipal effectue-t-il le matching entre mon profil et les offres ?',
                        answer: 'L\'algorithme analyse vos diplômes et certifications enregistrés dans votre profil (Doctorat, Master, Diplôme d\'Ingénieur, Licence, BTS/DUT, Baccalauréat), ainsi que vos compétences clés, et compare ces données aux prérequis de chaque offre d\'emploi afin de calculer un score de compatibilité en pourcentage.'
                      },
                      {
                        id: 7,
                        category: 'compte',
                        categoryLabel: language === 'en' ? 'Candidate Profile Sheet' : 'Fiche Candidat',
                        question: 'Comment imprimer ma Fiche Officielle de Candidat certifiée ?',
                        answer: 'Dans l\'onglet "Mon Profil", cliquez sur le bouton "Imprimer Fiche Officielle". Une prévisualisation haute fidélité conforme aux standards de l\'administration municipale s\'affiche avec l\'en-tête de la République du Cameroun, vos diplômes et la signature légale.'
                      },
                      {
                        id: 8,
                        category: 'administratif',
                        categoryLabel: language === 'en' ? 'HR Messaging' : 'Messagerie RH',
                        question: 'Quels sont les horaires de permanence et de réponse de la messagerie RH ?',
                        answer: 'Les agents RH de la Mairie de Soa sont disponibles du Lundi au Vendredi de 07h30 à 15h30. Si vous envoyez un message en dehors de ces horaires, un accusé automatique vous confirme la bonne réception et votre demande est traitée en priorité dès l\'ouverture des bureaux.'
                      },
                      {
                        id: 9,
                        category: 'administratif',
                        categoryLabel: language === 'en' ? 'Calendar & Events' : 'Calendrier & Citoyenneté',
                        question: 'Comment être informé des conseils municipaux et des journées citoyennes ?',
                        answer: 'Consultez l\'onglet "Calendrier & Événements". Toutes les dates des conseils municipaux publics, des journées "Soa Ville Propre" et des foires d\'emploi y sont tenues à jour en temps réel avec possibilité de confirmer votre participation citoyenne.'
                      },
                      {
                        id: 10,
                        category: 'recrutement',
                        categoryLabel: language === 'en' ? 'Security & Data Protection' : 'Sécurité & Données',
                        question: 'Mes pièces justificatives et diplômes sont-ils protégés ?',
                        answer: 'Oui. Toutes les données et documents téléversés sont stockés de façon chiffrée sur les serveurs sécurisés de la Commune de Soa et ne sont consultables que par les agents RH habilités de la Mairie.'
                      }
                    ];

                    const filtered = FAQ_ITEMS.filter(item => {
                      const matchCat = faqCategoryFilter === 'TOUTES' || item.category === faqCategoryFilter;
                      const matchSearch = !faqSearchTerm ||
                        item.question.toLowerCase().includes(faqSearchTerm.toLowerCase()) ||
                        item.answer.toLowerCase().includes(faqSearchTerm.toLowerCase());
                      return matchCat && matchSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="faq-empty-state">
                          <i className="fa-solid fa-circle-question" />
                          <h4>{t("Aucune réponse ne correspond à votre recherche")}</h4>
                          <p>Vous ne trouvez pas la réponse souhaitée ? Ouvrez un ticket d'assistance personnalisé auprès de nos agents.</p>
                          <button
                            type="button"
                            className="btn-faq-open-ticket"
                            onClick={() => setSupportSubTab('new_ticket')}
                          >
                            <i className="fa-solid fa-pen-to-square" /> Ouvrir un ticket de support
                          </button>
                        </div>
                      );
                    }

                    return filtered.map(item => {
                      const isOpen = openFaqId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`faq-item-accordion ${isOpen ? 'open' : ''}`}
                        >
                          <div
                            className="faq-item-header"
                            onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                          >
                            <div className="faq-header-left">
                              <span className="faq-category-tag">{item.categoryLabel}</span>
                              <h4 className="faq-question-text">{item.question}</h4>
                            </div>
                            <button type="button" className="btn-toggle-faq">
                              <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} />
                            </button>
                          </div>

                          {isOpen && (
                            <div className="faq-item-body">
                              <p>{item.answer}</p>
                              <div className="faq-helpful-box">
                                <span>{t("Cette réponse vous a-t-elle été utile ?")}</span>
                                <button
                                  type="button"
                                  className="btn-helpful"
                                  onClick={() => setStatusMsg({ text: 'Merci pour votre retour !', type: 'info' })}
                                >
                                   Oui
                                </button>
                                <button
                                  type="button"
                                  className="btn-helpful"
                                  onClick={() => setSupportSubTab('new_ticket')}
                                >
                                   Besoin d'aide complémentaire
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 2 : MES TICKETS D'ASSISTANCE */}
            {supportSubTab === 'tickets' && (
              <div className="support-tab-pane">

                <div className="tickets-controls-row">
                  <div>
                    <h4>Historique de vos Demandes d'Assistance</h4>
                    <p>{t("Suivez en direct le traitement de vos réclamations et sollicitations administratives.")}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-create-ticket-cta"
                    onClick={() => setSupportSubTab('new_ticket')}
                  >
                    <i className="fa-solid fa-plus" /> Nouveau ticket d'assistance
                  </button>
                </div>

                {supportTicketsList.length === 0 ? (
                  <div className="empty-tickets-card">
                    <div className="empty-tickets-icon">
                      <i className="fa-solid fa-ticket-simple" />
                    </div>
                    <h4>{t("Vous n'avez aucun ticket de support en cours")}</h4>
                    <p>{t("Si vous rencontrez une difficulté ou avez besoin d'une précision administrative, notre équipe est à votre disposition.")}</p>
                    <button
                      type="button"
                      className="btn-open-first-ticket"
                      onClick={() => setSupportSubTab('new_ticket')}
                    >
                      <i className="fa-solid fa-pen-to-square" /> Soumettre une demande
                    </button>
                  </div>
                ) : (
                  <div className="tickets-list-grid">
                    {supportTicketsList.map(t => {
                      const tDate = new Date(t.created_at);

                      return (
                        <div key={t.id} className={`ticket-card-row ${t.status || 'en_attente'}`}>
                          <div className="ticket-card-top">
                            <div className="ticket-ref-group">
                              <span className="ticket-number-badge">{t.ticket_number}</span>
                              <span className="ticket-category-tag">{t.category}</span>
                            </div>

                            <div className="ticket-status-pill-box">
                              {t.status === 'en_attente' && <span className="status-pill pending">{t("En attente d'attribution")}</span>}
                              {t.status === 'en_cours' && <span className="status-pill in-progress">{t("En cours d'analyse")}</span>}
                              {t.status === 'resolu' && <span className="status-pill resolved"> Résolu par le Support</span>}
                              {t.status === 'ferme' && <span className="status-pill closed">{t("Clôturé")}</span>}
                            </div>
                          </div>

                          <h4 className="ticket-subject-title">{t.subject}</h4>
                          <p className="ticket-message-preview">{t.message}</p>

                          {/* RÉPONSE OFFICIELLE ADMINISTRATIVE */}
                          {t.admin_response && (
                            <div className="ticket-official-reply-box">
                              <div className="reply-header">
                                <i className="fa-solid fa-shield-halved" />
                                <strong>Réponse Officielle du Support de la Mairie de Soa :</strong>
                              </div>
                              <p className="reply-content-text">{t.admin_response}</p>
                            </div>
                          )}

                          <div className="ticket-card-footer">
                            <span className="ticket-date-tag">
                              <i className="fa-regular fa-clock" /> Soumis le {tDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span className={`ticket-priority-tag ${t.priority || 'normale'}`}>
                              Priorité : {t.priority || 'Normale'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

            {/* SOUS-ONGLET 3 : OUVRIR UN NOUVEAU TICKET */}
            {supportSubTab === 'new_ticket' && (
              <div className="support-tab-pane">

                <div className="new-ticket-container-card">
                  <div className="ticket-form-header">
                    <div className="ticket-form-icon">
                      <i className="fa-solid fa-pen-nib" />
                    </div>
                    <div>
                      <h3>Formulaire d'Assistance &amp; Réclamation Citoyenne</h3>
                      <p>Renseignez les détails de votre demande. Un agent municipal du Secrétariat Général vous apportera une réponse sous 24h ouvrées.</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateSupportTicket} className="new-ticket-form">
                    <div className="form-row-dual">
                      <div className="form-group-custom">
                        <label><i className="fa-solid fa-layer-group" />{t("Catégorie de la demande :")}</label>
                        <select
                          value={newTicketForm.category}
                          onChange={e => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                        >
                          <option value="Dossier & Candidature">Dossier &amp; Candidature Emploi (CDD/CDI)</option>
                          <option value="Demande de Stage">Demande de Stage Académique / Professionnel</option>
                          <option value="Formation Municipale">Inscription &amp; Décharge de Formation</option>
                          <option value="Diplômes & Profil">Diplômes, Certifications &amp; Profil</option>
                          <option value="Problème Technique">Problème Technique / Téléversement</option>
                          <option value="Réclamation Administrative">Réclamation Administrative / Recours</option>
                          <option value="Autre Demande">Autre Demande Générale</option>
                        </select>
                      </div>

                      <div className="form-group-custom">
                        <label><i className="fa-solid fa-flag" />{t("Degré d'urgence :")}</label>
                        <select
                          value={newTicketForm.priority}
                          onChange={e => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                        >
                          <option value="normale"> Normale (Traitement sous 24h - 48h)</option>
                          <option value="urgente"> Urgente (Entretien imminent ou délai légal)</option>
                          <option value="tres_urgente"> Très urgente (Dossier bloqué)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group-custom">
                      <label><i className="fa-solid fa-heading" />{t("Objet explicite de votre demande :")}</label>
                      <input
                        type="text"
                        placeholder="Ex: Précision sur les pièces complémentaires de mon dossier de stage"
                        value={newTicketForm.subject}
                        onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                      />
                    </div>

                    <div className="form-group-custom">
                      <label><i className="fa-solid fa-message" />{t("Description détaillée du problème ou de la question :")}</label>
                      <textarea
                        rows={5}
                        required
                        placeholder="Décrivez précisément votre situation, la référence de votre candidature ou formation, et les questions pour lesquelles vous sollicitez l'assistance municipale..."
                        value={newTicketForm.message}
                        onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                      />
                    </div>

                    <div className="ticket-form-submit-row">
                      <button
                        type="button"
                        className="btn-cancel-ticket"
                        onClick={() => setSupportSubTab('faq')}
                      >
                        Retour à la FAQ
                      </button>
                      <button
                        type="submit"
                        className="btn-submit-ticket"
                        disabled={submittingTicket}
                      >
                        {submittingTicket ? (
                          <i className="fa-solid fa-circle-notch fa-spin" />
                        ) : (
                          <><i className="fa-solid fa-paper-plane" />{t("Transmettre ma demande aux services municipaux")}</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 4 : COORDONNÉES & ACCUEIL MAIRIE */}
            {supportSubTab === 'contact' && (
              <div className="support-tab-pane">

                <div className="support-contact-grid">
                  {/* CARTE 1 : HÔTEL DE VILLE */}
                  <div className="contact-info-card">
                    <div className="contact-card-icon hotel">
                      <i className="fa-solid fa-landmark-flag" />
                    </div>
                    <h4>Mairie de la Commune de Soa</h4>
                    <p className="contact-lead">Secrétariat Général &amp; Accueil Citoyen</p>
                    <ul className="contact-details-list">
                      <li>
                        <i className="fa-solid fa-location-dot" />
                        <span>Centre Administratif, Face Campus Université de Yaoundé II, BP 20 Soa, Cameroun</span>
                      </li>
                      <li>
                        <i className="fa-solid fa-clock" />
                        <span>Lundi au Vendredi : 07h30 — 15h30 (Heure locale)</span>
                      </li>
                      <li>
                        <i className="fa-solid fa-envelope-open-text" />
                        <span>info@communesoa.com</span>
                      </li>
                    </ul>
                  </div>

                  {/* CARTE 2 : DIRECTION DES RESSOURCES HUMAINES */}
                  <div className="contact-info-card">
                    <div className="contact-card-icon rh">
                      <i className="fa-solid fa-users-gear" />
                    </div>
                    <h4>Service des Ressources Humaines</h4>
                    <p className="contact-lead">Recrutements, Stages &amp; Formations Municipales</p>
                    <ul className="contact-details-list">
                      <li>
                        <i className="fa-solid fa-briefcase" />
                        <span>Bureau RH — Bâtiment Principal, 1er Étage</span>
                      </li>
                      <li>
                        <i className="fa-solid fa-phone" />
                        <span>Téléphones de la Mairie : +237 678 35 85 09 / +237 692 19 97 22</span>
                      </li>
                      <li>
                        <i className="fa-solid fa-comments" />
                        <span>{t("Messagerie instantanée directe via votre portail candidat")}</span>
                      </li>
                    </ul>
                  </div>

                  {/* CARTE 3 : PERMANENCE & NUMÉROS UTILES */}
                  <div className="contact-info-card full-width">
                    <div className="contact-card-icon emergency">
                      <i className="fa-solid fa-phone-volume" />
                    </div>
                    <h4>Numéros Utiles &amp; Permanences Communales de Soa</h4>
                    <div className="emergency-pills-row">
                      <div className="emergency-pill">
                        <strong>Standard Mairie de Soa :</strong>
                        <span>+237 678 35 85 09 / +237 692 19 97 22</span>
                      </div>
                      <div className="emergency-pill">
                        <strong>Centre Médical d'Arrondissement (CMA) de Soa :</strong>
                        <span>+237 222 21 34 43</span>
                      </div>
                      <div className="emergency-pill">
                        <strong>Secours &amp; Urgences :</strong>
                        <span>118 (Pompiers) / 117 (Police)</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SOUS-ONGLET 5 : GUIDES & RÈGLEMENTS PDF OFFICIELS (TÉLÉCHARGEABLES DYNAMIQUES) */}
            {supportSubTab === 'guides' && (
              <div className="support-tab-pane">

                <div className="guides-download-grid">
                  {dynamicGuides.length > 0 ? (
                    dynamicGuides.map((guide) => (
                      <div className="guide-download-card" key={guide.id} style={{ borderLeft: `5px solid ${guide.badge_color || '#00a859'}` }}>
                        <div className="guide-icon pdf" style={{ background: '#e0f2fe', color: guide.badge_color || '#00a859' }}>
                          <i className="fa-solid fa-file-pdf" />
                        </div>
                        <div className="guide-info">
                          <h4>{guide.title}</h4>
                          <p>{guide.description}</p>
                          <span className="guide-meta" style={{ color: guide.badge_color || '#00a859' }}>
                            {guide.badge_tag || 'Document Officiel'} • {guide.category || 'Guide Général'} ({guide.file_size || 'PDF'})
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-download-guide"
                          style={{ background: guide.badge_color || '#00a859', borderColor: guide.badge_color || '#00a859' }}
                          onClick={() => {
                            if (guide.file_url) {
                              window.open(guide.file_url, '_blank');
                            } else {
                              downloadGuideCandidat();
                            }
                          }}
                        >
                          <i className="fa-solid fa-download" /> {language === 'en' ? 'Download / View' : 'Consulter / Télécharger'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="guide-download-card">
                      <div className="guide-icon pdf"><i className="fa-solid fa-file-pdf" /></div>
                      <div className="guide-info">
                        <h4>Guide Officiel du Candidat &amp; Recrutements — Mairie de Soa (2026)</h4>
                        <p>Manuel complet sur le processus de candidature, le barème des diplômes (BTS, Licence, Master) et la préparation aux commissions de sélection.</p>
                        <span className="guide-meta">Document Administratif Officiel • Conforme Loi Décentralisation</span>
                      </div>
                      <button type="button" className="btn-download-guide" onClick={downloadGuideCandidat}>
                        <i className="fa-solid fa-download" /> {language === 'en' ? 'Download / Print' : 'Télécharger / Imprimer'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* ONGLET 6 : MON PROFIL MODERNE (VUE RECRUTEUR RH & ÉDITION) */}
        {activeTab === 'profile' && (
          <div className="tab-fade profile-module-container">

            {/* TOP BAR AVEC JAUGE DE COMPLÉTION & SWITCH DE VUE */}
            <div className="profile-top-controls">
              <div className="profile-completion-card">
                <div className="completion-info">
                  <div className="completion-text">
                    <span className="completion-title">
                      <i className="fa-solid fa-chart-pie" /> Taux de complétion du profil
                    </span>
                    <span className="completion-percentage-badge">
                      {dashboardData.completionPercentage || 85}%
                    </span>
                  </div>
                  <div className="completion-bar-container">
                    <div
                      className="completion-bar-fill"
                      style={{
                        width: `${dashboardData.completionPercentage || 85}%`,
                        background: (dashboardData.completionPercentage || 85) >= 100
                          ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                          : (dashboardData.completionPercentage || 85) >= 70
                            ? 'linear-gradient(90deg, #3b82f6, #22c55e)'
                            : 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      }}
                    />
                  </div>
                  <p className="completion-hint">
                    {(dashboardData.completionPercentage || 85) >= 100
                      ? 'Votre profil est 100% complet et prêt pour les commissions de sélection de la Mairie de Soa.'
                      : 'Complétez vos coordonnées, votre présentation et téléversez vos diplômes pour maximiser votre score d\'adéquation.'}
                  </p>
                </div>
              </div>

              <div className="view-mode-switcher">
                <button
                  type="button"
                  className={`mode-btn ${profileViewMode === 'preview' ? 'active' : ''}`}
                  onClick={() => setProfileViewMode('preview')}
                >
                  <i className="fa-solid fa-eye" /> Aperçu Public (Vue Recruteur RH)
                </button>
                <button
                  type="button"
                  className={`mode-btn ${profileViewMode === 'edit' ? 'active' : ''}`}
                  onClick={() => setProfileViewMode('edit')}
                >
                  <i className="fa-solid fa-pen-to-square" /> Modifier mon profil
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            {/* MODE 1 : APERÇU PUBLIC / COMMENT LES RH LE VOIENT     */}
            {/* ══════════════════════════════════════════════════════ */}
            {profileViewMode === 'preview' ? (
              <div className="profile-public-view fade-in">
                {/* BANNIÈRE DE PROFIL HAUT DE GAMME */}
                <div className="profile-hero-banner">
                  <div className="banner-background">
                    <div className="banner-glow"></div>
                    <div className="banner-badge-top">
                      <i className="fa-solid fa-shield-halved" /> Candidat Enregistré — Commune de Soa
                    </div>
                  </div>

                  <div className="banner-content">
                    <div className="banner-avatar-section">
                      <div className="hero-avatar-wrapper" onClick={() => avatarInputRef.current?.click()} title="Cliquez pour changer la photo">
                        <img src={currentAvatar} alt="Utilisateur" className="hero-avatar" />
                        <div className="avatar-change-badge">
                          <i className="fa-solid fa-camera" />
                        </div>
                      </div>
                      <span className="availability-pill">
                        <span className="dot-pulse"></span> Disponible pour opportunités
                      </span>
                    </div>

                    <div className="banner-identity">
                      <div className="identity-header">
                        <h1 className="candidate-full-name">{user.prenom} {user.nom}</h1>
                        <span className="highlight-domain-badge">
                          <i className="fa-solid fa-briefcase" /> {profileForm.title || 'Candidat Polyvalent'}
                        </span>
                      </div>

                      {/* COORDONNÉES OFFICIELLES & CONTACTS */}
                      <div className="contact-badges-row">
                        <span className="contact-pill" title="Email officiel">
                          <i className="fa-solid fa-envelope" /> {user.email}
                        </span>
                        <span className="contact-pill" title="Téléphone direct">
                          <i className="fa-solid fa-phone" /> {profileForm.phone || user.phone || 'Non renseigné'}
                        </span>
                        <span className="contact-pill" title="Localisation">
                          <i className="fa-solid fa-location-dot" /> {profileForm.ville || user.ville || 'Soa'}, {profileForm.region || user.region || 'Centre'}
                        </span>

                        {/* Portfolio professionnel */}
                        {profileForm.portfolio_url && (
                          <a
                            href={profileForm.portfolio_url.startsWith('http') ? profileForm.portfolio_url : `https://${profileForm.portfolio_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="contact-pill portfolio-link"
                            title="Consulter le portfolio"
                          >
                            <i className="fa-solid fa-globe" /> Portfolio / Site Web <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.7rem' }} />
                          </a>
                        )}

                        {profileForm.linkedin_url && (
                          <a
                            href={profileForm.linkedin_url.startsWith('http') ? profileForm.linkedin_url : `https://${profileForm.linkedin_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="contact-pill linkedin-link"
                          >
                            <i className="fa-brands fa-linkedin" /> LinkedIn
                          </a>
                        )}

                        {profileForm.github_url && (
                          <a
                            href={profileForm.github_url.startsWith('http') ? profileForm.github_url : `https://${profileForm.github_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="contact-pill github-link"
                          >
                            <i className="fa-brands fa-github" /> GitHub
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="banner-quick-actions">
                      <button className="edit-shortcut-btn" onClick={() => setProfileViewMode('edit')}>
                        <i className="fa-solid fa-pen" /> Modifier mon profil
                      </button>
                      <button className="print-shortcut-btn" onClick={() => setShowPrintPreviewModal(true)}>
                        <i className="fa-solid fa-print" /> Imprimer la Fiche Officielle
                      </button>
                    </div>
                  </div>
                </div>

                {/* CORPS DU PROFIL — GRILLE 2 COLONNES */}
                <div className="profile-details-grid">
                  {/* COLONNE GAUCHE (PRINCIPALE) */}
                  <div className="profile-col-main">

                    {/* À PROPOS / PITCH */}
                    <div className="profile-card">
                      <div className="card-header-styled">
                        <div className="header-icon-box green">
                          <i className="fa-solid fa-quote-left" />
                        </div>
                        <h3>À propos de moi & Synthèse Professionnelle</h3>
                      </div>
                      <div className="bio-content-box">
                        <p className="bio-text">
                          {profileForm.bio || 'Aucune description rédigée. Cliquez sur "Modifier mon profil" pour ajouter une courte présentation de vos compétences et ambitions professionnelles.'}
                        </p>
                      </div>
                    </div>

                    {/* COMPÉTENCES CLÉS & DOMAINES D'EXPERTISE */}
                    <div className="profile-card">
                      <div className="card-header-styled">
                        <div className="header-icon-box blue">
                          <i className="fa-solid fa-layer-group" />
                        </div>
                        <h3>Compétences & Savoir-Faire Clés</h3>
                      </div>
                      <div className="skills-cloud">
                        {profileForm.skills ? (
                          profileForm.skills.split(',').map((skill, idx) => {
                            const trimmed = skill.trim();
                            if (!trimmed) return null;
                            return (
                              <span key={idx} className="skill-chip">
                                <i className="fa-solid fa-check" /> {trimmed}
                              </span>
                            );
                          })
                        ) : (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t("Aucune compétence renseignée.")}</p>
                        )}
                      </div>
                    </div>

                    {/* DIPLÔMES & CERTIFICATIONS ACADÉMIQUES (RÉELS ET VÉRIFIÉS) */}
                    <div className="profile-card">
                      <div className="card-header-styled-between">
                        <div className="header-icon-title">
                          <div className="header-icon-box purple">
                            <i className="fa-solid fa-graduation-cap" />
                          </div>
                          <div>
                            <h3>Mes Diplômes & Certifications ({myDiplomas.length})</h3>
                            <p className="card-sub-p">{t("Authentifiés pour le calcul de compatibilité et les recommandations de postes vacants")}</p>
                          </div>
                        </div>
                        <div className="diplomas-header-actions">
                          <button
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => multiDiplomaInputRef.current?.click()}
                            disabled={uploadingDiploma}
                            title="Sélectionner et téléverser plusieurs PDF en un seul clic"
                          >
                            <i className="fa-solid fa-cloud-arrow-up" /> Téléversement Multiple
                          </button>
                          <button
                            type="button"
                            className="action-btn-primary"
                            onClick={() => setShowAddDiplomaModal(true)}
                          >
                            <i className="fa-solid fa-plus" /> Ajouter un Diplôme
                          </button>
                        </div>
                      </div>

                      {myDiplomas.length === 0 ? (
                        <div className="empty-diploma-box">
                          <div className="empty-icon-circle">
                            <i className="fa-solid fa-award" />
                          </div>
                          <h4>{t("Aucun diplôme ou certification enregistré")}</h4>
                          <p>
                            Téléversez vos diplômes officiels (Licence, Master, BTS, Certifications professionnelles).
                            L'algorithme de la Mairie de Soa analyse vos diplômes réels pour calculer avec précision vos scores d'adéquation avec les offres d'emploi.
                          </p>
                          <div className="empty-actions-row">
                            <button className="empty-primary-btn" onClick={() => setShowAddDiplomaModal(true)}>
                              <i className="fa-solid fa-plus" /> Ajouter mon premier diplôme
                            </button>
                            <button className="empty-secondary-btn" onClick={() => multiDiplomaInputRef.current?.click()}>
                              <i className="fa-solid fa-cloud-arrow-up" /> Téléverser plusieurs fichiers PDF
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="diplomas-grid">
                          {myDiplomas.map(dip => (
                            <div key={dip.id} className="diploma-card-item">
                              <div className="diploma-icon-col">
                                <i className="fa-solid fa-file-pdf pdf-red" />
                              </div>
                              <div className="diploma-info-col">
                                <div className="diploma-top-line">
                                  <span className="diploma-level-badge">{dip.level || 'Diplôme d\'État'}</span>
                                  <span className="diploma-year-badge"><i className="fa-regular fa-calendar" /> {dip.year || 'Année récente'}</span>
                                </div>
                                <h4 className="diploma-title">{dip.title}</h4>
                                <span className="diploma-institution">
                                  <i className="fa-solid fa-building-columns" /> {dip.institution || 'Établissement académique'}
                                </span>
                                <div className="diploma-file-meta">
                                  <i className="fa-solid fa-paperclip" /> {dip.file_name}
                                </div>
                              </div>
                              <div className="diploma-actions-col">
                                <a
                                  href={dip.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="diploma-view-pill"
                                  title="Consulter le document PDF"
                                >
                                  <i className="fa-solid fa-arrow-up-right-from-square" /> Consulter
                                </a>
                                <button
                                  type="button"
                                  className="diploma-delete-pill"
                                  onClick={() => handleDeleteDiploma(dip.id)}
                                  title="Retirer ce diplôme"
                                >
                                  <i className="fa-solid fa-trash-can" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLONNE DROITE (MÉTRIQUES & PARCOURS) */}
                  <div className="profile-col-side">

                    {/* PARCOURS & INFOS RAPIDES */}
                    <div className="profile-card">
                      <div className="card-header-styled">
                        <div className="header-icon-box amber">
                          <i className="fa-solid fa-id-card-clip" />
                        </div>
                        <h3>Informations Clés</h3>
                      </div>
                      <div className="key-metrics-list">
                        <div className="metric-row">
                          <span className="metric-label">
                            <i className="fa-solid fa-graduation-cap" /> Niveau d'études
                          </span>
                          <strong className="metric-value">{profileForm.education_level || 'Licence / Master'}</strong>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">
                            <i className="fa-solid fa-briefcase" /> Expérience
                          </span>
                          <strong className="metric-value">{profileForm.experience_years} an(s) d'expérience</strong>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">
                            <i className="fa-solid fa-building-columns" /> Commune
                          </span>
                          <strong className="metric-value">{profileForm.ville || 'Soa'} (Yaoundé)</strong>
                        </div>
                        <div className="metric-row">
                          <span className="metric-label">
                            <i className="fa-solid fa-map-pin" /> Adresse
                          </span>
                          <strong className="metric-value">{profileForm.address || 'Soa Centre'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* SCORE IA GLOBAL BASÉ SUR LES FAITS */}
                    <div className="profile-card score-card-gradient">
                      <div className="score-header">
                        <i className="fa-solid fa-chart-line" />
                        <h4>Score IA de Compatibilité</h4>
                      </div>
                      <div className="score-number-display">
                        <span>{dashboardData.compatibilityScore || 82}%</span>
                        <p>{t("Score calculé sur la base de vos compétences et de vos diplômes enregistrés")}</p>
                      </div>
                      <button className="view-jobs-btn" onClick={() => navigate('/candidat/offres')}>
                        Voir les offres compatibles <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }} />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              /* ══════════════════════════════════════════════════════ */
              /* MODE 2 : FORMULAIRE D'ÉDITION MODERNE & COMPLET        */
              /* ══════════════════════════════════════════════════════ */
              <div className="profile-edit-view fade-in">
                <form onSubmit={handleSaveProfile} className="styled-edit-form">

                  {/* 1. IDENTITÉ & DOMAINE EN HIGHLIGHT */}
                  <div className="edit-form-card">
                    <div className="form-card-header">
                      <div className="header-icon-box green">
                        <i className="fa-solid fa-user-tag" />
                      </div>
                      <div>
                        <h3>Identité & Domaine en Highlight</h3>
                        <p>{t("Ces informations s'affichent en grand format en tête de votre profil pour les recruteurs.")}</p>
                      </div>
                    </div>

                    <div className="form-grid-two">
                      <div className="form-field">
                        <label>{t("Prénom")}<span className="req-star">*</span></label>
                        <input
                          type="text"
                          required
                          value={profileForm.prenom}
                          onChange={e => setProfileForm({ ...profileForm, prenom: e.target.value })}
                          placeholder="Ex: Paul"
                        />
                      </div>
                      <div className="form-field">
                        <label>{t("Nom de famille")}<span className="req-star">*</span></label>
                        <input
                          type="text"
                          required
                          value={profileForm.nom}
                          onChange={e => setProfileForm({ ...profileForm, nom: e.target.value })}
                          placeholder="Ex: ETO'O"
                        />
                      </div>
                    </div>

                    <div className="form-field" style={{ marginTop: '16px' }}>
                      <label>
                        Domaine d'Activité / Titre en Highlight <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.title}
                        onChange={e => setProfileForm({ ...profileForm, title: e.target.value })}
                        placeholder="Ex: Développeur Web Fullstack, Élève Ingénieur, Gestionnaire RH..."
                      />
                      <div className="title-suggestions">
                        <span className="sugg-label">{t("Suggestions rapides :")}</span>
                        {[
                          'Développeur Web & Mobile',
                          'Élève Ingénieur Génie Logiciel',
                          'Gestionnaire RH en Formation',
                          'Technicien Systèmes & Réseaux',
                          'Chargé de Communication Municipale',
                          'Technicien Travaux Publics / Urbanisme',
                          'Comptable & Gestionnaire Financier'
                        ].map((sugg, i) => (
                          <button
                            key={i}
                            type="button"
                            className="sugg-chip"
                            onClick={() => setProfileForm({ ...profileForm, title: sugg })}
                          >
                            + {sugg}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. DESCRIPTION & PITCH DE PRÉSENTATION */}
                  <div className="edit-form-card">
                    <div className="form-card-header">
                      <div className="header-icon-box blue">
                        <i className="fa-solid fa-pen-nib" />
                      </div>
                      <div>
                        <h3>Description / Pitch Professionnel</h3>
                        <p>Présentez vos motivations, votre parcours et ce qui vous distingue auprès de la Mairie de Soa.</p>
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Bio & Synthèse de votre profil <span className="req-star">*</span></label>
                      <textarea
                        rows={4}
                        required
                        value={profileForm.bio}
                        onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Ex: Titulaire d'une Licence en Informatique, je possède une expérience de 2 ans dans la conception de solutions web. Rigoureux et motivé, je souhaite mettre mes compétences au service de la Mairie de Soa..."
                      />
                    </div>
                  </div>

                  {/* 3. COORDONNÉES OBLIGATOIRES */}
                  <div className="edit-form-card">
                    <div className="form-card-header">
                      <div className="header-icon-box purple">
                        <i className="fa-solid fa-address-book" />
                      </div>
                      <div>
                        <h3>Coordonnées de Contact <span className="badge-required">{t("Requis pour être contacté")}</span></h3>
                        <p>Ces coordonnées sont indispensables pour que les RH puissent vous joindre rapidement.</p>
                      </div>
                    </div>

                    <div className="form-grid-two">
                      <div className="form-field">
                        <label>Numéro de Téléphone <span className="req-star">*</span></label>
                        <input
                          type="tel"
                          required
                          value={profileForm.phone}
                          onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="Ex: +237 690 00 00 00"
                        />
                      </div>
                      <div className="form-field">
                        <label>Ville de Résidence <span className="req-star">*</span></label>
                        <input
                          type="text"
                          required
                          value={profileForm.ville}
                          onChange={e => setProfileForm({ ...profileForm, ville: e.target.value })}
                          placeholder="Ex: Soa, Yaoundé..."
                        />
                      </div>
                    </div>

                    <div className="form-grid-two" style={{ marginTop: '16px' }}>
                      <div className="form-field">
                        <label>{t("Région administrative")}<span className="req-star">*</span></label>
                        <select
                          value={profileForm.region}
                          onChange={e => setProfileForm({ ...profileForm, region: e.target.value })}
                        >
                          <option value="Centre (Soa / Yaoundé)">Centre (Soa / Yaoundé)</option>
                          <option value="Littoral (Douala)">Littoral (Douala)</option>
                          <option value="Ouest (Bafoussam)">Ouest (Bafoussam)</option>
                          <option value="Nord-Ouest (Bamenda)">Nord-Ouest (Bamenda)</option>
                          <option value="Sud-Ouest (Buea)">Sud-Ouest (Buea)</option>
                          <option value="Adamaoua (Ngaoundéré)">Adamaoua (Ngaoundéré)</option>
                          <option value="Nord (Garoua)">Nord (Garoua)</option>
                          <option value="Extrême-Nord (Maroua)">Extrême-Nord (Maroua)</option>
                          <option value="Sud (Ebolowa)">Sud (Ebolowa)</option>
                          <option value="Est (Bertoua)">Est (Bertoua)</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Adresse exacte / Quartier <span className="req-star">*</span></label>
                        <input
                          type="text"
                          required
                          value={profileForm.address}
                          onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                          placeholder="Ex: Quartier Universitaire, Rue Principale..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. LIENS & PORTFOLIO (OPTIONNELS) */}
                  <div className="edit-form-card">
                    <div className="form-card-header">
                      <div className="header-icon-box amber">
                        <i className="fa-solid fa-link" />
                      </div>
                      <div>
                        <h3>Portfolio & Présence en Ligne <span className="badge-optional">{t("Optionnel")}</span></h3>
                        <p>{t("Partagez vos réalisations, projets ou profils professionnels pour enrichir votre dossier.")}</p>
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Lien du Portfolio ou Site Personnel</label>
                      <input
                        type="url"
                        value={profileForm.portfolio_url}
                        onChange={e => setProfileForm({ ...profileForm, portfolio_url: e.target.value })}
                        placeholder="Ex: https://mon-portfolio.dev ou https://mon-site.cm"
                      />
                    </div>

                    <div className="form-grid-two" style={{ marginTop: '16px' }}>
                      <div className="form-field">
                        <label>Profil LinkedIn</label>
                        <input
                          type="text"
                          value={profileForm.linkedin_url}
                          onChange={e => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                          placeholder="Ex: https://linkedin.com/in/mon-profil"
                        />
                      </div>
                      <div className="form-field">
                        <label>Profil GitHub / GitLab</label>
                        <input
                          type="text"
                          value={profileForm.github_url}
                          onChange={e => setProfileForm({ ...profileForm, github_url: e.target.value })}
                          placeholder="Ex: https://github.com/mon-pseudo"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. FORMATION, EXPÉRIENCE & COMPÉTENCES */}
                  <div className="edit-form-card">
                    <div className="form-card-header">
                      <div className="header-icon-box green">
                        <i className="fa-solid fa-graduation-cap" />
                      </div>
                      <div>
                        <h3>Formation, Expérience & Compétences</h3>
                        <p>Ces données alimentent l'algorithme de compatibilité IA avec les offres de la Mairie.</p>
                      </div>
                    </div>

                    <div className="form-grid-two">
                      <div className="form-field">
                        <label>{t("Niveau d'études le plus élevé")}<span className="req-star">*</span></label>
                        <select
                          value={profileForm.education_level}
                          onChange={e => setProfileForm({ ...profileForm, education_level: e.target.value })}
                        >
                          <option value="Baccalauréat / GCE A-Level">Baccalauréat / GCE A-Level</option>
                          <option value="BTS / DUT / DEUG (Bac+2)">BTS / DUT / DEUG (Bac+2)</option>
                          <option value="Licence / Bachelor (Bac+3)">Licence / Bachelor (Bac+3)</option>
                          <option value="Master (Bac+5)">Master (Bac+5)</option>
                          <option value="Diplôme d'Ingénieur (Bac+5)">Diplôme d'Ingénieur (Bac+5)</option>
                          <option value="Doctorat / PhD (Bac+8)">Doctorat / PhD (Bac+8)</option>
                          <option value="Autre formation certifiante">{t("Autre formation certifiante")}</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>{t("Années d'expérience professionnelle")}<span className="req-star">*</span></label>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          required
                          value={profileForm.experience_years}
                          onChange={e => setProfileForm({ ...profileForm, experience_years: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-field" style={{ marginTop: '16px' }}>
                      <label>{t("Compétences clés (séparées par des virgules)")}<span className="req-star">*</span></label>
                      <input
                        type="text"
                        required
                        value={profileForm.skills}
                        onChange={e => setProfileForm({ ...profileForm, skills: e.target.value })}
                        placeholder="Ex: JavaScript, React, Node.js, SQL, Gestion RH, Communication..."
                      />
                      <div className="title-suggestions">
                        <span className="sugg-label">{t("Compétences populaires :")}</span>
                        {[
                          'JavaScript', 'React', 'Node.js', 'SQL',
                          'Gestion RH', 'Communication', 'Bureautique (Word/Excel)',
                          'Gestion de Projet', 'Comptabilité Publique', 'Réseaux & Sécurité'
                        ].map((skill, i) => (
                          <button
                            key={i}
                            type="button"
                            className="sugg-chip"
                            onClick={() => {
                              const current = profileForm.skills ? profileForm.skills.split(',').map(s => s.trim()) : [];
                              if (!current.includes(skill)) {
                                setProfileForm({ ...profileForm, skills: [...current, skill].filter(Boolean).join(', ') });
                              }
                            }}
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* BOUTONS D'ACTION SOUMISSION */}
                  <div className="form-submit-actions">
                    <button
                      type="button"
                      className="cancel-edit-btn"
                      onClick={() => setProfileViewMode('preview')}
                      disabled={savingProfile}
                    >
                      Annuler & Revenir à l'aperçu
                    </button>
                    <button type="submit" className="save-all-btn" disabled={savingProfile}>
                      {savingProfile ? (
                        <><i className="fa-solid fa-circle-notch fa-spin" />{t("Enregistrement en cours...")}</>
                      ) : (
                        <><i className="fa-solid fa-floppy-disk" /> Enregistrer & Mettre à jour mon profil</>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL DE CONSULTATION DÉTAILLÉE D'UNE OFFRE & SOUMISSION DE CANDIDATURE */}
      {selectedJobToApply && (
        <div className="modal-overlay" onClick={() => setSelectedJobToApply(null)}>
          <div className="modal-content modal-job-apply" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            
            {/* EN-TÊTE PRINCIPAL DE L'OFFRE */}
            <div className="modal-apply-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="apply-icon-box" style={{ background: '#eff6ff', color: '#0284c7', borderColor: '#bae6fd' }}>
                <i className="fa-solid fa-briefcase" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span className="badge-contract-type" style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '0.72rem', padding: '2px 10px', borderRadius: '10px', textTransform: 'uppercase' }}>
                    {selectedJobToApply.type || 'Offre d\'emploi (CDI / CDD)'}
                  </span>
                  <span className="match-score-pill">
                    <i className="fa-solid fa-chart-line" /> {selectedJobToApply.matchPercentage || 85}% d'Adéquation IA
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{selectedJobToApply.title}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <span><i className="fa-solid fa-building-columns" style={{ color: '#00a859', marginRight: '5px' }} /> {selectedJobToApply.department || 'Direction RH — Mairie de Soa'}</span>
                  <span><i className="fa-solid fa-location-dot" style={{ color: '#ea580c', marginRight: '5px' }} /> {selectedJobToApply.location || 'Hôtel de Ville de Soa'}</span>
                </p>
              </div>
              <button
                type="button"
                className="apply-modal-close"
                onClick={() => setSelectedJobToApply(null)}
              >
                &times;
              </button>
            </div>

            {/* BARRE DE NAVIGATION MODALE : DÉTAILS DU POSTE VS CANDIDATER */}
            <div className="modal-tab-nav" style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setJobModalTab('details')}
                style={{
                  background: jobModalTab === 'details' ? '#0f172a' : '#f8fafc',
                  color: jobModalTab === 'details' ? '#ffffff' : '#64748b',
                  border: '1px solid',
                  borderColor: jobModalTab === 'details' ? '#0f172a' : '#e2e8f0',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fa-solid fa-file-lines" /> Fiche Détaillée du Poste
              </button>
              <button
                type="button"
                onClick={() => setJobModalTab('apply')}
                style={{
                  background: jobModalTab === 'apply' ? '#00a859' : '#ecfdf5',
                  color: jobModalTab === 'apply' ? '#ffffff' : '#047857',
                  border: '1px solid',
                  borderColor: jobModalTab === 'apply' ? '#00a859' : '#a7f3d0',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fa-solid fa-paper-plane" /> Postuler à ce Poste
              </button>
            </div>

            {/* VUE 1 : DÉTAILS DE L'OFFRE */}
            {jobModalTab === 'details' ? (
              <div className="job-details-view-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* BLOC INFOS CLÉS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>{t("Rémunération :")}</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedJobToApply.salary_range || selectedJobToApply.salary || 'Grille Salariale Communale'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Région Administrative :</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Centre (Soa / Yaoundé)</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>{t("Statut de l'offre :")}</span>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', display: 'inline-block' }}>Recrutement Ouvert</span>
                  </div>
                </div>

                {/* DESCRIPTION & CONTEXTE */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-align-left" style={{ color: '#00a859' }} /> Description &amp; Contexte du Poste
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                    {selectedJobToApply.description || 'Sous la responsabilité directe du Chef de Service RH de la Mairie de Soa, le titulaire du poste participe activement aux missions d\'administration générale, de gestion prévisionnelle des effectifs et d\'accueil des usagers.'}
                  </p>
                </div>

                {/* MISSIONS ET RESPONSABILITÉS */}
                {selectedJobToApply.missions && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-list-check" style={{ color: '#0284c7' }} /> Missions Principales &amp; Attributions
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                      {selectedJobToApply.missions}
                    </p>
                  </div>
                )}

                {/* PROFIL RECHERCHÉ ET PRÉREQUIS */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-user-graduate" style={{ color: '#7c3aed' }} /> Profil Recherché &amp; Diplômes Requis
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                    {selectedJobToApply.requirements || 'Titulaire d\'un diplôme universitaire (BTS, Licence ou Master) en Gestion des Ressources Humaines, Droit, Informatique ou Administration Publique. Rigoureux, ponctuel et apte au travail en équipe municipale.'}
                  </p>
                </div>

                {/* COMPÉTENCES CLÉS */}
                {selectedJobToApply.skills_required && (
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-tags" style={{ color: '#ea580c' }} /> Compétences Clés Clôturées
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(Array.isArray(selectedJobToApply.skills_required)
                        ? selectedJobToApply.skills_required
                        : String(selectedJobToApply.skills_required).split(',')
                      ).map((skill, idx) => (
                        <span key={idx} style={{ background: '#f1f5f9', color: '#047857', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 700 }}>
                          <i className="fa-solid fa-check" style={{ color: '#16a34a', marginRight: '6px' }} />{String(skill).trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PIED DE MODALE DETAILS : BOUTON PASSER A L'ACTION */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="cancel-edit-btn"
                    onClick={() => setSelectedJobToApply(null)}
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    className="save-all-btn"
                    onClick={() => setJobModalTab('apply')}
                  >
                    <i className="fa-solid fa-paper-plane" />{t("Postuler à cette offre")}<i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }} />
                  </button>
                </div>

              </div>
            ) : (
              /* VUE 2 : FORMULAIRE DE SOUMISSION DE CANDIDATURE */
              <form onSubmit={handleApplySubmit} className="apply-modal-form">
                
                {/* RAPPEL DES PIÈCES TRANSMISES AUTOMATIQUEMENT */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-folder-check" style={{ color: '#00a859' }} /> Pièces transmises depuis votre profil citoyen :
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-check" style={{ color: '#16a34a' }} />
                      <span>CV &amp; Parcours Profil</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-check" style={{ color: '#16a34a' }} />
                      <span>Diplômes &amp; Certifications</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-check" style={{ color: '#16a34a' }} />
                      <span>Coordonnées &amp; Téléphone</span>
                    </div>
                  </div>
                </div>

                {/* TÉLÉVERSEMENT DE PIÈCES SPÉCIFIQUES À CETTE OFFRE */}
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0b192c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-file-pdf" style={{ color: '#dc2626' }} /> Pièces Spécifiques pour ce Poste (Fichiers PDF)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                      Les CV et lettres de motivation varient selon les offres. Téléversez ici des documents PDF sur-mesure pour ce poste (ils seront examinés en priorité par l'administration RH) :
                    </p>
                  </div>

                  <div className="required-uploads-grid">
                    {/* 1. CV ADAPTÉ */}
                    <div className={`doc-upload-box ${applyCvFile ? 'has-file' : ''}`}>
                      <div className="doc-box-header">
                        <i className="fa-solid fa-file-lines" />
                        <div style={{ flex: 1 }}>
                          <strong>1. CV Spécifique / Adapté à l'Offre (PDF)</strong>
                          <small>Format PDF uniquement (max 10 Mo) — Recommandé</small>
                        </div>
                        {applyCvFile && (
                          <button
                            type="button"
                            onClick={() => setApplyCvFile(null)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Retirer ce fichier"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        )}
                      </div>
                      <label className="upload-drop-zone">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => setApplyCvFile(e.target.files[0] || null)}
                        />
                        {applyCvFile ? (
                          <span className="file-picked-name" style={{ color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-circle-check" /> {applyCvFile.name} ({Math.round(applyCvFile.size / 1024)} KB)
                          </span>
                        ) : (
                          <span className="file-placeholder">
                            <i className="fa-solid fa-arrow-up-from-bracket" /> Cliquer pour choisir un CV PDF spécifique
                          </span>
                        )}
                      </label>
                    </div>

                    {/* 2. LETTRE DE MOTIVATION PDF */}
                    <div className={`doc-upload-box ${applyCoverLetterFile ? 'has-file' : ''}`}>
                      <div className="doc-box-header">
                        <i className="fa-solid fa-envelope-open-text" />
                        <div style={{ flex: 1 }}>
                          <strong>2. Lettre de Motivation Officielle (PDF)</strong>
                          <small>Format PDF uniquement (max 10 Mo) — Optionnel</small>
                        </div>
                        {applyCoverLetterFile && (
                          <button
                            type="button"
                            onClick={() => setApplyCoverLetterFile(null)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Retirer ce fichier"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        )}
                      </div>
                      <label className="upload-drop-zone">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => setApplyCoverLetterFile(e.target.files[0] || null)}
                        />
                        {applyCoverLetterFile ? (
                          <span className="file-picked-name" style={{ color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-circle-check" /> {applyCoverLetterFile.name} ({Math.round(applyCoverLetterFile.size / 1024)} KB)
                          </span>
                        ) : (
                          <span className="file-placeholder">
                            <i className="fa-solid fa-arrow-up-from-bracket" /> Cliquer pour joindre une lettre de motivation PDF
                          </span>
                        )}
                      </label>
                    </div>

                    {/* 3. DIPLÔME / CERTIFICAT SPÉCIFIQUE */}
                    <div className={`doc-upload-box ${applyDiplomaFile ? 'has-file' : ''}`}>
                      <div className="doc-box-header">
                        <i className="fa-solid fa-graduation-cap" />
                        <div style={{ flex: 1 }}>
                          <strong>3. Diplôme ou Justificatif Spécifique (PDF)</strong>
                          <small>Format PDF uniquement (max 10 Mo) — Optionnel</small>
                        </div>
                        {applyDiplomaFile && (
                          <button
                            type="button"
                            onClick={() => setApplyDiplomaFile(null)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Retirer ce fichier"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        )}
                      </div>
                      <label className="upload-drop-zone">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => setApplyDiplomaFile(e.target.files[0] || null)}
                        />
                        {applyDiplomaFile ? (
                          <span className="file-picked-name" style={{ color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-circle-check" /> {applyDiplomaFile.name} ({Math.round(applyDiplomaFile.size / 1024)} KB)
                          </span>
                        ) : (
                          <span className="file-placeholder">
                            <i className="fa-solid fa-arrow-up-from-bracket" /> Cliquer pour joindre un diplôme / attestation PDF
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* CHAMP D'EXPRESSION ET MOTIVATIONS */}
                <div className="form-field">
                  <label>
                    Message d'Accompagnement à la Direction RH <span className="req-star">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Présentez brièvement vos compétences, vos acquis et ce qui motive votre candidature pour la Mairie de Soa..."
                  />
                </div>

                <div className="apply-notice-box">
                  <i className="fa-solid fa-shield-halved" />
                  <span>
                    Votre dossier sera directement transmis au Service des Ressources Humaines de Soa pour examen. Un accusé de réception officiel sera généré.
                  </span>
                </div>

                <div className="form-submit-actions">
                  <button
                    type="button"
                    className="cancel-edit-btn"
                    onClick={() => setJobModalTab('details')}
                    disabled={submittingApply}
                  >
                    ← Revenir aux détails
                  </button>
                  <button type="submit" className="save-all-btn" disabled={submittingApply}>
                    {submittingApply ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" /> Transmission du dossier...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane" /> Soumettre ma Candidature Officielle
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL DE DÉCHARGE OFFICIELLE */}
      {selectedDischarge && (
        <div className="modal-overlay" onClick={() => setSelectedDischarge(null)}>
          <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>
                <i className="fa-solid fa-stamp" style={{ color: '#22c55e', marginRight: '8px' }} />
                Accusé de Réception Officiel (Décharge)
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => window.print()}
                >
                  <i className="fa-solid fa-print" /> Imprimer / PDF
                </button>
                <button
                  type="button"
                  style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setSelectedDischarge(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
            <div
              className="discharge-preview"
              dangerouslySetInnerHTML={{ __html: selectedDischarge }}
            />
          </div>
        </div>
      )}

      {/* MODAL D'AJOUT DE DIPLÔME / CERTIFICATION */}
      {showAddDiplomaModal && (
        <div className="modal-overlay" onClick={() => setShowAddDiplomaModal(false)}>
          <div className="modal-content modal-diploma" onClick={e => e.stopPropagation()}>
            <div className="modal-header-styled">
              <div className="header-icon-box purple">
                <i className="fa-solid fa-graduation-cap" />
              </div>
              <div>
                <h3>Ajouter un Diplôme ou une Certification</h3>
                <p>Renseignez les détails de votre diplôme et joignez le justificatif au format PDF.</p>
              </div>
            </div>

            <form onSubmit={handleSingleDiplomaSubmit} className="diploma-modal-form">
              <div className="form-field">
                <label>Intitulé Officiel du Diplôme / Certification <span className="req-star">*</span></label>
                <input
                  type="text"
                  required
                  value={newDiploma.title}
                  onChange={e => setNewDiploma({ ...newDiploma, title: e.target.value })}
                  placeholder="Ex : Licence en Informatique / Génie Logiciel, Master en RH, BTS..."
                />
              </div>

              <div className="form-grid-two">
                <div className="form-field">
                  <label>Établissement / Université <span className="req-star">*</span></label>
                  <input
                    type="text"
                    required
                    value={newDiploma.institution}
                    onChange={e => setNewDiploma({ ...newDiploma, institution: e.target.value })}
                    placeholder="Ex : Université de Yaoundé II - Soa, ENSPY..."
                  />
                </div>

                <div className="form-field">
                  <label>{t("Année d'obtention")}<span className="req-star">*</span></label>
                  <input
                    type="number"
                    min="1980"
                    max={new Date().getFullYear()}
                    required
                    value={newDiploma.year}
                    onChange={e => setNewDiploma({ ...newDiploma, year: parseInt(e.target.value, 10) || 2024 })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Niveau Académique / Catégorie <span className="req-star">*</span></label>
                <select
                  value={newDiploma.level}
                  onChange={e => setNewDiploma({ ...newDiploma, level: e.target.value })}
                >
                  <option value="Baccalauréat / GCE A-Level">Baccalauréat / GCE A-Level</option>
                  <option value="BTS / DUT / DEUG (Bac+2)">BTS / DUT / DEUG (Bac+2)</option>
                  <option value="Licence / Bachelor (Bac+3)">Licence / Bachelor (Bac+3)</option>
                  <option value="Master (Bac+5)">Master (Bac+5)</option>
                  <option value="Diplôme d'Ingénieur (Bac+5)">Diplôme d'Ingénieur (Bac+5)</option>
                  <option value="Doctorat / PhD (Bac+8)">Doctorat / PhD (Bac+8)</option>
                  <option value="Certification Professionnelle">Certification Professionnelle</option>
                </select>
              </div>

              <div className="form-field">
                <label>Fichier Justificatif (PDF ou Image lisible) <span className="req-star">*</span></label>
                <input
                  type="file"
                  ref={diplomaFileInputRef}
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="file-picker-input"
                />
              </div>

              <div className="modal-actions-styled">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddDiplomaModal(false)}
                  disabled={uploadingDiploma}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={uploadingDiploma}
                >
                  {uploadingDiploma ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" />{t("Téléversement en cours...")}</>
                  ) : (
                    <><i className="fa-solid fa-check" />{t("Enregistrer ce diplôme")}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL DE PRÉVISUALISATION DU CV OFFICIEL AVANT IMPRESSION     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showPrintPreviewModal && (
        <div className="modal-overlay" onClick={() => setShowPrintPreviewModal(false)}>
          <div className="modal-content modal-print-preview" onClick={e => e.stopPropagation()}>
            <div className="print-preview-topbar">
              <div className="print-preview-title">
                <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.4rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 900 }}>
                    Aperçu de la Fiche Officielle du Candidat — Mairie de Soa
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Document normé au format A4 avec en-tête républicain et validation municipale
                  </span>
                </div>
              </div>

              <div className="print-preview-actions">
                <button
                  type="button"
                  className="print-launch-btn"
                  onClick={() => window.print()}
                >
                  <i className="fa-solid fa-print" /> Imprimer / Exporter en PDF
                </button>
                <button
                  type="button"
                  className="print-close-btn"
                  onClick={() => setShowPrintPreviewModal(false)}
                >
                  <i className="fa-solid fa-xmark" /> Fermer
                </button>
              </div>
            </div>

            {/* CONTENEUR VISUEL DE LA FEUILLE A4 DANS LA MODALE */}
            <div className="print-sheet-wrapper">
              <div className="official-cv-document-sheet">

                {/* 1. EN-TÊTE RÉPUBLICAIN & MUNICIPAL BILINGUE */}
                <header className="print-official-header">
                  <div className="print-header-col left">
                    <p className="bold-country">RÉPUBLIQUE DU CAMEROUN</p>
                    <p className="motto">Paix – Travail – Patrie</p>
                    <div className="header-divider-mini"></div>
                    <p>RÉGION DU CENTRE</p>
                    <p>DÉPARTEMENT DE LA MÉFOU-ET-AFAMBA</p>
                    <p className="bold-council">COMMUNE DE SOA</p>
                    <p className="service-name">Service des Ressources Humaines</p>
                  </div>

                  <div className="print-header-col center">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
                      alt="Armoiries du Cameroun"
                      className="print-national-emblem"
                    />
                    <div className="print-portal-badge">
                      <span>HIREBRIDGE SOA</span>
                      <small>Portail Numérique Municipal</small>
                    </div>
                  </div>

                  <div className="print-header-col right">
                    <p className="bold-country">REPUBLIC OF CAMEROON</p>
                    <p className="motto">Peace – Work – Fatherland</p>
                    <div className="header-divider-mini"></div>
                    <p>CENTRE REGION</p>
                    <p>MEFOU & AFAMBA DIVISION</p>
                    <p className="bold-council">SOA COUNCIL</p>
                    <p className="service-name">Human Resources Department</p>
                  </div>
                </header>

                {/* 2. TITRE OFFICIEL ET RÉFÉRENCES */}
                <div className="print-document-title-box">
                  <h2>FICHE OFFICIELLE DU CANDIDAT</h2>
                  <div className="print-ref-bar">
                    <span><strong>DOSSIER N° :</strong> SOA-CAND-{user.id ? String(user.id).padStart(5, '0') : '00001'}-{new Date().getFullYear()}</span>
                    <span><strong>ÉMIS LE :</strong> {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* 3. IDENTITÉ & COORDONNÉES */}
                <section className="print-identity-section">
                  <div className="print-avatar-col">
                    <img
                      src={currentAvatar}
                      alt="Avatar"
                      className="print-avatar-photo"
                    />
                    <div className="print-stamp-valid">
                      <i className="fa-solid fa-circle-check" /> PROFIL ENREGISTRÉ
                    </div>
                  </div>

                  <div className="print-identity-details">
                    <h1 className="print-candidate-name">{user.prenom} {user.nom}</h1>
                    <div className="print-domain-badge">
                      <i className="fa-solid fa-briefcase" /> {profileForm.title || 'Candidat Polyvalent'}
                    </div>

                    <div className="print-contact-grid">
                      <div className="print-contact-item">
                        <i className="fa-solid fa-envelope" /> <strong>{t("Email :")}</strong> {user.email}
                      </div>
                      <div className="print-contact-item">
                        <i className="fa-solid fa-phone" /> <strong>{t("Téléphone :")}</strong> {profileForm.phone || user.phone || 'Non renseigné'}
                      </div>
                      <div className="print-contact-item">
                        <i className="fa-solid fa-location-dot" /> <strong>{t("Résidence :")}</strong> {profileForm.ville || user.ville || 'Soa'} ({profileForm.region || user.region || 'Centre'})
                      </div>
                      <div className="print-contact-item">
                        <i className="fa-solid fa-map-pin" /> <strong>{t("Adresse :")}</strong> {profileForm.address || 'Soa Centre'}
                      </div>
                      {profileForm.portfolio_url && (
                        <div className="print-contact-item">
                          <i className="fa-solid fa-globe" /> <strong>{t("Portfolio :")}</strong> {profileForm.portfolio_url}
                        </div>
                      )}
                      {profileForm.linkedin_url && (
                        <div className="print-contact-item">
                          <i className="fa-brands fa-linkedin" /> <strong>LinkedIn :</strong> {profileForm.linkedin_url}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* 4. SYNTHÈSE PROFESSIONNELLE / PROFIL */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-user-tie" /> 1. PROFIL & SYNTHÈSE PROFESSIONNELLE
                  </div>
                  <div className="print-section-body">
                    <p className="print-bio-text">
                      {profileForm.bio || 'Candidat qualifié enregistré sur le portail municipal HireBridge de la Commune de Soa, disponible pour contribuer aux missions administratives et techniques de la collectivité.'}
                    </p>
                  </div>
                </section>

                {/* 5. DIPLÔMES & CERTIFICATIONS AUTHENTIFIÉS */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-graduation-cap" /> 2. DIPLÔMES & CERTIFICATIONS AUTHENTIFIÉS ({myDiplomas.length})
                  </div>
                  <div className="print-section-body">
                    {myDiplomas.length === 0 ? (
                      <p className="print-empty-note">
                        Niveau académique déclaré : <strong>{profileForm.education_level || 'Licence / Master'}</strong>. (Aucun diplôme PDF joint à ce jour).
                      </p>
                    ) : (
                      <table className="print-diplomas-table">
                        <thead>
                          <tr>
                            <th>Intitulé du Diplôme / Certification</th>
                            <th>Niveau Académique</th>
                            <th>Établissement / Université</th>
                            <th>{t("Année")}</th>
                            <th>{t("Authentification")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myDiplomas.map((dip, idx) => (
                            <tr key={idx}>
                              <td><strong>{dip.title}</strong></td>
                              <td>{dip.level || 'Diplôme d\'État'}</td>
                              <td>{dip.institution || 'Établissement académique'}</td>
                              <td>{dip.year || 'Récent'}</td>
                              <td className="print-status-verified"><i className="fa-solid fa-circle-check" />{t("Conforme")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>

                {/* 6. COMPÉTENCES TECHNIQUES & TRANSVERSALES */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-layer-group" /> 3. COMPÉTENCES & DOMAINES D'EXPERTISE
                  </div>
                  <div className="print-section-body">
                    <div className="print-skills-wrap">
                      {profileForm.skills ? (
                        profileForm.skills.split(',').map((skill, idx) => {
                          const s = skill.trim();
                          if (!s) return null;
                          return (
                            <span key={idx} className="print-skill-badge">
                              • {s}
                            </span>
                          );
                        })
                      ) : (
                        <span>Communication, Organisation, Gestion</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* 7. INFORMATIONS CLÉS & PARCOURS */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-clipboard-check" /> 4. SYNTHÈSE MUNICIPALE & ÉVALUATION
                  </div>
                  <div className="print-summary-grid">
                    <div className="print-summary-box">
                      <span className="summary-label">{t("Niveau d'études :")}</span>
                      <strong className="summary-val">{profileForm.education_level || 'Licence / Master'}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">{t("Expérience :")}</span>
                      <strong className="summary-val">{profileForm.experience_years} an(s)</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">Score d'Adéquation IA :</span>
                      <strong className="summary-val green">{dashboardData.compatibilityScore || 82}%</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">{t("Commune d'attache :")}</span>
                      <strong className="summary-val blue">{profileForm.ville || 'Soa'} (Yaoundé)</strong>
                    </div>
                  </div>
                </section>

                {/* 8. SIGNATURES & VALIDATION */}
                <footer className="print-official-footer">
                  <div className="print-signature-box">
                    <p className="sig-city">Fait à Soa, le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="sig-role">Le Candidat (Signature)</p>
                    <div className="sig-space"></div>
                    <p className="sig-name">{user.prenom} {user.nom}</p>
                  </div>

                  <div className="print-signature-box right">
                    <p className="sig-city">Pour la Mairie de Soa</p>
                    <p className="sig-role">Le Service des Ressources Humaines</p>
                    <div className="sig-space"></div>
                    <p className="sig-name">Enregistrement & Visa RH</p>
                  </div>
                </footer>

                <div className="print-bottom-watermark">
                  Document officiel généré par le portail municipal HireBridge — Commune de Soa • Page 1/1
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STRUCTURE EXCLUSIVE DÉDIÉE À L'IMPRESSION PHYSIQUE / PDF       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="official-print-cv">
        {/* EN-TÊTE RÉPUBLICAIN & MUNICIPAL BILINGUE */}
        <header className="print-official-header">
          <div className="print-header-col left">
            <p className="bold-country">RÉPUBLIQUE DU CAMEROUN</p>
            <p className="motto">Paix – Travail – Patrie</p>
            <div className="header-divider-mini"></div>
            <p>RÉGION DU CENTRE</p>
            <p>DÉPARTEMENT DE LA MÉFOU-ET-AFAMBA</p>
            <p className="bold-council">COMMUNE DE SOA</p>
            <p className="service-name">Service des Ressources Humaines</p>
          </div>

          <div className="print-header-col center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
              alt="Armoiries du Cameroun"
              className="print-national-emblem"
            />
            <div className="print-portal-badge">
              <span>HIREBRIDGE SOA</span>
              <small>Portail Numérique Municipal</small>
            </div>
          </div>

          <div className="print-header-col right">
            <p className="bold-country">REPUBLIC OF CAMEROON</p>
            <p className="motto">Peace – Work – Fatherland</p>
            <div className="header-divider-mini"></div>
            <p>CENTRE REGION</p>
            <p>MEFOU & AFAMBA DIVISION</p>
            <p className="bold-council">SOA COUNCIL</p>
            <p className="service-name">Human Resources Department</p>
          </div>
        </header>

        {/* TITRE OFFICIEL ET RÉFÉRENCES */}
        <div className="print-document-title-box">
          <h2>FICHE OFFICIELLE DU CANDIDAT</h2>
          <div className="print-ref-bar">
            <span><strong>DOSSIER N° :</strong> SOA-CAND-{user.id ? String(user.id).padStart(5, '0') : '00001'}-{new Date().getFullYear()}</span>
            <span><strong>ÉMIS LE :</strong> {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* IDENTITÉ & COORDONNÉES */}
        <section className="print-identity-section">
          <div className="print-avatar-col">
            <img
              src={currentAvatar}
              alt="Avatar"
              className="print-avatar-photo"
            />
            <div className="print-stamp-valid">
              <i className="fa-solid fa-circle-check" /> PROFIL ENREGISTRÉ
            </div>
          </div>

          <div className="print-identity-details">
            <h1 className="print-candidate-name">{user.prenom} {user.nom}</h1>
            <div className="print-domain-badge">
              <i className="fa-solid fa-briefcase" /> {profileForm.title || 'Candidat Polyvalent'}
            </div>

            <div className="print-contact-grid">
              <div className="print-contact-item">
                <i className="fa-solid fa-envelope" /> <strong>{t("Email :")}</strong> {user.email}
              </div>
              <div className="print-contact-item">
                <i className="fa-solid fa-phone" /> <strong>{t("Téléphone :")}</strong> {profileForm.phone || user.phone || 'Non renseigné'}
              </div>
              <div className="print-contact-item">
                <i className="fa-solid fa-location-dot" /> <strong>{t("Résidence :")}</strong> {profileForm.ville || user.ville || 'Soa'} ({profileForm.region || user.region || 'Centre'})
              </div>
              <div className="print-contact-item">
                <i className="fa-solid fa-map-pin" /> <strong>{t("Adresse :")}</strong> {profileForm.address || 'Soa Centre'}
              </div>
              {profileForm.portfolio_url && (
                <div className="print-contact-item">
                  <i className="fa-solid fa-globe" /> <strong>{t("Portfolio :")}</strong> {profileForm.portfolio_url}
                </div>
              )}
              {profileForm.linkedin_url && (
                <div className="print-contact-item">
                  <i className="fa-brands fa-linkedin" /> <strong>LinkedIn :</strong> {profileForm.linkedin_url}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SYNTHÈSE PROFESSIONNELLE / PROFIL */}
        <section className="print-section-block">
          <div className="print-section-title">
            <i className="fa-solid fa-user-tie" /> 1. PROFIL & SYNTHÈSE PROFESSIONNELLE
          </div>
          <div className="print-section-body">
            <p className="print-bio-text">
              {profileForm.bio || 'Candidat qualifié enregistré sur le portail municipal HireBridge de la Commune de Soa, disponible pour contribuer aux missions administratives et techniques de la collectivité.'}
            </p>
          </div>
        </section>

        {/* DIPLÔMES & CERTIFICATIONS AUTHENTIFIÉS */}
        <section className="print-section-block">
          <div className="print-section-title">
            <i className="fa-solid fa-graduation-cap" /> 2. DIPLÔMES & CERTIFICATIONS AUTHENTIFIÉS ({myDiplomas.length})
          </div>
          <div className="print-section-body">
            {myDiplomas.length === 0 ? (
              <p className="print-empty-note">
                Niveau académique déclaré : <strong>{profileForm.education_level || 'Licence / Master'}</strong>. (Aucun diplôme PDF joint à ce jour).
              </p>
            ) : (
              <table className="print-diplomas-table">
                <thead>
                  <tr>
                    <th>Intitulé du Diplôme / Certification</th>
                    <th>Niveau Académique</th>
                    <th>Établissement / Université</th>
                    <th>{t("Année")}</th>
                    <th>{t("Authentification")}</th>
                  </tr>
                </thead>
                <tbody>
                  {myDiplomas.map((dip, idx) => (
                    <tr key={idx}>
                      <td><strong>{dip.title}</strong></td>
                      <td>{dip.level || 'Diplôme d\'État'}</td>
                      <td>{dip.institution || 'Établissement académique'}</td>
                      <td>{dip.year || 'Récent'}</td>
                      <td className="print-status-verified"><i className="fa-solid fa-circle-check" />{t("Conforme")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* COMPÉTENCES TECHNIQUES & TRANSVERSALES */}
        <section className="print-section-block">
          <div className="print-section-title">
            <i className="fa-solid fa-layer-group" /> 3. COMPÉTENCES & DOMAINES D'EXPERTISE
          </div>
          <div className="print-section-body">
            <div className="print-skills-wrap">
              {profileForm.skills ? (
                profileForm.skills.split(',').map((skill, idx) => {
                  const s = skill.trim();
                  if (!s) return null;
                  return (
                    <span key={idx} className="print-skill-badge">
                      • {s}
                    </span>
                  );
                })
              ) : (
                <span>Communication, Organisation, Gestion</span>
              )}
            </div>
          </div>
        </section>

        {/* INFORMATIONS CLÉS & PARCOURS */}
        <section className="print-section-block">
          <div className="print-section-title">
            <i className="fa-solid fa-clipboard-check" /> 4. SYNTHÈSE MUNICIPALE & ÉVALUATION
          </div>
          <div className="print-summary-grid">
            <div className="print-summary-box">
              <span className="summary-label">{t("Niveau d'études :")}</span>
              <strong className="summary-val">{profileForm.education_level || 'Licence / Master'}</strong>
            </div>
            <div className="print-summary-box">
              <span className="summary-label">{t("Expérience :")}</span>
              <strong className="summary-val">{profileForm.experience_years} an(s)</strong>
            </div>
            <div className="print-summary-box">
              <span className="summary-label">Score d'Adéquation IA :</span>
              <strong className="summary-val green">{dashboardData.compatibilityScore || 82}%</strong>
            </div>
            <div className="print-summary-box">
              <span className="summary-label">{t("Commune d'attache :")}</span>
              <strong className="summary-val blue">{profileForm.ville || 'Soa'} (Yaoundé)</strong>
            </div>
          </div>
        </section>

        {/* SIGNATURES & VALIDATION */}
        <footer className="print-official-footer">
          <div className="print-signature-box">
            <p className="sig-city">Fait à Soa, le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="sig-role">Le Candidat (Signature)</p>
            <div className="sig-space"></div>
            <p className="sig-name">{user.prenom} {user.nom}</p>
          </div>

          <div className="print-signature-box right">
            <p className="sig-city">Pour la Mairie de Soa</p>
            <p className="sig-role">Le Service des Ressources Humaines</p>
            <div className="sig-space"></div>
            <p className="sig-name">Enregistrement & Visa RH</p>
          </div>
        </footer>

        <div className="print-bottom-watermark">
          Document officiel généré par le portail municipal HireBridge — Commune de Soa • Page 1/1
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL DE TÉLÉCHARGEMENT & IMPRESSION DE L'ORGANIGRAMME        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showOrganigrammeModal && (
        <div className="modal-overlay" onClick={() => setShowOrganigrammeModal(false)}>
          <div className="modal-content modal-print-preview" onClick={e => e.stopPropagation()}>
            <div className="print-preview-topbar">
              <div className="print-preview-title">
                <i className="fa-solid fa-sitemap" style={{ color: '#d97706', fontSize: '1.4rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 900 }}>
                    Organigramme Officiel et Intégral — Commune de Soa
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Document officiel d'organisation administrative et des régies municipales
                  </span>
                </div>
              </div>

              <div className="print-preview-actions">
                <button
                  type="button"
                  className="print-launch-btn"
                  onClick={() => window.print()}
                >
                  <i className="fa-solid fa-print" /> Imprimer / Exporter en PDF
                </button>
                <button
                  type="button"
                  className="print-close-btn"
                  onClick={() => setShowOrganigrammeModal(false)}
                >
                  <i className="fa-solid fa-xmark" /> Fermer
                </button>
              </div>
            </div>

            {/* FEUILLE D'ORGANIGRAMME FORMAT A4 IMPRIMABLE */}
            <div className="print-sheet-wrapper">
              <div className="official-cv-document-sheet">

                {/* EN-TÊTE RÉPUBLICAIN */}
                <header className="print-official-header">
                  <div className="print-header-col left">
                    <p className="bold-country">RÉPUBLIQUE DU CAMEROUN</p>
                    <p className="motto">Paix – Travail – Patrie</p>
                    <div className="header-divider-mini"></div>
                    <p>RÉGION DU CENTRE</p>
                    <p>DÉPARTEMENT DE LA MÉFOU-ET-AFAMBA</p>
                    <p className="bold-council">COMMUNE DE SOA</p>
                    <p className="service-name">Secrétariat Général &amp; DRH</p>
                  </div>

                  <div className="print-header-col center">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
                      alt="Armoiries du Cameroun"
                      className="print-national-emblem"
                    />
                    <div className="print-portal-badge">
                      <span>COMMUNE DE SOA</span>
                      <small>Organigramme Administratif</small>
                    </div>
                  </div>

                  <div className="print-header-col right">
                    <p className="bold-country">REPUBLIC OF CAMEROON</p>
                    <p className="motto">Peace – Work – Fatherland</p>
                    <div className="header-divider-mini"></div>
                    <p>CENTRE REGION</p>
                    <p>MEFOU &amp; AFAMBA DIVISION</p>
                    <p className="bold-council">SOA COUNCIL</p>
                    <p className="service-name">General Secretariat &amp; HRD</p>
                  </div>
                </header>

                <div className="print-document-title-box">
                  <h2>ORGANIGRAMME INTÉGRAL ET EXHAUSTIF DES SERVICES MUNICIPAUX</h2>
                  <div className="print-ref-bar">
                    <span><strong>CADRE LÉGAL :</strong> Décentralisation &amp; Code Général des Collectivités Territoriales</span>
                    <span><strong>ÉDITION OFFICIELLE :</strong> {new Date().getFullYear()}</span>
                  </div>
                </div>

                {/* LES 7 PÔLES MUNICIPAUX */}
                <div className="print-organigramme-grid">
                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle I : Organes de Décision et de Contrôle</strong>
                    <p>• <strong>Conseil Municipal :</strong> Organe délibérant (Vote du budget &amp; délibérations)</p>
                    <p>• <strong>Cabinet du Maire :</strong> Politique générale, protocole &amp; partenariats</p>
                    <p>• <strong>CIPM :</strong> Commission Interne de Passation des Marchés publics</p>
                  </div>

                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle II : Haute Administration Coordonnatrice</strong>
                    <p>• <strong>Secrétariat Général (SG) :</strong> Suivi des délibérations &amp; coordination administrative</p>
                    <p>• <strong>Bureau du Courrier &amp; Archives :</strong> Enregistrement &amp; traçabilité documentaire</p>
                  </div>

                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle III : Service de l'État Civil (Guichets Publics)</strong>
                    <p>• <strong>Bureau des Naissances</strong> • <strong>Bureau des Mariages</strong> • <strong>Bureau des Décès</strong></p>
                    <p>• <strong>Cellule des Certifications :</strong> Légalisations, certificats de vie, célibat &amp; résidence</p>
                  </div>

                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle IV : Pôle Économique &amp; Assiette Fiscale</strong>
                    <p>• <strong>Service de l'Assiette Fiscale :</strong> Recensement, Patentes &amp; Licences</p>
                    <p>• <strong>Service des Recettes (La Régie) :</strong> Taxes ODP &amp; tickets de marché</p>
                    <p>• <strong>Bureau des Droits de Place :</strong> Commerces &amp; Transports (Motos-taxis, minibus)</p>
                    <p>• <strong>Service Comptable &amp; Budget :</strong> Exécution budgétaire &amp; trésorerie</p>
                  </div>

                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle V : Pôle Social, Genre &amp; Éducation</strong>
                    <p>• <strong>Promotion de la Femme &amp; Famille :</strong> Insertion économique &amp; artisanat</p>
                    <p>• <strong>Affaires Sociales &amp; Jeunesse :</strong> Aides indigents &amp; appui aux étudiants UY II</p>
                    <p>• <strong>Éducation &amp; Culture :</strong> Écoles primaires &amp; patrimoine Béti</p>
                  </div>

                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle VI : Pôle Technique &amp; Urbanisme</strong>
                    <p>• <strong>Développement Urbain :</strong> Permis de bâtir &amp; conformité architecturale</p>
                    <p>• <strong>Voirie &amp; Réseaux :</strong> Pistes agricoles &amp; axes routiers communaux</p>
                    <p>• <strong>Éclairage Public &amp; Eau :</strong> Réseau électrique &amp; forages communautaires</p>
                  </div>

                  <div className="print-pole-box">
                    <strong className="pole-tag">Pôle VII : Hygiène, Salubrité &amp; Environnement</strong>
                    <p>• <strong>Hygiène Publique :</strong> Inspection sanitaire des débits de boisson &amp; commerces</p>
                    <p>• <strong>Salubrité Urbaine :</strong> Collecte des déchets en partenariat avec HYSACAM</p>
                    <p>• <strong>Environnement &amp; Reforestation :</strong> Espaces verts &amp; préservation forestière</p>
                  </div>
                </div>

                {/* SIGNATURE OFFICIELLE */}
                <footer className="print-official-footer" style={{ marginTop: '16px' }}>
                  <div className="print-signature-box">
                    <p className="sig-city">Commune de Soa</p>
                    <p className="sig-role">Le Secrétaire Général</p>
                    <div className="sig-space"></div>
                    <p className="sig-name">Coordination Générale</p>
                  </div>

                  <div className="print-signature-box right">
                    <p className="sig-city">Pour la Mairie de Soa</p>
                    <p className="sig-role">Le Maire de la Commune de Soa</p>
                    <div className="sig-space"></div>
                    <p className="sig-name">M. ESSAMA EMBOLO</p>
                  </div>
                </footer>

                <div className="print-bottom-watermark">
                  Document officiel de la Commune de Soa • Organigramme Administratif Intégral
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1 : DÉTAILS COMPLETS DE LA FORMATION                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedTrainingToView && (
        <div className="modal-overlay" onClick={() => setSelectedTrainingToView(null)}>
          <div className="modal-content modal-training-details" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon green">
                <i className="fa-solid fa-graduation-cap" />
              </div>
              <div>
                <span className="modal-badge-cat">{selectedTrainingToView.category}</span>
                <h3 className="modal-title">{selectedTrainingToView.title}</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedTrainingToView(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="modal-body-details">
              <div className="detail-hero-box">
                <h4><i className="fa-solid fa-align-left" />{t("Description du programme")}</h4>
                <p>{selectedTrainingToView.description}</p>
              </div>

              <div className="details-info-grid">
                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-user-tie" /> Organisme / Formateur :</span>
                  <strong className="d-val">{selectedTrainingToView.trainer}</strong>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-regular fa-clock" /> Durée &amp; Volume horaire :</span>
                  <strong className="d-val">{selectedTrainingToView.duration}</strong>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-location-dot" />{t("Lieu de formation :")}</span>
                  <strong className="d-val">{selectedTrainingToView.location}</strong>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-chalkboard-user" />{t("Format pédagogique :")}</span>
                  <strong className="d-val">{selectedTrainingToView.format}</strong>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-regular fa-calendar-days" />{t("Période prévue :")}</span>
                  <strong className="d-val">
                    Du {selectedTrainingToView.start_date ? new Date(selectedTrainingToView.start_date).toLocaleDateString('fr-FR') : 'Date à fixer'} au {selectedTrainingToView.end_date ? new Date(selectedTrainingToView.end_date).toLocaleDateString('fr-FR') : 'Date à fixer'}
                  </strong>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-users" />{t("Capacité d'accueil :")}</span>
                  <strong className="d-val">{selectedTrainingToView.capacity} places (Inscrits : {selectedTrainingToView.enrolled_count || 0})</strong>
                </div>
              </div>

              <div className="detail-hero-box sub">
                <h4><i className="fa-solid fa-list-check" />{t("Prérequis recommandés")}</h4>
                <p>{selectedTrainingToView.prerequisites || 'Aucun prérequis spécifique. Ouvert aux résidents de Soa et aux étudiants motivés.'}</p>
              </div>

              <div className="detail-hero-box certif">
                <h4><i className="fa-solid fa-award" />{t("Certification officielle")}</h4>
                <p>{selectedTrainingToView.certification || 'Certificat Officiel de Fin de Formation délivré par la Commune de Soa'}</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setSelectedTrainingToView(null)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  const training = selectedTrainingToView;
                  setSelectedTrainingToView(null);
                  setSelectedTrainingToApply(training);
                }}
              >
                <i className="fa-solid fa-paper-plane" /> Postuler à cette formation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2 : POSTULER À LA FORMATION (3 DOCUMENTS PDF REQUIS)   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedTrainingToApply && (
        <div className="modal-overlay" onClick={() => !submittingTrainingApp && setSelectedTrainingToApply(null)}>
          <div className="modal-content modal-training-apply" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon blue">
                <i className="fa-solid fa-file-arrow-up" />
              </div>
              <div>
                <span className="modal-badge-cat">Dossier de Candidature</span>
                <h3 className="modal-title">Inscription : {selectedTrainingToApply.title}</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                disabled={submittingTrainingApp}
                onClick={() => setSelectedTrainingToApply(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleTrainingApplySubmit}>
              <div className="modal-body-form">
                <div className="training-apply-notice">
                  <i className="fa-solid fa-circle-info" />
                  <div>
                    <strong>{t("Documents obligatoires requis pour participer à la demande :")}</strong>
                    <p>Pour participer à la demande, vous devez obligatoirement téléverser en PDF : un <strong>CV actualisé</strong>, une <strong>demande de participation à la demande</strong>, une <strong>lettre de motivation</strong> et une <strong>copie de votre pièce d'identité (CNI / Passeport)</strong>. Dès validation par les RH, vous recevrez votre décharge officielle.</p>
                  </div>
                </div>

                {/* INFOS DU CANDIDAT */}
                <div className="form-row-grid">
                  <div className="form-group">
                    <label>Nom &amp; Prénom du Candidat</label>
                    <input
                      type="text"
                      value={`${user.prenom || ''} ${user.nom || ''}`}
                      disabled
                      className="input-disabled"
                    />
                  </div>

                  <div className="form-group">
                    <label>Adresse Email de contact</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="input-disabled"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Numéro de Téléphone (WhatsApp / Appel) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: +237 690 00 00 00"
                    value={trainingAppForm.phone || profileForm.phone || ''}
                    onChange={e => setTrainingAppForm({ ...trainingAppForm, phone: e.target.value })}
                  />
                </div>

                {/* 4 ZONES DE TÉLÉVERSEMENT DE DOCUMENTS */}
                <div className="required-uploads-grid">

                  {/* 1. CV */}
                  <div className={`doc-upload-box ${trainingCvFile ? 'has-file' : ''}`}>
                    <div className="doc-box-header">
                      <i className="fa-solid fa-file-pdf" />
                      <div>
                        <strong>1. Curriculum Vitae (CV) *</strong>
                        <small>Format PDF uniquement (max 10 Mo)</small>
                      </div>
                    </div>
                    <label className="upload-drop-zone">
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={e => setTrainingCvFile(e.target.files[0] || null)}
                      />
                      {trainingCvFile ? (
                        <span className="file-picked-name">
                          <i className="fa-solid fa-check-circle" /> {trainingCvFile.name}
                        </span>
                      ) : (
                        <span className="file-placeholder">
                          <i className="fa-solid fa-arrow-up-from-bracket" /> Choisir le CV (PDF)
                        </span>
                      )}
                    </label>
                  </div>

                  {/* 2. DEMANDE DE PARTICIPATION */}
                  <div className={`doc-upload-box ${trainingRequestFile ? 'has-file' : ''}`}>
                    <div className="doc-box-header">
                      <i className="fa-solid fa-file-signature" style={{ color: '#0284c7' }} />
                      <div>
                        <strong>2. Demande de Participation à la Demande *</strong>
                        <small>Format PDF uniquement (max 10 Mo)</small>
                      </div>
                    </div>
                    <label className="upload-drop-zone">
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={e => setTrainingRequestFile(e.target.files[0] || null)}
                      />
                      {trainingRequestFile ? (
                        <span className="file-picked-name">
                          <i className="fa-solid fa-check-circle" /> {trainingRequestFile.name}
                        </span>
                      ) : (
                        <span className="file-placeholder">
                          <i className="fa-solid fa-arrow-up-from-bracket" /> Choisir la Demande de Participation (PDF)
                        </span>
                      )}
                    </label>
                  </div>

                  {/* 3. LETTRE DE MOTIVATION */}
                  <div className={`doc-upload-box ${trainingCoverLetterFile ? 'has-file' : ''}`}>
                    <div className="doc-box-header">
                      <i className="fa-solid fa-envelope-open-text" style={{ color: '#059669' }} />
                      <div>
                        <strong>3. Lettre de Motivation *</strong>
                        <small>Format PDF uniquement (max 10 Mo)</small>
                      </div>
                    </div>
                    <label className="upload-drop-zone">
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={e => setTrainingCoverLetterFile(e.target.files[0] || null)}
                      />
                      {trainingCoverLetterFile ? (
                        <span className="file-picked-name">
                          <i className="fa-solid fa-check-circle" /> {trainingCoverLetterFile.name}
                        </span>
                      ) : (
                        <span className="file-placeholder">
                          <i className="fa-solid fa-arrow-up-from-bracket" /> Choisir la Lettre (PDF)
                        </span>
                      )}
                    </label>
                  </div>

                  {/* 4. COPIE DE PIÈCE D'IDENTITÉ */}
                  <div className={`doc-upload-box ${trainingCniFile ? 'has-file' : ''}`}>
                    <div className="doc-box-header">
                      <i className="fa-solid fa-id-card" style={{ color: '#7c3aed' }} />
                      <div>
                        <strong>4. Copie de Pièce d'Identité (CNI / Passeport) *</strong>
                        <small>Format PDF uniquement (max 10 Mo)</small>
                      </div>
                    </div>
                    <label className="upload-drop-zone">
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={e => setTrainingCniFile(e.target.files[0] || null)}
                      />
                      {trainingCniFile ? (
                        <span className="file-picked-name">
                          <i className="fa-solid fa-check-circle" /> {trainingCniFile.name}
                        </span>
                      ) : (
                        <span className="file-placeholder">
                          <i className="fa-solid fa-arrow-up-from-bracket" /> Choisir la Pièce d'Identité (PDF)
                        </span>
                      )}
                    </label>
                  </div>

                </div>

                {/* MOTIVATION TEXTE COMPLÉMENTAIRE */}
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Vos attentes &amp; objectifs pour cette formation (Facultatif)</label>
                  <textarea
                    rows={3}
                    placeholder="Précisez brièvement vos objectifs professionnels ou les compétences spécifiques que vous souhaitez acquérir..."
                    value={trainingAppForm.motivation_text}
                    onChange={e => setTrainingAppForm({ ...trainingAppForm, motivation_text: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  disabled={submittingTrainingApp}
                  onClick={() => setSelectedTrainingToApply(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submittingTrainingApp || !trainingCvFile || !trainingRequestFile || !trainingCoverLetterFile || !trainingCniFile}
                >
                  {submittingTrainingApp ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" />{t("Transmission du dossier...")}</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane" />{t("Transmettre ma candidature")}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 3 : ACCUSÉ DE RÉCEPTION & DÉCHARGE DE FORMATION A4      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedTrainingReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedTrainingReceipt(null)}>
          <div className="modal-content modal-print-preview" onClick={e => e.stopPropagation()}>
            <div className="print-preview-topbar">
              <div className="print-preview-title">
                <i className="fa-solid fa-stamp" style={{ color: '#16a34a', fontSize: '1.4rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 900 }}>
                    Accusé de Réception &amp; Décharge Officielle d'Inscription — Commune de Soa
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Document officiel d'enregistrement de formation avec référence républicaine
                  </span>
                </div>
              </div>

              <div className="print-preview-actions">
                <button
                  type="button"
                  className="print-launch-btn"
                  onClick={() => window.print()}
                >
                  <i className="fa-solid fa-print" /> Imprimer / Exporter en PDF
                </button>
                <button
                  type="button"
                  className="print-close-btn"
                  onClick={() => setSelectedTrainingReceipt(null)}
                >
                  <i className="fa-solid fa-xmark" /> Fermer
                </button>
              </div>
            </div>

            {/* FEUILLE OFFICIELLE FORMAT A4 IMPRIMABLE */}
            <div className="print-sheet-wrapper">
              <div className="official-cv-document-sheet">

                {/* EN-TÊTE RÉPUBLICAIN */}
                <header className="print-official-header">
                  <div className="print-header-col left">
                    <p className="bold-country">RÉPUBLIQUE DU CAMEROUN</p>
                    <p className="motto">Paix – Travail – Patrie</p>
                    <div className="header-divider-mini"></div>
                    <p>RÉGION DU CENTRE</p>
                    <p>DÉPARTEMENT DE LA MÉFOU-ET-AFAMBA</p>
                    <p className="bold-council">COMMUNE DE SOA</p>
                    <p className="service-name">Service des Ressources Humaines</p>
                  </div>

                  <div className="print-header-col center">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
                      alt="Armoiries du Cameroun"
                      className="print-national-emblem"
                    />
                    <div className="print-portal-badge">
                      <span>COMMUNE DE SOA</span>
                      <small>Pôle Formation Continue</small>
                    </div>
                  </div>

                  <div className="print-header-col right">
                    <p className="bold-country">REPUBLIC OF CAMEROON</p>
                    <p className="motto">Peace – Work – Fatherland</p>
                    <div className="header-divider-mini"></div>
                    <p>CENTRE REGION</p>
                    <p>MEFOU &amp; AFAMBA DIVISION</p>
                    <p className="bold-council">SOA COUNCIL</p>
                    <p className="service-name">Human Resources Department</p>
                  </div>
                </header>

                <div className="print-document-title-box">
                  <h2>ACCUSÉ DE RÉCEPTION &amp; DÉCHARGE D'INSCRIPTION À LA FORMATION</h2>
                  <div className="print-ref-bar">
                    <span><strong>RÉFÉRENCE D'ENREGISTREMENT :</strong> {selectedTrainingReceipt.receipt_number || `SOA-FORM-${new Date().getFullYear()}-${String(selectedTrainingReceipt.id).padStart(5, '0')}`}</span>
                    <span><strong>DATE D'ÉMISSION :</strong> {selectedTrainingReceipt.receipt_date ? new Date(selectedTrainingReceipt.receipt_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* 1. IDENTIFICATION DU BÉNÉFICIAIRE */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-user-check" /> 1. IDENTIFICATION DU CANDIDAT RETENU
                  </div>
                  <div className="print-summary-grid">
                    <div className="print-summary-box">
                      <span className="summary-label">Nom &amp; Prénom :</span>
                      <strong className="summary-val">{selectedTrainingReceipt.prenom || user.prenom} {selectedTrainingReceipt.nom || user.nom}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">Adresse Email :</span>
                      <strong className="summary-val">{selectedTrainingReceipt.email || user.email}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">{t("Téléphone :")}</span>
                      <strong className="summary-val">{selectedTrainingReceipt.phone || user.phone || 'Non renseigné'}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">{t("Commune de résidence :")}</span>
                      <strong className="summary-val blue">Soa (Centre)</strong>
                    </div>
                  </div>
                </section>

                {/* 2. DÉTAILS DE LA SESSION DE FORMATION */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-graduation-cap" /> 2. CARACTÉRISTIQUES DE LA FORMATION
                  </div>
                  <div className="print-summary-grid">
                    <div className="print-summary-box" style={{ gridColumn: '1 / -1' }}>
                      <span className="summary-label">Intitulé Officiel :</span>
                      <strong className="summary-val" style={{ fontSize: '10pt', color: '#0f172a' }}>{selectedTrainingReceipt.training_title}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">Pôle / Catégorie :</span>
                      <strong className="summary-val">{selectedTrainingReceipt.training_category || 'Administration & Numérique'}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">Durée &amp; Volume :</span>
                      <strong className="summary-val">{selectedTrainingReceipt.training_duration || '3 Semaines'}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">Lieu &amp; Salle :</span>
                      <strong className="summary-val">{selectedTrainingReceipt.training_location || 'Hôtel de Ville de Soa'}</strong>
                    </div>
                    <div className="print-summary-box">
                      <span className="summary-label">Formateur / Encadrement :</span>
                      <strong className="summary-val">{selectedTrainingReceipt.training_trainer || 'Mairie de Soa'}</strong>
                    </div>
                  </div>
                </section>

                {/* 3. DOSSIER REÇU & ATTESTATION MUNICIPALE */}
                <section className="print-section-block">
                  <div className="print-section-title">
                    <i className="fa-solid fa-folder-check" /> 3. PIÈCES REÇUES &amp; ATTESTATION DE VALIDATION
                  </div>
                  <div className="print-section-body" style={{ fontSize: '8pt', lineHeight: '1.45', color: '#334155' }}>
                    <p style={{ margin: '0 0 6px' }}>
                      Le Service des Ressources Humaines de la Commune de Soa certifie avoir reçu, examiné et validé avec succès le dossier complet du candidat comprenant :
                    </p>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a' }}>
                       Curriculum Vitae (CV) actualisé •  Copie certifiée du diplôme •  Lettre de motivation d'engagement.
                    </p>
                    <p style={{ margin: '6px 0 0', fontStyle: 'italic', background: '#f0fdf4', padding: '6px 10px', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534' }}>
                      « Le présent document tient lieu d'<strong>Accusé de Réception Officiel et de Convocation</strong> pour le démarrage de la session de formation. Le bénéficiaire est invité à se présenter muni de cette décharge et de sa pièce d'identité originale. »
                    </p>
                  </div>
                </section>

                {/* SIGNATURES & VALIDATION RH */}
                <footer className="print-official-footer" style={{ marginTop: '16px' }}>
                  <div className="print-signature-box">
                    <p className="sig-city">Fait à Soa, le {selectedTrainingReceipt.receipt_date ? new Date(selectedTrainingReceipt.receipt_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="sig-role">Le Bénéficiaire / Candidat</p>
                    <div className="sig-space"></div>
                    <p className="sig-name">{selectedTrainingReceipt.prenom || user.prenom} {selectedTrainingReceipt.nom || user.nom}</p>
                  </div>

                  <div className="print-signature-box right">
                    <p className="sig-city">Pour la Mairie de Soa</p>
                    <p className="sig-role">Le Chef du Service des Ressources Humaines</p>
                    <div className="sig-space"></div>
                    <p className="sig-name">Enregistrement &amp; Visa de Formation</p>
                  </div>
                </footer>

                <div className="print-bottom-watermark">
                  Commune de Soa • Direction des Ressources Humaines • Décharge Officielle de Formation
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL ÉVÉNEMENT : DÉTAILS COMPLETS & PARTICIPATION           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedEventDetails && (
        <div className="modal-overlay" onClick={() => setSelectedEventDetails(null)}>
          <div className="modal-content modal-event-details" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon blue">
                <i className="fa-solid fa-calendar-check" />
              </div>
              <div>
                <span className={`modal-badge-cat cat-${selectedEventDetails.category || 'default'}`}>
                  {selectedEventDetails.category === 'institutionnel' && <><i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Institutional & Deliberations' : 'Institutionnel & Délibérations'}</>}
                  {selectedEventDetails.category === 'universitaire' && <><i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} />{language === 'en' ? 'University & Ceremonies' : 'Universitaire & Cérémonies'}</>}
                  {selectedEventDetails.category === 'ecologie' && <><i className="fa-solid fa-leaf" style={{ marginRight: '5px' }} />{language === 'en' ? 'Ecology & Cleanliness' : 'Écologie & Salubrité'}</>}
                  {selectedEventDetails.category === 'terroir' && <><i className="fa-solid fa-store" style={{ marginRight: '5px' }} />{language === 'en' ? 'Fairs & Local Products' : 'Foires & Terroir'}</>}
                  {selectedEventDetails.category === 'emploi_jeunesse' && <><i className="fa-solid fa-briefcase" style={{ marginRight: '5px' }} />{language === 'en' ? 'Jobs & Recruitment' : 'Emploi & Insertion'}</>}
                  {selectedEventDetails.category === 'culture_sport' && <><i className="fa-solid fa-trophy" style={{ marginRight: '5px' }} />{language === 'en' ? 'Sport & Culture' : 'Sport & Culture'}</>}
                  {!selectedEventDetails.category && <><i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Municipal Event' : 'Événement Municipal'}</>}
                </span>
                <h3 className="modal-title">{selectedEventDetails.title}</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedEventDetails(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="modal-body-details">
              <div className="detail-hero-box">
                <h4><i className="fa-solid fa-align-left" /> Description &amp; Déroulement</h4>
                <p>{selectedEventDetails.description}</p>
              </div>

              <div className="details-info-grid">
                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-calendar-day" /> Date &amp; Période</span>
                  <span className="d-val">
                    {new Date(selectedEventDetails.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-regular fa-clock" />{t("Horaires")}</span>
                  <span className="d-val">
                    {selectedEventDetails.start_time || '09h00'} — {selectedEventDetails.end_time || '15h00'}
                  </span>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-location-dot" /> Lieu &amp; Accès</span>
                  <span className="d-val">{selectedEventDetails.location || 'Hôtel de Ville de Soa'}</span>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-user-tie" />{t("Organisateur")}</span>
                  <span className="d-val">{selectedEventDetails.organizer || 'Mairie de Soa'}</span>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-users" /> Public Cible</span>
                  <span className="d-val">{selectedEventDetails.target_audience || 'Grand Public & Citoyens'}</span>
                </div>

                <div className="detail-item-box">
                  <span className="d-label"><i className="fa-solid fa-ticket" />{t("Conditions d'accès")}</span>
                  <span className="d-val">{selectedEventDetails.access_type || 'Entrée Libre & Gratuite'}</span>
                </div>
              </div>

              {selectedEventDetails.is_registered && (
                <div className="event-registered-banner">
                  <i className="fa-solid fa-circle-check" />
                  <div>
                    <strong>{t("Vous êtes inscrit à cet événement communal")}</strong>
                    <p>Votre présence est enregistrée auprès du service organisateur de la Mairie de Soa.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions modal-event-actions">
              <button
                type="button"
                className="btn-agenda-ics"
                onClick={() => handleDownloadIcs(selectedEventDetails)}
              >
                <i className="fa-regular fa-calendar-plus" /> Ajouter à mon Agenda (.ics)
              </button>

              {selectedEventDetails.is_registered ? (
                <button
                  type="button"
                  className="btn-cancel-reg"
                  onClick={() => handleEventUnregister(selectedEventDetails.id)}
                  disabled={eventRegistering}
                >
                  <i className="fa-solid fa-xmark" /> Annuler ma participation
                </button>
              ) : (
                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => handleEventRegister(selectedEventDetails.id)}
                  disabled={eventRegistering}
                >
                  <i className="fa-solid fa-ticket" /> Confirmer ma présence
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL JOUR DU CALENDRIER : VUE DÉTAILLÉE DE LA DATE SÉLECTIONNÉE */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedCalendarDay && (
        <div className="modal-overlay" onClick={() => setSelectedCalendarDay(null)}>
          <div className="modal-content modal-day-details" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon blue">
                <i className="fa-regular fa-calendar" />
              </div>
              <div>
                <span className="modal-badge-cat">
                  {selectedCalendarDay.isToday ? 'Aujourd\'hui' : 'Journée Municipale'}
                </span>
                <h3 className="modal-title">
                  {selectedCalendarDay.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedCalendarDay(null)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="modal-body-details">
              {selectedCalendarDay.events && selectedCalendarDay.events.length > 0 ? (
                <div className="day-modal-events-list">
                  <div className="day-modal-notice-banner">
                    <i className="fa-solid fa-circle-info" />
                    <span>
                      {selectedCalendarDay.events.length} événement(s) municipal(aux) programmé(s) ce jour :
                    </span>
                  </div>

                  {selectedCalendarDay.events.map(ev => (
                    <div key={ev.id} className="day-modal-event-card">
                      <div className="d-ev-header">
                        <span className={`agenda-cat-badge ${ev.category || 'default'}`}>
                          {ev.category === 'institutionnel' && <><i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Institutional' : 'Institutionnel'}</>}
                          {ev.category === 'universitaire' && <><i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} />{language === 'en' ? 'University' : 'Universitaire'}</>}
                          {ev.category === 'ecologie' && <><i className="fa-solid fa-leaf" style={{ marginRight: '5px' }} />{language === 'en' ? 'Ecology' : 'Écologie'}</>}
                          {ev.category === 'terroir' && <><i className="fa-solid fa-store" style={{ marginRight: '5px' }} />{language === 'en' ? 'Fairs & Local Products' : 'Terroir & Foires'}</>}
                          {ev.category === 'emploi_jeunesse' && <><i className="fa-solid fa-briefcase" style={{ marginRight: '5px' }} />{language === 'en' ? 'Jobs' : 'Emploi'}</>}
                          {ev.category === 'culture_sport' && <><i className="fa-solid fa-trophy" style={{ marginRight: '5px' }} />{language === 'en' ? 'Sport' : 'Sport'}</>}
                          {!ev.category && <><i className="fa-solid fa-landmark" style={{ marginRight: '5px' }} />{language === 'en' ? 'Municipal' : 'Municipal'}</>}
                        </span>
                        <span className="agenda-time-pill">
                          <i className="fa-regular fa-clock" /> {ev.start_time || '09h00'} - {ev.end_time || '15h00'}
                        </span>
                      </div>

                      <h4 className="d-ev-title">{ev.title}</h4>
                      <p className="d-ev-desc">{ev.description}</p>
                      <div className="d-ev-meta">
                        <span><i className="fa-solid fa-location-dot" /> {ev.location || 'Mairie de Soa'}</span>
                        <span><i className="fa-solid fa-ticket" /> {ev.access_type || 'Entrée Libre'}</span>
                      </div>

                      <div className="d-ev-actions">
                        <button
                          type="button"
                          className="btn-agenda-details"
                          onClick={() => {
                            setSelectedCalendarDay(null);
                            setSelectedEventDetails(ev);
                          }}
                        >
                          <i className="fa-solid fa-circle-info" /> Voir Détails Complets
                        </button>
                        {ev.is_registered ? (
                          <span className="registered-live-tag">
                            <i className="fa-solid fa-circle-check" /> Inscrit
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-agenda-register"
                            onClick={() => handleEventRegister(ev.id)}
                            disabled={eventRegistering}
                          >
                            <i className="fa-solid fa-ticket" /> S'inscrire
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-day-modal-box">
                  <div className="empty-day-icon-circle">
                    <i className="fa-solid fa-building-columns" />
                  </div>
                  <h4>{t("Aucun événement municipal programmé pour cette date")}</h4>
                  <p>
                    Les services administratifs et techniques de l'Hôtel de Ville de la Commune de Soa sont ouverts au public selon les horaires officiels :
                  </p>
                  <div className="standard-hours-box">
                    <div className="hours-row">
                      <span><i className="fa-solid fa-calendar-week" /> Du Lundi au Vendredi</span>
                      <strong>07h30 — 15h30</strong>
                    </div>
                    <div className="hours-row">
                      <span><i className="fa-solid fa-phone" /> Permanence État Civil</span>
                      <strong>Guichet Ouvert</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setSelectedCalendarDay(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHATBOT ASSISTANT MUNICIPAL 24/7 (EXCLUSIF AU CANDIDAT) */}
      <ChatbotWidget user={user} userId={user?.id} />
    </div>
  );
};

export default CandidateDashboard;