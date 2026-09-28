import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Auth from './pages/Auth';
import CandidateDashboard from './pages/Candidat/CandidateDashboard';
import OffresEmploi from './pages/Candidat/OffresEmploi';
import AdminDashboard from './pages/Admin/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import PublicPortal from './pages/Public/PublicPortal';

// Composant de protection des routes nécessitant une authentification
const ProtectedRoute = ({ children, allowedRoles }) => {
  let savedUser = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) savedUser = JSON.parse(userStr);
  } catch (e) {}
  const token = localStorage.getItem('token');

  // L'utilisateur est connecté si un token OU un objet user existe dans localStorage
  const isLoggedIn = !!(token || savedUser);

  // Si aucun utilisateur connecté -> Redirection immédiate vers /auth
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  const rawRole = savedUser?.role || 'candidat';
  let normalizedRole = 'candidat';
  if (rawRole === 'super_admin' || rawRole === 'superadmin') normalizedRole = 'superadmin';
  else if (rawRole === 'admin_rh' || rawRole === 'admin' || rawRole === 'rh') normalizedRole = 'admin';

  // Contrôle d'accès basé sur les rôles
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.includes(normalizedRole) || allowedRoles.includes(rawRole);
    if (!isAllowed) {
      if (normalizedRole === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
      if (normalizedRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
      return <Navigate to="/candidat/dashboard" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          {/* Portail Public (Page d'accueil & offres d'emploi pour les citoyens) */}
          <Route path="/" element={<PublicPortal />} />
          <Route path="/portail" element={<PublicPortal />} />

          {/* Page d'authentification (Connexion / Inscription / Mot de passe oublié) */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />

          {/* Espace Candidat (Protégé) */}
          <Route
            path="/candidat/dashboard"
            element={
              <ProtectedRoute allowedRoles={['candidat', 'admin', 'superadmin']}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidat/offres"
            element={
              <ProtectedRoute allowedRoles={['candidat', 'admin', 'superadmin']}>
                <OffresEmploi />
              </ProtectedRoute>
            }
          />

          {/* Espace Admin RH (Protégé) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Espace Super Admin (Protégé) */}
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirection des routes inconnues */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;