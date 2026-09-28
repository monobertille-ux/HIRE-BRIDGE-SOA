// =========================================================================
// Moteur Headless Google Translate pour HireBridge SOA
// Bilinguisme officiel 100% : Français (FR) ⟷ Anglais (EN)
// Traduit instantanément toute l'interface sans aucun code manuel
// =========================================================================

// Polyfill de sécurité anti-crash React pour les mutations Google Translate (font tags)
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

export const getSavedLanguage = () => {
  if (typeof window === 'undefined') return 'fr';
  return localStorage.getItem('hb_lang') || 'fr';
};

export const setGoogleTranslateCookie = (lang) => {
  if (typeof document === 'undefined') return;
  const cookieVal = lang === 'en' ? '/fr/en' : '/fr/fr';
  const host = window.location.hostname;

  // Supprime les anciens cookies pour éviter les conflits de domaine
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${host};`;

  if (lang === 'en') {
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${host};`;
  }
};

export const applyTranslation = (lang) => {
  if (typeof window === 'undefined') return;
  const targetLang = lang === 'en' ? 'en' : 'fr';

  localStorage.setItem('hb_lang', targetLang);
  if (document.documentElement) {
    document.documentElement.lang = targetLang;
  }

  setGoogleTranslateCookie(targetLang);

  const attemptComboChange = () => {
    const select = document.querySelector('.goog-te-combo');
    if (!select) return false;

    if (targetLang === 'fr') {
      // Trouver l'option Français ou revenir à l'état d'origine
      const options = Array.from(select.options || []);
      const frOption = options.find((opt) => opt.value === 'fr' || opt.value === '');
      select.value = frOption ? frOption.value : '';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      // Si le bandeau de restauration Google existe dans le DOM
      const restoreBtn = document.querySelector('.goog-te-banner-frame');
      if (restoreBtn && restoreBtn.contentWindow) {
        try {
          const btn = restoreBtn.contentWindow.document.querySelector('.goog-close-link, #goog-gt-c .goog-close-link');
          if (btn) btn.click();
        } catch (e) {}
      }
    } else {
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  };

  if (!attemptComboChange()) {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (attemptComboChange() || count >= 25) {
        clearInterval(interval);
      }
    }, 120);
  }
};
