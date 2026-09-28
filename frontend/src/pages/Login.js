import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleRedirect = (user) => {
    if (user && (user.role === 'admin' || user.role === 'rh')) {
      navigate('/admin/dashboard');
    } else {
      navigate('/candidat/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Connexion réussie !', type: 'success' });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => handleRedirect(data.user), 800);
      } else {
        setMessage({ text: data.message || 'Identifiants incorrects', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Impossible de contacter le serveur backend.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        handleRedirect(data.user);
      } else {
        setMessage({ text: 'Échec authentification Google.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Erreur réseau Google.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Côté Gauche */}
        <div className="left-panel">
          <div className="brand-header">
            <img src="/logo-soa.png" alt="Mairie de SOA" className="logo-mairie" onError={(e)=>{e.target.style.display='none'}} />
            <div className="brand-title">MAIRIE DE<br /><strong>SOA</strong></div>
            <div className="hire-bridge">- HIRE BRIDGE</div>
          </div>

          <div className="login-tab-notch">
            LOGIN
          </div>

          <div className="left-content">
            <h2>Votre carrière<br />à la mairie<br />commence ici.</h2>
            <div className="green-line"></div>
          </div>
        </div>

        {/* Côté Droit */}
        <div className="right-panel">
          <div className="profile-avatar-icon">
            <i className="fa-regular fa-user"></i>
          </div>

          <h2 className="form-title-login">CONNEXION</h2>

          {message.text && (
            <div className={`alert-message ${message.type}`}>{message.text}</div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field-container">
              <i className="fa-regular fa-envelope field-icon"></i>
              <input
                type="email"
                placeholder="Email"
                className="custom-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-container">
              <i className="fa-solid fa-lock field-icon"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                className="custom-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <i
                className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-eye`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>

            <a href="#forgot" className="forgot-password-link">
              Mot de passe oublié ?
            </a>

            <button type="submit" className="btn-submit-green" disabled={loading}>
              {loading ? 'CONNEXION...' : 'SE CONNECTER'}
            </button>

            <div className="divider-ou">
              <span>OU</span>
            </div>

            <div className="google-btn-wrapper">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => {}} />
            </div>

            <p className="signup-redirect-text">
              Pas encore de compte ?
              <Link to="/signup" className="signup-redirect-link">
                Créer un compte
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;