// Utilitaire d'adresse API dynamique (compatible PC, Téléphone Mobile et Réseau Wi-Fi local)
export const getApiUrl = () => {
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export const API_BASE_URL = getApiUrl();
