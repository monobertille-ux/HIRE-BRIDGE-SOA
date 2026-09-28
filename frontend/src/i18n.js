import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './utils/translations';
import { translateRawText } from './utils/domTranslator';

const savedLanguage = typeof window !== 'undefined' ? (localStorage.getItem('hb_lang') || 'fr') : 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        translation: translations.fr || {}
      },
      en: {
        translation: translations.en || {}
      }
    },
    lng: savedLanguage,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false // React déjà protégé contre XSS
    },
    react: {
      useSuspense: false
    }
  });

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hb_lang', lng);
    document.documentElement.lang = lng;
  }
});

// Helper de fallback dynamique pour traduire toute phrase française non présente dans les clés i18n
export const translateDynamic = (text, targetLang = i18n.language) => {
  if (!text || typeof text !== 'string') return text || '';
  if (targetLang !== 'en') return text;
  
  // Si la clé existe dans i18n
  if (i18n.exists(text)) {
    return i18n.t(text);
  }

  // Fallback sur le dictionnaire exhaustif PHRASES bilingue de Soa
  return translateRawText(text);
};

export default i18n;
