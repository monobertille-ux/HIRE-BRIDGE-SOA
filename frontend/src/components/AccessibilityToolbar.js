import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './AccessibilityToolbar.css';

const AccessibilityToolbar = () => {
  const { tp } = useLanguage();
  const [theme, setTheme] = useState(() => localStorage.getItem('hb_theme') || 'light');
  const [contrast, setContrast] = useState(() => localStorage.getItem('hb_contrast') === 'true');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('hb_font_size') || 'normal');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const body = document.body;

    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }

    if (contrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    body.classList.remove('font-normal', 'font-lg', 'font-xl');
    body.classList.add(`font-${fontSize}`);

    localStorage.setItem('hb_theme', theme);
    localStorage.setItem('hb_contrast', contrast);
    localStorage.setItem('hb_font_size', fontSize);
  }, [theme, contrast, fontSize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
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

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleContrast = () => {
    setContrast(prev => !prev);
  };

  const changeFontSize = (size) => {
    setFontSize(size);
  };

  return (
    <div className="topbar-access-wrapper" ref={wrapperRef}>
      <button 
        type="button"
        className={`btn-access-topbar ${isOpen ? 'active' : ''} ${theme === 'dark' ? 'is-dark-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={tp("Paramètres d'affichage & Accessibilité", "Display Settings & Accessibility")}
        aria-label={tp("Options d'accessibilité", "Accessibility options")}
      >
        <i className={theme === 'dark' ? "fa-solid fa-moon" : "fa-solid fa-universal-access"}></i>
        {theme === 'dark' && <span className="access-active-dot" />}
      </button>

      {isOpen && (
        <div className="accessibility-panel-dropdown">
          <div className="panel-header">
            <span><i className="fa-solid fa-sliders"></i> {tp('Affichage & Accessibilité', 'Display & Accessibility')}</span>
            <button type="button" className="close-panel-btn" onClick={() => setIsOpen(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="panel-body">
            {/* Mode Sombre / Mode Clair */}
            <div className="access-option">
              <span className="option-title">{tp("Thème d'affichage :", "Display Theme:")}</span>
              <button 
                type="button"
                className={`access-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={toggleTheme}
              >
                {theme === 'light' ? (
                  <><i className="fa-solid fa-moon"></i> {tp('Activer Mode Sombre', 'Enable Dark Mode')}</>
                ) : (
                  <><i className="fa-solid fa-sun"></i> {tp('Basculer en Mode Clair', 'Switch to Light Mode')}</>
                )}
              </button>
            </div>

            {/* Contraste Élevé */}
            <div className="access-option">
              <span className="option-title">{tp("Contraste de lecture :", "Reading Contrast:")}</span>
              <button 
                type="button"
                className={`access-btn ${contrast ? 'active' : ''}`}
                onClick={toggleContrast}
              >
                <i className="fa-solid fa-circle-half-stroke"></i> {contrast ? tp('Contraste Standard', 'Standard Contrast') : tp('Contraste Renforcé', 'High Contrast')}
              </button>
            </div>

            {/* Taille du Texte */}
            <div className="access-option">
              <span className="option-title">{tp("Taille de police :", "Font Size:")}</span>
              <div className="font-size-group">
                <button 
                  type="button"
                  className={`font-btn ${fontSize === 'normal' ? 'active' : ''}`}
                  onClick={() => changeFontSize('normal')}
                  title={tp("Taille normale", "Normal size")}
                >
                  A ({tp('Normal', 'Normal')})
                </button>
                <button 
                  type="button"
                  className={`font-btn ${fontSize === 'lg' ? 'active' : ''}`}
                  onClick={() => changeFontSize('lg')}
                  title={tp("Grand texte", "Large text")}
                >
                  A+ ({tp('Grand', 'Large')})
                </button>
                <button 
                  type="button"
                  className={`font-btn ${fontSize === 'xl' ? 'active' : ''}`}
                  onClick={() => changeFontSize('xl')}
                  title={tp("Très grand texte", "Very large text")}
                >
                  A++ ({tp('Max', 'Max')})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityToolbar;
