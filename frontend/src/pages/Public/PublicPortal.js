import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AccessibilityToolbar from '../../components/AccessibilityToolbar';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';
import './PublicPortal.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const PublicPortal = () => {
  const navigate = useNavigate();
  const { language, t, tp } = useLanguage();

  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [activeTab, setActiveTab] = useState('jobs');
  const [showOrganigramme, setShowOrganigramme] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [regStatus, setRegStatus] = useState({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/jobs`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setJobs(data);
        else setJobs(defaultJobs);
      })
      .catch(() => setJobs(defaultJobs));

    fetch(`${API_BASE_URL}/api/events`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setEvents(data);
        else setEvents(defaultEvents);
      })
      .catch(() => setEvents(defaultEvents));

    fetch(`${API_BASE_URL}/api/news`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setNews(data);
        else setNews(defaultNews);
      })
      .catch(() => setNews(defaultNews));
  }, []);

  const handleRegisterEvent = (eventId) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/auth');
      return;
    }
    fetch(`${API_BASE_URL}/api/events/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, userId: user.id })
    })
      .then(res => res.json())
      .then(() => setRegStatus(prev => ({ ...prev, [eventId]: tp('Inscrit !', 'Registered!') })))
      .catch(() => setRegStatus(prev => ({ ...prev, [eventId]: tp('Enregistré', 'Enrolled') })));
  };

  const filteredJobs = jobs.filter(j => {
    const matchesFilter = selectedFilter === 'tous' || (j.type || '').toLowerCase() === selectedFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (j.title || '').toLowerCase().includes(q) || 
      (j.department || '').toLowerCase().includes(q) ||
      (j.description || '').toLowerCase().includes(q) ||
      (j.skills_required || []).some(s => s.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="public-portal-container">
      {/* 1. BARRE CIVIQUE SUPERIEURE */}
      <div className="top-civic-bar">
        <div className="civic-bar-inner">
          <div className="civic-tag">
            <span className="cameroun-flag-badge"><i className="fa-solid fa-flag" style={{ color: '#00a859', fontSize: '0.85rem' }} /></span>
            <span>{tp('République du Cameroun — Région du Centre — Mefou-et-Afamba', 'Republic of Cameroon — Center Region — Mefou and Afamba')}</span>
          </div>
          <div className="civic-tools">
            <button className="top-utility-btn" title={tp("Centre d'Aide Citoyen", "Citizen Help Center")}>
              <i className="fa-regular fa-circle-question"></i> {tp('Aide', 'Help')}
            </button>
            <div className="top-access-item">
              <i className="fa-solid fa-universal-access"></i> {tp('Accessibilité', 'Accessibility')}
            </div>
            
            {/* SÉLECTEUR DE LANGUE REACT NATIVE */}
            <LanguageSwitcher />

            <AccessibilityToolbar />
          </div>
        </div>
      </div>

      {/* 2. HEADER NAVBAR PRINCIPALE */}
      <header className="public-header">
        <div className="header-brand" onClick={() => navigate('/')}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg" 
            alt={tp("Armoiries du Cameroun", "Coat of Arms of Cameroon")}
            className="header-coat"
          />
          <div className="brand-titles">
            <div className="mairie-title">{tp('MAIRIE DE', 'SOA')} <span className="highlight-soa">{tp('SOA', 'COUNCIL')}</span></div>
            <span className="portal-sub">HIREBRIDGE • {tp('RECRUTEMENT MUNICIPAL', 'MUNICIPAL RECRUITMENT')}</span>
          </div>
        </div>

        <nav className="public-nav">
          <button 
            className={`nav-link ${activeTab === 'jobs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('jobs')}
          >
            <i className="fa-solid fa-briefcase"></i> {tp("Offres d'emploi", "Job Offers")}
          </button>
          <button 
            className={`nav-link ${activeTab === 'events' ? 'active' : ''}`} 
            onClick={() => setActiveTab('events')}
          >
            <i className="fa-regular fa-calendar-days"></i> {tp("Calendrier Municipal", "Municipal Calendar")}
          </button>
          <button 
            className={`nav-link ${activeTab === 'news' ? 'active' : ''}`} 
            onClick={() => setActiveTab('news')}
          >
            <i className="fa-solid fa-newspaper"></i> {tp("Actualités", "News & Updates")}
          </button>
          <button 
            className="nav-link" 
            onClick={() => setShowOrganigramme(true)}
          >
            <i className="fa-solid fa-sitemap"></i> {tp("Organigramme", "Organization Chart")}
          </button>
        </nav>

        <div className="header-actions">
          <button className="btn-espace-candidat-pill" onClick={() => navigate('/auth')}>
            <i className="fa-regular fa-user"></i> {tp("Espace Candidat", "Candidate Space")}
          </button>
          <button className="btn-header-search-circle" onClick={() => {
            const el = document.getElementById('search-jobs-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="hero-section-arche">
        <div className="hero-arche-container">
          
          <div className="hero-arche-left">

            <div className="kicker-tag-blue">
              <i className="fa-solid fa-landmark"></i> {tp("SERVICE PUBLIC & PROXIMITÉ CITOYENNE", "PUBLIC SERVICE & CITIZEN PROXIMITY")}
            </div>

            <h1 className="hero-headline">
              {language === 'en' ? (
                <>{t("Building together the future")}<br />of <span className="green-soa-text">Soa Municipality</span></>
              ) : (
                <>{t("Construisons ensemble")}<br />l'avenir de la commune de <span className="green-soa-text">{t("Soa")}</span></>
              )}
            </h1>

            <p className="hero-subtext">
              {tp(
                "Le portail officiel de recrutement de la Mairie de Soa. Découvrez nos opportunités, rejoignez nos équipes et contribuez activement au développement de la commune.",
                "The official recruitment portal of Soa Council. Explore opportunities, join our team and actively contribute to local development."
              )}
            </p>

            <div className="hero-buttons-row">
              <button className="btn-consulter-green" onClick={() => {
                setActiveTab('jobs');
                const el = document.getElementById('search-jobs-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>
                <i className="fa-solid fa-magnifying-glass"></i> {tp("Consulter les Offres", "View Job Offers")}
              </button>

              <button className="btn-deposer-white" onClick={() => navigate('/auth')}>
                <i className="fa-solid fa-paper-plane"></i> {tp("Déposer ma candidature", "Submit Application")}
              </button>
            </div>

            <div className="hero-stat-cards">
              <div className="stat-card">
                <div className="stat-icon blue"><i className="fa-solid fa-shield-halved"></i></div>
                <div>
                  <div className="stat-value">100%</div>
                  <div className="stat-label">{tp("Transparence RH", "HR Transparency")}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green"><i className="fa-solid fa-users"></i></div>
                <div>
                  <div className="stat-value">+15</div>
                  <div className="stat-label">{tp("Services Municipaux", "Municipal Services")}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon teal"><i className="fa-solid fa-headset"></i></div>
                <div>
                  <div className="stat-value">24/7</div>
                  <div className="stat-label">{tp("Guichet Numérique", "Digital Desk")}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-arche-divider-svg">
            <svg viewBox="0 0 100 500" preserveAspectRatio="none">
              <path d="M 0,0 L 50,0 C 110,180 80,350 0,500 Z" fill="#ebf3fe" />
              <path d="M 50,0 C 110,180 80,350 0,500" fill="none" stroke="#ffffff" strokeWidth="4" />
              <path d="M 50,0 C 110,180 80,350 0,500" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="10" />
            </svg>
          </div>

          <div className="hero-arche-right">
            <img 
              src="/hotel_de_ville_soa.jpg" 
              alt="Hôtel de Ville de Soa (Soa City Hall)" 
              className="hotel-ville-soa-img sharp-bright"
              onError={(e) => {
                e.target.src = "https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg";
              }}
            />

            <div className="dark-building-badge-card">
              <div className="green-landmark-box">
                <i className="fa-solid fa-landmark"></i>
              </div>
              <div className="badge-text-box">
                <h4>{tp("Hôtel de Ville de Soa", "Soa Town Hall")}</h4>
                <p>{tp("Guichet Officiel & Portail HireBridge", "Official Counter & HireBridge Portal")}</p>
              </div>
              <div className="badge-arrow-btn">
                <i className="fa-solid fa-arrow-right"></i>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SECTION POUR VOUS */}
      <section className="pour-vous-section">
        <div className="section-container">
          
          <div className="pour-vous-title-block">
            <span className="pour-vous-kicker">{tp("— POUR VOUS —", "— FOR YOU —")}</span>
            <h2>{tp("Un service public moderne et accessible", "A modern and accessible public service")}</h2>
          </div>

          <div className="pour-vous-grid-4">
            
            <div className="pv-card" onClick={() => setActiveTab('jobs')}>
              <div className="pv-icon-box blue">
                <i className="fa-solid fa-briefcase"></i>
              </div>
              <h3>{tp("Opportunités", "Opportunities")}</h3>
              <p>{tp("Accédez à toutes les offres d'emploi et de stage proposées par la Mairie de Soa.", "Access all job and internship offers published by Soa Council.")}</p>
              <div className="pv-bottom-arrow"><i className="fa-solid fa-arrow-right"></i></div>
            </div>

            <div className="pv-card" onClick={() => navigate('/auth')}>
              <div className="pv-icon-box green">
                <i className="fa-regular fa-file-lines"></i>
              </div>
              <h3>{tp("Candidature en ligne", "Online Application")}</h3>
              <p>{tp("Postulez facilement en quelques clics et suivez l'évolution de votre dossier.", "Apply easily in a few clicks and track your application progress.")}</p>
              <div className="pv-bottom-arrow"><i className="fa-solid fa-arrow-right"></i></div>
            </div>

            <div className="pv-card" onClick={() => setActiveTab('events')}>
              <div className="pv-icon-box slate">
                <i className="fa-regular fa-calendar-days"></i>
              </div>
              <h3>{tp("Calendrier Municipal", "Municipal Calendar")}</h3>
              <p>{tp("Restez informé des événements, formations et activités de la commune.", "Stay informed about council events, workshops and civic activities.")}</p>
              <div className="pv-bottom-arrow"><i className="fa-solid fa-arrow-right"></i></div>
            </div>

            <div className="pv-card" onClick={() => setShowOrganigramme(true)}>
              <div className="pv-icon-box teal">
                <i className="fa-solid fa-users"></i>
              </div>
              <h3>{tp("Transparence", "Transparency")}</h3>
              <p>{tp("Un processus équitable, clair et ouvert à tous les citoyens.", "A fair, clear and open recruitment process for all citizens.")}</p>
              <div className="pv-bottom-arrow"><i className="fa-solid fa-arrow-right"></i></div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. CONTENU DES ONGLETS */}
      <main className="public-main-content" id="search-jobs-section">
        <div className="section-container">

          {/* SECTION OFFRES D'EMPLOI */}
          {activeTab === 'jobs' && (
            <section className="jobs-section-block">
              <div className="jobs-header-row">
                <div>
                  <h2 className="section-title">{tp("Offres d'Emploi & Stages Municipaux", "Municipal Job Offers & Internships")}</h2>
                  <p className="section-subtitle">{tp("Consultez les postes ouverts et postulez directement en ligne.", "Browse open vacancies and apply online directly.")}</p>
                </div>

                <div className="jobs-controls-wrapper">
                  <div className="search-box-modern">
                    <i className="fa-solid fa-magnifying-glass search-icon"></i>
                    <input 
                      type="text" 
                      placeholder={tp("Rechercher par poste, métier...", "Search by title, role...")} 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-pills">
                    <button className={`pill ${selectedFilter === 'tous' ? 'active' : ''}`} onClick={() => setSelectedFilter('tous')}>
                      {tp("Tous", "All")} ({jobs.length})
                    </button>
                    <button className={`pill ${selectedFilter === 'cdi' ? 'active' : ''}`} onClick={() => setSelectedFilter('cdi')}>
                      CDI
                    </button>
                    <button className={`pill ${selectedFilter === 'cdd' ? 'active' : ''}`} onClick={() => setSelectedFilter('cdd')}>
                      CDD
                    </button>
                    <button className={`pill ${selectedFilter === 'stage' ? 'active' : ''}`} onClick={() => setSelectedFilter('stage')}>
                      {tp("Stages", "Internships")}
                    </button>
                  </div>
                </div>
              </div>

              {filteredJobs.length > 0 ? (
                <div className="jobs-grid-public">
                  {filteredJobs.map(job => (
                    <article key={job.id || job.title} className="public-job-card">
                      <div className="job-card-header">
                        <span className={`contract-badge ${job.type ? job.type.toLowerCase() : 'cdi'}`}>
                          {language === 'en' ? (job.type === 'Stage' ? 'Internship' : job.type) : (job.type || 'CDI')}
                        </span>
                        <span className="location-badge">
                          <i className="fa-solid fa-location-dot"></i> {job.location ? (language === 'en' ? job.location.replace('Mairie de Soa', 'Soa Council') : job.location) : tp('Mairie de Soa', 'Soa Council')}
                        </span>
                      </div>

                      <h3 className="job-title">
                        {language === 'en' ? (
                          job.title === 'Assistant Ressources Humaines' ? 'Human Resources Assistant' :
                          job.title === 'Analyste de Données' ? 'Data Analyst' :
                          job.title === 'Chargé de Communication' ? 'Communications Officer' :
                          job.title === 'Stagiaire Académique en Droit Public / Informatique' ? 'Academic Intern in Public Law / IT' :
                          job.title
                        ) : job.title}
                      </h3>
                      <div className="job-dept">
                        <i className="fa-solid fa-building"></i> {job.department || tp('Service Municipal', 'Municipal Service')}
                      </div>
                      
                      <p className="job-description">{job.description}</p>

                      <div className="job-card-footer">
                        <div className="salary-info">
                          <i className="fa-solid fa-wallet"></i> {tp(job.salary_range || 'Selon grille', job.salary_range === 'Stage' ? 'Internship Stipend' : (job.salary_range || 'Municipal Salary Scale'))}
                        </div>
                        <button className="apply-btn-card" onClick={() => navigate('/auth')}>
                          {tp("Postuler", "Apply")} <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-jobs-card">
                  <i className="fa-solid fa-folder-open empty-icon"></i>
                  <h3>{tp("Aucune offre trouvée", "No offers found")}</h3>
                  <button className="btn-reset-filter" onClick={() => { setSearchQuery(''); setSelectedFilter('tous'); }}>
                    {tp("Réinitialiser les filtres", "Reset filters")}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* SECTION CALENDRIER MUNICIPAL */}
          {activeTab === 'events' && (
            <section className="events-section-block">
              <div className="section-header-centered">
                <h2 className="section-title">{tp("Calendrier Municipal & Ateliers Citoyens", "Municipal Calendar & Citizen Workshops")}</h2>
                <p className="section-subtitle">{tp("Découvrez l'agenda des ateliers, réunions et cérémonies de la Commune de Soa.", "Discover the agenda of workshops, council meetings and civic events in Soa.")}</p>
              </div>

              <div className="events-grid-public">
                {events.map(ev => (
                  <div key={ev.id} className="event-card-public">
                    <div className="event-date-box">
                      <i className="fa-regular fa-calendar-check"></i>
                      <span>{new Date(ev.event_date || Date.now()).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="event-details">
                      <h3>{ev.title}</h3>
                      <p className="ev-desc">{ev.description}</p>
                      <button className="register-ev-btn" onClick={() => handleRegisterEvent(ev.id)}>
                        {regStatus[ev.id] || tp("S'inscrire", "Register")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION ACTUALITÉS */}
          {activeTab === 'news' && (
            <section className="news-section-block">
              <div className="section-header-centered">
                <h2 className="section-title">{tp("Actualités & Lancement HireBridge", "News & HireBridge Portal Launch")}</h2>
                <p className="section-subtitle">{tp("Suivez l'évolution des projets communaux et du portail numérique de Soa.", "Follow municipal developments and digital portal updates in Soa.")}</p>
              </div>

              <div className="news-grid-public">
                {news.map(n => (
                  <article key={n.id} className="news-card">
                    {n.image_url && (
                      <div className="news-img-box">
                        <img src={n.image_url} alt={n.title} />
                      </div>
                    )}
                    <div className="news-content">
                      <h3>{n.title}</h3>
                      <p>{n.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      {/* 6. MODAL ORGANIGRAMME */}
      {showOrganigramme && (
        <div className="modal-overlay" onClick={() => setShowOrganigramme(false)}>
          <div className="modal-content-organigramme" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{tp("Organigramme des Services Municipaux de Soa", "Soa Municipal Services Organization Chart")}</h3>
              <button className="close-modal-btn" onClick={() => setShowOrganigramme(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="organigramme-tree">
              <div className="orga-root-card">
                <h4>{tp("MONSIEUR LE MAIRE DE SOA", "THE MAYOR OF SOA COUNCIL")}</h4>
                <p>{tp("Conseil Municipal & Exécutif Communal", "Municipal Council & Executive Board")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. FOOTER */}
      <footer className="public-footer">
        <div className="footer-container">
          <div className="footer-cols">
            <div className="footer-col brand-col">
              <div className="footer-logo">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg" 
                  alt={tp("Armoiries Cameroun", "Coat of Arms of Cameroon")} 
                />
                <span>{tp("MAIRIE DE SOA", "SOA COUNCIL")}</span>
              </div>
              <p className="footer-tagline">
                {tp(
                  "Portail officiel de recrutement et de services citoyens numériques de la Commune de Soa (Cameroun).",
                  "Official digital recruitment and citizen services portal of Soa Council (Cameroon)."
                )}
              </p>
            </div>
            <div className="footer-col">
              <h4>{tp("Contact RH", "HR Contact")}</h4>
              <p>rh@soa.cm</p>
              <span className="platform-tag">{tp("Plateforme Sécurisée HireBridge v2.4", "HireBridge Secure Platform v2.4")}</span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} {tp("Mairie de Soa — Tous droits réservés. République du Cameroun.", "Soa Council — All rights reserved. Republic of Cameroon.")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const defaultJobs = [
  {
    id: 1,
    title: "Stagiaire Académique en Droit Public / Informatique",
    type: "Stage",
    department: "Cellule Juridique & SI",
    location: "Mairie de Soa • Yaoundé",
    description: "Stage de perfectionnement académique au sein des services municipaux de Soa pour les étudiants de niveau Licence/Master.",
    salary_range: "Stage"
  },
  {
    id: 2,
    title: "Assistant Ressources Humaines Municipales",
    type: "CDI",
    department: "Service RH & Recrutement",
    location: "Mairie de Soa • Yaoundé",
    description: "Gestion administrative du personnel communal, suivi des dossiers d'embauche et accueil des nouveaux collaborateurs.",
    salary_range: "Selon grille municipale"
  }
];

const defaultEvents = [
  {
    id: 101,
    title: "Atelier de Sensibilisation à l'Entrepreneuriat Jeune",
    event_date: new Date(Date.now() + 86400000 * 5).toISOString(),
    location: "Mairie de Soa",
    description: "Session d'orientation pour les jeunes diplômés et porteurs de projets de la commune de Soa."
  }
];

const defaultNews = [
  {
    id: 201,
    title: "Lancement officiel du portail numérique HireBridge",
    summary: "La Mairie de Soa digitalise l'accès à l'emploi public et aux stages municipaux.",
    image_url: "/hirebridge_platform_launch.jpg"
  }
];

export default PublicPortal;
