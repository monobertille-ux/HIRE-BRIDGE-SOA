import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { language, setLanguage, toggleLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLang = (lang) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="topbar-language-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`btn-lang-topbar ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={language === 'fr' ? "Traduire en Anglais (Switch to English)" : "Traduire en Français (Switch to French)"}
        aria-label="Sélection de la langue"
      >
        <i className="fa-solid fa-language"></i>
        <span className="lang-code-badge">{language.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="language-dropdown-menu">
          <div className="lang-menu-header">
            <i className="fa-solid fa-earth-africa"></i>
            <span>Bilinguisme Officiel</span>
          </div>

          <div className="lang-options-list">
            <button
              type="button"
              className={`lang-option-btn ${language === 'fr' ? 'active' : ''}`}
              onClick={() => handleSelectLang('fr')}
            >
              <span className="lang-pill-badge" style={{ fontWeight: 900, background: '#074696', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>FR</span>
              <div className="lang-text-group">
                <strong>Français</strong>
                <small>Langue Officielle</small>
              </div>
              {language === 'fr' && <i className="fa-solid fa-check check-icon"></i>}
            </button>

            <button
              type="button"
              className={`lang-option-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleSelectLang('en')}
            >
              <span className="lang-pill-badge" style={{ fontWeight: 900, background: '#1b8a53', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>EN</span>
              <div className="lang-text-group">
                <strong>English</strong>
                <small>Official Language</small>
              </div>
              {language === 'en' && <i className="fa-solid fa-check check-icon"></i>}
            </button>
          </div>

          <div className="lang-quick-toggle-row">
            <button
              type="button"
              className="btn-quick-switch"
              onClick={() => {
                toggleLanguage();
                setIsOpen(false);
              }}
            >
              <i className="fa-solid fa-repeat"></i>
              {language === 'fr' ? "Bascule Rapide  English" : "Quick Switch  Français"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
