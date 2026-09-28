import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AccessibilityToolbar from '../../components/AccessibilityToolbar';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import VisioRoomModal from '../../components/VisioRoomModal';
import { useLanguage } from '../../context/LanguageContext';
import { printBilanMensuelRH } from '../../utils/officialDocuments';
import { getDynamicGreeting } from '../../utils/timeGreeting';
import './AdminDashboard.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><circle cx='64' cy='64' r='64' fill='%23e2e8f0'/><circle cx='64' cy='48' r='24' fill='%2364748b'/><path d='M64 80c-26.5 0-48 16.1-48 36v12h96v-12c0-19.9-21.5-36-48-36z' fill='%2364748b'/></svg>";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const avatarInputRef = useRef(null);
  const [adminUser, setAdminUser] = useState(() => JSON.parse(localStorage.getItem('user')) || { prenom: 'Agent RH', nom: 'Soa' });
  const [activeTab, setActiveTab] = useState('analytics');

  // Salutation dynamique traquant l'heure en temps réel
  const [currentGreeting, setCurrentGreeting] = useState(() => getDynamicGreeting(adminUser?.prenom || '', language));

  useEffect(() => {
    setCurrentGreeting(getDynamicGreeting(adminUser?.prenom || '', language));
    const timer = setInterval(() => {
      setCurrentGreeting(getDynamicGreeting(adminUser?.prenom || '', language));
    }, 15000);
    return () => clearInterval(timer);
  }, [adminUser?.prenom, language]);

  // États des données
  const [analytics, setAnalytics] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [trainingApps, setTrainingApps] = useState([]);
  const [trainingsList, setTrainingsList] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [conversationsList, setConversationsList] = useState([]);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [adminChatSubject, setAdminChatSubject] = useState('Information Officielle RH');
  const [adminRhStatus, setAdminRhStatus] = useState({ is_available: true, status_text: 'En ligne & Disponible' });
  const [adminChatSending, setAdminChatSending] = useState(false);
  const [adminSupportTickets, setAdminSupportTickets] = useState([]);
  const [selectedTicketToReply, setSelectedTicketToReply] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replyingTicket, setReplyingTicket] = useState(false);
  const [submittingTraining, setSubmittingTraining] = useState(false);
  const [, setLoading] = useState(true);

  // Journal d'Audit & Rapport Mensuel RH
  const [monthlyAuditData, setMonthlyAuditData] = useState(null);
  const [selectedAuditMonthKey, setSelectedAuditMonthKey] = useState('2026-08');
  const [loadingMonthlyAudit, setLoadingMonthlyAudit] = useState(false);

  const fetchMonthlyAudit = async () => {
    setLoadingMonthlyAudit(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-monthly`);
      if (res.ok) {
        const data = await res.json();
        setMonthlyAuditData(data);
        if (data.current_month_key) {
          setSelectedAuditMonthKey(data.current_month_key);
        }
      }
    } catch (err) {
      console.error('Erreur chargement rapport d audit mensuel RH:', err);
    } finally {
      setLoadingMonthlyAudit(false);
    }
  };

  // Formulaire Profil RH & Sécurité
  const [adminProfileForm, setAdminProfileForm] = useState({
    nom: adminUser.nom || '',
    prenom: adminUser.prenom || '',
    email: adminUser.email || '',
    phone: adminUser.phone || '',
    ville: adminUser.ville || 'Soa',
    region: adminUser.region || 'Centre (Soa)',
    function_title: 'Cadre RH — Direction des Ressources Humaines'
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Formulaire Nouvelle Offre
  const [newJob, setNewJob] = useState({
    title: '',
    department: 'Service Informatique',
    location: 'Mairie de Soa • Yaoundé, Cameroun',
    type: 'CDI',
    salary_range: '250 000 FCFA - 400 000 FCFA',
    skills: 'JavaScript, React, SQL',
    description: ''
  });

  // Formulaire Nouvelle Formation Municipale & Édition/Consultation
  const [showNewTrainingModal, setShowNewTrainingModal] = useState(false);
  const [showEditTrainingModal, setShowEditTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [showViewTrainingModal, setShowViewTrainingModal] = useState(false);
  const [viewingTraining, setViewingTraining] = useState(null);
  const [newTraining, setNewTraining] = useState({
    title: '',
    category: 'Administration & Numérique',
    description: '',
    prerequisites: 'Baccalauréat ou équivalent, Connaissances de base',
    trainer: 'Cellule Municipale de Formation — Soa',
    location: 'Hôtel de Ville de Soa — Salle Multimédia',
    format: 'Présentiel & Ateliers Pratiques',
    duration: '3 Semaines (60h)',
    start_date: '',
    end_date: '',
    capacity: 30,
    certification: 'Certificat Officiel Commune de Soa'
  });

  // Formulaire Nouvel Événement Municipal
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'institutionnel',
    event_date: '',
    start_time: '09h00',
    end_time: '15h00',
    location: 'Hôtel de Ville de Soa — Grande Salle des Actes',
    organizer: 'Mairie de la Commune de Soa',
    target_audience: 'Grand Public & Citoyens de Soa',
    access_type: 'Entrée Libre & Gratuite',
    capacity: 150,
    description: ''
  });

  // Modal Entretien Visio & Édition / Suppression
  const [adminInterviews, setAdminInterviews] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('Entretien d évaluation des compétences et motivation pour la commission municipale.');
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [selectedInterviewForVisio, setSelectedInterviewForVisio] = useState(null);
  const [showVisioModal, setShowVisioModal] = useState(false);

  // Édition & Suppression d'Entretien Visio (RH)
  const [showEditInterviewModal, setShowEditInterviewModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [editInterviewDate, setEditInterviewDate] = useState('');
  const [editInterviewNotes, setEditInterviewNotes] = useState('');
  const [savingEditInterview, setSavingEditInterview] = useState(false);
  const [showDeleteInterviewModal, setShowDeleteInterviewModal] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState(null);
  const [deletingInterviewId, setDeletingInterviewId] = useState(null);

  // Modal Examen Approfondi du Dossier de Candidature & Pièces Téléversées
  const [selectedAppReviewData, setSelectedAppReviewData] = useState(null);
  const [loadingAppReview, setLoadingAppReview] = useState(false);
  const [showAppReviewModal, setShowAppReviewModal] = useState(false);
  const [reviewAdminNote, setReviewAdminNote] = useState('');
  const [validatingAndDischarging, setValidatingAndDischarging] = useState(false);
  const [reviewActiveTab, setReviewActiveTab] = useState('documents'); // 'documents' | 'profile' | 'diplomas' | 'discharge'

  // Modal Profil Candidat pour les RH
  const [candidateProfileModalData, setCandidateProfileModalData] = useState(null);

  // Gestion des Candidats RH
  const [adminCandidates, setAdminCandidates] = useState([]);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('all');
  const [candidateRegionFilter, setCandidateRegionFilter] = useState('all');
  const [selectedCandidateActivity, setSelectedCandidateActivity] = useState(null);
  const [showCandidateActivityModal, setShowCandidateActivityModal] = useState(false);
  const [loadingCandidateActivity, setLoadingCandidateActivity] = useState(false);
  const [blockingCandidateId, setBlockingCandidateId] = useState(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [candidateToBlock, setCandidateToBlock] = useState(null);

  // Gestion des Guides & Règlements Officiels (Admin RH)
  const [adminGuides, setAdminGuides] = useState([]);
  const [loadingAdminGuides, setLoadingAdminGuides] = useState(false);
  const [showAddGuideModal, setShowAddGuideModal] = useState(false);
  const [showEditGuideModal, setShowEditGuideModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [showDeleteGuideConfirmModal, setShowDeleteGuideConfirmModal] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState(null);
  const [deletingGuideId, setDeletingGuideId] = useState(null);
  const [guideSearchQuery, setGuideSearchQuery] = useState('');
  const [guideCategoryFilter, setGuideCategoryFilter] = useState('ALL');

  const [guideForm, setGuideForm] = useState({
    title: '',
    category: 'Guide Général',
    description: '',
    target_audience: 'Tous les candidats',
    badge_tag: 'Document Officiel',
    badge_color: '#00a859',
    file_url_link: ''
  });
  const [selectedGuideFile, setSelectedGuideFile] = useState(null);
  const [savingGuide, setSavingGuide] = useState(false);

  // Centre de Notifications RH & Candidatures Reçues
  const [hrNotifications, setHrNotifications] = useState([]);
  const [unreadHrNotifCount, setUnreadHrNotifCount] = useState(0);
  const [showHrNotifDropdown, setShowHrNotifDropdown] = useState(false);

  // Stockage Interne RH & GED Municipale des Documents Candidats
  const [allStoredDocs, setAllStoredDocs] = useState([]);
  const [loadingStoredDocs, setLoadingStoredDocs] = useState(false);
  const [storageSearchTerm, setStorageSearchTerm] = useState('');
  const [storageFilterType, setStorageFilterType] = useState('ALL');
  const [storageViewMode, setStorageViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('hb_storage_view_mode');
      if (saved === 'grid' || saved === 'table') return saved;
    } catch (e) {}
    return 'table'; // Persistance : 'table' (Vue Liste) ou 'grid' selon la préférence de l'utilisateur
  });

  const handleToggleStorageViewMode = (mode) => {
    setStorageViewMode(mode);
    try {
      localStorage.setItem('hb_storage_view_mode', mode);
    } catch (e) {}
  };

  // Visionneuse Intégrée de Documents (Lecture dans la plateforme, Impression & Téléchargement)
  const [showDocViewerModal, setShowDocViewerModal] = useState(false);
  const [activeDocForViewer, setActiveDocForViewer] = useState(null);

  // Modal Fiche de Rejet de Candidature / Document avec motif & email
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetApp, setRejectTargetApp] = useState(null);
  const [rejectCategory, setRejectCategory] = useState('Document non conforme ou illisible (CNI / Diplôme / CV)');
  const [rejectDetails, setRejectDetails] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [submittingRejection, setSubmittingRejection] = useState(false);

  const handleOpenRejectModal = (item) => {
    setRejectTargetApp(item);
    setRejectCategory('Document non conforme ou illisible (CNI / Diplôme / CV)');
    setRejectDetails('');
    setAllowResubmission(true);
    setShowRejectModal(true);
  };

  const handleConfirmRejectionSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTargetApp) return;
    if (!rejectDetails.trim()) {
      alert('Veuillez saisir les raisons explicites du rejet.');
      return;
    }

    setSubmittingRejection(true);
    try {
      const appId = rejectTargetApp.application_id || rejectTargetApp.id;
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionReasonCategory: rejectCategory,
          rejectionReasonDetails: rejectDetails,
          allowResubmission,
          rhId: adminUser.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || 'La candidature a été rejetée et le candidat notifié par email.', type: 'success' });
        setShowRejectModal(false);
        setShowAppReviewModal(false);
        fetchData();
        fetchStoredDocs();
      } else {
        alert(data.message || 'Erreur lors du rejet de la candidature.');
      }
    } catch (err) {
      console.error('Erreur rejet:', err);
      alert('Erreur réseau lors de la soumission du rejet.');
    } finally {
      setSubmittingRejection(false);
    }
  };

  const [msg, setMsg] = useState({ text: '', type: '' });

  // Auto-effacement automatique des notifications RH après 4 secondes
  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => {
        setMsg({ text: '', type: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [msg.text]);

  // Chargement et rafraîchissement des notifications RH
  const fetchHrNotifications = async () => {
    try {
      const activeUserId = adminUser?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (!activeUserId) return;
      const res = await fetch(`${API_BASE_URL}/api/notifications/${activeUserId}`);
      if (res.ok) {
        const data = await res.json();
        setHrNotifications(data.notifications || []);
        setUnreadHrNotifCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Erreur chargement notifications RH:', err);
    }
  };

  useEffect(() => {
    fetchHrNotifications();
    const notifTimer = setInterval(fetchHrNotifications, 10000);
    return () => clearInterval(notifTimer);
  }, [adminUser]);

  const handleHrNotificationClick = async (n) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${n.id}/read`, { method: 'PUT' });
      setHrNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      setUnreadHrNotifCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
    setShowHrNotifDropdown(false);
    if (n.action_tab === 'trainings') {
      setActiveTab('trainings');
    } else if (n.action_tab === 'applications' || n.action_tab === 'candidatures') {
      setActiveTab('candidatures');
    } else if (n.action_tab === 'messages') {
      setActiveTab('messages');
    }
  };

  const handleMarkAllHrNotifsRead = async () => {
    try {
      const activeUserId = adminUser?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (!activeUserId) return;
      await fetch(`${API_BASE_URL}/api/notifications/mark-all-read/${activeUserId}`, { method: 'PUT' });
      setHrNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadHrNotifCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [anRes, appRes, jobsRes, trAppsRes, trListRes, evRes, convsRes, rhStatusRes, supRes, intRes, profRes, docsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/analytics`),
        fetch(`${API_BASE_URL}/api/applications/admin`),
        fetch(`${API_BASE_URL}/api/jobs`),
        fetch(`${API_BASE_URL}/api/admin/training-applications`),
        fetch(`${API_BASE_URL}/api/trainings`),
        fetch(`${API_BASE_URL}/api/events?includePast=true`),
        fetch(`${API_BASE_URL}/api/admin/messages/conversations`),
        fetch(`${API_BASE_URL}/api/rh/status`),
        fetch(`${API_BASE_URL}/api/admin/support/tickets`),
        fetch(`${API_BASE_URL}/api/interviews/admin`),
        fetch(`${API_BASE_URL}/api/admin/profile/${adminUser.id}`),
        fetch(`${API_BASE_URL}/api/documents/admin/all`)
      ]);

      const anData = await anRes.json();
      const appData = await appRes.json();
      const jobsData = await jobsRes.json();
      if (trAppsRes.ok) setTrainingApps(await trAppsRes.json());
      if (trListRes.ok) setTrainingsList(await trListRes.json());
      if (evRes.ok) setAdminEvents(await evRes.json());
      if (convsRes.ok) setConversationsList(await convsRes.json());
      if (rhStatusRes.ok) setAdminRhStatus(await rhStatusRes.json());
      if (supRes.ok) setAdminSupportTickets(await supRes.json());
      if (intRes.ok) setAdminInterviews(await intRes.json());
      if (docsRes && docsRes.ok) {
        const dData = await docsRes.json();
        setAllStoredDocs(dData.documents || []);
      }
      if (profRes && profRes.ok) {
        const pData = await profRes.json();
        setAdminUser(pData);
        localStorage.setItem('user', JSON.stringify(pData));
        setAdminProfileForm({
          nom: pData.nom || '',
          prenom: pData.prenom || '',
          email: pData.email || '',
          phone: pData.phone || '',
          ville: pData.ville || 'Soa',
          region: pData.region || 'Centre (Soa)',
          function_title: 'Cadre RH — Direction des Ressources Humaines'
        });
      }

      setAnalytics(anData);
      setApplications(appData);
      setJobs(jobsData);
      fetchMonthlyAudit();
      fetchAdminCandidates();
      fetchAdminGuides();
    } catch (err) {
      console.error('Erreur chargement données RH :', err);
    } finally {
      setLoading(false);
    }
  };

  // Recharger les documents du stockage interne
  const fetchStoredDocs = async () => {
    setLoadingStoredDocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/admin/all`);
      if (res.ok) {
        const data = await res.json();
        setAllStoredDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Erreur rechargement documents :', err);
    } finally {
      setLoadingStoredDocs(false);
    }
  };

  // Chargement de la liste des candidats
  const fetchAdminCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/candidates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAdminCandidates(data);
      }
    } catch (err) {
      console.error('Erreur chargement candidats:', err);
    }
  };

  // Consulter la fiche d'activité détaillée d'un candidat
  const handleOpenCandidateActivity = async (cand) => {
    setSelectedCandidateActivity(null);
    setShowCandidateActivityModal(true);
    setLoadingCandidateActivity(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/candidates/${cand.id}/activity`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCandidateActivity(data);
      }
    } catch (err) {
      console.error('Erreur chargement fiche candidat:', err);
    } finally {
      setLoadingCandidateActivity(false);
    }
  };

  // Action Bloquer / Débloquer un candidat
  const handleToggleBlockCandidate = async (candidate, targetBlocked, reason = '') => {
    setBlockingCandidateId(candidate.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/candidates/${candidate.id}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_blocked: targetBlocked, reason })
      });
      if (res.ok) {
        setMsg({
          text: targetBlocked
            ? `Le compte de ${candidate.prenom} ${candidate.nom} a été bloqué avec succès.`
            : `Le compte de ${candidate.prenom} ${candidate.nom} a été réactivé.`,
          type: 'success'
        });
        fetchAdminCandidates();
        setShowBlockConfirmModal(false);
        setCandidateToBlock(null);
        setBlockReasonInput('');
      } else {
        const errData = await res.json();
        setMsg({ text: errData.message || 'Erreur lors de la modification du statut.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur toggle block candidat:', err);
      setMsg({ text: 'Erreur réseau lors de la mise à jour du statut.', type: 'error' });
    } finally {
      setBlockingCandidateId(null);
    }
  };

  // Chargement des Guides & Règlements Officiels
  const fetchAdminGuides = async () => {
    setLoadingAdminGuides(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/guides`);
      if (res.ok) {
        const data = await res.json();
        setAdminGuides(data);
      }
    } catch (err) {
      console.error('Erreur chargement guides admin:', err);
    } finally {
      setLoadingAdminGuides(false);
    }
  };

  // Création / Upload d'un nouveau guide ou règlement
  const handleCreateGuideSubmit = async (e) => {
    e.preventDefault();
    setSavingGuide(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', guideForm.title);
      formData.append('category', guideForm.category);
      formData.append('description', guideForm.description);
      formData.append('target_audience', guideForm.target_audience);
      formData.append('badge_tag', guideForm.badge_tag);
      formData.append('badge_color', guideForm.badge_color);
      if (guideForm.file_url_link) formData.append('file_url_link', guideForm.file_url_link);
      if (selectedGuideFile) formData.append('file', selectedGuideFile);

      const res = await fetch(`${API_BASE_URL}/api/admin/guides`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        setMsg({ text: 'Guide ou règlement officiel publié avec succès !', type: 'success' });
        fetchAdminGuides();
        setShowAddGuideModal(false);
        setGuideForm({
          title: '',
          category: 'Guide Général',
          description: '',
          target_audience: 'Tous les candidats',
          badge_tag: 'Document Officiel',
          badge_color: '#00a859',
          file_url_link: ''
        });
        setSelectedGuideFile(null);
      } else {
        const data = await res.json();
        setMsg({ text: data.message || 'Erreur lors de la publication du guide.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur ajout guide:', err);
      setMsg({ text: 'Erreur réseau lors de la publication.', type: 'error' });
    } finally {
      setSavingGuide(false);
    }
  };

  // Modification d'un guide ou règlement
  const handleEditGuideSubmit = async (e) => {
    e.preventDefault();
    if (!editingGuide) return;
    setSavingGuide(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', guideForm.title);
      formData.append('category', guideForm.category);
      formData.append('description', guideForm.description);
      formData.append('target_audience', guideForm.target_audience);
      formData.append('badge_tag', guideForm.badge_tag);
      formData.append('badge_color', guideForm.badge_color);
      if (guideForm.file_url_link) formData.append('file_url_link', guideForm.file_url_link);
      if (selectedGuideFile) formData.append('file', selectedGuideFile);

      const res = await fetch(`${API_BASE_URL}/api/admin/guides/${editingGuide.id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        setMsg({ text: 'Guide mis à jour avec succès !', type: 'success' });
        fetchAdminGuides();
        setShowEditGuideModal(false);
        setEditingGuide(null);
        setSelectedGuideFile(null);
      } else {
        const data = await res.json();
        setMsg({ text: data.message || 'Erreur lors de la modification.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur modification guide:', err);
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setSavingGuide(false);
    }
  };

  // Suppression d'un guide ou règlement
  const handleDeleteGuideConfirm = async () => {
    if (!guideToDelete) return;
    setDeletingGuideId(guideToDelete.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/guides/${guideToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setMsg({ text: `Le guide "${guideToDelete.title}" a été supprimé.`, type: 'success' });
        fetchAdminGuides();
        setShowDeleteGuideConfirmModal(false);
        setGuideToDelete(null);
      } else {
        const data = await res.json();
        setMsg({ text: data.message || 'Erreur lors de la suppression.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur suppression guide:', err);
      setMsg({ text: 'Erreur réseau lors de la suppression.', type: 'error' });
    } finally {
      setDeletingGuideId(null);
    }
  };

  // Ouvrir la visionneuse intégrée de documents
  const handleOpenDocViewer = (doc) => {
    setActiveDocForViewer(doc);
    setShowDocViewerModal(true);
  };

  // Enregistrer les modifications du profil RH
  const handleSaveAdminProfile = async (e) => {
    e.preventDefault();
    setSavingAdminProfile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/profile/${adminUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminProfileForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'Vos informations de profil RH ont été enregistrées avec succès !', type: 'success' });
        setAdminUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setMsg({ text: data.message || 'Erreur mise à jour profil.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau lors de la mise à jour.', type: 'error' });
    } finally {
      setSavingAdminProfile(false);
    }
  };

  // Téléversement direct de la photo de profil RH (Avatar)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', adminUser.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/avatar`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'Votre photo de profil RH a été actualisée avec succès !', type: 'success' });
        setAdminUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setMsg({ text: data.message || 'Erreur modification photo.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau upload photo.', type: 'error' });
    }
  };

  // Modification du mot de passe sécurisé RH
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMsg({ text: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMsg({ text: 'Le mot de passe doit comporter au moins 6 caractères.', type: 'error' });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminUser.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || 'Votre mot de passe a été modifié avec succès !', type: 'success' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMsg({ text: data.message || 'Erreur modification mot de passe.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  // Programmation d'un entretien vidéo RH avec envoi d'email, messagerie & notifications
  const handleScheduleInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp || !interviewDate) {
      setMsg({ text: 'Veuillez sélectionner la date et l heure de l entretien.', type: 'error' });
      return;
    }
    setSchedulingInterview(true);
    try {
      const res = await fetch('http://localhost:5000/api/interviews/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedApp.user_id || selectedApp.candidate_id,
          applicationId: selectedApp.id,
          scheduledAt: interviewDate,
          notes: interviewNotes,
          rhId: adminUser.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          text: 'Entretien vidéo programmé avec succès ! L email officiel, le message automatique (consigne 24h) et les notifications ont été transmis.',
          type: 'success'
        });
        setShowInterviewModal(false);
        setSelectedApp(null);
        setInterviewDate('');
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la programmation de l entretien.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMsg({ text: 'Erreur réseau lors de la programmation.', type: 'error' });
    } finally {
      setSchedulingInterview(false);
    }
  };

  // Clôturer un entretien vidéo
  const handleEndInterviewByRh = async (interviewId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/interviews/${interviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'termine' })
      });
      if (res.ok) {
        setMsg({ text: 'Entretien marqué comme terminé avec succès.', type: 'success' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ouvrir la modale de modification d'un entretien (Date/Heure & Consignes)
  const handleOpenEditInterviewModal = (interview) => {
    setEditingInterview(interview);
    if (interview.scheduled_at) {
      const d = new Date(interview.scheduled_at);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setEditInterviewDate(`${year}-${month}-${day}T${hh}:${mm}`);
    } else {
      setEditInterviewDate('');
    }
    setEditInterviewNotes(interview.notes || 'Entretien d évaluation des compétences et motivation.');
    setShowEditInterviewModal(true);
  };

  // Enregistrer la modification de l'entretien (Reschedule)
  const handleSaveEditInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!editingInterview || !editInterviewDate) {
      setMsg({ text: 'Veuillez sélectionner la nouvelle date et heure de l entretien.', type: 'error' });
      return;
    }
    setSavingEditInterview(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/interviews/${editingInterview.id}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          scheduledAt: editInterviewDate,
          notes: editInterviewNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'L entretien vidéo a été reprogrammé avec succès ! Le candidat a été notifié.', type: 'success' });
        setShowEditInterviewModal(false);
        setEditingInterview(null);
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la modification de l entretien.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur modification entretien:', err);
      setMsg({ text: 'Erreur réseau lors de la modification.', type: 'error' });
    } finally {
      setSavingEditInterview(false);
    }
  };

  // Ouvrir la modale de confirmation de suppression d'un entretien
  const handleOpenDeleteInterviewModal = (interview) => {
    setInterviewToDelete(interview);
    setShowDeleteInterviewModal(true);
  };

  // Confirmer la suppression de l'entretien vidéo
  const handleConfirmDeleteInterview = async () => {
    if (!interviewToDelete) return;
    setDeletingInterviewId(interviewToDelete.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/interviews/${interviewToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'L entretien vidéo a été annulé et supprimé avec succès.', type: 'success' });
        setShowDeleteInterviewModal(false);
        setInterviewToDelete(null);
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la suppression de l entretien.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur suppression entretien:', err);
      setMsg({ text: 'Erreur réseau lors de la suppression.', type: 'error' });
    } finally {
      setDeletingInterviewId(null);
    }
  };

  // Création d'une nouvelle session de formation municipale
  const handleCreateTrainingSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submittingTraining) return;
    setSubmittingTraining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/trainings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTraining)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'Session de formation municipale créée et ouverte avec succès !', type: 'success' });
        setShowNewTrainingModal(false);
        const newRecord = data.training || data;
        if (newRecord && newRecord.id) {
          setTrainingsList(prev => [newRecord, ...prev.filter(t => t.id !== newRecord.id)]);
        }
        setNewTraining({
          title: '',
          category: 'Administration & Numérique',
          description: '',
          prerequisites: 'Baccalauréat ou équivalent, Connaissances de base',
          trainer: 'Cellule Municipale de Formation — Soa',
          location: 'Hôtel de Ville de Soa — Salle Multimédia',
          format: 'Présentiel & Ateliers Pratiques',
          duration: '3 Semaines (60h)',
          start_date: '',
          end_date: '',
          capacity: 30,
          certification: 'Certificat Officiel Commune de Soa'
        });
        fetchData();
      } else {
        alert(data.message || 'Erreur lors de la création de la formation.');
        setMsg({ text: data.message || 'Erreur lors de la création de la formation.', type: 'error' });
      }
    } catch (err) {
      alert('Erreur réseau lors de la communication avec le serveur.');
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setSubmittingTraining(false);
    }
  };

  // Modification d'une formation municipale
  const handleEditTrainingSubmit = async (e) => {
    e.preventDefault();
    if (!editingTraining || !editingTraining.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/trainings/${editingTraining.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTraining)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'Formation municipale mise à jour avec succès !', type: 'success' });
        setShowEditTrainingModal(false);
        setEditingTraining(null);
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la modification.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    }
  };

  // Suppression d'une formation du catalogue
  const handleDeleteTraining = async (trainingId, title) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la formation "${title}" du catalogue municipal ?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/trainings/${trainingId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || 'Formation supprimée du catalogue municipal.', type: 'success' });
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la suppression.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau lors de la suppression.', type: 'error' });
    }
  };

  // Supprimer une offre d'emploi
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette offre d emploi du catalogue municipal ?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ text: 'Offre d emploi supprimée avec succès !', type: 'success' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Répondre officiellement à un ticket de support citoyen
  const handleReplyTicketSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicketToReply || !adminReplyText.trim()) return;

    setReplyingTicket(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/support/tickets/${selectedTicketToReply.id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_response: adminReplyText.trim(),
          status: 'resolu'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'Réponse officielle transmise au citoyen avec notification directe !', type: 'success' });
        setSelectedTicketToReply(null);
        setAdminReplyText('');
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de l envoi.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setReplyingTicket(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    sessionStorage.clear();
    window.location.href = '/auth';
  };

  // Mettre à jour le statut d'une candidature
  const handleStatusChange = async (appId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setMsg({ text: 'Statut mis à jour !', type: 'success' });
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  // Ouvrir le profil d'un candidat pour consultation RH
  const handleOpenCandidateProfile = async (userId, app) => {
    try {
      const res = await fetch(`http://localhost:5000/api/candidate/profile/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCandidateProfileModalData({ ...data, currentApp: app });
      }
    } catch (err) {
      console.error('Erreur chargement profil candidat RH:', err);
    }
  };

  // Création d'une nouvelle offre
  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newJob.title,
          department: newJob.department,
          location: newJob.location,
          type: newJob.type,
          salary_range: newJob.salary_range,
          skills_required: newJob.skills.split(',').map(s => s.trim()),
          description: newJob.description
        })
      });

      if (response.ok) {
        setMsg({ text: 'Nouvelle offre d emploi publiée avec succès !', type: 'success' });
        setNewJob({ title: '', department: 'Service Informatique', location: 'Mairie de Soa • Yaoundé, Cameroun', type: 'CDI', salary_range: '', skills: '', description: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Raccourci pour formater une date pour l'entretien visio
  const setInterviewShortcut = (daysAhead, hours = 10, minutes = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hours, minutes, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setInterviewDate(`${year}-${month}-${day}T${hh}:${mm}`);
  };

  // Programmer un entretien visio
  const handleScheduleInterview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedApp) {
      setMsg({ text: 'Aucun candidat sélectionné pour cet entretien.', type: 'error' });
      return;
    }
    if (!interviewDate || !interviewDate.trim()) {
      setMsg({ text: 'Veuillez sélectionner la date et l\'heure de l\'entretien (ex: 24/08/2026 à 10:00).', type: 'error' });
      return;
    }

    setSchedulingInterview(true);
    try {
      const response = await fetch('http://localhost:5000/api/interviews/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          candidateId: selectedApp.user_id,
          rhId: adminUser.id,
          scheduledAt: interviewDate,
          notes: interviewNotes || 'Entretien d évaluation des compétences et motivation pour la commission municipale.'
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMsg({ text: data.message || 'Entretien en visioconférence programmé avec succès !', type: 'success' });
        setShowInterviewModal(false);
        setInterviewDate('');
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la programmation de l\'entretien.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur handleScheduleInterview:', err);
      setMsg({ text: 'Erreur réseau lors de la programmation de l\'entretien.', type: 'error' });
    } finally {
      setSchedulingInterview(false);
    }
  };

  // Ouvrir le dossier complet de candidature & consultation des pièces téléversées
  const handleOpenApplicationReview = async (appId) => {
    setLoadingAppReview(true);
    setShowAppReviewModal(true);
    setReviewAdminNote('');
    setReviewActiveTab('documents');
    try {
      const res = await fetch(`http://localhost:5000/api/applications/${appId}/details`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAppReviewData(data);
      } else {
        setMsg({ text: 'Erreur lors du chargement du dossier de candidature.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur details dossier:', err);
      setMsg({ text: 'Erreur réseau lors du chargement du dossier.', type: 'error' });
    } finally {
      setLoadingAppReview(false);
    }
  };

  // Valider le dossier et émettre la décharge officielle (Email + Message RH automatique + Notifications)
  const handleValidateAndDischargeApplication = async (appId, targetStatus = 'en_examen') => {
    setValidatingAndDischarging(true);
    try {
      const res = await fetch(`http://localhost:5000/api/applications/${appId}/validate-and-discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNote: reviewAdminNote,
          status: targetStatus,
          rhId: adminUser.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message, type: 'success' });
        if (selectedAppReviewData && selectedAppReviewData.application && selectedAppReviewData.application.id === appId) {
          setSelectedAppReviewData({
            ...selectedAppReviewData,
            application: {
              ...selectedAppReviewData.application,
              status: targetStatus,
              discharge_sent: true,
              discharge_content: data.dischargeHTML
            }
          });
        }
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la validation.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau lors de la validation.', type: 'error' });
    } finally {
      setValidatingAndDischarging(false);
    }
  };

  // Raccourci Accuser réception
  const handleAcknowledge = async (appId) => {
    await handleValidateAndDischargeApplication(appId, 'en_examen');
  };

  // Accuser réception & Confirmer l'inscription à une formation (Génère la décharge officielle)
  const handleConfirmTrainingApp = async (appId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/training-applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CONFIRMEE',
          admin_notes: 'Dossier complet validé par la commission RH municipale.'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          text: 'Réception accusée & Inscription validée ! La Décharge officielle avec référence a été transmise au candidat.',
          type: 'success'
        });
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur validation.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    }
  };

  // Refuser une demande de formation
  const handleRefuseTrainingApp = async (appId) => {
    if (!window.confirm('Voulez-vous marquer cette demande de formation comme non retenue ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/training-applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REFUSEE',
          admin_notes: 'Capacité maximale atteinte ou profil non adapté pour cette session.'
        })
      });
      if (res.ok) {
        setMsg({ text: 'Demande de formation marquée comme non retenue.', type: 'info' });
        fetchData();
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    }
  };

  // Créer un nouvel événement municipal
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: 'Événement municipal publié avec succès sur le calendrier !', type: 'success' });
        setNewEvent({
          title: '',
          category: 'institutionnel',
          event_date: '',
          start_time: '09h00',
          end_time: '15h00',
          location: 'Hôtel de Ville de Soa — Grande Salle des Actes',
          organizer: 'Mairie de la Commune de Soa',
          target_audience: 'Grand Public & Citoyens de Soa',
          access_type: 'Entrée Libre & Gratuite',
          capacity: 150,
          description: ''
        });
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur publication.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    }
  };

  // Supprimer un événement
  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Voulez-vous supprimer cet événement du calendrier communal ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/events/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMsg({ text: 'Événement supprimé du calendrier.', type: 'info' });
        fetchData();
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    }
  };

  // Sélectionner un candidat et charger sa conversation
  const handleSelectCandidateConversation = async (candidate) => {
    setActiveCandidate(candidate);
    const candId = candidate.candidate_id || candidate.id;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/messages/conversation/${candId}`);
      if (res.ok) {
        setActiveMessages(await res.json());
      }
      const convsRes = await fetch('http://localhost:5000/api/admin/messages/conversations');
      if (convsRes.ok) setConversationsList(await convsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Envoi d'un message par l'Admin RH
  const handleSendAdminMessage = async (e) => {
    if (e) e.preventDefault();
    if (!adminChatInput.trim() || !activeCandidate) return;

    setAdminChatSending(true);
    const candId = activeCandidate.candidate_id || activeCandidate.id;
    const currentAdmin = JSON.parse(localStorage.getItem('user')) || adminUser;

    try {
      const res = await fetch('http://localhost:5000/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentAdmin?.id,
          receiver_id: candId,
          content: adminChatInput.trim(),
          subject: adminChatSubject
        })
      });

      if (res.ok) {
        setAdminChatInput('');
        const msgsRes = await fetch(`http://localhost:5000/api/admin/messages/conversation/${candId}`);
        if (msgsRes.ok) setActiveMessages(await msgsRes.json());
        const convsRes = await fetch('http://localhost:5000/api/admin/messages/conversations');
        if (convsRes.ok) setConversationsList(await convsRes.json());
      } else {
        const errData = await res.json();
        setMsg({ text: errData.message || 'Erreur lors de l envoi du message.', type: 'error' });
      }
    } catch (err) {
      console.error('Erreur envoi message RH:', err);
      setMsg({ text: 'Erreur réseau lors de l envoi du message.', type: 'error' });
    } finally {
      setAdminChatSending(false);
    }
  };

  // Basculer la disponibilité du Service RH
  const handleToggleRhAvailability = async () => {
    const newStatus = !adminRhStatus.is_available;
    try {
      const res = await fetch('http://localhost:5000/api/rh/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_available: newStatus,
          status_text: newStatus ? 'En ligne & Disponible' : 'Hors permanence'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminRhStatus(data.settings);
        setMsg({
          text: newStatus ? ' Permanence RH activée : Vous apparaissez disponible pour les candidats.' : ' Permanence RH suspendue : Les candidats sont informés que les bureaux sont fermés.',
          type: 'info'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-container">
      {/* SIDEBAR ADMIN */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg" alt="Logo" />
            <div className="sidebar-logo-text">MAIRIE DE <span>SOA</span></div>
          </div>
          <div className="app-brand red">ESPACE <span>ADMIN RH</span></div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <i className="fa-solid fa-chart-pie"></i> {t('admin_tab_analytics', 'Tableau Analytique')}
          </button>
          <button className={`nav-item ${activeTab === 'audit_report' ? 'active' : ''}`} onClick={() => { setActiveTab('audit_report'); fetchMonthlyAudit(); }}>
            <i className="fa-solid fa-file-invoice"></i> {language === 'en' ? 'Monthly RH Audit' : 'Journal Audit Mensuel RH'}
          </button>
          <button className={`nav-item ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
            <i className="fa-solid fa-users-gear"></i> {t('admin_tab_apps', 'Candidatures')}
            {applications.length > 0 && <span className="nav-badge-pill">{applications.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => { setActiveTab('candidates'); fetchAdminCandidates(); }}>
            <i className="fa-solid fa-user-shield"></i> {t('admin_tab_candidates', 'Gestion des Candidats')}
            {adminCandidates.length > 0 && <span className="nav-badge-pill green">{adminCandidates.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>
            <i className="fa-solid fa-video"></i> {language === 'en' ? 'Video Interviews' : 'Entretiens Vidéo'}
            {adminInterviews.length > 0 && <span className="nav-badge-pill">{adminInterviews.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'trainings' ? 'active' : ''}`} onClick={() => setActiveTab('trainings')}>
            <i className="fa-solid fa-graduation-cap"></i> {t('admin_tab_trainings', 'Formations')}
            {trainingApps.length > 0 && <span className="nav-badge-pill">{trainingApps.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <i className="fa-regular fa-calendar-days"></i> {t('admin_tab_events', 'Événements')}
            {adminEvents.length > 0 && <span className="nav-badge-pill blue">{adminEvents.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <i className="fa-solid fa-comments"></i> {t('admin_tab_messages', 'Messagerie')}
            {(() => {
              const unreadSum = conversationsList.reduce((acc, c) => acc + parseInt(c.unread_count || 0, 10), 0);
              if (unreadSum > 0) return <span className="nav-badge-pill red">{unreadSum}</span>;
              if (conversationsList.length > 0) return <span className="nav-badge-pill">{conversationsList.length}</span>;
              return null;
            })()}
          </button>
          <button className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
            <i className="fa-solid fa-briefcase"></i> {t('admin_tab_jobs', 'Gestion des Offres')}
          </button>
          <button className={`nav-item ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => { setActiveTab('storage'); fetchStoredDocs(); }}>
            <i className="fa-solid fa-folder-tree"></i> {language === 'en' ? 'Document Storage' : 'Stockage Documents'}
            {allStoredDocs.length > 0 && <span className="nav-badge-pill">{allStoredDocs.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => { setActiveTab('guides'); fetchAdminGuides(); }}>
            <i className="fa-solid fa-book-bookmark"></i> {t('admin_tab_guides', 'Guides & Règlements')}
            {adminGuides.length > 0 && <span className="nav-badge-pill blue">{adminGuides.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
            <i className="fa-solid fa-headset"></i> {t('admin_tab_support', 'Support & Réclamations')}
            {(() => {
              const pendingCount = adminSupportTickets.filter(t => t.status === 'en_attente').length;
              if (pendingCount > 0) return <span className="nav-badge-pill red">{pendingCount}</span>;
              if (adminSupportTickets.length > 0) return <span className="nav-badge-pill">{adminSupportTickets.length}</span>;
              return null;
            })()}
          </button>
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <i className="fa-regular fa-user"></i> {language === 'en' ? 'My HR Profile' : 'Mon Profil RH'}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div
              style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
              title="Cliquer pour modifier la photo de profil RH"
            >
              <img
                src={adminUser.avatar_url || DEFAULT_AVATAR}
                alt="Avatar RH"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16px' }}>
                <i className="fa-solid fa-camera" />
              </div>
            </div>
            <div className="user-info" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
              <span className="user-name">{adminUser.prenom} {adminUser.nom}</span>
              <span className="user-role">{language === 'en' ? 'HR Manager' : 'Responsable RH'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title={t('logout', 'Déconnexion')}>
              <i className="fa-solid fa-power-off"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="admin-main">
        {/* INPUT FILE POUR LA PHOTO DE PROFIL RH */}
        <input
          type="file"
          ref={avatarInputRef}
          onChange={handleAvatarUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {/* HEADER TOP BAR STYLISÉE & CIVIQUE (ALIGNÉE DASHBOARD CANDIDAT) */}
        <header className="admin-topbar">
          <div className="topbar-welcome-title">
            <div className="civic-portal-header-badge">
              <div className="civic-portal-icon-box rh">
                <i className="fa-solid fa-users-gear"></i>
              </div>
              <div className="civic-portal-text-group">
                <div className="civic-portal-kicker">
                  <span className="civic-pulse-dot"></span> PORTAIL OFFICIEL ADMINISTRATION RH
                </div>
                <h2 className="civic-portal-main-heading">
                  Espace Gestion RH <span className="title-dash">—</span> <span className="mairie-highlight">{t("Mairie de")}<span className="soa-green-glow">SOA</span></span>
                </h2>
              </div>
            </div>
          </div>

          <div className="topbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <LanguageSwitcher />
            <AccessibilityToolbar />

            {/* CLOCHE DE NOTIFICATION RH */}
            <div className="topbar-notif-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className={`btn-notif-bell ${showHrNotifDropdown ? 'active' : ''}`}
                onClick={() => setShowHrNotifDropdown(!showHrNotifDropdown)}
                title="Notifications RH &amp; Candidatures Reçues"
                style={{
                  position: 'relative',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#334155',
                  fontSize: '1.15rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fa-regular fa-bell" />
                {unreadHrNotifCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    borderRadius: '10px',
                    padding: '2px 6px',
                    lineHeight: 1,
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)'
                  }}>
                    {unreadHrNotifCount}
                  </span>
                )}
              </button>

              {showHrNotifDropdown && (
                <div className="notif-dropdown-popover" style={{
                  position: 'absolute',
                  right: 0,
                  top: '50px',
                  width: '380px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.18)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div className="notif-popover-header" style={{
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Notifications RH</h5>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{unreadHrNotifCount} non lue(s)</span>
                    </div>
                    {unreadHrNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllHrNotifsRead}
                        style={{ background: 'none', border: 'none', color: '#00a859', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>

                  <div className="notif-popover-list" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {hrNotifications.length === 0 ? (
                      <div style={{ padding: '35px 20px', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="fa-regular fa-bell-slash" style={{ fontSize: '2rem', marginBottom: '8px', color: '#cbd5e1' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>{t("Aucune notification de candidature reçue")}</p>
                      </div>
                    ) : (
                      hrNotifications.slice(0, 10).map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleHrNotificationClick(n)}
                          style={{
                            padding: '13px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            background: n.is_read ? '#ffffff' : '#f0fdf4',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '12px',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: n.is_read ? '#f1f5f9' : '#dcfce7',
                            color: n.is_read ? '#64748b' : '#00a859',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.05rem',
                            flexShrink: 0
                          }}>
                            <i className={n.icon || 'fa-solid fa-user-plus'} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0f172a', fontWeight: n.is_read ? 600 : 800, marginBottom: '3px' }}>{n.title}</strong>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>{n.message}</p>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                              {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BADGE UTILISATEUR RH DANS LA TOPBAR */}
            <div
              className="topbar-user-badge-rh"
              onClick={() => setActiveTab('profile')}
              title="Accéder à mon Profil RH & Sécurité"
            >
              <img
                src={adminUser.avatar_url || DEFAULT_AVATAR}
                alt="Avatar"
                className="topbar-rh-avatar"
              />
              <div className="topbar-rh-meta">
                <span className="topbar-rh-name">
                  {adminUser.prenom} {adminUser.nom}
                </span>
                <small className="topbar-rh-status">
                  <i className="fa-solid fa-circle" /> En ligne &amp; Permanence
                </small>
              </div>
            </div>
          </div>
        </header>

        {msg.text && (
          <div className={`status-banner ${msg.type}`}>
            <span>{msg.text}</span>
            <button
              type="button"
              className="status-banner-close"
              onClick={() => setMsg({ text: '', type: '' })}
              title="Fermer"
            >
              &times;
            </button>
          </div>
        )}

        {/* ONGLET : JOURNAL D'AUDIT & RAPPORT MENSUEL RH */}
        {activeTab === 'audit_report' && (
          <div className="audit-monthly-section" style={{ padding: '24px' }}>

            {/* HEADER EN-TÊTE IMPRESSIONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '24px', borderRadius: '16px', color: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, color: '#60a5fa', marginBottom: '8px' }}>
                  <i className="fa-solid fa-file-invoice" /> JOURNAL D'AUDIT &amp; RAPPORTS MENSUELS RH
                </div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>Rapport d'Activité &amp; Statistique Mensuelle Mairie de Soa</h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
                  Consultez les bilans mensuels consolidés (Candidatures, Stages, Formations, Support citoyen &amp; Répartition géographique) jusqu'à ce mois-ci ({monthlyAuditData ? (monthlyAuditData.reports.find(r=>r.monthKey === selectedAuditMonthKey)?.monthLabel || 'Août 2026') : 'Août 2026'}).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const currentReport = monthlyAuditData ? (monthlyAuditData.reports.find(r => r.monthKey === selectedAuditMonthKey) || monthlyAuditData.reports[0]) : null;
                    printBilanMensuelRH(currentReport, adminUser);
                  }}
                  style={{ background: 'linear-gradient(135deg, #00a859, #008746)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(0,168,89,0.3)' }}
                >
                  <i className="fa-solid fa-file-pdf" /> Imprimer la Fiche Officielle du Bilan (PDF)
                </button>
              </div>
            </div>

            {/* SÉLECTEUR DYNAMIQUE DES MOIS (BOUTONS / ONGLETS MENSUELS) */}
            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '10px' }}>
                <i className="fa-solid fa-calendar-check" style={{ color: '#074696', marginRight: '6px' }} />
                Sélectionnez le mois à consulter :
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {monthlyAuditData && monthlyAuditData.reports.map(m => (
                  <button
                    key={m.monthKey}
                    type="button"
                    onClick={() => setSelectedAuditMonthKey(m.monthKey)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: selectedAuditMonthKey === m.monthKey ? '2px solid #074696' : '1px solid #cbd5e1',
                      background: selectedAuditMonthKey === m.monthKey ? 'linear-gradient(135deg, #074696, #0959be)' : '#f8fafc',
                      color: selectedAuditMonthKey === m.monthKey ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {m.monthLabel} {m.monthKey === monthlyAuditData.current_month_key ? ' (Courant)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* DONNÉES DU MOIS SÉLECTIONNÉ */}
            {monthlyAuditData && (() => {
              const currentReport = monthlyAuditData.reports.find(r => r.monthKey === selectedAuditMonthKey) || monthlyAuditData.reports[0];
              if (!currentReport) return <p style={{ padding: '20px', color: '#64748b' }}>{t("Chargement des données du mois...")}</p>;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* STATISTIQUES CLES DU MOIS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ background: '#ffffff', borderLeft: '5px solid #074696', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Candidatures Emplois</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#074696', margin: '4px 0' }}>{currentReport.emploisCount}</div>
                      <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}><i className="fa-solid fa-briefcase" />{t("Recrutements reçus")}</span>
                    </div>

                    <div style={{ background: '#ffffff', borderLeft: '5px solid #16a34a', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Demandes de Stages</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', margin: '4px 0' }}>{currentReport.stagesCount}</div>
                      <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}><i className="fa-solid fa-graduation-cap" /> Académiques &amp; Pro</span>
                    </div>

                    <div style={{ background: '#ffffff', borderLeft: '5px solid #d97706', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Inscriptions Formations</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>{currentReport.totalTrainings}</div>
                      <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 700 }}><i className="fa-solid fa-certificate" />{t("Ateliers communaux")}</span>
                    </div>

                    <div style={{ background: '#ffffff', borderLeft: '5px solid #dc2626', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tickets Support Citoyen</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{currentReport.totalTickets}</div>
                      <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700 }}><i className="fa-solid fa-headset" />{t("Réclamations enregistrées")}</span>
                    </div>
                  </div>

                  {/* DEUX COLONNES DE RAPPORTS DÉTAILLÉS : SUPPORT ET PROVENANCE GÉOGRAPHIQUE */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
                    
                    {/* BILLETS ET TICKETS PAR CATÉGORIE DU MOIS */}
                    <div style={{ background: '#ffffff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-ticket" style={{ color: '#dc2626' }} />
                        Répartition des Billets &amp; Support du mois de {currentReport.monthLabel}
                      </h3>
                      {currentReport.ticketsByCategory.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t("Aucun ticket de support enregistré ce mois-ci.")}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {currentReport.ticketsByCategory.map((tkCat, idx) => (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                <span>{tkCat.category}</span>
                                <span style={{ color: '#074696', fontWeight: 900 }}>{tkCat.count} demande(s)</span>
                              </div>
                              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)', height: '100%', width: `${Math.min(tkCat.count * 25, 100)}%`, borderRadius: '4px' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PROVENANCE GÉOGRAPHIQUE DU MOIS */}
                    <div style={{ background: '#ffffff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-earth-africa" style={{ color: '#074696' }} />
                        Provenance Géographique des Postulants ({currentReport.monthLabel})
                      </h3>
                      {currentReport.geographicDistribution.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t("Aucune donnée géographique pour ce mois.")}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {currentReport.geographicDistribution.map((geo, idx) => (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                <span> {geo.region}</span>
                                <span style={{ color: '#059669', fontWeight: 900 }}>{geo.count} candidat(s) ({geo.percentage}%)</span>
                              </div>
                              <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ background: 'linear-gradient(90deg, #074696, #10b981)', height: '100%', width: `${Math.min(geo.percentage, 100)}%`, borderRadius: '4px' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* POSTES LES PLUS SOLICITÉS DU MOIS */}
                  <div style={{ background: '#ffffff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-ranking-star" style={{ color: '#d97706' }} />
                      Offres &amp; Demandes de Stages les plus Sollicitées ({currentReport.monthLabel})
                    </h3>
                    {currentReport.topJobs.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t("Aucun dépôt de dossier pour ce mois.")}</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                        {currentReport.topJobs.map((tj, idx) => (
                          <div key={idx} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ width: '32px', height: '32px', background: '#074696', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                              #{idx + 1}
                            </span>
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{tj.title}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{tj.count} dossier(s) déposé(s)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}

          </div>
        )}

        {/* ONGLET 1 : ANALYTIQUE EN TEMPS RÉEL */}
        {activeTab === 'analytics' && analytics && (
          <div className="analytics-section">
            <div className="dashboard-header-simple" style={{ marginBottom: '24px' }}>
              <span className="dash-kicker">{language === 'en' ? 'HR MANAGEMENT • SOA COUNCIL' : 'ESPACE RH • MAIRIE DE SOA'}</span>
              <h1 className="dash-greeting">{currentGreeting}</h1>
              <p className="dash-subtext">
                {language === 'en'
                  ? 'Here is the real-time analytics overview of the HireBridge municipal platform.'
                  : 'Voici la vue d\'ensemble analytique de la plateforme HireBridge en temps réel.'}
              </p>
            </div>

            {/* CARTE STATISTIQUES CLES */}
            <div className="stats-cards-grid">
              <div className="admin-stat-card blue">
                <i className="fa-solid fa-file-signature"></i>
                <div>
                  <h3>{analytics.totalApplications}</h3>
                  <p>Candidatures Reçues</p>
                </div>
              </div>
              <div className="admin-stat-card green">
                <i className="fa-solid fa-briefcase"></i>
                <div>
                  <h3>{analytics.totalJobs}</h3>
                  <p>Offres Publiées</p>
                </div>
              </div>
              <div className="admin-stat-card purple">
                <i className="fa-solid fa-graduation-cap"></i>
                <div>
                  <h3>{analytics.totalTrainings !== undefined ? analytics.totalTrainings : trainingApps.length}</h3>
                  <p>{language === 'en' ? 'Municipal Trainings' : 'Formations Municipales'}</p>
                </div>
              </div>
              <div className="admin-stat-card orange">
                <i className="fa-solid fa-user-check"></i>
                <div>
                  <h3>{analytics.totalCandidates}</h3>
                  <p>Candidats Inscrits</p>
                </div>
              </div>
            </div>

            {/* GRAPHIQUES ANALYTIQUES (VISUELS ET TABLEAUX DÉCISIONNELS) */}
            <div className="charts-grid-two">
              {/* REPARTITION GEOGRAPHIQUE */}
              <div className="analytics-card">
                <h3><i className="fa-solid fa-map-location-dot"></i> Provenance Géographique des Candidats</h3>
                <div className="geo-list">
                  {(analytics.geographicDistribution || []).map((g, idx) => (
                    <div key={idx} className="geo-row">
                      <span className="geo-name">{g.region}</span>
                      <div className="geo-bar-bg">
                        <div className="geo-bar-fill" style={{ width: `${Math.min(g.count * 20, 100)}%` }}></div>
                      </div>
                      <span className="geo-count">{g.count} candidat(s)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* POSTES LES PLUS ATTRACTIFS */}
              <div className="analytics-card">
                <h3><i className="fa-solid fa-fire"></i> Top Offres les Plus Attractives</h3>
                <div className="top-jobs-list">
                  {(analytics.topAttractiveJobs || []).map((tj, idx) => (
                    <div key={idx} className="top-job-item">
                      <span className="rank">#{idx + 1}</span>
                      <div className="top-job-details">
                        <h4>{tj.title}</h4>
                        <p>{tj.total_applications} candidature(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET CANDIDATS : GESTION & SUIVI PAR LA RH */}
        {activeTab === 'candidates' && (
          <div className="tab-pane fade-in">
            <div className="table-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#041430', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-user-shield" style={{ color: '#00a859' }}></i>
                    {t('admin_candidates_title', 'Gestion & Répertoire Officiel des Candidats')}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                    {t('admin_candidates_subtitle', 'Consultez la provenance géographique, les demandes de stage/emploi, et gérez les accès de la plateforme.')}
                  </p>
                </div>
                <button type="button" style={{ background: '#041430', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={fetchAdminCandidates}>
                  <i className="fa-solid fa-rotate-right"></i>
                  {t('refresh', 'Actualiser')}
                </button>
              </div>

              {/* KPIs Synthese Candidats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('total_candidates', 'Total Candidats')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{adminCandidates.length}</h3>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-user-check"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('active_accounts', 'Comptes Actifs')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{adminCandidates.filter(c => !c.is_blocked && c.status !== 'bloqué').length}</h3>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-user-slash"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('blocked_accounts', 'Comptes Bloqués')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{adminCandidates.filter(c => c.is_blocked || c.status === 'bloqué').length}</h3>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-graduation-cap"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('internship_applicants', 'Demandeurs de Stage')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{adminCandidates.filter(c => parseInt(c.stage_requests || 0, 10) > 0).length}</h3>
                  </div>
                </div>
              </div>

              {/* Toolbar Recherche & Filtres */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', background: '#f1f5f9', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ position: 'relative', minWidth: '280px', flex: '1' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
                    placeholder={t('search_candidate_placeholder', 'Rechercher par nom, prénom, email ou ville...')}
                    value={candidateSearchQuery}
                    onChange={(e) => setCandidateSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', background: '#fff', fontWeight: 600 }}
                    value={candidateStatusFilter}
                    onChange={(e) => setCandidateStatusFilter(e.target.value)}
                  >
                    <option value="all">{t('filter_all_status', 'Tous les statuts')}</option>
                    <option value="active">{t('status_active', 'Compte Actif')}</option>
                    <option value="blocked">{t('status_blocked', 'Compte Bloqué')}</option>
                  </select>

                  <select
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', background: '#fff', fontWeight: 600 }}
                    value={candidateRegionFilter}
                    onChange={(e) => setCandidateRegionFilter(e.target.value)}
                  >
                    <option value="all">{t('filter_all_regions', 'Toutes les provenances')}</option>
                    {Array.from(new Set(adminCandidates.map(c => c.ville || c.region || 'Soa'))).map((prov, i) => (
                      <option key={i} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tableau des candidats */}
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('candidate_identity', 'Identité Candidat')}</th>
                      <th>{t('geographic_origin', 'Provenance Géographique')}</th>
                      <th>{t('member_since', 'Membre Depuis')}</th>
                      <th style={{ textAlign: 'center' }}>{t('job_applications_count', 'Candidatures Emploi')}</th>
                      <th style={{ textAlign: 'center' }}>{t('stage_requests_count', 'Demandes de Stage')}</th>
                      <th>{t('account_status', 'Statut du Compte')}</th>
                      <th style={{ textAlign: 'right' }}>{t('actions', 'Actions RH')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminCandidates.filter(c => {
                      const query = candidateSearchQuery.toLowerCase().trim();
                      const fullName = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase();
                      const email = (c.email || '').toLowerCase();
                      const ville = (c.ville || '').toLowerCase();
                      const region = (c.region || '').toLowerCase();
                      const matchesQuery = !query || fullName.includes(query) || email.includes(query) || ville.includes(query) || region.includes(query);

                      const isBlocked = c.is_blocked || c.status === 'bloqué';
                      let matchesStatus = true;
                      if (candidateStatusFilter === 'active') matchesStatus = !isBlocked;
                      if (candidateStatusFilter === 'blocked') matchesStatus = isBlocked;

                      let matchesRegion = true;
                      if (candidateRegionFilter !== 'all') {
                        matchesRegion = (c.ville === candidateRegionFilter) || (c.region === candidateRegionFilter);
                      }

                      return matchesQuery && matchesStatus && matchesRegion;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                          <i className="fa-solid fa-users-slash" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}></i>
                          {t('no_candidates_found', 'Aucun candidat ne correspond à vos critères de recherche.')}
                        </td>
                      </tr>
                    ) : (
                      adminCandidates.filter(c => {
                        const query = candidateSearchQuery.toLowerCase().trim();
                        const fullName = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase();
                        const email = (c.email || '').toLowerCase();
                        const ville = (c.ville || '').toLowerCase();
                        const region = (c.region || '').toLowerCase();
                        const matchesQuery = !query || fullName.includes(query) || email.includes(query) || ville.includes(query) || region.includes(query);

                        const isBlocked = c.is_blocked || c.status === 'bloqué';
                        let matchesStatus = true;
                        if (candidateStatusFilter === 'active') matchesStatus = !isBlocked;
                        if (candidateStatusFilter === 'blocked') matchesStatus = isBlocked;

                        let matchesRegion = true;
                        if (candidateRegionFilter !== 'all') {
                          matchesRegion = (c.ville === candidateRegionFilter) || (c.region === candidateRegionFilter);
                        }

                        return matchesQuery && matchesStatus && matchesRegion;
                      }).map((cand) => {
                        const isBlocked = cand.is_blocked || cand.status === 'bloqué';
                        const createdDate = cand.created_at ? new Date(cand.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                        return (
                          <tr key={cand.id} style={{ backgroundColor: isBlocked ? '#fff5f5' : 'transparent' }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                  src={cand.avatar_url || DEFAULT_AVATAR}
                                  alt=""
                                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div>
                                  <strong style={{ display: 'block', color: '#041430', fontSize: '0.92rem' }}>
                                    {cand.prenom} {cand.nom}
                                  </strong>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{cand.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', color: '#334155' }}>
                                <i className="fa-solid fa-location-dot" style={{ color: '#ef4444' }}></i>
                                <span><strong>{cand.ville || 'Soa'}</strong> ({cand.region || 'Centre'})</span>
                              </div>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              <i className="fa-regular fa-calendar-check" style={{ marginRight: '6px', color: '#00a859' }}></i>
                              {createdDate}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.82rem' }}>
                                {cand.job_applications || 0}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.82rem' }}>
                                {cand.stage_requests || 0}
                              </span>
                            </td>
                            <td>
                              {isBlocked ? (
                                <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-ban"></i> {t('blocked', 'Bloqué')}
                                </span>
                              ) : (
                                <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-circle-check"></i> {t('active', 'Actif')}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title={t('view_activity', 'Voir fiche activité')}
                                  onClick={() => handleOpenCandidateActivity(cand)}
                                >
                                  <i className="fa-solid fa-eye"></i>
                                  {t('activity', 'Fiche Activité')}
                                </button>

                                {isBlocked ? (
                                  <button
                                    type="button"
                                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    disabled={blockingCandidateId === cand.id}
                                    onClick={() => handleToggleBlockCandidate(cand, false)}
                                  >
                                    <i className="fa-solid fa-lock-open"></i>
                                    {t('unblock', 'Débloquer')}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    disabled={blockingCandidateId === cand.id}
                                    onClick={() => {
                                      setCandidateToBlock(cand);
                                      setShowBlockConfirmModal(true);
                                    }}
                                  >
                                    <i className="fa-solid fa-ban"></i>
                                    {t('block', 'Bloquer')}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET GUIDES & RÈGLEMENTS OFFICIELS (ADMIN RH) */}
        {activeTab === 'guides' && (
          <div className="tab-pane fade-in">
            <div className="table-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#041430', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-book-bookmark" style={{ color: '#0284c7' }}></i>
                    {t('admin_guides_title', 'Gestion des Guides & Règlements Municipaux')}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                    {t('admin_guides_subtitle', 'Publiez, modifiez ou supprimez les guides officiels. Toute modification apparaît instantanément sur le dashboard des candidats.')}
                  </p>
                </div>
                <button
                  type="button"
                  style={{ background: '#00a859', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => {
                    setGuideForm({
                      title: '',
                      category: 'Guide Général',
                      description: '',
                      target_audience: 'Tous les candidats',
                      badge_tag: 'Document Officiel',
                      badge_color: '#00a859',
                      file_url_link: ''
                    });
                    setSelectedGuideFile(null);
                    setShowAddGuideModal(true);
                  }}
                >
                  <i className="fa-solid fa-plus"></i>
                  {t('add_new_guide', 'Publier un Nouveau Guide / Règlement')}
                </button>
              </div>

              {/* KPIs Synthèse Guides */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-file-pdf"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('total_guides', 'Guides Publiés')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{adminGuides.length}</h3>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('categories_count', 'Catégories')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>
                      {new Set(adminGuides.map(g => g.category)).size}
                    </h3>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-eye"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t('candidate_access', 'Accès Candidats')}</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>Actif &amp; En Direct</h3>
                  </div>
                </div>
              </div>

              {/* Toolbar Recherche & Filtres */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', background: '#f1f5f9', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ position: 'relative', minWidth: '280px', flex: '1' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
                    placeholder={t('search_guide_placeholder', 'Rechercher par titre, catégorie ou description...')}
                    value={guideSearchQuery}
                    onChange={(e) => setGuideSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', background: '#fff', fontWeight: 600 }}
                  value={guideCategoryFilter}
                  onChange={(e) => setGuideCategoryFilter(e.target.value)}
                >
                  <option value="ALL">{t('filter_all_categories', 'Toutes les catégories')}</option>
                  {Array.from(new Set(adminGuides.map(g => g.category || 'Guide Général'))).map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tableau / Grille des Guides */}
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('guide_title', 'Titre du Guide / Règlement')}</th>
                      <th>{t('category', 'Catégorie')}</th>
                      <th>{t('target_audience', 'Public Cible')}</th>
                      <th>{t('badge_tag', 'Certification')}</th>
                      <th>{t('published_date', 'Date Publication')}</th>
                      <th style={{ textAlign: 'right' }}>{t('actions', 'Actions RH')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminGuides.filter(g => {
                      const q = guideSearchQuery.toLowerCase().trim();
                      const matchesQ = !q || (g.title || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q);
                      const matchesCat = guideCategoryFilter === 'ALL' || g.category === guideCategoryFilter;
                      return matchesQ && matchesCat;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                          <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}></i>
                          {t('no_guides_found', 'Aucun guide ou règlement trouvé.')}
                        </td>
                      </tr>
                    ) : (
                      adminGuides.filter(g => {
                        const q = guideSearchQuery.toLowerCase().trim();
                        const matchesQ = !q || (g.title || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q) || (g.category || '').toLowerCase().includes(q);
                        const matchesCat = guideCategoryFilter === 'ALL' || g.category === guideCategoryFilter;
                        return matchesQ && matchesCat;
                      }).map((guide) => (
                        <tr key={guide.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', color: guide.badge_color || '#00a859', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                <i className="fa-solid fa-file-pdf"></i>
                              </div>
                              <div>
                                <strong style={{ display: 'block', color: '#041430', fontSize: '0.92rem' }}>
                                  {guide.title}
                                </strong>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {guide.description ? guide.description.slice(0, 75) + '...' : 'Aucune description'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                              {guide.category || 'Guide Général'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                            {guide.target_audience || 'Tous les candidats'}
                          </td>
                          <td>
                            <span style={{ background: `${guide.badge_color || '#00a859'}15`, color: guide.badge_color || '#00a859', border: `1px solid ${guide.badge_color || '#00a859'}`, padding: '3px 9px', borderRadius: '12px', fontWeight: 700, fontSize: '0.78rem' }}>
                              {guide.badge_tag || 'Document Officiel'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                            {guide.created_at ? new Date(guide.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title={t('view_pdf', 'Consulter PDF')}
                                onClick={() => window.open(guide.file_url, '_blank')}
                              >
                                <i className="fa-solid fa-eye"></i>
                                {t('view', 'PDF')}
                              </button>

                              <button
                                type="button"
                                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  setEditingGuide(guide);
                                  setGuideForm({
                                    title: guide.title || '',
                                    category: guide.category || 'Guide Général',
                                    description: guide.description || '',
                                    target_audience: guide.target_audience || 'Tous les candidats',
                                    badge_tag: guide.badge_tag || 'Document Officiel',
                                    badge_color: guide.badge_color || '#00a859',
                                    file_url_link: guide.file_url || ''
                                  });
                                  setSelectedGuideFile(null);
                                  setShowEditGuideModal(true);
                                }}
                              >
                                <i className="fa-solid fa-pen"></i>
                                {t('edit', 'Modifier')}
                              </button>

                              <button
                                type="button"
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  setGuideToDelete(guide);
                                  setShowDeleteGuideConfirmModal(true);
                                }}
                              >
                                <i className="fa-solid fa-trash"></i>
                                {t('delete', 'Supprimer')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'applications' && (
          <div className="applications-admin-section">
            <div className="table-card">
              <div className="table-header">
                <h3>Candidatures Triées par Score de Compatibilité IA</h3>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("Candidat")}</th>
                    <th>Poste Visé</th>
                    <th>{t("Provenances")}</th>
                    <th>Score %</th>
                    <th>Statut Actuel</th>
                    <th>Actions RH</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.id}>
                      <td
                        className="candidat-cell"
                        onClick={() => handleOpenApplicationReview(app.id)}
                        style={{ cursor: 'pointer' }}
                        title="Cliquer pour examiner le dossier complet du candidat"
                      >
                        <img src={app.avatar_url || DEFAULT_AVATAR} alt="" className="table-avatar" />
                        <div>
                          <strong style={{ color: '#074696', fontWeight: 800 }}>{app.prenom} {app.nom}</strong>
                          <span className="email-sub">{app.email}</span>
                          <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}><i className="fa-solid fa-folder-open" style={{ marginRight: '4px' }} />{t("Consulter dossier")}</span>
                        </div>
                      </td>
                      <td onClick={() => handleOpenApplicationReview(app.id)} style={{ cursor: 'pointer' }}>
                        <strong style={{ color: '#0f172a' }}>{app.job_title}</strong>
                        <div className="sub-text">{app.department}</div>
                        {app.application_type && app.application_type !== 'emploi' && (
                          <div className="sub-text" style={{ color: '#7c3aed', fontWeight: 700 }}>
                            <i className={app.application_type === 'stage_academique' ? "fa-solid fa-graduation-cap" : (app.application_type === 'stage_vacances' ? "fa-solid fa-umbrella-beach" : "fa-solid fa-briefcase")} style={{ marginRight: '4px' }} />
                            {app.application_type === 'stage_academique' ? 'Stage Académique' : (app.application_type === 'stage_vacances' ? 'Stage de Vacances' : 'Stage Pro')}
                          </div>
                        )}
                      </td>
                      <td>{app.region || 'Soa / Centre'}</td>
                      <td>
                        <span className="score-badge-pill">
                          {app.compatibility_score}% Compatibilité
                        </span>
                      </td>
                      <td>
                        <select 
                          className={`status-select ${app.status}`}
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        >
                          <option value="soumis">{t("Soumis")}</option>
                          <option value="en_examen">En Examen RH</option>
                          <option value="entretien_programme">Entretien Programmé</option>
                          <option value="accepte">Accepté / Retenu</option>
                          <option value="refuse">{t("Refusé")}</option>
                        </select>
                      </td>
                      <td className="actions-cell">
                        {/* Bouton Consulter Dossier & Pièces Téléversées */}
                        <button
                          className="action-btn dossier"
                          onClick={() => handleOpenApplicationReview(app.id)}
                          title="Examiner les pièces téléversées, diplômes et profil avant validation"
                          style={{
                            background: '#074696',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(7, 70, 150, 0.2)'
                          }}
                        >
                          <i className="fa-solid fa-folder-open" /> Dossier
                        </button>

                        {/* Bouton Valider / Décharge Officielle */}
                        {!app.discharge_sent ? (
                          <button
                            className="action-btn acknowledge"
                            onClick={() => handleOpenApplicationReview(app.id)}
                            title="Valider la candidature, émettre la décharge par mail et envoyer le message automatique"
                            style={{
                              background: 'linear-gradient(135deg, #1b8a53, #16a34a)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(27, 138, 83, 0.2)'
                            }}
                          >
                            <i className="fa-solid fa-stamp" /> Valider
                          </button>
                        ) : (
                          <span
                            className="discharge-done-badge"
                            onClick={() => handleOpenApplicationReview(app.id)}
                            style={{ cursor: 'pointer' }}
                            title="Décharge officielle déjà transmise. Cliquer pour afficher."
                          >
                            <i className="fa-solid fa-check-double" /> Déchargé
                          </span>
                        )}

                        <button
                          className="action-btn visio"
                          onClick={() => { setSelectedApp(app); setShowInterviewModal(true); }}
                          title="Programmer Visio"
                        >
                          <i className="fa-solid fa-video" /> Entretien
                        </button>

                        {/* Bouton Rejeter le dossier / document avec Fiche de motif explicite & Email */}
                        <button
                          className="action-btn reject"
                          onClick={() => handleOpenRejectModal(app)}
                          title="Rejeter la candidature avec fiche de motif explicite et notification par mail"
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="fa-solid fa-xmark" /> Rejeter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONGLET : GESTION DES ENTRETIENS VIDÉO RH */}
        {activeTab === 'interviews' && (
          <div className="interviews-admin-section">
            <div className="admin-page-hero" style={{ background: 'linear-gradient(135deg, #074696 0%, #1b8a53 100%)', borderRadius: '16px', padding: '24px 28px', color: '#fff', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ background: 'rgba(255,255,255,0.18)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                  <i className="fa-solid fa-video" /> SALLE DE SÉLECTION &amp; CONVOCATIONS VISIO
                </span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '1.5rem', fontWeight: 900 }}>
                  Supervision des Entretiens en Visioconférence RH
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.95 }}>
                  Programmez, lancez et évaluez les entretiens vidéo avec les candidats. Chaque programmation déclenche automatiquement l'envoi d'un email officiel, un message dans la messagerie avec rappel de prévenance 24h, et des notifications in-app.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: '#fff', color: '#074696', padding: '8px 18px', borderRadius: '12px', textAlign: 'center', fontWeight: 800 }}>
                  <span style={{ display: 'block', fontSize: '1.2rem' }}>{adminInterviews.length}</span>
                  <small style={{ fontSize: '0.7rem' }}>Total Entretiens</small>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 18px', borderRadius: '12px', textAlign: 'center', fontWeight: 800 }}>
                  <span style={{ display: 'block', fontSize: '1.2rem' }}>{adminInterviews.filter(i => i.status === 'programme').length}</span>
                  <small style={{ fontSize: '0.7rem' }}>À Venir</small>
                </div>
              </div>
            </div>

            <div className="section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3><i className="fa-solid fa-calendar-check" /> Liste des Convocations &amp; Séances Visio</h3>
                <button
                  type="button"
                  style={{ background: '#074696', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setActiveTab('applications')}
                >
                  <i className="fa-solid fa-plus" /> Programmer depuis Candidatures
                </button>
              </div>

              {adminInterviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-video-slash" style={{ fontSize: '2.5rem', marginBottom: '10px', display: 'block' }} />
                  <h4 style={{ margin: 0, color: '#475569' }}>{t("Aucun entretien visio programmé")}</h4>
                  <p style={{ fontSize: '0.85rem' }}>{t("Rendez-vous dans l'onglet Candidatures et cliquez sur \"Entretien\" sur le dossier d'un candidat pour programmer un rendez-vous.")}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Heure</th>
                        <th>{t("Candidat")}</th>
                        <th>Poste / Demande</th>
                        <th>Réf. Salle</th>
                        <th>{t("Statut")}</th>
                        <th>Actions RH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminInterviews.map(interview => {
                        const schedDate = new Date(interview.scheduled_at);
                        const dateStr = schedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                        const timeStr = schedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                        return (
                          <tr key={interview.id}>
                            <td>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{dateStr}</div>
                              <small style={{ color: '#1b8a53', fontWeight: 700 }}>{timeStr}</small>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{interview.candidate_prenom} {interview.candidate_nom}</div>
                              <small style={{ color: '#64748b' }}>{interview.candidate_email} {interview.candidate_phone ? `• ${interview.candidate_phone}` : ''}</small>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{interview.job_title}</span>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{interview.department}</div>
                            </td>
                            <td>
                              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem', color: '#074696' }}>
                                #{interview.room_id || `SOA-${interview.id}`}
                              </code>
                            </td>
                            <td>
                              <span className={`status-pill ${interview.status || 'programme'}`}>
                                {interview.status === 'programme' && 'Programmé'}
                                {interview.status === 'en_cours' && 'En direct'}
                                {interview.status === 'termine' && 'Terminé'}
                                {interview.status === 'annule' && 'Annulé'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {(() => {
                                  const isExpired = (new Date(interview.scheduled_at).getTime() + (3 * 3600 * 1000)) < Date.now();
                                  const isJoinable = interview.status !== 'termine' && interview.status !== 'annule' && !isExpired;

                                  return (
                                    <>
                                      {isJoinable && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedInterviewForVisio(interview);
                                            setShowVisioModal(true);
                                          }}
                                          style={{ background: 'linear-gradient(135deg, #074696, #1b8a53)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                          title="Lancer ou rejoindre la salle visio en tant que Recruteur RH"
                                        >
                                          <i className="fa-solid fa-video" /> Lancer Visio
                                        </button>
                                      )}
                                      
                                      {isJoinable && (
                                        <button
                                          type="button"
                                          onClick={() => handleEndInterviewByRh(interview.id)}
                                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                          title="Marquer l'entretien comme terminé"
                                        >
                                          <i className="fa-solid fa-check" /> Clôturer
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditInterviewModal(interview)}
                                        style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0284c7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        title="Modifier la date et l'heure de cet entretien"
                                      >
                                        <i className="fa-solid fa-pen-to-square" /> Modifier
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenDeleteInterviewModal(interview)}
                                        style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        title="Annuler et supprimer cet entretien"
                                      >
                                        <i className="fa-solid fa-trash-can" /> Supprimer
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET 3 : GESTION DES OFFRES D'EMPLOI MUNICIPALES */}
        {activeTab === 'jobs' && (
          <div className="analytics-section">
            <div className="section-header-admin" style={{ marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontFamily: 'Montserrat', fontSize: '1.3rem', fontWeight: 900, color: '#041430', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-briefcase" style={{ color: '#00a859' }} />
                  Gestion &amp; Publication des Offres d'Emploi Municipales
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                  Rédigez et publiez les avis de recrutement pour les postes contractuels, CDD, CDI et opportunités de carrière de la Mairie de Soa.
                </p>
              </div>
            </div>

            {/* FORMULAIRE DESIGN SOFT & HUMANISE */}
            <div className="form-card" style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(11, 25, 44, 0.04)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1.5px solid #f1f5f9' }}>
                <h3 style={{ fontFamily: 'Montserrat', fontSize: '1.15rem', fontWeight: 800, color: '#041430', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-file-pen" style={{ color: '#00a859' }} />
                  Publier une Nouvelle Offre d'Emploi Municipale
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}>
                  <i className="fa-solid fa-globe" style={{ marginRight: '6px' }} /> Visible sur le Portail Citoyen
                </span>
              </div>

              {/* MODÈLES PRÉ-ÉTABLIS EN PILULES DOUCES */}
              <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#00a859', marginRight: '6px' }} />
                  Prérégler avec un modèle communal standard :
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setNewJob({
                      title: 'Agent Administratif & Secrétariat',
                      department: 'Service des Affaires Générales',
                      location: 'Hôtel de Ville de Soa',
                      type: 'CDI',
                      salary_range: '200 000 FCFA - 300 000 FCFA',
                      skills: 'Bureautique, Rédaction administrative, Accueil citoyen',
                      description: 'Gestion des courriers d entrée/sortie, rédaction des notes de service, tenue des registres communaux et assistance administrative générale.'
                    })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#041430', padding: '8px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                  >
                    <i className="fa-solid fa-building-user" style={{ color: '#074696' }} /> Agent Administratif (CDI)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewJob({
                      title: 'Technicien Informatique & Systèmes GED',
                      department: 'Service Informatique & Numérique',
                      location: 'Mairie de Soa — Pôle Numérique',
                      type: 'CDI',
                      salary_range: '250 000 FCFA - 400 000 FCFA',
                      skills: 'Maintenance réseau, SQL, Support utilisateurs, GED',
                      description: 'Maintenance du parc informatique communal, assistance technique aux agents municipaux et administration du portail HireBridge Soa.'
                    })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#041430', padding: '8px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                  >
                    <i className="fa-solid fa-laptop-code" style={{ color: '#00a859' }} /> Technicien Informatique (CDI)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewJob({
                      title: 'Assistant Comptable & Recouvrement Municipal',
                      department: 'Recette Municipale / Finances',
                      location: 'Hôtel de Ville de Soa',
                      type: 'CDD',
                      salary_range: '220 000 FCFA - 320 000 FCFA',
                      skills: 'Comptabilité publique, Excel avancé, Recouvrement fiscal',
                      description: 'Tenue des journaux comptables municipaux, établissement des ordonnances de paiement et appui à la gestion budgétaire.'
                    })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#041430', padding: '8px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                  >
                    <i className="fa-solid fa-calculator" style={{ color: '#d97706' }} /> Assistant Comptable (CDD)
                  </button>
                </div>
              </div>

              {/* FORMULAIRE PRINCIPAL */}
              <form onSubmit={handleCreateJob} className="admin-job-form">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontFamily: 'Montserrat', fontSize: '0.84rem', fontWeight: 800, color: '#041430', marginBottom: '6px', display: 'block' }}>
                      INTITULÉ DU POSTE VACANT *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJob.title}
                      onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                      placeholder="Ex: Responsable Voirie & Urbanisme"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontFamily: 'Montserrat', fontSize: '0.84rem', fontWeight: 800, color: '#041430', marginBottom: '6px', display: 'block' }}>
                      DÉPARTEMENT / SERVICE MUNICIPAL *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJob.department}
                      onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                      placeholder="Ex: Service Informatique"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '18px' }}>
                  <div className="form-group">
                    <label style={{ fontFamily: 'Montserrat', fontSize: '0.84rem', fontWeight: 800, color: '#041430', marginBottom: '6px', display: 'block' }}>
                      TYPE DE CONTRAT *
                    </label>
                    <select
                      value={newJob.type}
                      onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: '#ffffff', fontWeight: 700, color: '#041430' }}
                    >
                      <option value="CDI">CDI (Durée Indéterminée)</option>
                      <option value="CDD">CDD (Durée Déterminée)</option>
                      <option value="Stage">Stage Professionnel d'Insertion</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontFamily: 'Montserrat', fontSize: '0.84rem', fontWeight: 800, color: '#041430', marginBottom: '6px', display: 'block' }}>
                      FOURCHETTE DE RÉMUNÉRATION
                    </label>
                    <input
                      type="text"
                      value={newJob.salary_range}
                      onChange={e => setNewJob({ ...newJob, salary_range: e.target.value })}
                      placeholder="Ex: 250 000 FCFA - 400 000 FCFA"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '18px' }}>
                  <label style={{ fontFamily: 'Montserrat', fontSize: '0.84rem', fontWeight: 800, color: '#041430', marginBottom: '6px', display: 'block' }}>
                    COMPÉTENCES REQUISE (SÉPARÉES PAR DES VIRGULES)
                  </label>
                  <input
                    type="text"
                    value={newJob.skills}
                    onChange={e => setNewJob({ ...newJob, skills: e.target.value })}
                    placeholder="JavaScript, React, SQL"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '18px' }}>
                  <label style={{ fontFamily: 'Montserrat', fontSize: '0.84rem', fontWeight: 800, color: '#041430', marginBottom: '6px', display: 'block' }}>
                    DESCRIPTION DES MISSIONS &amp; EXIGENCES *
                  </label>
                  <textarea
                    rows="4"
                    required
                    value={newJob.description}
                    onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Détaillez les responsabilités, missions principales et profil attendu..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: '#f8fafc', resize: 'vertical' }}
                  ></textarea>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    style={{ background: 'linear-gradient(135deg, #041430 0%, #002b75 100%)', color: '#ffffff', border: 'none', padding: '12px 28px', borderRadius: '14px', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(4, 20, 48, 0.25)', transition: 'all 0.2s ease' }}
                  >
                    <i className="fa-solid fa-cloud-arrow-up" /> Publier l'Offre sur le Portail Citoyen
                  </button>
                </div>
              </form>
            </div>

            {/* TABLEAU DES OFFRES PUBLIÉES */}
            <div className="table-card">
              <div className="table-header">
                <h3>
                  <i className="fa-solid fa-list-check" style={{ color: '#00a859', marginRight: '8px' }} />
                  Catalogue des Offres d'Emploi Actives ({jobs.length})
                </h3>
              </div>

              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-briefcase" style={{ fontSize: '2.5rem', marginBottom: '10px', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>{t("Aucune offre d'emploi publiée pour le moment.")}</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("Intitulé du Poste")}</th>
                      <th>{t("Service / Pôle")}</th>
                      <th>{t("Type")}</th>
                      <th>{t("Rémunération")}</th>
                      <th>{t("Compétences Requis")}</th>
                      <th>{t("Actions RH")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id}>
                        <td>
                          <strong style={{ color: '#041430', fontWeight: 800 }}>{j.title}</strong>
                        </td>
                        <td>{j.department}</td>
                        <td>
                          <span className="role-pill candidat">{j.type}</span>
                        </td>
                        <td>{j.salary_range || 'Selon profil'}</td>
                        <td>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{j.skills || 'Général'}</div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(j.id)}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            title="Supprimer cette offre"
                          >
                            <i className="fa-solid fa-trash-can" /> Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        {/* ONGLET : GESTION DES FORMATIONS & CANDIDATURES */}
        {activeTab === 'trainings' && (
          <div className="analytics-section">
            <div className="section-header-admin" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'Montserrat', fontSize: '1.3rem', fontWeight: 900, color: '#041430', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-graduation-cap" style={{ color: '#00a859' }} />
                  Pôle Formations Municipales &amp; Inscriptions
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                  Gérez le catalogue des programmes de formation (Ajouter, Modifier, Regarder et Supprimer) et instruisez les dossiers des candidats.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTrainingModal(true)}
                style={{ background: 'linear-gradient(135deg, #00a859 0%, #008746 100%)', color: '#ffffff', border: 'none', padding: '12px 22px', borderRadius: '14px', fontFamily: 'Montserrat', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(0, 168, 89, 0.35)', transition: 'all 0.2s ease' }}
              >
                <i className="fa-solid fa-plus" /> + Ajouter une Formation Municipale
              </button>
            </div>

            {/* STATS RAPIDES */}
            <div className="stats-cards-grid" style={{ marginBottom: '28px' }}>
              <div className="admin-stat-card blue">
                <i className="fa-solid fa-graduation-cap" />
                <div>
                  <h3>{trainingsList.length}</h3>
                  <p>Programmes de Formation</p>
                </div>
              </div>

              <div className="admin-stat-card orange">
                <i className="fa-solid fa-users" />
                <div>
                  <h3>{trainingApps.length}</h3>
                  <p>Total Candidatures Formations</p>
                </div>
              </div>

              <div className="admin-stat-card green">
                <i className="fa-solid fa-stamp" />
                <div>
                  <h3>
                    {trainingApps.filter(a => a.status === 'CONFIRMEE' || a.status === 'ACCEPTEE').length}
                  </h3>
                  <p>Décharges Émises &amp; Validées</p>
                </div>
              </div>
            </div>

            {/* 1. GESTION DU CATALOGUE DES FORMATIONS MUNICIPALES (AJOUTER, REGARDER, MODIFIER, SUPPRIMER) */}
            <div className="table-card" style={{ marginBottom: '32px' }}>
              <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontFamily: 'Montserrat', fontSize: '1.1rem', fontWeight: 800, color: '#041430' }}>
                  <i className="fa-solid fa-book-bookmark" style={{ color: '#074696', marginRight: '8px' }} />
                  Catalogue &amp; Gestion des Formations Municipales ({trainingsList.length})
                </h3>
              </div>

              {trainingsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '2.5rem', marginBottom: '10px', display: 'block', color: '#cbd5e1' }} />
                  <p style={{ margin: '0 0 10px 0', fontWeight: 700, color: '#041430' }}>{t("Aucune formation enregistrée dans le catalogue municipal.")}</p>
                  <button
                    type="button"
                    onClick={() => setShowNewTrainingModal(true)}
                    style={{ background: '#00a859', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    + Créer la Première Formation
                  </button>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Intitulé de la Formation</th>
                      <th>Formateur &amp; Lieu</th>
                      <th>Durée &amp; Sessions</th>
                      <th>Capacité (Places)</th>
                      <th>{t("Statut")}</th>
                      <th>Actions RH (Regarder, Modifier, Supprimer)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingsList.map(tr => (
                      <tr key={tr.id}>
                        <td>
                          <strong style={{ color: '#041430', fontWeight: 800, display: 'block' }}>{tr.title}</strong>
                          <span style={{ fontSize: '0.78rem', color: '#00a859', fontWeight: 700 }}>{tr.category || 'Administration'}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.86rem' }}>{tr.trainer || 'Commune de Soa'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{tr.location || 'Hôtel de Ville de Soa'}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#074696', fontSize: '0.86rem' }}>{tr.duration || '3 Semaines'}</span>
                        </td>
                        <td>
                          <span style={{ background: '#f1f5f9', color: '#041430', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '0.82rem' }}>
                            {tr.capacity || 30} Places Max
                          </span>
                        </td>
                        <td>
                          <span className="status-tag-pill actif">
                            {tr.status || 'OUVERTE'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {/* BOUTON REGARDER */}
                            <button
                              type="button"
                              onClick={() => { setViewingTraining(tr); setShowViewTrainingModal(true); }}
                              style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Regarder les détails et la liste des inscrits"
                            >
                              <i className="fa-solid fa-eye" /> Regarder
                            </button>

                            {/* BOUTON MODIFIER */}
                            <button
                              type="button"
                              onClick={() => { setEditingTraining({ ...tr }); setShowEditTrainingModal(true); }}
                              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Modifier cette formation"
                            >
                              <i className="fa-solid fa-pen-to-square" /> Modifier
                            </button>

                            {/* BOUTON SUPPRIMER */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTraining(tr.id, tr.title)}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Supprimer définitivement la formation"
                            >
                              <i className="fa-solid fa-trash-can" /> Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 2. TABLEAU DES CANDIDATURES AUX FORMATIONS ET DÉCHARGES */}
            <div className="table-card">
              <div className="table-header">
                <h3>
                  <i className="fa-solid fa-list-check" style={{ color: '#00a859', marginRight: '8px' }} />
                  Demandes d'Inscription aux Formations ({trainingApps.length})
                </h3>
              </div>

              {trainingApps.length === 0 ? (
                <div className="empty-training-state-card">
                  <div className="empty-icon-circle-rh">
                    <i className="fa-solid fa-inbox" />
                  </div>
                  <h4>{t("Aucune candidature de formation reçue pour le moment")}</h4>
                  <p>
                    Les dossiers d'inscription soumis par les citoyens (CV, Diplômes et Lettres de motivation) s'afficheront automatiquement dans ce tableau avec le module d'émission des Décharges Officieuses.
                  </p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("Candidat")}</th>
                      <th>Formation Demandée</th>
                      <th>Date Soumission</th>
                      <th>Pièces Jointes (Dossier PDF)</th>
                      <th>Statut Actuel</th>
                      <th>Action RH (Validation / Décharge)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingApps.map(app => {
                      const isConfirmed = app.status === 'CONFIRMEE' || app.status === 'ACCEPTEE';
                      const isRefused = app.status === 'REFUSEE';
                      const isPending = !isConfirmed && !isRefused;

                      return (
                        <tr key={app.id}>
                          <td>
                            <strong>{app.prenom} {app.nom}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.email}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.phone || 'Tél: Non renseigné'}</div>
                          </td>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{app.training_title}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                              {app.training_category || 'Formation Continue'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {app.training_duration} • {app.training_location}
                            </div>
                          </td>
                          <td>
                            {new Date(app.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {app.cv_url && (
                                <a href={app.cv_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-file-pdf" /> Voir CV
                                </a>
                              )}
                              {app.request_letter_url && (
                                <a href={app.request_letter_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#0284c7', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-file-signature" /> Voir Demande
                                </a>
                              )}
                              {app.cover_letter_url && (
                                <a href={app.cover_letter_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#059669', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-envelope-open-text" /> Voir Lettre
                                </a>
                              )}
                              {app.identity_card_url && (
                                <a href={app.identity_card_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#7c3aed', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-id-card" /> Voir CNI / Pièce
                                </a>
                              )}
                              {app.diploma_url && (
                                <a href={app.diploma_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className="fa-solid fa-graduation-cap" /> Voir Diplôme
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            {isPending && (
                              <span className="status-badge en_examen">
                                <i className="fa-solid fa-clock" style={{ marginRight: '5px' }} /> En Attente d'Examen
                              </span>
                            )}
                            {isConfirmed && (
                              <div>
                                <span className="status-badge accepte">
                                  <i className="fa-solid fa-check" style={{ marginRight: '5px' }} /> Confirmé
                                </span>
                                <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '4px', fontWeight: 800 }}>
                                  Réf: {app.receipt_number}
                                </div>
                              </div>
                            )}
                            {isRefused && (
                              <span className="status-badge refuse">
                                <i className="fa-solid fa-xmark" style={{ marginRight: '5px' }} /> Non Retenu
                              </span>
                            )}
                          </td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmTrainingApp(app.id)}
                                  style={{
                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.76rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Accuser réception, valider l'inscription et générer la décharge officielle"
                                >
                                  <i className="fa-solid fa-stamp" /> Accuser Réception &amp; Valider
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRefuseTrainingApp(app.id)}
                                  style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Refuser
                                </button>
                              </div>
                            ) : isConfirmed ? (
                              <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 800 }}>
                                <i className="fa-solid fa-circle-check" /> Décharge émise &amp; transmise
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                Dossier clôturé
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ONGLET : GESTION DU CALENDRIER MUNICIPAL & ÉVÉNEMENTS */}
        {activeTab === 'events' && (
          <div className="analytics-section">
            <div className="section-header-admin">
              <div>
                <h3>Calendrier Municipal &amp; Programmation des Événements</h3>
                <p>Publiez et planifiez les sessions de conseil municipal, foires, cérémonies et forums ouverts aux citoyens et candidats de Soa.</p>
              </div>
            </div>

            {/* FORMULAIRE PUBLICATION NOUVEL ÉVÉNEMENT */}
            <div className="job-creation-card" style={{ marginBottom: '28px' }}>
              <div className="form-card-header">
                <i className="fa-regular fa-calendar-plus" />
                <div>
                  <h4>Publier un Nouvel Événement sur le Calendrier Communal</h4>
                  <p>{t("L'événement sera immédiatement visible sur le calendrier des citoyens et candidats.")}</p>
                </div>
              </div>

              <form onSubmit={handleCreateEvent} className="admin-form">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Intitulé de l'Événement *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Session Ordinaire du Conseil Municipal — Vote du Budget"
                      value={newEvent.title}
                      onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Pôle / Catégorie *</label>
                    <select
                      value={newEvent.category}
                      onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                    >
                      <option value="institutionnel">Institutionnel &amp; Délibérations</option>
                      <option value="universitaire">Universitaire &amp; Cérémonies UY II</option>
                      <option value="ecologie">Écologie &amp; Soa Ville Propre</option>
                      <option value="terroir">Foires, Marchés &amp; Terroir</option>
                      <option value="emploi_jeunesse">Emploi &amp; Salons de Recrutement</option>
                      <option value="culture_sport">Culture, Sport &amp; Traditions</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date de l'Événement *</label>
                    <input
                      type="date"
                      required
                      value={newEvent.event_date}
                      onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Heure de Début</label>
                    <input
                      type="text"
                      placeholder="Ex: 09h30"
                      value={newEvent.start_time}
                      onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Heure de Fin</label>
                    <input
                      type="text"
                      placeholder="Ex: 16h00"
                      value={newEvent.end_time}
                      onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Lieu Précis *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Hôtel de Ville de Soa — Grande Salle des Actes"
                      value={newEvent.location}
                      onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Service Organisateur</label>
                    <input
                      type="text"
                      placeholder="Ex: Direction des Affaires Générales"
                      value={newEvent.organizer}
                      onChange={e => setNewEvent({ ...newEvent, organizer: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Public Cible</label>
                    <input
                      type="text"
                      placeholder="Ex: Grand Public, Étudiants, Commerçants..."
                      value={newEvent.target_audience}
                      onChange={e => setNewEvent({ ...newEvent, target_audience: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Conditions d'accès")}</label>
                    <input
                      type="text"
                      placeholder="Ex: Entrée Libre &amp; Gratuite"
                      value={newEvent.access_type}
                      onChange={e => setNewEvent({ ...newEvent, access_type: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("Capacité estimée")}</label>
                    <input
                      type="number"
                      placeholder="150"
                      value={newEvent.capacity}
                      onChange={e => setNewEvent({ ...newEvent, capacity: parseInt(e.target.value, 10) || 100 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description &amp; Ordre du Jour / Programme *</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Détaillez les activités, l'ordre du jour ou les objectifs de cet événement municipal..."
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="submit-job-btn">
                  <i className="fa-solid fa-calendar-check" /> Publier sur le Calendrier Municipal
                </button>
              </form>
            </div>

            {/* LISTE DES ÉVÉNEMENTS PROGRAMMÉS */}
            <div className="admin-table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fa-regular fa-calendar-days" style={{ color: '#2563eb', marginRight: '8px' }} />
                  Événements Officiels Enregistrés ({adminEvents.length})
                </h4>
              </div>

              {adminEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fa-regular fa-calendar-xmark" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }} />
                  <p style={{ fontWeight: 700, margin: 0 }}>{t("Aucun événement programmé pour le moment.")}</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Horaires</th>
                      <th>Intitulé &amp; Pôle</th>
                      <th>Lieu &amp; Organisateur</th>
                      <th>{t("Inscriptions")}</th>
                      <th>{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminEvents.map(ev => {
                      const evDate = new Date(ev.event_date);
                      const isPast = new Date(ev.event_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                      return (
                        <tr key={ev.id} style={{ opacity: isPast ? 0.65 : 1 }}>
                          <td>
                            <strong>{evDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {ev.start_time || '09h00'} - {ev.end_time || '15h00'}
                            </div>
                            <span style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: isPast ? '#f1f5f9' : '#dcfce7',
                              color: isPast ? '#64748b' : '#15803d'
                            }}>
                              {isPast ? 'Archivé / Passé' : 'À venir'}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{ev.title}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>
                              {ev.category === 'institutionnel' && <><i className="fa-solid fa-landmark" style={{ marginRight: '4px' }} />{t("Institutionnel")}</>}
                              {ev.category === 'universitaire' && <><i className="fa-solid fa-graduation-cap" style={{ marginRight: '4px' }} />Universitaire &amp; UY II</>}
                              {ev.category === 'ecologie' && <><i className="fa-solid fa-leaf" style={{ marginRight: '4px' }} />Écologie &amp; Salubrité</>}
                              {ev.category === 'terroir' && <><i className="fa-solid fa-store" style={{ marginRight: '4px' }} />Foires &amp; Terroir</>}
                              {ev.category === 'emploi_jeunesse' && <><i className="fa-solid fa-briefcase" style={{ marginRight: '4px' }} />Emploi &amp; Insertion</>}
                              {ev.category === 'culture_sport' && <><i className="fa-solid fa-trophy" style={{ marginRight: '4px' }} />Sport &amp; Culture</>}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{ev.location}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.organizer}</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.82rem' }}>
                              {ev.registered_count || 0} citoyen(s)
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Supprimer du calendrier"
                            >
                              <i className="fa-solid fa-trash" /> Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ONGLET : MESSAGERIE CANDIDATS & ÉCHANGES DIRECTS */}
        {activeTab === 'messages' && (
          <div className="analytics-section">
            <div className="section-header-admin">
              <div>
                <h3>Messagerie Interne RH — Échanges Directs avec les Candidats</h3>
                <p>{t("Répondez aux questions des postulants, précisez les documents manquants et orientez les stagiaires et candidats aux formations.")}</p>
              </div>

              {/* TOGGLE STATUT DE PERMANENCE RH */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleToggleRhAvailability}
                  style={{
                    background: adminRhStatus.is_available ? '#dcfce7' : '#fee2e2',
                    color: adminRhStatus.is_available ? '#15803d' : '#b91c1c',
                    border: `1.5px solid ${adminRhStatus.is_available ? '#86efac' : '#fca5a5'}`,
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title="Cliquer pour basculer votre statut de permanence"
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: adminRhStatus.is_available ? '#22c55e' : '#ef4444'
                  }} />
                  {adminRhStatus.is_available ? ' Permanence Ouverte (Disponible)' : ' Permanence Fermée (Bureaux Fermés)'}
                </button>
              </div>
            </div>

            {/* INTERFACE SPLIT : LISTE DES CONVERSATIONS & CHAT ACTIF */}
            <div className="admin-chat-split-container" style={{
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              gap: '20px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              minHeight: '620px'
            }}>

              {/* COLONNE GAUCHE : LISTE DES CANDIDATS AYANT ÉCRIT */}
              <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    <i className="fa-solid fa-inbox" style={{ color: '#3b82f6', marginRight: '6px' }} />
                    Conversations ({conversationsList.length})
                  </h4>
                  <small style={{ color: '#64748b' }}>{t("Sélectionnez un candidat pour lui répondre")}</small>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {conversationsList.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <i className="fa-regular fa-comment-dots" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }} />
                      <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700 }}>{t("Aucune conversation pour le moment.")}</p>
                    </div>
                  ) : (
                    conversationsList.map(cand => {
                      const isSelected = activeCandidate && (activeCandidate.candidate_id === cand.candidate_id || activeCandidate.id === cand.candidate_id);
                      const unread = parseInt(cand.unread_count || 0, 10);

                      return (
                        <div
                          key={cand.candidate_id}
                          onClick={() => handleSelectCandidateConversation(cand)}
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : unread > 0 ? '#f0fdf4' : '#ffffff',
                            borderLeft: isSelected ? '4px solid #2563eb' : unread > 0 ? '4px solid #22c55e' : '4px solid transparent',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                              {cand.prenom} {cand.nom}
                            </strong>
                            {unread > 0 && (
                              <span style={{
                                background: '#22c55e',
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                padding: '2px 6px',
                                borderRadius: '10px'
                              }}>
                                {unread} new
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, marginBottom: '2px' }}>
                            {cand.last_subject || 'Général'}
                          </div>

                          <div style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '260px'
                          }}>
                            {cand.last_message || 'Pas de message'}
                          </div>

                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                            {cand.last_message_date ? new Date(cand.last_message_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COLONNE DROITE : FENÊTRE DE CONVERSATION ACTIVE */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {activeCandidate ? (
                  <>
                    {/* EN-TÊTE DU CHAT RH */}
                    <div style={{
                      padding: '16px 22px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                            {activeCandidate.prenom} {activeCandidate.nom}
                          </h4>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '8px' }}>
                            Candidat #{activeCandidate.candidate_id || activeCandidate.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                          {activeCandidate.email} {activeCandidate.phone && `• ${activeCandidate.phone}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCandidateProfileModalData(activeCandidate)}
                        style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-id-card" /> Consulter le Dossier
                      </button>
                    </div>

                    {/* FLUX DE MESSAGES */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '20px',
                      background: '#fafbfc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {activeMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                          <p style={{ fontWeight: 700, margin: 0 }}>{t("Aucun message dans ce fil de discussion.")}</p>
                        </div>
                      ) : (
                        activeMessages.map(m => {
                          const isFromRh = m.sender_role === 'admin_rh' || m.sender_role === 'super_admin' || m.sender_id === (adminUser.id || 6);
                          const mDate = new Date(m.created_at);

                          return (
                            <div
                              key={m.id}
                              style={{
                                alignSelf: isFromRh ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isFromRh ? 'flex-end' : 'flex-start'
                              }}
                            >
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                                {isFromRh ? 'Vous (Service RH)' : `${activeCandidate.prenom} ${activeCandidate.nom}`} • {m.subject || 'Général'}
                              </div>

                              <div style={{
                                background: isFromRh ? '#0f172a' : '#ffffff',
                                color: isFromRh ? '#ffffff' : '#0f172a',
                                border: isFromRh ? 'none' : '1px solid #e2e8f0',
                                padding: '12px 16px',
                                borderRadius: isFromRh ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                fontSize: '0.85rem',
                                lineHeight: 1.5,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                              }}>
                                {m.content}

                                {m.attachment_url && (
                                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: isFromRh ? '1px solid rgba(255,255,255,0.2)' : '1px solid #f1f5f9' }}>
                                    <a
                                      href={m.attachment_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: isFromRh ? '#38bdf8' : '#2563eb',
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <i className="fa-solid fa-paperclip" /> Pièce jointe du candidat
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px' }}>
                                {mDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {mDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* RÉPONSES TYPES RAPIDES RH */}
                    <div style={{
                      padding: '8px 16px',
                      background: '#f1f5f9',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto'
                    }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', alignSelf: 'center', flexShrink: 0 }}>{t("Réponses types :")}</span>
                      <button
                        type="button"
                        onClick={() => setAdminChatInput('Bonjour. Votre dossier est actuellement en cours d\'examen par la commission RH.')}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                      >
                        <i className="fa-solid fa-file-lines" style={{ marginRight: '5px' }} /> Dossier en cours d'examen
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminChatInput('Bonjour. Merci de bien vouloir téléverser un certificat de scolarité valide pour compléter votre demande de stage.')}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                      >
                        <i className="fa-solid fa-paperclip" style={{ marginRight: '5px' }} /> Compléter pièce de stage
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminChatInput('Bonjour. Votre décharge officielle de formation a été émise et est disponible dans votre espace candidat.')}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                      >
                        <i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }} /> Décharge formation émise
                      </button>
                    </div>

                    {/* FORMULAIRE DE RÉPONSE RH */}
                    <form onSubmit={handleSendAdminMessage} style={{ padding: '16px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>{t("Objet officiel :")}</span>
                        <select
                          value={adminChatSubject}
                          onChange={e => setAdminChatSubject(e.target.value)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            outline: 'none'
                          }}
                        >
                          <option value="Information Officielle RH">Information Officielle RH</option>
                          <option value="Suivi de Candidature Emploi">Suivi de Candidature Emploi</option>
                          <option value="Demande de Stage Communal">Demande de Stage Communal</option>
                          <option value="Convocation / Formation">Convocation / Formation</option>
                          <option value="Pièce Justificative Manquante">Pièce Justificative Manquante</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="text"
                          required
                          placeholder={`Répondre officiellement à ${activeCandidate.prenom} ${activeCandidate.nom}...`}
                          value={adminChatInput}
                          onChange={e => setAdminChatInput(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            fontSize: '0.86rem',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={adminChatSending || !adminChatInput.trim()}
                          style={{
                            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0 22px',
                            borderRadius: '12px',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {adminChatSending ? (
                            <i className="fa-solid fa-circle-notch fa-spin" />
                          ) : (
                            <><i className="fa-solid fa-paper-plane" />{t("Répondre")}</>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8',
                    padding: '40px',
                    textAlign: 'center'
                  }}>
                    <i className="fa-regular fa-comments" style={{ fontSize: '3.5rem', marginBottom: '16px' }} />
                    <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.2rem', fontWeight: 900 }}>
                      Centre de Messagerie Municipale
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', maxWidth: '420px' }}>
                      Sélectionnez un candidat dans la colonne de gauche pour consulter l'historique des échanges et lui transmettre des consignes officielles.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ONGLET : GESTION DES OFFRES DE RECRUTEMENT & STAGES */}
        {activeTab === 'jobs' && (
          <div className="analytics-section">
            <div className="section-header-admin">
              <div>
                <h3>Gestion &amp; Publication des Postes Vacants &amp; Stages</h3>
                <p>Publiez de nouvelles opportunités d'emploi communal (CDI, CDD) ou des offres de stage à l'Hôtel de Ville de Soa.</p>
              </div>
            </div>

            {/* FORMULAIRE PUBLICATION NOUVELLE OFFRE AVEC MODÈLES PRÉ-ÉTABLIS */}
            <div className="job-creation-card" style={{ marginBottom: '28px' }}>
              <div className="form-card-header">
                <i className="fa-solid fa-briefcase" />
                <div>
                  <h4>Publier un Poste Vacant ou une Offre de Stage</h4>
                  <p>{t("Utilisez un modèle pré-établi municipal en un clic ou personnalisez les critères.")}</p>
                </div>
              </div>

              {/* MODÈLES PRÉ-ÉTABLIS RAPIDES */}
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>{t("Modèles communaux :")}</span>
                <button
                  type="button"
                  onClick={() => setNewJob({
                    title: 'Agent Administratif & Secrétariat Communal',
                    department: 'Secrétariat Général',
                    location: 'Hôtel de Ville de Soa • Yaoundé, Cameroun',
                    type: 'CDI',
                    salary_range: '180 000 FCFA - 280 000 FCFA',
                    skills: 'Bureautique, Rédaction administrative, Accueil citoyen, Archivage',
                    description: 'Assurer le traitement du courrier communal, l\'accueil des administrés, la tenue des registres officiels et l\'appui administratif aux commissions municipales.'
                  })}
                  style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-landmark" style={{ marginRight: '6px' }} /> Agent Administratif (CDI)
                </button>
                <button
                  type="button"
                  onClick={() => setNewJob({
                    title: 'Technicien Réseaux & Systèmes d\'Information',
                    department: 'Service Informatique',
                    location: 'Hôtel de Ville de Soa • Yaoundé, Cameroun',
                    type: 'CDI',
                    salary_range: '250 000 FCFA - 400 000 FCFA',
                    skills: 'Réseaux, Maintenance, Support technique, Sécurité, SQL',
                    description: 'Maintenance du parc informatique communal, assistance technique aux agents de mairie et sécurisation des bases de données de l\'état civil.'
                  })}
                  style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-laptop-code" style={{ marginRight: '6px' }} /> Technicien Informatique (CDI)
                </button>
                <button
                  type="button"
                  onClick={() => setNewJob({
                    title: 'Assistant Comptable & Finances Publiques',
                    department: 'Direction Financière',
                    location: 'Hôtel de Ville de Soa • Yaoundé, Cameroun',
                    type: 'CDD',
                    salary_range: '220 000 FCFA - 350 000 FCFA',
                    skills: 'Comptabilité publique, Fiscalité locale, Excel avancé, Rapprochement bancaire',
                    description: 'Suivi budgétaire communal, recouvrement des taxes locales et préparation des états financiers pour le compte administratif.'
                  })}
                  style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-chart-pie" style={{ marginRight: '6px' }} /> Assistant Comptable (CDD)
                </button>
                <button
                  type="button"
                  onClick={() => setNewJob({
                    title: 'Stagiaire Académique en Droit Public / Informatique',
                    department: 'Cellule Juridique & SI',
                    location: 'Mairie de Soa • Yaoundé, Cameroun',
                    type: 'Stage',
                    salary_range: 'Indemnité de Stage Communale',
                    skills: 'Droit administratif, Recherche documentaire, Rédaction, Informatique',
                    description: 'Stage de perfectionnement académique au sein des services municipaux de Soa pour les étudiants de niveau Licence/Master.'
                  })}
                  style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-graduation-cap" style={{ marginRight: '6px' }} /> Stagiaire Académique (Stage)
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="admin-form" style={{ padding: '20px' }}>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Intitulé du Poste Vacant *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Responsable Voirie & Urbanisme"
                      value={newJob.title}
                      onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Département / Service *</label>
                    <select
                      value={newJob.department}
                      onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                    >
                      <option value="Secrétariat Général">Secrétariat Général</option>
                      <option value="Service Informatique">Service Informatique</option>
                      <option value="Direction Financière">Direction Financière</option>
                      <option value="Service des Ressources Humaines">Service des Ressources Humaines</option>
                      <option value="Service Technique & Urbanisme">Service Technique &amp; Urbanisme</option>
                      <option value="Service Hygiène & Salubrité">Service Hygiène &amp; Salubrité</option>
                      <option value="Police Municipale">Police Municipale</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Type de Contrat *</label>
                    <select
                      value={newJob.type}
                      onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                    >
                      <option value="CDI">CDI (Durée Indéterminée)</option>
                      <option value="CDD">CDD (Durée Déterminée)</option>
                      <option value="Stage">Stage Académique / Pro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fourchette de Rémunération</label>
                    <input
                      type="text"
                      placeholder="Ex: 200 000 FCFA - 320 000 FCFA"
                      value={newJob.salary_range}
                      onChange={e => setNewJob({ ...newJob, salary_range: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Compétences Requises (séparées par des virgules)</label>
                    <input
                      type="text"
                      placeholder="Ex: Rédaction, Droit, Communication"
                      value={newJob.skills}
                      onChange={e => setNewJob({ ...newJob, skills: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description des Missions &amp; Exigences *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Détaillez les responsabilités, missions principales et profil attendu..."
                    value={newJob.description}
                    onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="submit-job-btn">
                  <i className="fa-solid fa-cloud-arrow-up" /> Publier l'Offre sur le Portail Citoyen
                </button>
              </form>
            </div>

            {/* LISTE DES OFFRES EXISTANTES */}
            <div className="admin-table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fa-solid fa-briefcase" style={{ color: '#2563eb', marginRight: '8px' }} />
                  Postes Vacants &amp; Offres Actives ({jobs.length})
                </h4>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Intitulé du Poste</th>
                    <th>Service Communal</th>
                    <th>{t("Type")}</th>
                    <th>{t("Rémunération")}</th>
                    <th>{t("Statut")}</th>
                    <th>{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(jb => (
                    <tr key={jb.id}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{jb.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{jb.location}</div>
                      </td>
                      <td>{jb.department}</td>
                      <td>
                        <span className={`status-badge ${jb.type === 'CDI' ? 'accepte' : (jb.type === 'CDD' ? 'en_examen' : 'programmee')}`}>
                          {jb.type}
                        </span>
                      </td>
                      <td>{jb.salary_range || 'Selon grille'}</td>
                      <td>
                        <span className={`status-badge ${jb.status === 'actif' ? 'accepte' : 'refuse'}`}>
                          {jb.status || 'actif'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm('Supprimer cette offre ?')) {
                              await fetch(`http://localhost:5000/api/jobs/${jb.id}`, { method: 'DELETE' });
                              fetchData();
                            }
                          }}
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-trash" /> Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ONGLET : SUPPORT CITOYEN & RÉCLAMATIONS */}
        {activeTab === 'support' && (
          <div className="analytics-section">
            <div className="section-header-admin">
              <div>
                <h3>Tickets de Support Citoyen &amp; Réclamations Administratives</h3>
                <p>{t("Consultez les demandes d'assistance des candidats et citoyens, et apportez des réponses officielles avec accusé de réception automatique.")}</p>
              </div>
            </div>

            <div className="admin-table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fa-solid fa-headset" style={{ color: '#2563eb', marginRight: '8px' }} />
                  Demandes d'Assistance Citoyenne ({adminSupportTickets.length})
                </h4>
              </div>

              {adminSupportTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-headset" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block' }} />
                  <p style={{ fontWeight: 700, margin: 0 }}>{t("Aucun ticket de support ouvert pour le moment.")}</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Référence &amp; Date</th>
                      <th>Citoyen / Candidat</th>
                      <th>Catégorie &amp; Objet</th>
                      <th>{t("Message")}</th>
                      <th>{t("Statut")}</th>
                      <th>Action RH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSupportTickets.map(tk => {
                      const tkDate = new Date(tk.created_at);
                      return (
                        <tr key={tk.id}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#0f172a', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                              {tk.ticket_number}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                              {tkDate.toLocaleDateString('fr-FR')} à {tkDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td>
                            <strong>{tk.user_prenom} {tk.user_nom}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tk.user_email}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb' }}>{tk.category}</span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{tk.subject}</div>
                          </td>
                          <td>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tk.message}
                            </p>
                            {tk.admin_response && (
                              <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
                                 Répondu : {tk.admin_response.slice(0, 40)}...
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge ${tk.status === 'resolu' ? 'accepte' : (tk.status === 'en_cours' ? 'programmee' : 'en_examen')}`}>
                              {tk.status === 'resolu' ? ' Résolu' : (tk.status === 'en_cours' ? ' En cours' : ' En attente')}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => { setSelectedTicketToReply(tk); setAdminReplyText(tk.admin_response || ''); }}
                              style={{
                                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <i className="fa-solid fa-reply" /> {tk.admin_response ? 'Modifier Réponse' : 'Répondre'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ONGLET : MON PROFIL RH & SÉCURITÉ */}
        {activeTab === 'profile' && (
          <div className="analytics-section hr-profile-container">
            {/* 1. HERO BANNER PROFIL RH */}
            <div
              className="admin-page-hero hr-profile-hero"
              style={{
                background: 'linear-gradient(135deg, #074696 0%, #0b3269 50%, #1b8a53 100%)',
                borderRadius: '20px',
                padding: '32px 36px',
                color: '#ffffff',
                marginBottom: '26px',
                boxShadow: '0 10px 30px rgba(7, 70, 150, 0.18)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                {/* PHOTO DE PROFIL AVEC ACTION DE CHANGEMENT */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '110px',
                      height: '110px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '4px solid rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      background: '#1e293b',
                      cursor: 'pointer'
                    }}
                    onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                    title="Cliquez pour téléverser une nouvelle photo"
                  >
                    <img
                      src={adminUser.avatar_url || DEFAULT_AVATAR}
                      alt="Photo de profil RH"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: '#1b8a53',
                      color: '#ffffff',
                      border: '2px solid #ffffff',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      fontSize: '0.9rem'
                    }}
                    title="Changer ma photo de profil"
                  >
                    <i className="fa-solid fa-camera" />
                  </button>
                </div>

                {/* INFOS IDENTITAIRES RH */}
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '30px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    <i className="fa-solid fa-shield-halved" /> Direction des Ressources Humaines • Soa
                  </div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                    {adminUser.prenom} {adminUser.nom}
                  </h2>
                  <p style={{ margin: '0 0 12px', fontSize: '0.95rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span><i className="fa-regular fa-envelope" style={{ marginRight: '6px' }} />{adminUser.email}</span>
                    {adminUser.phone && <span><i className="fa-solid fa-phone" style={{ marginRight: '6px' }} />{adminUser.phone}</span>}
                    <span><i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }} />{adminUser.ville || 'Soa'}, {adminUser.region || 'Centre'}</span>
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(34, 197, 94, 0.25)', color: '#86efac', border: '1px solid rgba(134, 239, 172, 0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 800 }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '0.45rem', marginRight: '6px' }} /> Compte RH Officiel &amp; Certifié
                    </span>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                      style={{
                        background: '#ffffff',
                        color: '#074696',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <i className="fa-solid fa-upload" /> Modifier ma photo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* GRILLE DES FORMULAIRES : INFOS PERSONNELLES & MOT DE PASSE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '26px' }}>

              {/* FORMULAIRE 1 : INFORMATIONS PERSONNELLES & PROFESSIONNELLES */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '28px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#074696', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    <i className="fa-regular fa-id-card" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      Informations Professionnelles RH
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Mettez à jour vos coordonnées officielles d'agent municipal.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveAdminProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>{t("Prénom")}</label>
                      <input
                        type="text"
                        required
                        value={adminProfileForm.prenom}
                        onChange={e => setAdminProfileForm({ ...adminProfileForm, prenom: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>{t("Nom de famille")}</label>
                      <input
                        type="text"
                        required
                        value={adminProfileForm.nom}
                        onChange={e => setAdminProfileForm({ ...adminProfileForm, nom: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Adresse Email Professionnelle
                    </label>
                    <input
                      type="email"
                      required
                      value={adminProfileForm.email}
                      onChange={e => setAdminProfileForm({ ...adminProfileForm, email: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Téléphone / WhatsApp Professionnel
                    </label>
                    <input
                      type="text"
                      placeholder="+237 6XX XX XX XX"
                      value={adminProfileForm.phone}
                      onChange={e => setAdminProfileForm({ ...adminProfileForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>{t("Ville de service")}</label>
                      <input
                        type="text"
                        value={adminProfileForm.ville}
                        onChange={e => setAdminProfileForm({ ...adminProfileForm, ville: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>{t("Région")}</label>
                      <input
                        type="text"
                        value={adminProfileForm.region}
                        onChange={e => setAdminProfileForm({ ...adminProfileForm, region: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAdminProfile}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #074696, #1b8a53)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: savingAdminProfile ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(7, 70, 150, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {savingAdminProfile ? (
                      <><i className="fa-solid fa-spinner fa-spin" />{t("Enregistrement en cours...")}</>
                    ) : (
                      <><i className="fa-solid fa-floppy-disk" />{t("Enregistrer les modifications du profil")}</>
                    )}
                  </button>
                </form>
              </div>

              {/* FORMULAIRE 2 : SÉCURITÉ & MODIFICATION DU MOT DE PASSE */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '28px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-lock" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      Sécurité &amp; Mot de Passe
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Modifiez votre mot de passe pour garantir la confidentialité de vos accès.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePasswordSubmit}>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Saisissez votre mot de passe actuel"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Nouveau mot de passe (6 caractères min.)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Nouveau mot de passe robuste"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Retapez le nouveau mot de passe"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569' }}>
                    <i className="fa-solid fa-circle-info" style={{ color: '#074696', marginRight: '6px' }} />
                    Assurez-vous d'utiliser un mot de passe robuste combinant lettres, chiffres et symboles.
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #0f172a, #334155)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: changingPassword ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {changingPassword ? (
                      <><i className="fa-solid fa-spinner fa-spin" />{t("Mise à jour en cours...")}</>
                    ) : (
                      <><i className="fa-solid fa-key" />{t("Mettre à jour le mot de passe")}</>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* 3. CARTE DES HABILITATIONS & DROITS DE GESTION RH */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '26px 30px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-shield" style={{ color: '#1b8a53' }} /> Habilitations &amp; Privilèges Officiels du Compte
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <i className="fa-solid fa-check-circle" style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Supervision des candidatures &amp; Matching IA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <i className="fa-solid fa-check-circle" style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Programmation &amp; Salons d'Entretiens Visio</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <i className="fa-solid fa-check-circle" style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Gestion des Formations &amp; Décharges Officielles</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <i className="fa-solid fa-check-circle" style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>Publication &amp; Suivi des Offres Municipales</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* ONGLET : STOCKAGE INTERNE & GED MUNICIPALE DES DOCUMENTS CANDIDATS */}
        {/* ========================================== */}
        {activeTab === 'storage' && (
          <div className="tab-fade">
            {/* HERO BANNER DU STOCKAGE INTERNE */}
            <div
              style={{
                background: 'linear-gradient(135deg, #074696 0%, #0b3269 60%, #1b8a53 100%)',
                padding: '28px 32px',
                borderRadius: '20px',
                color: '#ffffff',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(7, 70, 150, 0.2)'
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    <i className="fa-solid fa-server" style={{ marginRight: '6px' }} /> GED &amp; Coffre-fort Numérique Communal
                  </span>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    Stockage Sécurisé Mairie de Soa
                  </span>
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.7rem', fontWeight: 900 }}>
                  Stockage Interne &amp; Documents des Candidats
                </h2>
                <p style={{ margin: 0, maxWidth: '750px', fontSize: '0.88rem', opacity: 0.95, lineHeight: 1.6 }}>
                  Consultez, lisez directement dans la plateforme, imprimez et téléchargez l'ensemble des pièces justificatives, CV, CNI, casiers judiciaires et diplômes certifiés reçus de l'ensemble des candidats de la Commune de Soa.
                </p>
              </div>
            </div>

            {/* KPI STATS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '22px' }}>
              <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', color: '#074696', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  <i className="fa-solid fa-folder-tree" />
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Fichiers Reçus</span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>{allStoredDocs.length}</h3>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  <i className="fa-solid fa-file-pdf" />
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Documents PDF</span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                    {allStoredDocs.filter(d => (d.mime_type || '').includes('pdf') || (d.file_name || '').toLowerCase().endsWith('.pdf')).length}
                  </h3>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  <i className="fa-solid fa-graduation-cap" />
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Diplômes Authentifiés</span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                    {allStoredDocs.filter(d => (d.doc_type || '').toUpperCase().includes('DIPL')).length}
                  </h3>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  <i className="fa-solid fa-id-card" />
                </div>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>CNI &amp; Pièces d'Identité</span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                    {allStoredDocs.filter(d => (d.doc_type || '').toUpperCase().includes('CNI') || (d.doc_type || '').toUpperCase().includes('IDENTIT')).length}
                  </h3>
                </div>
              </div>
            </div>

            {/* BARRE DE RECHERCHE, FILTRES ET OPTIONS D'AFFICHAGE */}
            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1.5px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Rechercher par candidat, email, nom de fichier ou poste..."
                    value={storageSearchTerm}
                    onChange={e => setStorageSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '9px 14px 9px 38px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.86rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'ALL', label: `Tous (${allStoredDocs.length})` },
                    { key: 'CV', label: 'CV & Lettres' },
                    { key: 'DIP', label: 'Diplômes' },
                    { key: 'CNI', label: 'CNI & Identité' },
                    { key: 'AUTRE', label: 'Autres Justificatifs' }
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStorageFilterType(f.key)}
                      style={{
                        background: storageFilterType === f.key ? '#074696' : '#f8fafc',
                        color: storageFilterType === f.key ? '#ffffff' : '#475569',
                        border: '1.5px solid',
                        borderColor: storageFilterType === f.key ? '#074696' : '#cbd5e1',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={fetchStoredDocs}
                  disabled={loadingStoredDocs}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Actualiser le stockage"
                >
                  <i className={`fa-solid fa-arrows-rotate ${loadingStoredDocs ? 'fa-spin' : ''}`} />
                  Actualiser
                </button>

                <div style={{ display: 'flex', border: '1.5px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleStorageViewMode('grid')}
                    style={{
                      background: storageViewMode === 'grid' ? '#074696' : '#ffffff',
                      color: storageViewMode === 'grid' ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    title="Vue Grille"
                  >
                    <i className="fa-solid fa-border-all" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStorageViewMode('table')}
                    style={{
                      background: storageViewMode === 'table' ? '#074696' : '#ffffff',
                      color: storageViewMode === 'table' ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    title="Vue Tableau / Liste"
                  >
                    <i className="fa-solid fa-list" />
                  </button>
                </div>
              </div>
            </div>

            {/* CONTENU DU STOCKAGE */}
            {(() => {
              const filteredDocs = allStoredDocs.filter(d => {
                const term = storageSearchTerm.toLowerCase().trim();
                const matchSearch = !term ||
                  (d.candidate_nom && d.candidate_nom.toLowerCase().includes(term)) ||
                  (d.candidate_prenom && d.candidate_prenom.toLowerCase().includes(term)) ||
                  (d.candidate_email && d.candidate_email.toLowerCase().includes(term)) ||
                  (d.file_name && d.file_name.toLowerCase().includes(term)) ||
                  (d.doc_type && d.doc_type.toLowerCase().includes(term)) ||
                  (d.job_title && d.job_title.toLowerCase().includes(term));

                if (!matchSearch) return false;

                if (storageFilterType === 'CV') {
                  return (d.doc_type || '').toUpperCase().includes('CV') || (d.doc_type || '').toUpperCase().includes('CURRICULUM') || (d.file_name || '').toUpperCase().includes('CV');
                }
                if (storageFilterType === 'DIP') {
                  return (d.doc_type || '').toUpperCase().includes('DIPL');
                }
                if (storageFilterType === 'CNI') {
                  return (d.doc_type || '').toUpperCase().includes('CNI') || (d.doc_type || '').toUpperCase().includes('IDENTIT');
                }
                if (storageFilterType === 'AUTRE') {
                  const isCv = (d.doc_type || '').toUpperCase().includes('CV') || (d.file_name || '').toUpperCase().includes('CV');
                  const isDip = (d.doc_type || '').toUpperCase().includes('DIPL');
                  const isCni = (d.doc_type || '').toUpperCase().includes('CNI') || (d.doc_type || '').toUpperCase().includes('IDENTIT');
                  return !isCv && !isDip && !isCni;
                }
                return true;
              });

              if (filteredDocs.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '18px', border: '1.5px dashed #cbd5e1' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#eff6ff', color: '#074696', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>
                      <i className="fa-solid fa-folder-open" />
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      Aucun document ne correspond à votre recherche
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                      Modifiez vos filtres ou effectuez une recherche avec d'autres termes.
                    </p>
                  </div>
                );
              }

              // VUE GRILLE
              if (storageViewMode === 'grid') {
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                    {filteredDocs.map((doc, idx) => {
                      const fileUrl = doc.file_url ? (doc.file_url.startsWith('http') ? doc.file_url : `http://localhost:5000${doc.file_url}`) : '#';
                      const isPDF = (doc.file_name || '').toLowerCase().endsWith('.pdf') || (doc.mime_type || '').includes('pdf');
                      const docLabel = (doc.doc_type || 'Pièce Justificative').replace(/_/g, ' ');

                      return (
                        <div
                          key={doc.id ? `doc-${doc.id}-${idx}` : `doc-idx-${idx}`}
                          style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1.5px solid #e2e8f0',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div>
                            {/* EN-TÊTE DE LA CARTE DOCUMENT */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <span
                                style={{
                                  background: isPDF ? '#fee2e2' : '#e0e7ff',
                                  color: isPDF ? '#b91c1c' : '#3730a3',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase'
                                }}
                              >
                                {isPDF ? 'Fichier PDF' : 'Image / Document'}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                                {new Date(doc.uploaded_at || Date.now()).toLocaleDateString('fr-FR')}
                              </span>
                            </div>

                            {/* TITRE DU DOCUMENT */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                              <div
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '12px',
                                  background: isPDF ? '#fef2f2' : '#f0fdf4',
                                  color: isPDF ? '#dc2626' : '#16a34a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.4rem',
                                  flexShrink: 0
                                }}
                              >
                                <i className={isPDF ? "fa-solid fa-file-pdf" : "fa-solid fa-file-image"} />
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <h4 style={{ margin: '0 0 4px', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                  {docLabel}
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                  {doc.file_name}
                                </p>
                              </div>
                            </div>

                            {/* INFOS DU CANDIDAT */}
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={doc.candidate_avatar || DEFAULT_AVATAR}
                                alt="Candidat"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
                                <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                  {doc.candidate_prenom} {doc.candidate_nom}
                                </strong>
                                <small style={{ fontSize: '0.72rem', color: '#64748b', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', display: 'block' }}>
                                  {doc.job_title}
                                </small>
                              </div>
                            </div>
                          </div>

                          {/* BOUTONS D'ACTION : LIRE DANS LA PLATEFORME, TÉLÉCHARGER & IMPRIMER */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px' }}>
                            {/* BOUTON LIRE DIRECTEMENT DANS LA PLATEFORME */}
                            <button
                              type="button"
                              onClick={() => handleOpenDocViewer(doc)}
                              style={{
                                background: 'linear-gradient(135deg, #074696, #1b8a53)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                              title="Lire ce document directement dans la plateforme"
                            >
                              <i className="fa-solid fa-eye" /> Lire dans l'app
                            </button>

                            {/* BOUTON TÉLÉCHARGER SUR LA MACHINE */}
                            <a
                              href={fileUrl}
                              download={doc.file_name || 'document_commune_soa.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#f1f5f9',
                                color: '#0f172a',
                                border: '1.5px solid #cbd5e1',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Télécharger sur la machine"
                            >
                              <i className="fa-solid fa-download" />
                            </a>

                            {/* BOUTON IMPRIMER */}
                            <button
                              type="button"
                              onClick={() => handleOpenDocViewer(doc)}
                              style={{
                                background: '#f1f5f9',
                                color: '#0f172a',
                                border: '1.5px solid #cbd5e1',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Imprimer ce document"
                            >
                              <i className="fa-solid fa-print" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // VUE TABLEAU ADMINISTRATIF
              return (
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.74rem' }}>
                        <th style={{ padding: '14px 18px' }}>Type &amp; Fichier</th>
                        <th style={{ padding: '14px 18px' }}>{t("Candidat")}</th>
                        <th style={{ padding: '14px 18px' }}>Poste / Réf</th>
                        <th style={{ padding: '14px 18px' }}>Date Réception</th>
                        <th style={{ padding: '14px 18px', textAlign: 'right' }}>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map((doc, idx) => {
                        const fileUrl = doc.file_url ? (doc.file_url.startsWith('http') ? doc.file_url : `http://localhost:5000${doc.file_url}`) : '#';
                        const isPDF = (doc.file_name || '').toLowerCase().endsWith('.pdf') || (doc.mime_type || '').includes('pdf');
                        return (
                          <tr key={doc.id ? `tbl-${doc.id}-${idx}` : `tbl-idx-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <i className={isPDF ? "fa-solid fa-file-pdf" : "fa-solid fa-file-image"} style={{ color: isPDF ? '#dc2626' : '#16a34a', fontSize: '1.2rem' }} />
                                <div>
                                  <strong style={{ color: '#0f172a', display: 'block' }}>{doc.doc_type}</strong>
                                  <small style={{ color: '#64748b' }}>{doc.file_name}</small>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{doc.candidate_prenom} {doc.candidate_nom}</div>
                              <small style={{ color: '#64748b' }}>{doc.candidate_email}</small>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#334155' }}>
                              {doc.job_title}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem' }}>
                              {new Date(doc.uploaded_at || Date.now()).toLocaleDateString('fr-FR')}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDocViewer(doc)}
                                  style={{ background: '#074696', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Lire dans la plateforme"
                                >
                                  <i className="fa-solid fa-eye" /> Lire
                                </button>
                                <a
                                  href={fileUrl}
                                  download={doc.file_name}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                  title="Télécharger"
                                >
                                  <i className="fa-solid fa-download" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

          </div>
        )}

      </main>



      {/* MODALE D'EXAMEN APPROFONDI DU DOSSIER DE CANDIDATURE & PIÈCES TÉLÉVERSÉES */}
      {showAppReviewModal && selectedAppReviewData && (
        <div className="modal-overlay" onClick={() => setShowAppReviewModal(false)}>
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: '940px',
              maxHeight: '92vh',
              padding: '0',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4)',
              background: '#ffffff'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* EN-TÊTE DE LA CANDIDATURE (FIXE) */}
            <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #074696 0%, #0b3269 50%, #1b8a53 100%)', padding: '24px 28px', color: '#fff', position: 'relative' }}>
              <button
                type="button"
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}
                onClick={() => setShowAppReviewModal(false)}
              >
                
              </button>

              <div style={{ display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap' }}>
                <img
                  src={selectedAppReviewData.application.avatar_url || DEFAULT_AVATAR}
                  alt=""
                  style={{ width: '85px', height: '85px', borderRadius: '50%', border: '4px solid #fff', objectFit: 'cover', boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}
                />
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Réf. Candidature #{selectedAppReviewData.application.id}
                    </span>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Matching IA : {selectedAppReviewData.application.compatibility_score || 80}%
                    </span>
                    {selectedAppReviewData.application.discharge_sent ? (
                      <span style={{ background: 'rgba(34, 197, 94, 0.3)', color: '#86efac', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                        <i className="fa-solid fa-check-double" /> Décharge Émise
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(234, 179, 8, 0.3)', color: '#fef08a', border: '1px solid #fef08a', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                        <i className="fa-solid fa-hourglass-half" /> En attente de décharge
                      </span>
                    )}
                  </div>

                  <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 900 }}>
                    {selectedAppReviewData.application.prenom} {selectedAppReviewData.application.nom}
                  </h2>

                  <div style={{ fontSize: '1.05rem', color: '#86efac', fontWeight: 800, marginBottom: '6px' }}>
                    <i className="fa-solid fa-briefcase" style={{ marginRight: '6px' }} />
                    Poste souhaité : {selectedAppReviewData.application.job_title} ({selectedAppReviewData.application.department})
                  </div>

                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.84rem', opacity: 0.95 }}>
                    <span><i className="fa-regular fa-envelope" style={{ marginRight: '4px' }} />{selectedAppReviewData.application.email}</span>
                    {selectedAppReviewData.application.phone && <span><i className="fa-solid fa-phone" style={{ marginRight: '4px' }} />{selectedAppReviewData.application.phone}</span>}
                    <span><i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }} />{selectedAppReviewData.application.ville || 'Soa'} ({selectedAppReviewData.application.region || 'Centre'})</span>
                    <span><i className="fa-regular fa-calendar-days" style={{ marginRight: '4px' }} />Déposé le {new Date(selectedAppReviewData.application.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NAVIGATION PAR ONGLETS DANS LA MODALE (FIXE) */}
            <div style={{ flexShrink: 0, display: 'flex', gap: '8px', padding: '12px 24px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setReviewActiveTab('documents')}
                style={{
                  background: reviewActiveTab === 'documents' ? '#074696' : '#ffffff',
                  color: reviewActiveTab === 'documents' ? '#ffffff' : '#334155',
                  border: '1.5px solid',
                  borderColor: reviewActiveTab === 'documents' ? '#074696' : '#cbd5e1',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-folder-open" />
                Pièces Téléversées ({selectedAppReviewData.documents ? selectedAppReviewData.documents.length : 0})
              </button>

              <button
                type="button"
                onClick={() => setReviewActiveTab('diplomas')}
                style={{
                  background: reviewActiveTab === 'diplomas' ? '#074696' : '#ffffff',
                  color: reviewActiveTab === 'diplomas' ? '#ffffff' : '#334155',
                  border: '1.5px solid',
                  borderColor: reviewActiveTab === 'diplomas' ? '#074696' : '#cbd5e1',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-graduation-cap" />
                Diplômes &amp; Certifications ({selectedAppReviewData.diplomas ? selectedAppReviewData.diplomas.length : 0})
              </button>

              <button
                type="button"
                onClick={() => setReviewActiveTab('profile')}
                style={{
                  background: reviewActiveTab === 'profile' ? '#074696' : '#ffffff',
                  color: reviewActiveTab === 'profile' ? '#ffffff' : '#334155',
                  border: '1.5px solid',
                  borderColor: reviewActiveTab === 'profile' ? '#074696' : '#cbd5e1',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-regular fa-user" />
                Profil &amp; Compétences
              </button>

              <button
                type="button"
                onClick={() => setReviewActiveTab('discharge')}
                style={{
                  background: reviewActiveTab === 'discharge' ? '#074696' : '#ffffff',
                  color: reviewActiveTab === 'discharge' ? '#ffffff' : '#334155',
                  border: '1.5px solid',
                  borderColor: reviewActiveTab === 'discharge' ? '#074696' : '#cbd5e1',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-stamp" />
                Décharge Officielle
              </button>

              <button
                type="button"
                onClick={() => setReviewActiveTab('official_fiche')}
                style={{
                  background: reviewActiveTab === 'official_fiche' ? '#15803d' : '#ffffff',
                  color: reviewActiveTab === 'official_fiche' ? '#ffffff' : '#15803d',
                  border: '1.5px solid',
                  borderColor: '#15803d',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: reviewActiveTab === 'official_fiche' ? '0 4px 12px rgba(21, 128, 61, 0.25)' : 'none'
                }}
              >
                <i className="fa-solid fa-file-pdf" />
                Fiche Officielle du Candidat
              </button>
            </div>

            {/* CORPS DE L'ONGLET SÉLECTIONNÉ (DÉFILABLE DE HAUT EN BAS) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minHeight: '180px' }}>

              {/* ONGLET 1 : PIÈCES JOINTES & DOCUMENTS TÉLÉVERSÉS */}
              {reviewActiveTab === 'documents' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      <i className="fa-solid fa-file-shield" style={{ color: '#074696', marginRight: '8px' }} />
                      Pièces Justificatives Téléversées par le Candidat
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Format PDF / Image vérifié par le système
                    </span>
                  </div>

                  {selectedAppReviewData.documents && selectedAppReviewData.documents.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {selectedAppReviewData.documents.map((doc, idx) => {
                        const fileUrl = doc.file_url ? (doc.file_url.startsWith('http') ? doc.file_url : `http://localhost:5000${doc.file_url}`) : '#';
                        const docLabel = (doc.document_type || doc.doc_type || 'Document Justificatif').replace(/_/g, ' ').toUpperCase();
                        const isPDF = (doc.file_name || '').toLowerCase().endsWith('.pdf') || (doc.mime_type || '').includes('pdf');

                        return (
                          <div
                            key={doc.id || idx}
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '14px',
                              padding: '18px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ background: isPDF ? '#fee2e2' : '#e0e7ff', color: isPDF ? '#b91c1c' : '#3730a3', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                                  {isPDF ? 'DOCUMENT PDF' : 'IMAGE / JUSTIFICATIF'}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {new Date(doc.uploaded_at || selectedAppReviewData.application.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: isPDF ? '#fef2f2' : '#f0fdf4', color: isPDF ? '#dc2626' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                                  <i className={isPDF ? "fa-solid fa-file-pdf" : "fa-solid fa-file-image"} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <h4 style={{ margin: '0 0 2px', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                    {docLabel}
                                  </h4>
                                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                    {doc.file_name}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenDocViewer({
                                  ...doc,
                                  candidate_nom: selectedAppReviewData.application.nom,
                                  candidate_prenom: selectedAppReviewData.application.prenom,
                                  candidate_email: selectedAppReviewData.application.email
                                })}
                                style={{
                                  background: 'linear-gradient(135deg, #074696, #1b8a53)',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                                title="Lire ce document directement dans la plateforme"
                              >
                                <i className="fa-solid fa-eye" /> Lire dans l'app
                              </button>

                              <a
                                href={fileUrl}
                                download={doc.file_name || 'document_candidat.pdf'}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  border: '1.5px solid #cbd5e1',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Télécharger sur la machine"
                              >
                                <i className="fa-solid fa-download" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleOpenDocViewer({
                                  ...doc,
                                  candidate_nom: selectedAppReviewData.application.nom,
                                  candidate_prenom: selectedAppReviewData.application.prenom,
                                  candidate_email: selectedAppReviewData.application.email
                                })}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  border: '1.5px solid #cbd5e1',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Imprimer ce document"
                              >
                                <i className="fa-solid fa-print" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '14px', border: '1.5px dashed #cbd5e1' }}>
                      <i className="fa-solid fa-folder-open" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '10px', display: 'block' }} />
                      <h4 style={{ margin: '0 0 6px', color: '#334155', fontWeight: 800 }}>{t("Aucune pièce justificative séparée")}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        Le dossier a été soumis via le formulaire direct sans pièces jointes additionnelles.
                      </p>
                    </div>
                  )}

                  {/* LETTRE DE MOTIVATION / REMARQUE DU CANDIDAT */}
                  {selectedAppReviewData.application.cover_letter && (
                    <div style={{ marginTop: '24px', background: '#f8fafc', padding: '18px 22px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                        <i className="fa-solid fa-quote-left" style={{ color: '#074696', marginRight: '6px' }} />
                        Lettre de Motivation / Déclaration du Candidat
                      </h4>
                      <p style={{ margin: 0, color: '#334155', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {selectedAppReviewData.application.cover_letter}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 2 : DIPLÔMES & CERTIFICATIONS */}
              {reviewActiveTab === 'diplomas' && (
                <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    <i className="fa-solid fa-graduation-cap" style={{ color: '#9333ea', marginRight: '8px' }} />
                    Diplômes et Certifications Authentifiés ({selectedAppReviewData.diplomas ? selectedAppReviewData.diplomas.length : 0})
                  </h3>

                  {selectedAppReviewData.diplomas && selectedAppReviewData.diplomas.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedAppReviewData.diplomas.map((dip, idx) => {
                        const dipUrl = dip.file_url ? (dip.file_url.startsWith('http') ? dip.file_url : `http://localhost:5000${dip.file_url}`) : '#';
                        return (
                          <div
                            key={dip.id || idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '14px 18px',
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '12px',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                <i className="fa-solid fa-certificate" />
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>{dip.title}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {dip.institution} • {dip.level} ({dip.year})
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenDocViewer({
                                  ...dip,
                                  doc_type: 'DIPLÔME / CERTIFICATION',
                                  file_name: dip.title,
                                  candidate_nom: selectedAppReviewData.application.nom,
                                  candidate_prenom: selectedAppReviewData.application.prenom,
                                  candidate_email: selectedAppReviewData.application.email
                                })}
                                style={{
                                  background: 'linear-gradient(135deg, #074696, #1b8a53)',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                title="Lire ce diplôme dans la plateforme"
                              >
                                <i className="fa-solid fa-eye" /> Lire dans l'app
                              </button>
                              <a
                                href={dipUrl}
                                download={dip.file_name || 'diplome_candidat.pdf'}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  border: '1.5px solid #cbd5e1',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title="Télécharger"
                              >
                                <i className="fa-solid fa-download" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '14px', border: '1.5px dashed #cbd5e1' }}>
                      <p style={{ margin: 0, color: '#64748b', fontWeight: 700 }}>{t("Aucun diplôme enregistré dans le profil.")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 3 : PROFIL & COMPÉTENCES DU CANDIDAT */}
              {reviewActiveTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* LIENS & PORTFOLIO */}
                  {(selectedAppReviewData.application.portfolio_url || selectedAppReviewData.application.linkedin_url || selectedAppReviewData.application.github_url) && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '12px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>{t("Liens professionnels :")}</span>
                      {selectedAppReviewData.application.portfolio_url && (
                        <a href={selectedAppReviewData.application.portfolio_url.startsWith('http') ? selectedAppReviewData.application.portfolio_url : `https://${selectedAppReviewData.application.portfolio_url}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                           Portfolio <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82em' }} />
                        </a>
                      )}
                      {selectedAppReviewData.application.linkedin_url && (
                        <a href={selectedAppReviewData.application.linkedin_url.startsWith('http') ? selectedAppReviewData.application.linkedin_url : `https://${selectedAppReviewData.application.linkedin_url}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          LinkedIn <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82em' }} />
                        </a>
                      )}
                      {selectedAppReviewData.application.github_url && (
                        <a href={selectedAppReviewData.application.github_url.startsWith('http') ? selectedAppReviewData.application.github_url : `https://${selectedAppReviewData.application.github_url}`} target="_blank" rel="noreferrer" style={{ color: '#334155', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          GitHub <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82em' }} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* BIO / PRÉSENTATION */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
                      <i className="fa-solid fa-quote-left" style={{ color: '#1b8a53', marginRight: '6px' }} />
                      Pitch &amp; Présentation du Candidat
                    </h4>
                    <p style={{ margin: 0, background: '#f8fafc', padding: '14px', borderRadius: '10px', color: '#334155', lineHeight: 1.6, fontSize: '0.9rem' }}>
                      {selectedAppReviewData.application.candidate_bio || 'Aucune description rédigée.'}
                    </p>
                  </div>

                  {/* COMPÉTENCES */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
                      <i className="fa-solid fa-layer-group" style={{ color: '#3b82f6', marginRight: '6px' }} />
                      Compétences Clés &amp; Domaines d'Expertise
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Array.isArray(selectedAppReviewData.application.candidate_skills) ? selectedAppReviewData.application.candidate_skills.map((s, idx) => (
                        <span key={idx} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                           {s}
                        </span>
                      )) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t("Non renseigné.")}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ONGLET 4 : DÉCHARGE OFFICIELLE */}
              {reviewActiveTab === 'discharge' && (
                <div>
                  {selectedAppReviewData.application.discharge_sent && selectedAppReviewData.application.discharge_content ? (
                    <div>
                      <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', padding: '12px 18px', borderRadius: '10px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#15803d', fontWeight: 800 }}>
                        <span><i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }} /> Décharge émise &amp; transmise par email à {selectedAppReviewData.application.email}</span>
                        <span style={{ fontSize: '0.8rem', color: '#166534' }}>Date : {new Date(selectedAppReviewData.application.acknowledged_at).toLocaleString('fr-FR')}</span>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: selectedAppReviewData.application.discharge_content }} />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '14px', border: '1.5px dashed #cbd5e1' }}>
                      <i className="fa-solid fa-stamp" style={{ fontSize: '2.5rem', color: '#074696', marginBottom: '12px', display: 'block' }} />
                      <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 800 }}>{t("Décharge non encore émise")}</h4>
                      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                        Cliquez sur le bouton ci-dessous pour valider ce dossier et déclencher l'émission et l'envoi immédiat de la décharge officielle par email et messagerie RH.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleValidateAndDischargeApplication(selectedAppReviewData.application.id, 'en_examen')}
                        disabled={validatingAndDischarging}
                        style={{
                          background: 'linear-gradient(135deg, #1b8a53, #16a34a)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          cursor: validatingAndDischarging ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {validatingAndDischarging ? 'Émission en cours...' : 'Émettre & Transmettre la Décharge Maintenant'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 5 : FICHE OFFICIELLE DU CANDIDAT (A4 PRINT / PDF) */}
              {reviewActiveTab === 'official_fiche' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  
                  {/* BARRE D'ACTIONS D'IMPRESSION & EXPORT */}
                  <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '12px 20px', borderRadius: '12px', color: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.4rem' }} />
                      <div>
                        <strong style={{ fontSize: '0.92rem', display: 'block', color: '#38bdf8' }}>Fiche Officielle Normée du Candidat</strong>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Format A4 officiel avec en-tête républicain &amp; cachet municipal</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        background: 'linear-gradient(135deg, #00a859 0%, #008746 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(0, 168, 89, 0.35)'
                      }}
                    >
                      <i className="fa-solid fa-print" /> Imprimer / Exporter en PDF
                    </button>
                  </div>

                  {/* FEUILLE OFFICIELLE A4 */}
                  <div className="official-cv-document-sheet" style={{ background: '#ffffff', color: '#0f172a', width: '100%', maxWidth: '800px' }}>
                    
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
                        <p>MEFOU &amp; AFAMBA DIVISION</p>
                        <p className="bold-council">SOA COUNCIL</p>
                        <p className="service-name">Human Resources Department</p>
                      </div>
                    </header>

                    {/* 2. TITRE OFFICIEL ET RÉFÉRENCES */}
                    <div className="print-document-title-box">
                      <h2>FICHE OFFICIELLE DU CANDIDAT</h2>
                      <div className="print-ref-bar">
                        <span><strong>DOSSIER N° :</strong> SOA-CAND-{String(selectedAppReviewData.application.user_id || selectedAppReviewData.application.id || 1).padStart(5, '0')}-{new Date().getFullYear()}</span>
                        <span><strong>ÉMIS LE :</strong> {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* 3. IDENTITÉ & COORDONNÉES */}
                    <section className="print-identity-section">
                      <div className="print-avatar-col">
                        <img
                          src={selectedAppReviewData.application.avatar_url || DEFAULT_AVATAR}
                          alt="Avatar"
                          className="print-avatar-photo"
                        />
                        <div className="print-stamp-valid">
                          <i className="fa-solid fa-circle-check" /> PROFIL ENREGISTRÉ
                        </div>
                      </div>

                      <div className="print-identity-details">
                        <h1 className="print-candidate-name">{selectedAppReviewData.application.prenom} {selectedAppReviewData.application.nom}</h1>
                        <div className="print-domain-badge">
                          <i className="fa-solid fa-briefcase" /> {selectedAppReviewData.application.job_title || 'Candidat Polyvalent'}
                        </div>

                        <div className="print-contact-grid">
                          <div className="print-contact-item">
                            <i className="fa-solid fa-envelope" /> <strong>{t("Email :")}</strong> {selectedAppReviewData.application.email}
                          </div>
                          <div className="print-contact-item">
                            <i className="fa-solid fa-phone" /> <strong>{t("Téléphone :")}</strong> {selectedAppReviewData.application.phone || 'Non renseigné'}
                          </div>
                          <div className="print-contact-item">
                            <i className="fa-solid fa-location-dot" /> <strong>{t("Résidence :")}</strong> {selectedAppReviewData.application.ville || 'Soa'} ({selectedAppReviewData.application.region || 'Centre'})
                          </div>
                          <div className="print-contact-item">
                            <i className="fa-solid fa-map-pin" /> <strong>{t("Adresse :")}</strong> {selectedAppReviewData.application.address || 'Soa Centre'}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 4. SYNTHÈSE PROFESSIONNELLE / PROFIL */}
                    <section className="print-section-block">
                      <div className="print-section-title">
                        <i className="fa-solid fa-user-tie" /> 1. PROFIL &amp; SYNTHÈSE PROFESSIONNELLE
                      </div>
                      <div className="print-section-body">
                        <p className="print-bio-text">
                          {selectedAppReviewData.application.bio || selectedAppReviewData.application.cover_letter || 'Candidat qualifié enregistré sur le portail municipal HireBridge de la Commune de Soa, disponible pour contribuer aux missions administratives et techniques de la collectivité.'}
                        </p>
                      </div>
                    </section>

                    {/* 5. DIPLÔMES & CERTIFICATIONS AUTHENTIFIÉS */}
                    <section className="print-section-block">
                      <div className="print-section-title">
                        <i className="fa-solid fa-graduation-cap" /> 2. DIPLÔMES &amp; CERTIFICATIONS AUTHENTIFIÉS ({selectedAppReviewData.diplomas ? selectedAppReviewData.diplomas.length : 0})
                      </div>
                      <div className="print-section-body">
                        {!selectedAppReviewData.diplomas || selectedAppReviewData.diplomas.length === 0 ? (
                          <p className="print-empty-note">
                            Niveau académique déclaré : <strong>{selectedAppReviewData.application.education_level || 'Licence / Master'}</strong>. (Aucun diplôme PDF spécifique joint).
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
                              {selectedAppReviewData.diplomas.map((dip, idx) => (
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

                    {/* 6. COMPÉTENCES & EVALUATION */}
                    <section className="print-section-block">
                      <div className="print-section-title">
                        <i className="fa-solid fa-layer-group" /> 3. COMPÉTENCES &amp; ÉVALUATION MUNICIPALE
                      </div>
                      <div className="print-section-body">
                        <div className="print-summary-grid">
                          <div className="print-summary-card">
                            <span className="summary-label">Matching IA &amp; Compatibilité</span>
                            <span className="summary-val green">{selectedAppReviewData.application.compatibility_score || 85}%</span>
                          </div>
                          <div className="print-summary-card">
                            <span className="summary-label">Statut du Dossier</span>
                            <span className="summary-val">{selectedAppReviewData.application.status || 'En examen'}</span>
                          </div>
                          <div className="print-summary-card">
                            <span className="summary-label">{t("Décharge Officielle")}</span>
                            <span className="summary-val">{selectedAppReviewData.application.discharge_sent ? t("Émise par le RH") : t("En attente")}</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 7. SIGNATURES */}
                    <div className="print-official-footer">
                      <div className="print-signature-box">
                        <p className="sig-city">Soa, le {new Date().toLocaleDateString('fr-FR')}</p>
                        <p className="sig-role">Le Candidat(e)</p>
                        <div className="sig-space"></div>
                        <p className="sig-name">{selectedAppReviewData.application.prenom} {selectedAppReviewData.application.nom}</p>
                      </div>
                      <div className="print-signature-box right">
                        <p className="sig-city">Pour la Mairie de Soa</p>
                        <p className="sig-role">Le Service des Ressources Humaines</p>
                        <div className="sig-space"></div>
                        <p className="sig-name">Cachet Numérique Municipale</p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* PIED DE PAGE & ACTIONS DE VALIDATION RH (FIXE EN BAS) */}
            <div style={{ flexShrink: 0, padding: '18px 26px', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* CHAMP DE NOTE RH */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '6px', display: 'block' }}>
                  <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px', color: '#074696' }} />
                  Note / Consigne RH facultative (apparaîtra sur la décharge et l'accusé de réception) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Dossier complet déclaré recevable pour la commission municipale..."
                  value={reviewAdminNote}
                  onChange={e => setReviewAdminNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* BOUTONS D'ACTIONS DÉCISIONNELLES */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* BOUTON PRINCIPAL VALIDER & DÉCHARGE */}
                  <button
                    type="button"
                    disabled={validatingAndDischarging}
                    onClick={() => handleValidateAndDischargeApplication(selectedAppReviewData.application.id, 'en_examen')}
                    style={{
                      background: 'linear-gradient(135deg, #1b8a53, #16a34a)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 22px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 900,
                      cursor: validatingAndDischarging ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(27, 138, 83, 0.25)'
                    }}
                  >
                    {validatingAndDischarging ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> Traitement &amp; Envoi...</>
                    ) : (
                      <><i className="fa-solid fa-stamp" /> Valider le Dossier &amp; Émettre la Décharge Officielle</>
                    )}
                  </button>

                  {/* PROGRAMMER VISIO */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(selectedAppReviewData.application);
                      setShowInterviewModal(true);
                      setShowAppReviewModal(false);
                    }}
                    style={{
                      background: '#074696',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fa-solid fa-video" /> Programmer Entretien Visio
                  </button>

                  {/* BOUTON REJETER LE DOSSIER AVEC FICHE DE MOTIF */}
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenRejectModal(selectedAppReviewData.application);
                    }}
                    style={{
                      background: '#fef2f2',
                      color: '#b91c1c',
                      border: '1.5px solid #fca5a5',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    title="Rejeter la candidature avec fiche de motif explicite et notification par mail"
                  >
                    <i className="fa-solid fa-file-circle-xmark" /> Rejeter le Dossier
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', color: '#475569', fontSize: '0.85rem' }}
                    onClick={() => setShowAppReviewModal(false)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CONSULTATION DU PROFIL CANDIDAT COMPLET PAR LE RECRUTEUR RH */}
      {candidateProfileModalData && (
        <div className="modal-overlay" onClick={() => setCandidateProfileModalData(null)}>
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: '860px',
              maxHeight: '92vh',
              padding: '0',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4)',
              background: '#ffffff'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* EN-TÊTE DU PROFIL CANDIDAT (FIXE) */}
            <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #064e3b 100%)', padding: '26px 30px', color: '#fff', position: 'relative' }}>
              <button
                type="button"
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setCandidateProfileModalData(null)}
              >
                
              </button>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <img
                  src={candidateProfileModalData.user.avatar_url || DEFAULT_AVATAR}
                  alt=""
                  style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid #fff', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900 }}>
                      {candidateProfileModalData.user.prenom} {candidateProfileModalData.user.nom}
                    </h2>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Complétion : {candidateProfileModalData.completionPercentage || 85}%
                    </span>
                  </div>
                  <div style={{ margin: '6px 0', fontSize: '1rem', color: '#4ade80', fontWeight: 800 }}>
                     {candidateProfileModalData.profile.title || 'Candidat Polyvalent'}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <span><i className="fa-solid fa-envelope" /> {candidateProfileModalData.user.email}</span>
                    <span><i className="fa-solid fa-phone" /> {candidateProfileModalData.user.phone || candidateProfileModalData.profile.phone || 'Non renseigné'}</span>
                    <span><i className="fa-solid fa-location-dot" /> {candidateProfileModalData.user.ville || 'Soa'} ({candidateProfileModalData.user.region || 'Centre'})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CORPS DU PROFIL CANDIDAT (DÉFILABLE) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '26px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* LIENS & PORTFOLIO */}
              {(candidateProfileModalData.profile.portfolio_url || candidateProfileModalData.profile.linkedin_url || candidateProfileModalData.profile.github_url) && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>{t("Liens professionnels :")}</span>
                  {candidateProfileModalData.profile.portfolio_url && (
                    <a
                      href={candidateProfileModalData.profile.portfolio_url.startsWith('http') ? candidateProfileModalData.profile.portfolio_url : `https://${candidateProfileModalData.profile.portfolio_url}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#16a34a', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                       Portfolio en ligne <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82em' }} />
                    </a>
                  )}
                  {candidateProfileModalData.profile.linkedin_url && (
                    <a
                      href={candidateProfileModalData.profile.linkedin_url.startsWith('http') ? candidateProfileModalData.profile.linkedin_url : `https://${candidateProfileModalData.profile.linkedin_url}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0284c7', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      LinkedIn <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82em' }} />
                    </a>
                  )}
                  {candidateProfileModalData.profile.github_url && (
                    <a
                      href={candidateProfileModalData.profile.github_url.startsWith('http') ? candidateProfileModalData.profile.github_url : `https://${candidateProfileModalData.profile.github_url}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#334155', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      GitHub <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.82em' }} />
                    </a>
                  )}
                </div>
              )}

              {/* BIO / PITCH */}
              <div>
                <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
                  <i className="fa-solid fa-quote-left" style={{ color: '#22c55e', marginRight: '6px' }} />
                  Pitch & Présentation
                </h4>
                <p style={{ margin: 0, background: '#f8fafc', padding: '14px', borderRadius: '10px', color: '#334155', lineHeight: 1.6, fontSize: '0.9rem' }}>
                  {candidateProfileModalData.profile.bio || 'Aucune description rédigée par le candidat.'}
                </p>
              </div>

              {/* COMPÉTENCES */}
              <div>
                <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
                  <i className="fa-solid fa-layer-group" style={{ color: '#3b82f6', marginRight: '6px' }} />
                  Compétences Clés & Domaines d'Expertise
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Array.isArray(candidateProfileModalData.profile.skills) ? candidateProfileModalData.profile.skills.map((s, idx) => (
                    <span key={idx} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                       {s}
                    </span>
                  )) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t("Aucune compétence renseignée.")}</span>
                  )}
                </div>
              </div>

              {/* INFOS CLÉS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{t("Niveau d'études")}</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>{candidateProfileModalData.profile.education_level || 'Licence / Master'}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{t("Expérience professionnelle")}</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, color: '#0f172a' }}>{candidateProfileModalData.profile.experience_years || 1} an(s)</p>
                </div>
              </div>

              {/* DIPLÔMES ET CERTIFICATIONS AUTHENTIFIÉS */}
              {candidateProfileModalData.diplomas && candidateProfileModalData.diplomas.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
                    <i className="fa-solid fa-graduation-cap" style={{ color: '#9333ea', marginRight: '6px' }} />
                    Diplômes & Certifications Authentifiés ({candidateProfileModalData.diplomas.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {candidateProfileModalData.diplomas.map(dip => (
                      <div key={dip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.2rem' }} />
                          <div>
                            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{dip.title}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {dip.institution} • {dip.level} ({dip.year})
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDocViewer({
                              ...dip,
                              doc_type: 'DIPLÔME / CERTIFICATION',
                              file_name: dip.title,
                              candidate_nom: candidateProfileModalData.user.nom,
                              candidate_prenom: candidateProfileModalData.user.prenom,
                              candidate_email: candidateProfileModalData.user.email
                            })}
                            style={{ background: '#074696', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <i className="fa-solid fa-eye" /> Lire
                          </button>
                          <a href={dip.file_url} download={dip.file_name} target="_blank" rel="noreferrer" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                            <i className="fa-solid fa-download" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AUTRES DOCUMENTS DU DOSSIER */}
              {candidateProfileModalData.documents && candidateProfileModalData.documents.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
                    <i className="fa-solid fa-folder-open" style={{ color: '#2563eb', marginRight: '6px' }} />
                    Autres Justificatifs
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {candidateProfileModalData.documents.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.2rem' }} />
                          <div>
                            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{doc.document_type || doc.doc_type || 'Document'}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{doc.file_name}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDocViewer({
                              ...doc,
                              candidate_nom: candidateProfileModalData.user.nom,
                              candidate_prenom: candidateProfileModalData.user.prenom,
                              candidate_email: candidateProfileModalData.user.email
                            })}
                            style={{ background: '#074696', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <i className="fa-solid fa-eye" /> Lire
                          </button>
                          <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noreferrer" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                            <i className="fa-solid fa-download" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div style={{ padding: '16px 26px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setCandidateProfileModalData(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : OUVRIR UNE NOUVELLE FORMATION MUNICIPALE */}
      {showNewTrainingModal && (
        <div className="modal-overlay" onClick={() => setShowNewTrainingModal(false)}>
          <div
            className="modal-content"
            style={{ width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', padding: '0', background: '#ffffff', boxShadow: '0 25px 70px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '22px 28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-graduation-cap" style={{ color: '#fde047', fontSize: '1.4rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Ouvrir une Session de Formation Municipale</h3>
                  <small style={{ color: '#94a3b8' }}>Mairie de Soa • Direction de la Formation Continue</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTrainingModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.8 }}
              >
                &times;
              </button>
            </div>

            {/* MODÈLES PRÉ-ÉTABLIS FORMATION */}
            <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>{t("Modèles :")}</span>
              <button
                type="button"
                onClick={() => setNewTraining({
                  title: 'Bureautique, Outils Collaboratifs & Secrétariat Numérique',
                  category: 'Numérique & Bureautique',
                  description: 'Formation pratique intensive sur le traitement de texte administratif, tableurs Excel pour la comptabilité communale et messagerie sécurisée.',
                  prerequisites: 'Niveau BEPC / Baccalauréat minimum',
                  trainer: 'Cellule Numérique de la Commune de Soa',
                  location: 'Hôtel de Ville de Soa — Salle Multimédia',
                  format: 'Présentiel & Ateliers Pratiques',
                  duration: '3 Semaines (45h)',
                  start_date: '',
                  end_date: '',
                  capacity: 25,
                  certification: 'Certificat Officiel Commune de Soa'
                })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                 Bureautique &amp; Numérique
              </button>
              <button
                type="button"
                onClick={() => setNewTraining({
                  title: 'Gestion des Déchets, Salubrité Urbaine & Écologie (Soa Ville Propre)',
                  category: 'Environnement & Salubrité',
                  description: 'Apprentissage des techniques modernes de tri sélectif, compostage, désinfection publique et sensibilisation citoyenne.',
                  prerequisites: 'Ouvert à tous les résidents de la Commune de Soa',
                  trainer: 'Service Hygiène & Environnement Communal',
                  location: 'Centre Communal d\'Écologie de Soa',
                  format: 'Présentiel & Travaux Pratiques de Terrain',
                  duration: '2 Semaines (30h)',
                  start_date: '',
                  end_date: '',
                  capacity: 35,
                  certification: 'Attestation Municipale Écologie'
                })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                 Salubrité &amp; Écologie
              </button>
              <button
                type="button"
                onClick={() => setNewTraining({
                  title: 'État Civil, Fiscalité Locale & Démarches Administratives',
                  category: 'Gestion Publique & Droit',
                  description: 'Maîtrise de la rédaction des actes d\'état civil, procédures de délivrance des décharges communales et recouvrement fiscal local.',
                  prerequisites: 'Niveau Licence / BTS recommandé',
                  trainer: 'Direction des Affaires Juridiques & État Civil',
                  location: 'Grande Salle des Actes de la Mairie de Soa',
                  format: 'Présentiel & Études de Cas Réels',
                  duration: '4 Semaines (60h)',
                  start_date: '',
                  end_date: '',
                  capacity: 20,
                  certification: 'Certificat de Compétences Communales'
                })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                 État Civil &amp; Fiscalité
              </button>
            </div>

            <form onSubmit={handleCreateTrainingSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Intitulé Officiel de la Formation *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Perfectionnement en Gestion Communale"
                  value={newTraining.title}
                  onChange={e => setNewTraining({ ...newTraining, title: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Pôle / Domaine *</label>
                  <input
                    type="text"
                    required
                    value={newTraining.category}
                    onChange={e => setNewTraining({ ...newTraining, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Durée Estimée</label>
                  <input
                    type="text"
                    placeholder="Ex: 3 Semaines (60h)"
                    value={newTraining.duration}
                    onChange={e => setNewTraining({ ...newTraining, duration: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Capacité Max (Places)</label>
                  <input
                    type="number"
                    min="5"
                    max="200"
                    value={newTraining.capacity}
                    onChange={e => setNewTraining({ ...newTraining, capacity: parseInt(e.target.value, 10) || 30 })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Formateur / Service Organisateur</label>
                  <input
                    type="text"
                    value={newTraining.trainer}
                    onChange={e => setNewTraining({ ...newTraining, trainer: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Lieu des Ateliers</label>
                  <input
                    type="text"
                    value={newTraining.location}
                    onChange={e => setNewTraining({ ...newTraining, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description des Objectifs Pédagogiques *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Détaillez le programme d'apprentissage..."
                  value={newTraining.description}
                  onChange={e => setNewTraining({ ...newTraining, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setShowNewTrainingModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingTraining}
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 800, cursor: submittingTraining ? 'not-allowed' : 'pointer', opacity: submittingTraining ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingTraining ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" />{t("Publication...")}</>
                  ) : (
                    <><i className="fa-solid fa-check" /> Publier &amp; Ouvrir aux Inscriptions</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : RÉPONDRE À UN TICKET DE SUPPORT CITOYEN */}
      {selectedTicketToReply && (
        <div className="modal-overlay" onClick={() => setSelectedTicketToReply(null)}>
          <div
            className="modal-content"
            style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', padding: '0', background: '#ffffff', boxShadow: '0 25px 70px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '22px 28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-headset" style={{ color: '#38bdf8', fontSize: '1.4rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Réponse Officielle au Ticket {selectedTicketToReply.ticket_number}</h3>
                  <small style={{ color: '#94a3b8' }}>Citoyen : {selectedTicketToReply.user_prenom} {selectedTicketToReply.user_nom} ({selectedTicketToReply.user_email})</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketToReply(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                
              </button>
            </div>

            <form onSubmit={handleReplyTicketSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{selectedTicketToReply.category}</span>
                <h4 style={{ margin: '4px 0', fontSize: '0.95rem', color: '#0f172a' }}>{selectedTicketToReply.subject}</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                  "{selectedTicketToReply.message}"
                </p>
              </div>

              {/* RÉPONSES TYPES RAPIDES */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>{t("Suggestions :")}</span>
                <button
                  type="button"
                  onClick={() => setAdminReplyText('Bonjour. Votre dossier est complet et a été transmis à la commission municipale pour validation définitive. Vous recevrez une notification officielle.')}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                >
                   Dossier transmis commission
                </button>
                <button
                  type="button"
                  onClick={() => setAdminReplyText('Bonjour. Votre demande de stage a été validée. Votre décharge officielle SOA-STAGE-2026 est disponible dans l\'onglet Mes Candidatures.')}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                >
                   Décharge stage disponible
                </button>
                <button
                  type="button"
                  onClick={() => setAdminReplyText('Bonjour. Merci de vous présenter à l\'Hôtel de Ville de Soa (Bureau RH, 1er Étage) muni de vos originaux de diplômes du lundi au vendredi (07h30-15h30).')}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                >
                   Rendez-vous accueil physique
                </button>
              </div>

              <div className="form-group">
                <label>Texte de la Réponse Officielle du Support *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Rédigez les instructions ou la réponse administrative pour le citoyen..."
                  value={adminReplyText}
                  onChange={e => setAdminReplyText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setSelectedTicketToReply(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={replyingTicket || !adminReplyText.trim()}
                  style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {replyingTicket ? (
                    <i className="fa-solid fa-circle-notch fa-spin" />
                  ) : (
                    <><i className="fa-solid fa-paper-plane" /> Transmettre Réponse &amp; Notifier</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : PROGRAMMATION D'UN ENTRETIEN VIDÉO RH */}
      {showInterviewModal && selectedApp && (
        <div className="modal-overlay" onClick={() => setShowInterviewModal(false)}>
          <div
            className="modal-content"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', padding: '0', background: '#ffffff', boxShadow: '0 25px 70px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: 'linear-gradient(135deg, #074696 0%, #1b8a53 100%)', padding: '24px 28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-video" style={{ fontSize: '1.5rem', color: '#ffffff' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Programmer un Entretien Vidéo</h3>
                  <small style={{ opacity: 0.95 }}>Candidat : {selectedApp.prenom} {selectedApp.nom} ({selectedApp.email})</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInterviewModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#074696', textTransform: 'uppercase' }}>{t("Dossier concerné")}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedApp.job_title || selectedApp.application_type || 'Demande Communale'}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>Département : {selectedApp.department || 'Services Municipaux de Soa'}</div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', margin: 0 }}>
                    Date et Heure Précises du Rendez-vous Visio *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>GMT+1 (Heure de Yaoundé)</span>
                </div>
                <input
                  type="datetime-local"
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                />

                {/* CRÉNEAUX RAPIDES EN 1 CLIC */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>{t("Créneaux rapides :")}</span>
                  <button
                    type="button"
                    onClick={() => setInterviewShortcut(1, 10, 0)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
                  >
                    Demain 10h00
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewShortcut(1, 14, 30)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
                  >
                    Demain 14h30
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewShortcut(2, 10, 0)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
                  >
                    Dans 2 jours 10h00
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewShortcut(3, 11, 0)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
                  >
                    Dans 3 jours 11h00
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Consignes &amp; Objectifs de l'Entretien
                </label>
                <textarea
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                  value={interviewNotes}
                  onChange={e => setInterviewNotes(e.target.value)}
                  placeholder="Ex: Entretien technique et évaluation de la motivation pour la commission municipale."
                />
              </div>

              {/* AVERTISSEMENT DES ACTIONS AUTOMATIQUES */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #074696', borderRadius: '10px', padding: '12px 16px', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>{t("Actions automatiques déclenchées lors de la validation :")}</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                  <li>{t("Expédition d'un")}<strong>{t("Email officiel")}</strong> avec les détails, la date/heure et le lien de la salle visio.</li>
                  <li>{t("Envoi d'un")}<strong>Message automatique RH</strong> stipulant l'obligation de prévenir dans la messagerie 24h avant en cas d'empêchement.</li>
                  <li>{t("Création de")}<strong>2 notifications in-app</strong> dans l'espace du candidat.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setShowInterviewModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={schedulingInterview}
                  style={{ background: 'linear-gradient(135deg, #074696, #1b8a53)', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: '10px', fontWeight: 900, cursor: schedulingInterview ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(7, 70, 150, 0.3)' }}
                >
                  {schedulingInterview ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" /> Programmation &amp; Convocation...</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane" /> Valider &amp; Convoquer le Candidat</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : MODIFICATION / REPROGRAMMATION D'UN ENTRETIEN VIDÉO RH */}
      {showEditInterviewModal && editingInterview && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)', overflow: 'hidden', border: '1px solid #e2e8f0'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #041430 0%, #0a2540 100%)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.15)',
                  border: '1px solid rgba(2, 132, 199, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#38bdf8', fontSize: '1.2rem'
                }}>
                  <i className="fa-solid fa-clock-rotate-left" />
                </div>
                <div>
                  <h3 style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    Modifier l'Entretien Vidéo
                  </h3>
                  <p style={{ color: '#94a3b8', margin: '2px 0 0 0', fontSize: '0.78rem' }}>
                    Candidat : {editingInterview.candidate_prenom} {editingInterview.candidate_nom}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditInterviewModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#94a3b8',
                  width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEditInterviewSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  Nouvelle Date et Heure du Rendez-vous Visio <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editInterviewDate}
                  onChange={(e) => setEditInterviewDate(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '0.92rem', color: '#0f172a', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  Consignes &amp; Remarques pour le Candidat
                </label>
                <textarea
                  rows="3"
                  value={editInterviewNotes}
                  onChange={(e) => setEditInterviewNotes(e.target.value)}
                  placeholder="Notes ou remarques d'entretien..."
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '0.92rem', color: '#0f172a', outline: 'none', resize: 'vertical'
                  }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setShowEditInterviewModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEditInterview}
                  style={{
                    padding: '10px 22px', borderRadius: '10px', border: 'none',
                    background: savingEditInterview ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: savingEditInterview ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                  }}
                >
                  {savingEditInterview ? 'Enregistrement...' : 'Enregistrer la Modification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : CONFIRMATION DE SUPPRESSION D'UN ENTRETIEN VIDÉO */}
      {showDeleteInterviewModal && interviewToDelete && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)', overflow: 'hidden', border: '1px solid #fee2e2'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.25rem', color: '#fca5a5' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Annuler &amp; Supprimer cet Entretien ?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteInterviewModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#ffffff',
                  width: '30px', height: '30px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '24px', background: '#ffffff' }}>
              <p style={{ color: '#1e293b', fontSize: '0.92rem', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Voulez-vous vraiment supprimer l'entretien vidéo prévu pour <strong>{interviewToDelete.candidate_prenom} {interviewToDelete.candidate_nom}</strong> ?
              </p>
              <div style={{
                background: '#fef2f2', borderLeft: '4px solid #ef4444',
                padding: '12px 14px', borderRadius: '8px', marginBottom: '20px'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600, display: 'block' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }} />
                  Le candidat sera automatiquement notifié de l'annulation de son rendez-vous visio.
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteInterviewModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: '9px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={deletingInterviewId === interviewToDelete.id}
                  onClick={handleConfirmDeleteInterview}
                  style={{
                    padding: '9px 18px', borderRadius: '9px', border: 'none',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  {deletingInterviewId === interviewToDelete.id ? 'Suppression...' : 'Confirmer la Suppression'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALLE DE VISIOCONFÉRENCE EN DIRECT (MODE RECRUTEUR RH) */}
      <VisioRoomModal
        isOpen={showVisioModal}
        onClose={() => setShowVisioModal(false)}
        interviewData={selectedInterviewForVisio}
        currentUser={adminUser}
        isRh={true}
        onStatusUpdate={(intId, st, n) => {
          handleEndInterviewByRh(intId);
          fetchData();
        }}
      />

      {/* ========================================== */}
      {/* MODAL FICHE OFFICIELLE DE REJET DE CANDIDATURE / DOCUMENT • MAIRIE DE SOA */}
      {/* ========================================== */}
      {showRejectModal && rejectTargetApp && (
        <div className="modal-overlay" style={{ zIndex: 11000, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-content" style={{ width: '95%', maxWidth: '640px', padding: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)', background: '#ffffff' }} onClick={e => e.stopPropagation()}>
            {/* EN-TÊTE DU MODAL REJET */}
            <div style={{ background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 60%, #0f172a 100%)', color: '#ffffff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  <i className="fa-solid fa-file-circle-xmark" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                    Fiche Officielle de Rejet de Candidature
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#fca5a5', fontWeight: 700 }}>
                    Commission RH • Commune de Soa
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                
              </button>
            </div>

            {/* CORPS DU FORMULAIRE DE REJET */}
            <form onSubmit={handleConfirmRejectionSubmit} style={{ padding: '24px' }}>
              {/* RECAP CANDIDAT & POSTE */}
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={rejectTargetApp.candidate_avatar || rejectTargetApp.avatar_url || DEFAULT_AVATAR}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #dc2626' }}
                />
                <div>
                  <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1rem', fontWeight: 800 }}>
                    {rejectTargetApp.candidate_prenom || rejectTargetApp.prenom} {rejectTargetApp.candidate_nom || rejectTargetApp.nom}
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                    Poste / Demande : <strong>{rejectTargetApp.job_title}</strong> ({rejectTargetApp.candidate_email || rejectTargetApp.email})
                  </p>
                </div>
              </div>

              {/* AVERTISSEMENT ACTION OFFICIELLE */}
              <div style={{ background: '#f8fafc', borderLeft: '4px solid #dc2626', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', color: '#475569', marginBottom: '20px', lineHeight: 1.5 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#dc2626', marginRight: '6px' }} />
                Cette action rejettera le dossier, enverra automatiquement un <strong>email officiel explicatif</strong> au candidat et insérera une notification dans la messagerie interne.
              </div>

              {/* 1. SELECTION DE LA CATÉGORIE / MOTIF PRINCIPAL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Motif principal du rejet (Catégorie) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', fontWeight: 600, color: '#0f172a', background: '#ffffff' }}
                  value={rejectCategory}
                  onChange={e => setRejectCategory(e.target.value)}
                >
                  <option value="Document non conforme ou illisible (CNI / Diplôme / CV)">Document non conforme ou illisible (CNI / Diplôme / CV)</option>
                  <option value="Pièce justificative manquante ou périmée">{t("Pièce justificative manquante ou périmée")}</option>
                  <option value="Diplôme / Niveau d'études non conforme aux exigences du poste">Diplôme / Niveau d'études non conforme aux exigences du poste</option>
                  <option value="Profil / Expérience ne correspondant pas aux critères requis">Profil / Expérience ne correspondant pas aux critères requis</option>
                  <option value="Dossier de candidature incomplet">{t("Dossier de candidature incomplet")}</option>
                  <option value="Autre motif administratif spécifique">{t("Autre motif administratif spécifique")}</option>
                </select>
              </div>

              {/* 2. TEXTAREA RAISONS EXPLICITES ET REMARQUES DE LA COMMISSION */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Raisons explicites et détails du rejet (Rédigés pour le candidat) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#0f172a' }}
                  value={rejectDetails}
                  onChange={e => setRejectDetails(e.target.value)}
                  placeholder="Ex: La Carte Nationale d'Identité transmise est illisible. Veuillez fournir un scan propre et net de votre CNI pour la régularisation de votre dossier."
                />
              </div>

              {/* 3. OPTION : PERMETTRE LA RÉGULARISATION DU DOSSIER */}
              <div style={{ marginBottom: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="allowResubmitCheck"
                  checked={allowResubmission}
                  onChange={e => setAllowResubmission(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                />
                <label htmlFor="allowResubmitCheck" style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 700, cursor: 'pointer' }}>
                  Autoriser le candidat à corriger son dossier et soumettre à nouveau ses pièces justificatives
                </label>
              </div>

              {/* PIED DE MODAL & BOUTONS D'ACTION */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                  onClick={() => setShowRejectModal(false)}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submittingRejection}
                  style={{
                    background: 'linear-gradient(135deg, #991b1b, #dc2626)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px 24px',
                    borderRadius: '10px',
                    fontWeight: 900,
                    cursor: submittingRejection ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
                  }}
                >
                  {submittingRejection ? (
                    <><i className="fa-solid fa-circle-notch fa-spin" /> Traitement &amp; Envoi Email...</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane" /> Confirmer le Rejet &amp; Envoyer l'Email</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VISIONNEUSE INTÉGRÉE DE DOCUMENTS • LECTURE DIRECTE, IMPRESSION & TÉLÉCHARGEMENT */}
      {/* ========================================== */}
      {showDocViewerModal && activeDocForViewer && (
        <div
          className="modal-overlay"
          onClick={() => setShowDocViewerModal(false)}
          style={{ zIndex: 10000, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="modal-content"
            style={{
              width: '95%',
              maxWidth: '1120px',
              height: '92vh',
              maxHeight: '92vh',
              padding: '0',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)',
              background: '#0f172a'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* TOPBAR DE LA VISIONNEUSE */}
            <div style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff', flexShrink: 0, flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  <i className={(activeDocForViewer.file_name || '').toLowerCase().endsWith('.pdf') || (activeDocForViewer.mime_type || '').includes('pdf') ? "fa-solid fa-file-pdf" : "fa-solid fa-file-image"} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeDocForViewer.doc_type || 'Document Justificatif'}
                    <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      Mairie de Soa
                    </span>
                  </h3>
                  <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Candidat : <strong>{activeDocForViewer.candidate_prenom} {activeDocForViewer.candidate_nom}</strong> ({activeDocForViewer.candidate_email}) • {activeDocForViewer.file_name}
                  </small>
                </div>
              </div>

              {/* ACTIONS : IMPRIMER, TÉLÉCHARGER, NOUVEL ONGLET, FERMER */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* BOUTON IMPRIMER */}
                <button
                  type="button"
                  onClick={() => {
                    const ifr = document.getElementById('inapp-doc-preview-iframe');
                    if (ifr && ifr.contentWindow) {
                      try {
                        ifr.contentWindow.focus();
                        ifr.contentWindow.print();
                      } catch (e) {
                        window.print();
                      }
                    } else {
                      window.print();
                    }
                  }}
                  style={{
                    background: '#334155',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Imprimer ce document"
                >
                  <i className="fa-solid fa-print" /> Imprimer
                </button>

                {/* BOUTON TÉLÉCHARGER */}
                <a
                  href={activeDocForViewer.file_url ? (activeDocForViewer.file_url.startsWith('http') ? activeDocForViewer.file_url : `http://localhost:5000${activeDocForViewer.file_url}`) : '#'}
                  download={activeDocForViewer.file_name || 'document_candidat_soa.pdf'}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                  }}
                  title="Télécharger sur la machine"
                >
                  <i className="fa-solid fa-download" /> Télécharger
                </a>

                {/* OUVRIR DANS UN NOUVEL ONGLET */}
                <a
                  href={activeDocForViewer.file_url ? (activeDocForViewer.file_url.startsWith('http') ? activeDocForViewer.file_url : `http://localhost:5000${activeDocForViewer.file_url}`) : '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#074696',
                    color: '#ffffff',
                    textDecoration: 'none',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Ouvrir dans un nouvel onglet"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </a>

                {/* BOUTON FERMER */}
                <button
                  type="button"
                  onClick={() => setShowDocViewerModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Fermer la visionneuse"
                >
                  
                </button>
              </div>
            </div>

            {/* CONTENU AFFICHÉ DANS LA VISIONNEUSE */}
            <div style={{ flex: 1, background: '#090d16', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {(activeDocForViewer.file_name || '').toLowerCase().endsWith('.png') || (activeDocForViewer.file_name || '').toLowerCase().endsWith('.jpg') || (activeDocForViewer.file_name || '').toLowerCase().endsWith('.jpeg') || (activeDocForViewer.mime_type || '').includes('image') ? (
                <img
                  src={activeDocForViewer.file_url ? (activeDocForViewer.file_url.startsWith('http') ? activeDocForViewer.file_url : `http://localhost:5000${activeDocForViewer.file_url}`) : ''}
                  alt={activeDocForViewer.file_name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                />
              ) : (
                <iframe
                  id="inapp-doc-preview-iframe"
                  src={activeDocForViewer.file_url ? (activeDocForViewer.file_url.startsWith('http') ? activeDocForViewer.file_url : `http://localhost:5000${activeDocForViewer.file_url}`) : ''}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '10px', background: '#ffffff' }}
                  title={activeDocForViewer.file_name}
                />
              )}
            </div>
          </div>
        </div>
      )}



      {/* MODALE 2 : MODIFIER UNE FORMATION MUNICIPALE */}
      {showEditTrainingModal && editingTraining && (
        <div className="super-modal-overlay" onClick={() => setShowEditTrainingModal(false)}>
          <div className="super-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="super-modal-header">
              <div className="modal-title-group">
                <i className="fa-solid fa-pen-to-square" />
                <div>
                  <h3>Modifier la Formation Municipale</h3>
                  <p>Mettez à jour les informations du programme #{editingTraining.id}.</p>
                </div>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setShowEditTrainingModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleEditTrainingSubmit} className="super-modal-form">
              <div className="form-group-super">
                <label>Intitulé du Programme *</label>
                <input
                  type="text"
                  required
                  value={editingTraining.title || ''}
                  onChange={e => setEditingTraining({ ...editingTraining, title: e.target.value })}
                />
              </div>

              <div className="form-dual-row">
                <div className="form-group-super">
                  <label>{t("Catégorie :")}</label>
                  <input
                    type="text"
                    value={editingTraining.category || ''}
                    onChange={e => setEditingTraining({ ...editingTraining, category: e.target.value })}
                  />
                </div>

                <div className="form-group-super">
                  <label>{t("Durée :")}</label>
                  <input
                    type="text"
                    value={editingTraining.duration || ''}
                    onChange={e => setEditingTraining({ ...editingTraining, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-dual-row">
                <div className="form-group-super">
                  <label>Lieu / Salle :</label>
                  <input
                    type="text"
                    value={editingTraining.location || ''}
                    onChange={e => setEditingTraining({ ...editingTraining, location: e.target.value })}
                  />
                </div>

                <div className="form-group-super">
                  <label>Capacité (Places) :</label>
                  <input
                    type="number"
                    value={editingTraining.capacity || 30}
                    onChange={e => setEditingTraining({ ...editingTraining, capacity: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>

              <div className="form-group-super">
                <label>Description du programme *</label>
                <textarea
                  rows="3"
                  required
                  value={editingTraining.description || ''}
                  onChange={e => setEditingTraining({ ...editingTraining, description: e.target.value })}
                ></textarea>
              </div>

              <div className="super-modal-footer">
                <button type="button" onClick={() => setShowEditTrainingModal(false)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '9px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-create-admin-cta">
                  <i className="fa-solid fa-floppy-disk" /> Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 3 : REGARDER LA FICHE ET LES INSCRITS D'UNE FORMATION */}
      {showViewTrainingModal && viewingTraining && (
        <div className="super-modal-overlay" onClick={() => setShowViewTrainingModal(false)}>
          <div className="super-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="super-modal-header">
              <div className="modal-title-group">
                <i className="fa-solid fa-graduation-cap" />
                <div>
                  <h3>Fiche Officielle de la Formation</h3>
                  <p>{viewingTraining.title}</p>
                </div>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setShowViewTrainingModal(false)}>
                &times;
              </button>
            </div>

            <div className="super-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div>
                  <small style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>{t("Catégorie")}</small>
                  <strong style={{ display: 'block', color: '#041430', fontSize: '0.9rem' }}>{viewingTraining.category}</strong>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>{t("Durée")}</small>
                  <strong style={{ display: 'block', color: '#00a859', fontSize: '0.9rem' }}>{viewingTraining.duration}</strong>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>{t("Lieu")}</small>
                  <strong style={{ display: 'block', color: '#041430', fontSize: '0.9rem' }}>{viewingTraining.location}</strong>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>{t("Capacité")}</small>
                  <strong style={{ display: 'block', color: '#d97706', fontSize: '0.9rem' }}>{viewingTraining.capacity || 30} Places Max</strong>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: '#041430' }}>Description &amp; Objectifs :</h4>
                <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>{viewingTraining.description}</p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, color: '#041430', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-users" style={{ color: '#00a859' }} />
                  Candidats Inscrits à cette Formation ({trainingApps.filter(a => a.training_title === viewingTraining.title || a.training_id === viewingTraining.id).length})
                </h4>

                {trainingApps.filter(a => a.training_title === viewingTraining.title || a.training_id === viewingTraining.id).length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>{t("Aucun citoyen inscrit à cette session pour l'instant.")}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {trainingApps.filter(a => a.training_title === viewingTraining.title || a.training_id === viewingTraining.id).map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                        <div>
                          <strong style={{ color: '#041430' }}>{c.prenom} {c.nom}</strong>
                          <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>{c.email} • {c.phone || 'Sans tél'}</span>
                        </div>
                        <span className={`status-tag-pill ${c.status === 'CONFIRMEE' || c.status === 'ACCEPTEE' ? 'actif' : 'suspendu'}`}>
                          {c.status || 'En Examen'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="super-modal-footer">
                <button type="button" onClick={() => setShowViewTrainingModal(false)} style={{ background: '#041430', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale de Confirmation de Blocage */}
      {showBlockConfirmModal && candidateToBlock && (
        <div className="super-modal-overlay">
          <div className="super-modal-content" style={{ maxWidth: '480px' }}>
            <div className="super-modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
              <h3 style={{ color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                {t('confirm_block_title', 'Bloquer le compte candidat ?')}
              </h3>
              <button className="super-modal-close" onClick={() => setShowBlockConfirmModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ color: '#0f172a', fontSize: '0.92rem', margin: '0 0 10px 0' }}>
                Vous êtes sur le point de suspendre l'accès à la plateforme pour <strong>{candidateToBlock.prenom} {candidateToBlock.nom}</strong> ({candidateToBlock.email}).
              </p>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                Le candidat ne pourra plus se connecter, consulter le portail ni soumettre de candidatures.
              </p>
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Motif de la suspension (optionnel) :
                </label>
                <textarea
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none' }}
                  rows="3"
                  placeholder="Ex: Dossier frauduleux, non-respect des règles communales..."
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="super-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" style={{ background: '#cbd5e1', color: '#0f172a', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowBlockConfirmModal(false)}>
                {t('cancel', 'Annuler')}
              </button>
              <button
                type="button"
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleToggleBlockCandidate(candidateToBlock, true, blockReasonInput)}
              >
                <i className="fa-solid fa-ban"></i>
                {t('confirm_block', 'Confirmer le blocage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Fiche Activité Candidat */}
      {showCandidateActivityModal && (
        <div className="super-modal-overlay">
          <div className="super-modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="super-modal-header">
              <h3 style={{ color: '#041430', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-id-card" style={{ color: '#00a859' }}></i>
                {t('candidate_activity_sheet', 'Fiche Activité Complexe du Candidat')}
              </h3>
              <button className="super-modal-close" onClick={() => setShowCandidateActivityModal(false)}>&times;</button>
            </div>

            <div style={{ padding: '20px 0' }}>
              {loadingCandidateActivity || !selectedCandidateActivity ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#00a859' }}></i>
                  <p style={{ marginTop: '12px', color: '#64748b', fontWeight: 600 }}>Chargement du profil et de l'historique d'activités...</p>
                </div>
              ) : (
                <div>
                  {/* Profil En-tête */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                    <img
                      src={selectedCandidateActivity.candidate.avatar_url || DEFAULT_AVATAR}
                      alt=""
                      style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#041430', fontWeight: 800 }}>
                        {selectedCandidateActivity.candidate.prenom} {selectedCandidateActivity.candidate.nom}
                      </h4>
                      <p style={{ margin: '2px 0 6px 0', color: '#64748b', fontSize: '0.88rem' }}>
                        {selectedCandidateActivity.candidate.email} • {selectedCandidateActivity.candidate.phone || 'Sans téléphone'}
                      </p>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '0.84rem', color: '#334155', flexWrap: 'wrap' }}>
                        <span><i className="fa-solid fa-location-dot" style={{ color: '#ef4444' }}></i> Provenance: <strong>{selectedCandidateActivity.candidate.ville || 'Soa'} ({selectedCandidateActivity.candidate.region || 'Centre'})</strong></span>
                        <span><i className="fa-solid fa-graduation-cap" style={{ color: '#0284c7' }}></i> Niveau: <strong>{selectedCandidateActivity.candidate.education_level || 'Bac / Licence'}</strong></span>
                        <span><i className="fa-solid fa-briefcase" style={{ color: '#d97706' }}></i> Spécialité: <strong>{selectedCandidateActivity.candidate.title || 'Nouveau Candidat'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Application History */}
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#041430', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-list-check" style={{ color: '#00a859' }}></i>
                    Historique des Candidatures & Demandes de Stage ({selectedCandidateActivity.applications.length})
                  </h4>

                  {selectedCandidateActivity.applications.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.86rem' }}>
                      Aucune candidature ou demande de stage déposée par ce candidat.
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ marginBottom: '20px' }}>
                      <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Intitulé du Poste / Domaine de Stage</th>
                            <th>Type</th>
                            <th>Score IA</th>
                            <th>Date Dépôt</th>
                            <th>Statut Dossier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCandidateActivity.applications.map((app) => (
                            <tr key={app.id}>
                              <td><strong>{app.job_title || 'Demande de Stage Spontanée'}</strong></td>
                              <td><span style={{ background: app.job_type?.toLowerCase().includes('stage') ? '#fef3c7' : '#e0f2fe', color: app.job_type?.toLowerCase().includes('stage') ? '#b45309' : '#0369a1', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.78rem' }}>{app.job_type || 'Stage'}</span></td>
                              <td><strong>{app.compatibility_score}%</strong></td>
                              <td>{new Date(app.created_at).toLocaleDateString('fr-FR')}</td>
                              <td><span className="status-tag-pill actif">{app.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Entretiens Visio */}
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#041430', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-video" style={{ color: '#0284c7' }}></i>
                    Entretiens Vidéo Programmés ({selectedCandidateActivity.interviews.length})
                  </h4>

                  {selectedCandidateActivity.interviews.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.86rem' }}>
                      Aucun entretien vidéo programmé avec ce candidat.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedCandidateActivity.interviews.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                          <div>
                            <strong style={{ color: '#041430' }}>{inv.title || 'Entretien RH'}</strong>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>{new Date(inv.scheduled_at).toLocaleString('fr-FR')}</span>
                          </div>
                          <span className="status-tag-pill actif">{inv.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="super-modal-footer">
              <button type="button" onClick={() => setShowCandidateActivityModal(false)} style={{ background: '#041430', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Ajout d'un Nouveau Guide / Règlement */}
      {showAddGuideModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header de la Modale */}
            <div style={{
              background: 'linear-gradient(135deg, #041430 0%, #0a2540 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(0, 168, 89, 0.15)',
                  border: '1px solid rgba(0, 168, 89, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00a859',
                  fontSize: '1.25rem'
                }}>
                  <i className="fa-solid fa-file-circle-plus"></i>
                </div>
                <div>
                  <h3 style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                    {t('publish_new_guide', 'Publier un Nouveau Guide ou Règlement')}
                  </h3>
                  <p style={{ color: '#94a3b8', margin: '2px 0 0 0', fontSize: '0.78rem' }}>
                    Document officiel publié pour les candidats
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGuideModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                &times;
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleCreateGuideSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', background: '#ffffff' }}>
              
              {/* Field 1: Titre / Nom du Document */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-file-signature" style={{ color: '#00a859' }}></i>
                  Nom / Titre du Document <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Guide Officiel du Candidat & Concours Municipaux 2026"
                  value={guideForm.title}
                  onChange={(e) => setGuideForm({ ...guideForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00a859'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Field 2: Description du Document */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-align-left" style={{ color: '#0284c7' }}></i>
                  Description du Document <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Décrivez le contenu et les consignes importantes de ce document pour les candidats..."
                  value={guideForm.description}
                  onChange={(e) => setGuideForm({ ...guideForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    resize: 'vertical',
                    minHeight: '90px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                ></textarea>
              </div>

              {/* Field 3: Upload Fichier PDF */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-file-pdf" style={{ color: '#dc2626' }}></i>
                  Téléverser le Document PDF Officiel <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{
                  border: selectedGuideFile ? '2px dashed #00a859' : '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '22px 16px',
                  textAlign: 'center',
                  background: selectedGuideFile ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => setSelectedGuideFile(e.target.files[0])}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                  />
                  {selectedGuideFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <i className="fa-solid fa-file-pdf" style={{ fontSize: '2.2rem', color: '#dc2626' }}></i>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#16a34a', display: 'block' }}>
                          {selectedGuideFile.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {(selectedGuideFile.size / (1024 * 1024)).toFixed(2)} MB • Fichier PDF prêt
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2.2rem', color: '#00a859', marginBottom: '8px' }}></i>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                        Parcourir ou glisser-déposer le document PDF ici
                      </p>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Seuls les fichiers .PDF sont pris en compte (Max 15 MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer / Boutons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                marginTop: '6px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddGuideModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  {t('cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  disabled={savingGuide}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: savingGuide ? '#94a3b8' : 'linear-gradient(135deg, #00a859 0%, #008647 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: savingGuide ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: savingGuide ? 'none' : '0 4px 14px rgba(0, 168, 89, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {savingGuide ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Publication...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i> Publier le Guide
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modale d'Édition d'un Guide / Règlement */}
      {showEditGuideModal && editingGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header de la Modale */}
            <div style={{
              background: 'linear-gradient(135deg, #041430 0%, #0a2540 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(2, 132, 199, 0.15)',
                  border: '1px solid rgba(2, 132, 199, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  fontSize: '1.25rem'
                }}>
                  <i className="fa-solid fa-pen-to-square"></i>
                </div>
                <div>
                  <h3 style={{ color: '#ffffff', margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                    {t('edit_guide', 'Modifier le Guide ou Règlement')}
                  </h3>
                  <p style={{ color: '#94a3b8', margin: '2px 0 0 0', fontSize: '0.78rem' }}>
                    Mettre à jour la description ou remplacer le fichier PDF
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditGuideModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                &times;
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleEditGuideSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', background: '#ffffff' }}>
              
              {/* Field 1: Titre / Nom du Document */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-file-signature" style={{ color: '#0284c7' }}></i>
                  Nom / Titre du Document <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Guide Officiel du Candidat & Concours Municipaux 2026"
                  value={guideForm.title}
                  onChange={(e) => setGuideForm({ ...guideForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Field 2: Description du Document */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-align-left" style={{ color: '#0284c7' }}></i>
                  Description du Document <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Décrivez le contenu et les consignes importantes de ce document pour les candidats..."
                  value={guideForm.description}
                  onChange={(e) => setGuideForm({ ...guideForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    resize: 'vertical',
                    minHeight: '90px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                ></textarea>
              </div>

              {/* Field 3: Upload Fichier PDF (Optionnel) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-file-pdf" style={{ color: '#dc2626' }}></i>
                  Remplacer le Document PDF (Optionnel)
                </label>
                <div style={{
                  border: selectedGuideFile ? '2px dashed #0284c7' : '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '22px 16px',
                  textAlign: 'center',
                  background: selectedGuideFile ? '#f0f9ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedGuideFile(e.target.files[0])}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                  />
                  {selectedGuideFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <i className="fa-solid fa-file-pdf" style={{ fontSize: '2.2rem', color: '#dc2626' }}></i>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0284c7', display: 'block' }}>
                          {selectedGuideFile.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Nouveau fichier sélectionné pour remplacement
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: '#0284c7', marginBottom: '6px' }}></i>
                      <p style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                        Cliquez pour choisir un nouveau fichier PDF
                      </p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Fichier actuel : {editingGuide.file_name || 'Fichier PDF Officiel'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer / Boutons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                marginTop: '6px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  type="button"
                  onClick={() => setShowEditGuideModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  {t('cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  disabled={savingGuide}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: savingGuide ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: savingGuide ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: savingGuide ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {savingGuide ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Enregistrement...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modale de Confirmation de Suppression d'un Guide */}
      {showDeleteGuideConfirmModal && guideToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '1px solid #fee2e2'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.25rem', color: '#fca5a5' }}></i>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                  Supprimer ce document officiel ?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteGuideConfirmModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '24px', background: '#ffffff' }}>
              <p style={{ color: '#1e293b', fontSize: '0.92rem', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Voulez-vous vraiment supprimer le document <strong>"{guideToDelete.title}"</strong> ?
              </p>
              <div style={{
                background: '#fef2f2',
                borderLeft: '4px solid #ef4444',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600, display: 'block' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                  Ce document sera immédiatement retiré du portail candidat.
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteGuideConfirmModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('cancel', 'Annuler')}
                </button>
                <button
                  type="button"
                  disabled={deletingGuideId === guideToDelete.id}
                  onClick={handleDeleteGuideConfirm}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '9px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  {deletingGuideId === guideToDelete.id ? 'Suppression...' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;

