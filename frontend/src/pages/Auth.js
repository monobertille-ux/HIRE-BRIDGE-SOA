import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './Auth.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://hire-bridge-soa.onrender.com';

const Auth = () => {
  const navigate = useNavigate();
  const { language, t, tp } = useLanguage();

  // Mode principal : 'login', 'signup', ou 'forgot'
  const [viewMode, setViewMode] = useState('login');

  // États réinitialisation
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Masquer / Afficher les mots de passe
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Formulaire Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Formulaire Sign Up
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [genre, setGenre] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Modales & Messages
  const [modalContent, setModalContent] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleRedirect = (user) => {
    if (user && user.role === 'super_admin') {
      navigate('/superadmin/dashboard');
    } else if (user && (user.role === 'admin_rh' || user.role === 'admin' || user.role === 'rh')) {
      navigate('/admin/dashboard');
    } else {
      navigate('/candidat/dashboard');
    }
  };

  // --- SUBMIT LOGIN ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: tp('Connexion réussie !', 'Login successful!'), type: 'success' });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => handleRedirect(data.user), 800);
      } else {
        setMessage({ text: data.message ? (language === 'en' ? 'Incorrect email or password' : data.message) : tp('Identifiants incorrects', 'Incorrect credentials'), type: 'error' });
      }
    } catch (err) {
      setMessage({ text: tp('Erreur de connexion au serveur.', 'Server connection error.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- CONNEXION VIA GOOGLE ---
  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: credentialResponse.credential,
          credential: credentialResponse.credential
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: tp('Connexion Google réussie !', 'Google login successful!'), type: 'success' });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => handleRedirect(data.user), 800);
      } else {
        setMessage({ text: data.message || tp('Échec de la connexion Google', 'Google login failed'), type: 'error' });
      }
    } catch (err) {
      console.error('Erreur Google Auth frontend :', err);
      setMessage({ text: tp('Erreur de communication avec le serveur backend.', 'Backend communication error.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- BASCULEMENT SUR MOT DE PASSE OUBLIÉ ---
  const handleOpenForgotPassword = (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setResetEmail(loginEmail);
    setCodeSent(false);
    setViewMode('forgot');
  };

  // --- ENVOI DE L'EMAIL DE RÉINITIALISATION ---
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        setMessage({ text: tp('Un code de réinitialisation a été envoyé sur votre adresse e-mail.', 'A reset code has been sent to your email address.'), type: 'success' });
      } else {
        setMessage({ text: data.message || tp('Adresse e-mail non trouvée.', 'Email address not found.'), type: 'error' });
      }
    } catch (err) {
      setMessage({ text: tp('Erreur lors de l\'envoi du code.', 'Error sending reset code.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- SOUMISSION DE LA RÉINITIALISATION DU MOT DE PASSE ---
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setMessage({ text: tp('Les mots de passe ne correspondent pas.', 'Passwords do not match.'), type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: tp('Mot de passe réinitialisé avec succès ! Connectez-vous.', 'Password reset successful! Please sign in.'), type: 'success' });
        setTimeout(() => {
          setViewMode('login');
          setMessage({ text: '', type: '' });
        }, 1500);
      } else {
        setMessage({ text: data.message || tp('Code invalide ou expiré.', 'Invalid or expired code.'), type: 'error' });
      }
    } catch (err) {
      setMessage({ text: tp('Erreur de réinitialisation.', 'Reset error.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- SUBMIT INSCRIPTION ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!acceptedTerms) {
      setMessage({ text: tp('Veuillez accepter les conditions d\'utilisation pour continuer.', 'Please accept the terms of use to continue.'), type: 'error' });
      return;
    }
    if (signupPassword !== confirmPassword) {
      setMessage({ text: tp('Les mots de passe ne correspondent pas.', 'Passwords do not match.'), type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, prenom, genre, email: signupEmail, password: signupPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ text: tp('Compte créé avec succès !', 'Account created successfully!'), type: 'success' });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => handleRedirect(data.user), 800);
      } else {
        setMessage({ text: data.message || tp("Erreur lors de l'inscription.", "Registration error."), type: 'error' });
      }
    } catch (err) {
      setMessage({ text: tp('Erreur réseau backend.', 'Backend network error.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-outer-bg">

      {/* BARRE DE HEADER CIVIQUE SUPERIEURE AVEC SÉLECTEUR DE LANGUE */}
      <div className="auth-top-header">
        <div className="auth-header-brand" onClick={() => navigate('/')}>
          <div className="badge-logo-container-header">
            <img
              src={`${process.env.PUBLIC_URL}/soa.png`}
              alt="Mairie de Soa"
              className="soa-badge-img"
              onError={(e) => {
                e.target.src = "https://upload.wikimedia.org/wikipedia/commons/b/b5/Coat_of_arms_of_Cameroon.svg";
              }}
            />
          </div>
          <div className="auth-brand-text">
            <div className="auth-mairie">{tp('MAIRIE DE', 'SOA')} <span className="green-txt">{tp('SOA', 'COUNCIL')}</span></div>
            <span className="auth-sub">HIREBRIDGE</span>
          </div>
        </div>

        <LanguageSwitcher />
      </div>

      <AnimatePresence mode="wait">

        {/* VUE 1 : CONNEXION */}
        {viewMode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="login-card"
          >
            <div className="login-left-side background-soa-building" style={{ backgroundImage: "url('/hotel_de_ville_soa.jpg')" }}>
              <div className="bg-blue-overlay"></div>

              <div className="left-hero-content">
                <h1 className="signup-hero-headline">
                  {language === 'en' ? (
                    <>{t("Your career")}<br />starts <span className="green-txt">here.</span></>
                  ) : (
                    <>{t("Votre carrière")}<br />commence <span className="green-txt">ici.</span></>
                  )}
                </h1>

                <div className="green-dash-bar"></div>

                <p className="signup-hero-subtext">
                  {tp(
                    "Rejoignez les équipes de la Mairie de Soa et contribuez activement au développement de la commune.",
                    "Join the team at Soa Council and actively contribute to local municipal development."
                  )}
                </p>

                <div className="left-feature-badges-card">
                  <div className="feature-item">
                    <div className="feature-icon"><i className="fa-solid fa-shield-halved"></i></div>
                    <div>
                      <strong>{tp('Sécurisé', 'Secure')}</strong>
                      <span>{tp('Vos données sont protégées', 'Your data is protected')}</span>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><i className="fa-solid fa-users"></i></div>
                    <div>
                      <strong>{tp('Simple & Rapide', 'Fast & Easy')}</strong>
                      <span>{tp('Connexion rapide', 'Quick sign-in')}</span>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><i className="fa-solid fa-landmark"></i></div>
                    <div>
                      <strong>{tp('Service Public', 'Public Service')}</strong>
                      <span>{tp('Plateforme officielle de Soa', 'Official Soa portal')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="login-right-side">
              <div className="avatar-header-circle">
                <i className="fa-regular fa-user"></i>
              </div>

              <h2 className="title-connexion-modern">{tp('Connexion', 'Sign In')}</h2>
              <p className="sub-connexion-text">{tp('Saisissez vos identifiants pour vous connecter', 'Enter your credentials to sign in to your account')}</p>

              {message.text && <div className={`status-alert ${message.type}`}>{message.text}</div>}

              <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="input-group-custom">
                  <i className="fa-regular fa-user input-left-icon"></i>
                  <input
                    type="email"
                    placeholder={tp("Email", "Email Address")}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group-custom">
                  <i className="fa-solid fa-lock input-left-icon"></i>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder={tp("Mot de passe", "Password")}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <i
                    className={`fa-regular ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-eye-icon`}
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  ></i>
                </div>

                <button type="button" className="forgot-pass-green-link" onClick={handleOpenForgotPassword}>
                  {tp('Mot de passe oublié ?', 'Forgot password?')}
                </button>

                <button type="submit" className="btn-submit-green-arrow" disabled={loading}>
                  {loading ? (language === 'en' ? 'LOADING...' : 'CHARGEMENT...') : (language === 'en' ? 'SIGN IN' : 'SE CONNECTER')} <i className="fa-solid fa-arrow-right"></i>
                </button>

                <div className="or-separator-gray"><span>{tp('OU', 'OR')}</span></div>

                <div className="google-btn-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setMessage({ text: tp('Échec de l\'authentification Google', 'Google authentication failed'), type: 'error' })}
                  />
                </div>

                <p className="footer-switch-text">
                  {tp('Pas encore de compte ?', 'No account yet?')}{' '}
                  <span className="switch-link-green" onClick={() => { setViewMode('signup'); setMessage({ text: '', type: '' }); }}>
                    {tp('Créer un compte', 'Create Account')} <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </p>
              </form>
            </div>
          </motion.div>
        )}

        {/* VUE 2 : MOT DE PASSE OUBLIÉ */}
        {viewMode === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="login-card"
          >
            <div className="login-left-side background-soa-building" style={{ backgroundImage: "url('/hotel_de_ville_soa.jpg')" }}>
              <div className="bg-blue-overlay"></div>

              <div className="left-hero-content">
                <h1 className="signup-hero-headline">
                  {language === 'en' ? <>{t("Password")}<br />reset.</> : <>{t("Réinitialisation")}<br />du mot de passe.</>}
                </h1>
                <div className="green-dash-bar"></div>
              </div>
            </div>

            <div className="login-right-side">
              <div className="avatar-header-circle"><i className="fa-solid fa-key"></i></div>
              <h2 className="title-connexion-modern">{tp('Mot de passe oublié', 'Forgot Password')}</h2>

              {message.text && <div className={`status-alert ${message.type}`}>{message.text}</div>}

              {!codeSent ? (
                <form onSubmit={handleSendResetCode} className="login-form">
                  <div className="input-group-custom">
                    <i className="fa-regular fa-envelope input-left-icon"></i>
                    <input
                      type="email"
                      placeholder={tp("Saisissez votre email", "Enter your email")}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-submit-green-arrow" disabled={loading}>
                    {loading ? tp('ENVOI EN COURS...', 'SENDING CODE...') : tp('ENVOYER LE CODE', 'SEND RESET CODE')} <i className="fa-solid fa-arrow-right"></i>
                  </button>

                  <p className="footer-switch-text" style={{ marginTop: '20px' }}>
                    <span className="switch-link-green" onClick={() => { setViewMode('login'); setMessage({ text: '', type: '' }); }}>
                      &larr; {tp('Retour à la connexion', 'Back to sign in')}
                    </span>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="login-form">
                  <div className="input-group-custom">
                    <i className="fa-solid fa-key input-left-icon"></i>
                    <input
                      type="text"
                      placeholder={tp("Code à 6 chiffres", "6-digit code")}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group-custom">
                    <i className="fa-solid fa-lock input-left-icon"></i>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder={tp("Nouveau mot de passe", "New password")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group-custom">
                    <i className="fa-solid fa-lock input-left-icon"></i>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder={tp("Confirmer le mot de passe", "Confirm password")}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-submit-green-arrow" disabled={loading}>
                    {loading ? tp('VALIDATION...', 'SAVING...') : tp('ENREGISTRER', 'SAVE NEW PASSWORD')} <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}

        {/* VUE 3 : INSCRIPTION */}
        {viewMode === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="login-card"
          >
            <div className="login-left-side login-theme-blue signup-theme-panel">
              <div className="green-diamond-shape"></div>

              <div className="text-on-green-shape">
                <h2>{language === 'en' ? <>{t("Join us")}<br />today.</> : <>{t("Rejoignez-nous")}<br />dès maintenant.</>}</h2>
                <div className="white-dash-bar"></div>
              </div>

              <div className="login-tab-notch-pill">
                <span>{tp('INSCRIPTION', 'SIGN UP')}</span>
              </div>
            </div>

            <div className="login-right-side">
              <div className="avatar-header-circle">
                <i className="fa-solid fa-user-plus"></i>
              </div>

              <h2 className="title-connexion-modern">{tp('Créer un compte', 'Create Account')}</h2>
              <p className="sub-connexion-text">{tp('Remplissez les informations ci-dessous pour créer votre compte', 'Fill out the information below to create your account')}</p>

              {message.text && <div className={`status-alert ${message.type}`}>{message.text}</div>}

              <form onSubmit={handleRegisterSubmit} className="login-form">

                <div className="signup-grid-inputs">
                  <div className="input-group-custom">
                    <i className="fa-regular fa-user input-left-icon"></i>
                    <input type="text" placeholder={tp("Nom", "Last Name")} value={nom} onChange={(e) => setNom(e.target.value)} required />
                  </div>
                  <div className="input-group-custom">
                    <i className="fa-regular fa-user input-left-icon"></i>
                    <input type="text" placeholder={tp("Prénom", "First Name")} value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                  </div>
                </div>

                <div className="input-group-custom">
                  <i className="fa-regular fa-user input-left-icon"></i>
                  <select value={genre} onChange={(e) => setGenre(e.target.value)} required className="select-custom-input">
                    <option value="" disabled hidden>{tp('Genre', 'Gender')}</option>
                    <option value="Masculin">{tp('Masculin', 'Male')}</option>
                    <option value="Féminin">{tp('Féminin', 'Female')}</option>
                  </select>
                  <i className="fa-solid fa-chevron-down toggle-eye-icon"></i>
                </div>

                <div className="input-group-custom">
                  <i className="fa-regular fa-envelope input-left-icon"></i>
                  <input type="email" placeholder={tp("Email", "Email Address")} value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                </div>

                <div className="signup-grid-inputs">
                  <div className="input-group-custom">
                    <i className="fa-solid fa-lock input-left-icon"></i>
                    <input type={showSignupPassword ? 'text' : 'password'} placeholder={tp("Mot de passe", "Password")} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                    <i className={`fa-regular ${showSignupPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-eye-icon`} onClick={() => setShowSignupPassword(!showSignupPassword)}></i>
                  </div>
                  <div className="input-group-custom">
                    <i className="fa-solid fa-lock input-left-icon"></i>
                    <input type={showConfirmPassword ? 'text' : 'password'} placeholder={tp("Confirmer le mot de passe", "Confirm Password")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-eye-icon`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}></i>
                  </div>
                </div>

                <div className="terms-row">
                  <input type="checkbox" id="terms-checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                  <label htmlFor="terms-checkbox">
                    {tp("J'accepte les", "I accept the")}{' '}
                    <span className="green-link" onClick={() => setModalContent('terms')}>{tp("conditions", "terms")}</span>{' '}
                    {tp("et la", "and")}{' '}
                    <span className="green-link" onClick={() => setModalContent('privacy')}>{tp("confidentialité", "privacy policy")}</span>
                  </label>
                </div>

                <button type="submit" className="btn-submit-green-arrow" disabled={loading}>
                  {loading ? tp('CRÉATION...', 'CREATING...') : tp('CRÉER MON COMPTE', 'CREATE MY ACCOUNT')} <i className="fa-solid fa-arrow-right"></i>
                </button>

                <div className="or-separator-gray"><span>{tp('OU', 'OR')}</span></div>

                <div className="google-btn-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setMessage({ text: tp('Échec de l\'authentification Google', 'Google authentication failed'), type: 'error' })}
                  />
                </div>

                <p className="footer-switch-text">
                  {tp('Vous avez déjà un compte ?', 'Already have an account?')}{' '}
                  <span className="switch-link-green" onClick={() => { setViewMode('login'); setMessage({ text: '', type: '' }); }}>
                    {tp('Se connecter', 'Sign In')} <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </p>
              </form>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODALE CGU & PRIVACY */}
      {modalContent && (
        <div className="modal-backdrop" onClick={() => setModalContent(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <i className={modalContent === 'terms' ? 'fa-solid fa-file-contract' : 'fa-solid fa-user-shield'} style={{ marginRight: '10px', color: '#00a859' }} />
                {modalContent === 'terms'
                  ? tp("Conditions Générales d'Utilisation (CGU)", "Terms & Conditions (T&C)")
                  : tp("Politique de Confidentialité & Protection des Données", "Privacy Policy & Data Protection")}
              </h3>
              <button className="btn-close-x" onClick={() => setModalContent(null)}>&times;</button>
            </div>

            <div className="modal-body-scroll">
              {modalContent === 'terms' ? (
                <ol className="terms-list">
                  <li><strong>{tp('Objet du Service :', 'Purpose of Service:')}</strong> {tp('HireBridge est le portail officiel de recrutement de la Mairie de Soa.', 'HireBridge is the official recruitment portal of Soa Council.')}</li>
                  <li><strong>{tp('Éligibilité :', 'Eligibility:')}</strong> {tp('L\'inscription est réservée aux personnes physiques majeures ou autorisées.', 'Registration is open to adult individuals or legally authorized candidates.')}</li>
                  <li><strong>{tp('Véracité des informations :', 'Information Accuracy:')}</strong> {tp('Tout candidat s\'engage à fournir des renseignements personnels et professionnels exacts.', 'All candidates agree to provide accurate personal and professional details.')}</li>
                  <li><strong>{tp('Compte utilisateur :', 'User Account:')}</strong> {tp('Vous êtes responsable du maintien de la confidentialité de vos identifiants.', 'You are responsible for keeping your login credentials confidential.')}</li>
                  <li><strong>{tp('Droit applicable :', 'Applicable Law:')}</strong> {tp('Les présentes conditions sont régies exclusivement par les lois en vigueur au Cameroun.', 'These terms are governed exclusively by the laws of the Republic of Cameroon.')}</li>
                </ol>
              ) : (
                <ol className="terms-list">
                  <li><strong>{tp('Collecte des données :', 'Data Collection:')}</strong> {tp('Nous collectons votre nom, prénom, genre, email, téléphone et vos CVs.', 'We collect your name, gender, email address, phone number and CVs.')}</li>
                  <li><strong>{tp('Finalité du traitement :', 'Processing Purpose:')}</strong> {tp('Vos données sont traitées uniquement pour l\'évaluation de vos candidatures.', 'Your data is processed solely for evaluating your applications.')}</li>
                  <li><strong>{tp('Responsable du traitement :', 'Data Controller:')}</strong> {tp('Le service RH de la Mairie de Soa est le seul destinataire principal.', 'Soa Council HR Service is the sole primary recipient.')}</li>
                  <li><strong>{tp('Sécurité des comptes :', 'Account Security:')}</strong> {tp('Tous les mots de passe sont hachés de manière irréversible.', 'All passwords are securely hashed in the database.')}</li>
                </ol>
              )}
            </div>

            <div className="modal-foot">
              <button
                className="btn-accept-terms"
                onClick={() => {
                  setAcceptedTerms(true);
                  setModalContent(null);
                }}
              >
                {tp("J'ai lu et j'accepte", "I have read and accept")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Auth;