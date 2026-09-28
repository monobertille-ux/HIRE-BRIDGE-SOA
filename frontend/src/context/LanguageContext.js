import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateDynamic } from '../i18n';
import { translateRawText } from '../utils/domTranslator';
import { applyTranslation } from '../utils/googleTranslate';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { t: i18nT, i18n } = useTranslation();
  const language = i18n.language || 'fr';

  useEffect(() => {
    localStorage.setItem('hb_lang', language);
    document.documentElement.lang = language;
    applyTranslation(language);
  }, [language]);

  const changeLanguage = (newLang) => {
    if (newLang === 'fr' || newLang === 'en') {
      i18n.changeLanguage(newLang);
      applyTranslation(newLang);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr';
    changeLanguage(nextLang);
  };

  // Helper principal de traduction réactif avec react-i18next + fallback SOA
  const t = (keyOrDefaultText, fallbackText = '') => {
    if (!keyOrDefaultText || typeof keyOrDefaultText !== 'string') return keyOrDefaultText || '';

    // 1. i18next lookup
    if (i18n.exists(keyOrDefaultText)) {
      return i18nT(keyOrDefaultText);
    }

    // 2. Si langue est Anglais, traduction dynamique via dictionnaire Soa
    if (language === 'en') {
      const textToTranslate = fallbackText || keyOrDefaultText;
      return translateDynamic(textToTranslate, 'en');
    }

    return fallbackText || keyOrDefaultText;
  };

  // Helper direct FR / EN : tp("Bonjour", "Hello")
  const tp = (frText, enText) => {
    return language === 'en' ? enText : frText;
  };

  // Traducteur de statuts pour l'interface
  const tStatus = (statusKey) => {
    if (language !== 'en') return statusKey;
    const statusMap = {
      'soumis': 'Submitted',
      'recu': 'Received',
      'en_examen': 'Under Review',
      'entretien_programme': 'Interview Scheduled',
      'accepte': 'Selected',
      'refuse': 'Not Selected',
      'actif': 'Active',
      'inactif': 'Inactive',
      'ouvert': 'Open',
      'ferme': 'Closed',
      'resolu': 'Resolved',
      'en_cours': 'In Progress'
    };
    return statusMap[statusKey] || translateRawText(statusKey);
  };

  // Traducteur de types de contrat & demandes
  const tType = (typeKey) => {
    if (language !== 'en') return typeKey;
    const typeMap = {
      'emploi': 'Job Offer',
      'cdi': 'Permanent Contract (CDI)',
      'cdd': 'Fixed-Term Contract (CDD)',
      'stage_academique': 'Academic Internship',
      'stage_professionnel': 'Professional Internship',
      'stage_vacances': 'Holiday Internship',
      'formation': 'Training Course'
    };
    return typeMap[typeKey] || translateRawText(typeKey);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      toggleLanguage,
      t,
      tp,
      tStatus,
      tType,
      i18n
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'fr',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key, def) => def || key,
      tp: (fr, en) => fr,
      tStatus: (s) => s,
      tType: (t) => t
    };
  }
  return context;
};

export default LanguageContext;
