import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AccessibilityToolbar from '../../components/AccessibilityToolbar';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import { getDynamicGreeting } from '../../utils/timeGreeting';
import './SuperAdminDashboard.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user')) || { prenom: 'Super', nom: 'Admin', role: 'super_admin' });
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'all_users' | 'admins_rh' | 'audit_logs' | 'security_profile'

  // Salutation dynamique traquant l'heure en temps réel
  const [currentGreeting, setCurrentGreeting] = useState(() => getDynamicGreeting(currentUser?.prenom || '', language));

  useEffect(() => {
    setCurrentGreeting(getDynamicGreeting(currentUser?.prenom || '', language));
    const timer = setInterval(() => {
      setCurrentGreeting(getDynamicGreeting(currentUser?.prenom || '', language));
    }, 15000);
    return () => clearInterval(timer);
  }, [currentUser?.prenom, language]);

  // Données globales techniques
  const [metrics, setMetrics] = useState(null);
  const [adminsRhList, setAdminsRhList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Filtres utilisateurs
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Formulaire & Modale Création de Compte (Candidat, RH, Super Admin)
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'admin_rh',
    department: 'Pôle Recrutement & Emploi',
    phone: '+237 677 00 00 00'
  });

  // Modale Réinitialisation Mot de passe
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAdminForReset, setSelectedAdminForReset] = useState(null);
  const [newAdminResetPassword, setNewAdminResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Formulaire Profil & Identifiants Super Admin
  const [profileForm, setProfileForm] = useState({
    nom: currentUser.nom || 'Super Admin',
    prenom: currentUser.prenom || 'Développeur',
    email: currentUser.email || 'superadmin@soa.cm',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [metRes, rhRes, usersRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/superadmin/metrics`),
        fetch(`${API_BASE_URL}/api/superadmin/admins-rh`),
        fetch(`${API_BASE_URL}/api/admin/users`),
        fetch(`${API_BASE_URL}/api/superadmin/audit-logs`)
      ]);

      if (metRes.ok) setMetrics(await metRes.json());
      if (rhRes.ok) setAdminsRhList(await rhRes.json());
      if (usersRes.ok) setAllUsersList(await usersRes.json());
      if (logsRes.ok) setAuditLogsList(await logsRes.json());
    } catch (err) {
      console.error('Erreur chargement données Super Admin :', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Disparition automatique des notifications flash après 4 secondes
  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => {
        setMsg({ text: '', type: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [msg.text]);

  // Générateur de mot de passe sécurisé aléatoire
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$*';
    let pass = 'SOA-Tech';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '2026!';
    setNewAdminForm(prev => ({ ...prev, password: pass }));
  };

  // Création d'un nouveau compte (Candidat, RH, Super Admin)
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    if (!newAdminForm.nom || !newAdminForm.prenom || !newAdminForm.email || !newAdminForm.password || !newAdminForm.role) {
      setMsg({ text: 'Veuillez remplir tous les champs obligatoires.', type: 'error' });
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await fetch('http://localhost:5000/api/superadmin/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdminForm)
      });
      const data = await res.json();

      if (res.ok) {
        setMsg({ text: data.message || 'Compte utilisateur créé avec succès !', type: 'success' });
        setShowCreateAdminModal(false);
        setNewAdminForm({
          nom: '',
          prenom: '',
          email: '',
          password: '',
          role: 'admin_rh',
          department: 'Pôle Recrutement & Emploi',
          phone: '+237 677 00 00 00'
        });
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la création du compte.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau lors de la création.', type: 'error' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Réinitialisation mot de passe utilisateur
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminForReset || !newAdminResetPassword.trim()) return;

    setResettingPassword(true);
    try {
      const res = await fetch(`http://localhost:5000/api/superadmin/admins-rh/${selectedAdminForReset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newAdminResetPassword.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        setMsg({ text: `Mot de passe de ${selectedAdminForReset.prenom} ${selectedAdminForReset.nom} réinitialisé avec succès !`, type: 'success' });
        setShowResetPasswordModal(false);
        setSelectedAdminForReset(null);
        setNewAdminResetPassword('');
      } else {
        setMsg({ text: data.message || 'Erreur lors de la réinitialisation.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setResettingPassword(false);
    }
  };

  // Activer / Suspendre un compte
  const handleToggleUserStatus = async (userObj) => {
    const nextStatus = (userObj.status === 'suspendu') ? 'actif' : 'suspendu';
    const confirmMsg = nextStatus === 'suspendu'
      ? `Êtes-vous sûr de vouloir suspendre le compte de ${userObj.prenom} ${userObj.nom} ?`
      : `Réactiver l'accès pour ${userObj.prenom} ${userObj.nom} ?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/superadmin/users/${userObj.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setMsg({ text: `Compte ${userObj.email} désormais ${nextStatus}.`, type: 'info' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Supprimer définitivement N'IMPORTE QUEL compte utilisateur
  const handleDeleteAnyUser = async (userObj) => {
    if (!window.confirm(`Confirmez-vous la suppression définitive du compte ${userObj.role.toUpperCase()} : ${userObj.email} (${userObj.prenom} ${userObj.nom}) ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/users/${userObj.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || 'Compte supprimé avec succès.', type: 'info' });
        fetchData();
      } else {
        setMsg({ text: data.message || 'Erreur lors de la suppression.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau lors de la suppression.', type: 'error' });
    }
  };

  // Changement de rôle d'un utilisateur
  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setMsg({ text: 'Rôle utilisateur modifié avec succès !', type: 'success' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mise à jour des identifiants du Super Admin (Email / Mot de passe)
  const handleSaveSuperAdminProfile = async (e) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setMsg({ text: 'Les deux nouveaux mots de passe ne correspondent pas.', type: 'error' });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          nom: profileForm.nom,
          prenom: profileForm.prenom,
          email: profileForm.email,
          newPassword: profileForm.newPassword || undefined
        })
      });
      const data = await res.json();

      if (res.ok) {
        setMsg({ text: 'Identifiants Super Admin mis à jour avec succès !', type: 'success' });
        const updatedUser = { ...currentUser, ...data.user };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setProfileForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      } else {
        setMsg({ text: data.message || 'Erreur lors de la mise à jour.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    sessionStorage.clear();
    window.location.href = '/auth';
  };

  return (
    <div className="superadmin-layout-root">

      {/* TOPBAR COCKPIT */}
      <header className="superadmin-topbar">
        <div className="topbar-brand-group">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg"
            alt="Armoiries de la République du Cameroun"
            className="topbar-republic-emblem"
          />
          <div className="topbar-titles">
            <div className="brand-badge-pill">
              <i className="fa-solid fa-crown" /> {language === 'en' ? 'SUPER ADMIN COCKPIT • DEVELOPER' : 'COCKPIT SUPER ADMIN • DÉVELOPPEUR'}
            </div>
            <h1 className="topbar-main-title">{t('superadmin_portal_title', 'Commune de Soa — Contrôle Global du Système')}</h1>
          </div>
        </div>

        <div className="topbar-right-actions">
          <div className="system-health-indicator">
            <span className="health-dot pulse" />
            <div className="health-labels">
              <strong>{t('superadmin_system_online', 'PostgreSQL & API En Ligne')}</strong>
              <small>{t('superadmin_uptime', 'Uptime')} : {metrics ? `${Math.floor(metrics.uptime_seconds / 60)} min` : '100%'}</small>
            </div>
          </div>

          {/* SÉLECTEUR DE LANGUE BILINGUE (FR / EN) */}
          <LanguageSwitcher />

          {/* ACCESSIBILITÉ & MODE SOMBRE */}
          <AccessibilityToolbar />

          <div className="superadmin-profile-chip">
            <div className="super-avatar">
              <i className="fa-solid fa-user-shield" />
            </div>
            <div className="super-user-meta">
              <span className="super-name">{currentUser.prenom} {currentUser.nom}</span>
              <span className="super-email">{currentUser.email || 'superadmin@soa.cm'}</span>
            </div>
          </div>

          <button type="button" className="btn-super-logout" onClick={handleLogout}>
            <i className="fa-solid fa-power-off" /> {language === 'en' ? 'Exit' : 'Quitter'}
          </button>
        </div>
      </header>

      {/* ALERTE DE STATUT FLASH */}
      {msg.text && (
        <div className={`super-flash-banner ${msg.type}`}>
          <div className="banner-content">
            <i className={`fa-solid ${msg.type === 'success' ? 'fa-circle-check' : (msg.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info')}`} />
            <span>{msg.text}</span>
          </div>
          <button type="button" onClick={() => setMsg({ text: '', type: '' })}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* NAVIGATION PRINCIPALE PAR ONGLETS DU COCKPIT TECHNIQUE */}
      <nav className="superadmin-nav-bar">
        <button
          type="button"
          className={`super-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <i className="fa-solid fa-chart-pie" /> {t('superadmin_tab_metrics', "Vue d'ensemble & Métriques Système")}
        </button>

        <button
          type="button"
          className={`super-tab-btn highlight ${activeTab === 'all_users' ? 'active' : ''}`}
          onClick={() => setActiveTab('all_users')}
        >
          <i className="fa-solid fa-users-gear" /> {t('superadmin_tab_all_users', 'Gestion Tous Comptes')}
          <span className="super-nav-pill">{allUsersList.length}</span>
        </button>

        <button
          type="button"
          className={`super-tab-btn ${activeTab === 'admins_rh' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins_rh')}
        >
          <i className="fa-solid fa-user-tie" /> {t('superadmin_tab_admins_rh', 'Admins RH & Équipe Tech')}
          <span className="super-nav-pill gray">{adminsRhList.length}</span>
        </button>

        <button
          type="button"
          className={`super-tab-btn ${activeTab === 'audit_logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit_logs')}
        >
          <i className="fa-solid fa-clock-rotate-left" /> {t('superadmin_tab_audit_logs', "Journal d'Audit & Sécurité")}
        </button>

        <button
          type="button"
          className={`super-tab-btn ${activeTab === 'security_profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('security_profile')}
        >
          <i className="fa-solid fa-shield-halved" /> {t('superadmin_tab_security', 'Sécurité & Profil Développeur')}
        </button>
      </nav>

      {/* CONTENU DU COCKPIT SELON L'ONGLET SÉLECTIONNÉ */}
      <main className="superadmin-main-view">

        {/* ══════════════════════════════════════════════════════════════
            ONGLET 1 : VUE D'ENSEMBLE & MÉTRIQUES TECHNIQUE SYSTÈME
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'metrics' && (
          <div className="super-tab-pane-fade">

            <div className="super-hero-welcome-card">
              <div className="hero-text-side">
                <span className="hero-welcome-tag">
                  <i className="fa-solid fa-shield-halved" /> Administration Technique • Mairie de Soa
                </span>
                <h2>{currentGreeting} — Infrastructure &amp; Accès</h2>
                <p>
                  Cet espace est dédié à la gestion des accès utilisateurs (comptes RH, candidats, réinitialisation de mots de passe), à la sécurité de la plateforme et au suivi des journaux de connexion.
                </p>
              </div>
              <div className="hero-actions-side">
                <button
                  type="button"
                  className="btn-hero-action primary"
                  onClick={() => { setActiveTab('all_users'); setShowCreateAdminModal(true); }}
                >
                  <i className="fa-solid fa-user-plus" /> + Créer un Compte Utilisateur
                </button>
                <button
                  type="button"
                  className="btn-hero-action secondary"
                  onClick={fetchData}
                  disabled={loading}
                >
                  <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} /> Rafraîchir
                </button>
              </div>
            </div>

            {/* GRILLE DES CARTES DE MÉTRIQUES TECHNIQUES */}
            <div className="metrics-kpi-grid">
              <div className="kpi-card blue">
                <div className="kpi-icon-box">
                  <i className="fa-solid fa-users" />
                </div>
                <div className="kpi-content">
                  <span className="kpi-title">Citoyens &amp; Candidats</span>
                  <span className="kpi-value">{metrics ? metrics.total_candidates : allUsersList.filter(u => u.role === 'candidat').length}</span>
                  <span className="kpi-trend positive"><i className="fa-solid fa-check" />{t("Comptes candidats créés")}</span>
                </div>
              </div>

              <div className="kpi-card purple">
                <div className="kpi-icon-box">
                  <i className="fa-solid fa-user-tie" />
                </div>
                <div className="kpi-content">
                  <span className="kpi-title">Comptes Admins RH</span>
                  <span className="kpi-value">{adminsRhList.length}</span>
                  <span className="kpi-trend"><i className="fa-solid fa-user-check" /> Agents RH actifs</span>
                </div>
              </div>

              <div className="kpi-card emerald">
                <div className="kpi-icon-box">
                  <i className="fa-solid fa-user-shield" />
                </div>
                <div className="kpi-content">
                  <span className="kpi-title">Super Admins &amp; Tech</span>
                  <span className="kpi-value">{metrics ? metrics.total_super_admins : allUsersList.filter(u => u.role === 'super_admin').length}</span>
                  <span className="kpi-trend positive"><i className="fa-solid fa-shield-halved" /> Équipe Support système</span>
                </div>
              </div>

              <div className="kpi-card amber">
                <div className="kpi-icon-box">
                  <i className="fa-solid fa-address-card" />
                </div>
                <div className="kpi-content">
                  <span className="kpi-title">Total Tous Comptes</span>
                  <span className="kpi-value">{allUsersList.length}</span>
                  <span className="kpi-trend"><i className="fa-solid fa-database" />{t("Base utilisateurs global")}</span>
                </div>
              </div>

              <div className="kpi-card cyan">
                <div className="kpi-icon-box">
                  <i className="fa-solid fa-database" />
                </div>
                <div className="kpi-content">
                  <span className="kpi-title">Serveur &amp; Base PostgreSQL</span>
                  <span className="kpi-value">En Ligne</span>
                  <span className="kpi-trend positive"><i className="fa-solid fa-circle-check" />{t("Base de données connectée")}</span>
                </div>
              </div>

              <div className="kpi-card red">
                <div className="kpi-icon-box">
                  <i className="fa-solid fa-microchip" />
                </div>
                <div className="kpi-content">
                  <span className="kpi-title">Mémoire &amp; Uptime</span>
                  <span className="kpi-value">{metrics ? `${metrics.memory_rss_mb} MB` : '35.4 MB'}</span>
                  <span className="kpi-trend"><i className="fa-solid fa-clock" /> Uptime : {metrics ? `${Math.floor(metrics.uptime_seconds / 60)} min` : '100%'}</span>
                </div>
              </div>
            </div>

            {/* DEUX PANNEAUX RAPIDES : DERNIERS ADMINS RH & DERNIERS LOGS */}
            <div className="dual-panes-grid">
              <div className="pane-card">
                <div className="pane-header">
                  <h3><i className="fa-solid fa-user-tie" /> Administrateurs RH &amp; Équipe Tech</h3>
                  <button type="button" className="btn-link" onClick={() => setActiveTab('admins_rh')}>
                    Voir tout ({adminsRhList.length}) <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }} />
                  </button>
                </div>
                <div className="pane-list">
                  {adminsRhList.slice(0, 4).map(adm => (
                    <div key={adm.id} className="admin-mini-item">
                      <div className="admin-mini-avatar">
                        {adm.prenom ? adm.prenom[0] : 'R'}{adm.nom ? adm.nom[0] : 'H'}
                      </div>
                      <div className="admin-mini-info">
                        <strong>{adm.prenom} {adm.nom}</strong>
                        <span>{adm.email}</span>
                      </div>
                      <span className={`status-tag-pill ${adm.status || 'actif'}`}>
                        {adm.status || 'actif'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pane-card">
                <div className="pane-header">
                  <h3><i className="fa-solid fa-bolt" /> Dernières Activités Système</h3>
                  <button type="button" className="btn-link" onClick={() => setActiveTab('audit_logs')}>
                    Journal complet <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }} />
                  </button>
                </div>
                <div className="pane-list">
                  {auditLogsList.slice(0, 4).map(log => (
                    <div key={log.id} className="log-mini-item">
                      <i className={log.icon} />
                      <div className="log-mini-text">
                        <strong>{log.title}</strong>
                        <span>{new Date(log.timestamp).toLocaleTimeString('fr-FR')} • {log.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET 2 : GESTION COMPLÈTE DES COMPTES ADMINS RH
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'admins_rh' && (
          <div className="super-tab-pane-fade">

            <div className="section-header-row">
              <div>
                <h2>Gestion &amp; Création des Administrateurs RH</h2>
                <p>
                  Créez autant de comptes RH que nécessaire pour les employés de la Mairie de Soa. Chaque agent disposera d'identifiants dédiés pour accéder à l'espace RH.
                </p>
              </div>
              <button
                type="button"
                className="btn-create-admin-cta"
                onClick={() => setShowCreateAdminModal(true)}
              >
                <i className="fa-solid fa-user-plus" /> + Créer un compte Admin RH
              </button>
            </div>

            <div className="table-wrapper-card">
              <table className="super-data-table">
                <thead>
                  <tr>
                    <th>Agent RH</th>
                    <th>{t("Email de connexion")}</th>
                    <th>Département / Pôle</th>
                    <th>{t("Téléphone")}</th>
                    <th>{t("Date de création")}</th>
                    <th>{t("Statut")}</th>
                    <th>Actions Administrateur</th>
                  </tr>
                </thead>
                <tbody>
                  {adminsRhList.map(admin => (
                    <tr key={admin.id}>
                      <td>
                        <div className="table-user-cell">
                          <div className="table-user-avatar">
                            {admin.prenom ? admin.prenom[0] : 'R'}{admin.nom ? admin.nom[0] : 'H'}
                          </div>
                          <div>
                            <strong>{admin.prenom} {admin.nom}</strong>
                            <small>ID #{admin.id} • Rôle : {admin.role}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="email-code-badge">{admin.email}</span>
                      </td>
                      <td>
                        <span className="department-tag">{admin.region || 'Service des Ressources Humaines'}</span>
                      </td>
                      <td>{admin.phone || '+237 677 00 00 00'}</td>
                      <td>{new Date(admin.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn-status-toggle ${admin.status || 'actif'}`}
                          onClick={() => handleToggleUserStatus(admin)}
                          title="Cliquer pour basculer le statut"
                        >
                          <i className={`fa-solid ${admin.status === 'suspendu' ? 'fa-ban' : 'fa-circle-check'}`} />
                          {admin.status === 'suspendu' ? 'Suspendu' : 'Actif'}
                        </button>
                      </td>
                      <td>
                        <div className="table-actions-row">
                          <button
                            type="button"
                            className="btn-table-action key"
                            onClick={() => { setSelectedAdminForReset(admin); setShowResetPasswordModal(true); }}
                            title="Réinitialiser le mot de passe"
                          >
                            <i className="fa-solid fa-key" /> Mot de passe
                          </button>
                          <button
                            type="button"
                            className="btn-table-action delete"
                            onClick={() => handleDeleteAnyUser(admin)}
                            title="Supprimer ce compte RH"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET 2 : TOUS LES UTILISATEURS ET GESTION DES COMPTES
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'all_users' && (
          <div className="super-tab-pane-fade">

            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>Annuaire Global des Utilisateurs &amp; Gestion des Comptes</h2>
                <p>Visualisez tous les comptes créés sur la plateforme (Candidats, Admins RH, Équipe Tech), créez ou supprimez n'importe quel compte et gérez les rôles d'accès.</p>
              </div>
              <button
                type="button"
                className="btn-hero-action primary"
                onClick={() => setShowCreateAdminModal(true)}
                style={{ background: 'linear-gradient(135deg, #074696, #1b8a53)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(7,70,150,0.25)' }}
              >
                <i className="fa-solid fa-user-plus" /> + Créer un Compte
              </button>
            </div>

            <div className="users-filter-bar-card">
              <div className="search-input-box">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, adresse e-mail ou ville..."
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                />
              </div>

              <div className="role-filter-chips">
                <button
                  type="button"
                  className={`chip-btn ${userRoleFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setUserRoleFilter('ALL')}
                >
                  Tous ({allUsersList.length})
                </button>
                <button
                  type="button"
                  className={`chip-btn ${userRoleFilter === 'candidat' ? 'active' : ''}`}
                  onClick={() => setUserRoleFilter('candidat')}
                >
                  Candidats ({allUsersList.filter(u => u.role === 'candidat').length})
                </button>
                <button
                  type="button"
                  className={`chip-btn ${userRoleFilter === 'admin_rh' ? 'active' : ''}`}
                  onClick={() => setUserRoleFilter('admin_rh')}
                >
                  Admins RH ({allUsersList.filter(u => u.role === 'admin_rh' || u.role === 'admin').length})
                </button>
                <button
                  type="button"
                  className={`chip-btn ${userRoleFilter === 'super_admin' ? 'active' : ''}`}
                  onClick={() => setUserRoleFilter('super_admin')}
                >
                  Super Admin ({allUsersList.filter(u => u.role === 'super_admin').length})
                </button>
              </div>
            </div>

            <div className="table-wrapper-card">
              <table className="super-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom &amp; Prénom</th>
                    <th>{t("Email")}</th>
                    <th>Ville / Région</th>
                    <th>{t("Téléphone")}</th>
                    <th>{t("Date d'inscription")}</th>
                    <th>Rôle Système</th>
                    <th>Actions Technicien</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsersList
                    .filter(u => {
                      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
                      const matchSearch = !userSearchTerm ||
                        `${u.prenom} ${u.nom} ${u.email} ${u.ville}`.toLowerCase().includes(userSearchTerm.toLowerCase());
                      return matchRole && matchSearch;
                    })
                    .map(u => (
                      <tr key={u.id}>
                        <td><strong>#{u.id}</strong></td>
                        <td>
                          <strong>{u.prenom} {u.nom}</strong>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.ville || 'Soa'} ({u.region || 'Centre'})</td>
                        <td>{u.phone || 'Non renseigné'}</td>
                        <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className={`role-select-box ${u.role}`}
                            disabled={u.id === currentUser.id}
                          >
                            <option value="candidat">{t("Candidat")}</option>
                            <option value="admin_rh">Admin RH</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className={`btn-status-toggle ${u.status || 'actif'}`}
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={u.id === currentUser.id}
                            >
                              {u.status === 'suspendu' ? 'Suspendu' : 'Actif'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAnyUser(u)}
                              disabled={u.id === currentUser.id}
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: u.id === currentUser.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Supprimer définitivement ce compte de la base"
                            >
                              <i className="fa-solid fa-trash" /> Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET 3 : JOURNAL D'AUDIT SYSTÈME & SÉCURITÉ
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'audit_logs' && (
          <div className="super-tab-pane-fade">

            <div className="section-header-row">
              <div>
                <h2>Journal d'Audit Système &amp; Sécurité</h2>
                <p>{t("Historique horodaté des connexions, créations de comptes et événements de sécurité du serveur.")}</p>
              </div>
            </div>

            <div className="audit-timeline-card">
              <div className="timeline-list">
                {auditLogsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    <p>{t("Aucun événement enregistré dans le journal d'audit.")}</p>
                  </div>
                ) : (
                  auditLogsList.map(log => (
                    <div key={log.id} className="timeline-item">
                      <div className="timeline-icon">
                        <i className={log.icon || 'fa-solid fa-bell'} />
                      </div>
                      <div className="timeline-body">
                        <div className="timeline-top">
                          <h4>{log.title}</h4>
                          <span className="timestamp">{new Date(log.timestamp).toLocaleString('fr-FR')}</span>
                        </div>
                        <p>{log.description}</p>
                        <span className="log-badge">{log.badge}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ONGLET 4 : SÉCURITÉ & PROFIL SUPER ADMIN / DÉVELOPPEUR
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'security_profile' && (
          <div className="super-tab-pane-fade">

            <div className="section-header-row">
              <div>
                <h2>Paramètres de Sécurité &amp; Profil Développeur</h2>
                <p>Mettez à jour vos identifiants d'accès Super Admin et configurez le mode de maintenance du serveur.</p>
              </div>
            </div>

            <div className="super-form-card">
              <h3><i className="fa-solid fa-user-gear" /> Identifiants du Super Administrateur</h3>
              <form onSubmit={handleSaveSuperAdminProfile} style={{ marginTop: '20px' }}>
                <div className="form-dual-row">
                  <div className="form-group-super">
                    <label>Prénom Développeur :</label>
                    <input
                      type="text"
                      required
                      value={profileForm.prenom}
                      onChange={e => setProfileForm({ ...profileForm, prenom: e.target.value })}
                    />
                  </div>
                  <div className="form-group-super">
                    <label>{t("Nom :")}</label>
                    <input
                      type="text"
                      required
                      value={profileForm.nom}
                      onChange={e => setProfileForm({ ...profileForm, nom: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group-super">
                  <label>Adresse E-mail Super Admin :</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>

                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>Changer le mot de passe Super Admin :</h4>
                  <div className="form-dual-row">
                    <div className="form-group-super">
                      <label>{t("Nouveau mot de passe :")}</label>
                      <input
                        type="password"
                        placeholder="Laisser vide pour ne pas modifier"
                        value={profileForm.newPassword}
                        onChange={e => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      />
                    </div>
                    <div className="form-group-super">
                      <label>{t("Confirmer :")}</label>
                      <input
                        type="password"
                        placeholder="Répéter le mot de passe"
                        value={profileForm.confirmPassword}
                        onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-submit-row" style={{ marginTop: '20px' }}>
                  <button
                    type="submit"
                    className="btn-save-super-profile"
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <i className="fa-solid fa-circle-notch fa-spin" />
                    ) : (
                      <><i className="fa-solid fa-floppy-disk" /> Enregistrer mes identifiants Super Admin</>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODALE : CRÉER UN NOUVEAU COMPTE UTILISATEUR (CANDIDAT, RH, TECH)
          ══════════════════════════════════════════════════════════════ */}
      {showCreateAdminModal && (
        <div className="super-modal-overlay" onClick={() => setShowCreateAdminModal(false)}>
          <div className="super-modal-box" onClick={e => e.stopPropagation()}>
            <div className="super-modal-header">
              <div className="modal-title-group">
                <i className="fa-solid fa-user-plus" />
                <div>
                  <h3>{t("Créer un nouveau compte utilisateur")}</h3>
                  <p>{t("Définissez les identifiants et le rôle système du nouveau compte.")}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowCreateAdminModal(false)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="super-modal-form">
              {/* TYPE & RÔLE DE COMPTE */}
              <div className="form-group-super" style={{ marginBottom: '14px' }}>
                <label style={{ fontWeight: 800, color: '#0f172a' }}>Type &amp; Rôle du compte à créer *</label>
                <select
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', fontWeight: 800, color: '#074696', background: '#ffffff' }}
                  value={newAdminForm.role || 'admin_rh'}
                  onChange={e => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                >
                  <option value="admin_rh">Administrateur RH (Agent Municipal)</option>
                  <option value="candidat">Candidat / Citoyen Usager</option>
                  <option value="super_admin">Super Admin (Développeur / Support Tech)</option>
                </select>
              </div>

              <div className="form-dual-row">
                <div className="form-group-super">
                  <label>{t("Prénom :")}</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean"
                    value={newAdminForm.prenom}
                    onChange={e => setNewAdminForm({ ...newAdminForm, prenom: e.target.value })}
                  />
                </div>
                <div className="form-group-super">
                  <label>{t("Nom :")}</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kamga"
                    value={newAdminForm.nom}
                    onChange={e => setNewAdminForm({ ...newAdminForm, nom: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-super">
                <label>{t("Adresse e-mail :")}</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: jean.kamga@soa.cm"
                  value={newAdminForm.email}
                  onChange={e => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                />
              </div>

              <div className="form-group-super">
                <div className="label-with-action">
                  <label>{t("Mot de passe initial :")}</label>
                  <button
                    type="button"
                    className="btn-generate-pass"
                    onClick={generateRandomPassword}
                  >
                    <i className="fa-solid fa-wand-magic-sparkles" /> Générer mot de passe sécurisé
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: SOA-Tech2026! ou mot de passe généré"
                  value={newAdminForm.password}
                  onChange={e => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                />
              </div>

              <div className="form-dual-row">
                <div className="form-group-super">
                  <label>Pôle d'affectation RH :</label>
                  <select
                    value={newAdminForm.department}
                    onChange={e => setNewAdminForm({ ...newAdminForm, department: e.target.value })}
                  >
                    <option value="Pôle Recrutement & Emploi">Pôle Recrutement &amp; Emploi</option>
                    <option value="Pôle Stages Académiques & Pro">Pôle Stages Académiques &amp; Pro</option>
                    <option value="Pôle Formations Municipales">Pôle Formations Municipales</option>
                    <option value="Secrétariat Général RH">Secrétariat Général RH</option>
                    <option value="Direction Générale des Services">Direction Générale des Services</option>
                  </select>
                </div>

                <div className="form-group-super">
                  <label>{t("Téléphone de l'agent :")}</label>
                  <input
                    type="text"
                    placeholder="+237 6XX XX XX XX"
                    value={newAdminForm.phone}
                    onChange={e => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="super-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateAdminModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={creatingAdmin}
                >
                  {creatingAdmin ? (
                    <i className="fa-solid fa-circle-notch fa-spin" />
                  ) : (
                    <><i className="fa-solid fa-check" /> Créer le compte Admin RH</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALE : RÉINITIALISER LE MOT DE PASSE ADMIN RH
          ══════════════════════════════════════════════════════════════ */}
      {showResetPasswordModal && selectedAdminForReset && (
        <div className="super-modal-overlay" onClick={() => setShowResetPasswordModal(false)}>
          <div className="super-modal-box" onClick={e => e.stopPropagation()}>
            <div className="super-modal-header">
              <div className="modal-title-group">
                <i className="fa-solid fa-key" />
                <div>
                  <h3>{t("Réinitialiser le mot de passe")}</h3>
                  <p>Pour l'agent {selectedAdminForReset.prenom} {selectedAdminForReset.nom} ({selectedAdminForReset.email})</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowResetPasswordModal(false)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="super-modal-form">
              <div className="form-group-super">
                <label>{t("Nouveau mot de passe pour cet agent :")}</label>
                <input
                  type="text"
                  required
                  placeholder="Saisissez le nouveau mot de passe"
                  value={newAdminResetPassword}
                  onChange={e => setNewAdminResetPassword(e.target.value)}
                />
              </div>

              <div className="super-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowResetPasswordModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={resettingPassword || !newAdminResetPassword.trim()}
                >
                  {resettingPassword ? (
                    <i className="fa-solid fa-circle-notch fa-spin" />
                  ) : (
                    <><i className="fa-solid fa-check" />{t("Appliquer le nouveau mot de passe")}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminDashboard;

