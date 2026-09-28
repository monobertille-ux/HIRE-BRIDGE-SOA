// Utilitaire d'adresse API dynamique (compatible Local, Mobile et Production Render)
export const getApiUrl = () => {
  // En production sur Vercel ou si configuré dans l'environnement
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Si on est sur le site déployé (Vercel)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://hire-bridge-soa.onrender.com';
  }

  // En développement local (sur PC ou test Wi-Fi)
  const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  return `http://${hostname}:5000`;
};

export const API_BASE_URL = getApiUrl();