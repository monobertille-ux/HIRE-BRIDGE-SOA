/**
 * Utilitaire de Salutation Dynamique en Temps Réel — Mairie de Soa (HireBridge)
 * Détermine la salutation selon l'heure locale :
 * - Matin (05h00 à 11h59) : "Bonjour" / "Good morning"
 * - Après-midi (12h00 à 17h59) : "Bon après-midi" / "Good afternoon"
 * - Soir / Nuit (18h00 à 04h59) : "Bonsoir" / "Good evening"
 */

export const getTimeBasedSalutation = (language = 'fr') => {
  const hour = new Date().getHours();
  
  if (language === 'en') {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export const getDynamicGreeting = (firstName = '', language = 'fr') => {
  const salutation = getTimeBasedSalutation(language);
  if (!firstName) return salutation;
  return `${salutation}, ${firstName}`;
};
