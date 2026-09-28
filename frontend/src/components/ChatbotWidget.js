import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ChatbotWidget.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const ChatbotWidget = ({ user, userId }) => {
  const { language, t, tp } = useLanguage();
  const candidateName = user?.prenom || user?.nom || '';

  const defaultHello = language === 'en'
    ? (candidateName ? `Hello ${candidateName}, what can I do for you today?` : `Hello, what can I do for you today?`)
    : (candidateName ? `Hello ${candidateName}, que puis-je faire pour toi aujourd'hui ?` : `Hello, que puis-je faire pour toi aujourd'hui ?`);

  const initialOptions = language === 'en'
    ? ["Required documents", "Browse job offers", "Internship request", "Council opening hours"]
    : ["Pièces à fournir", "Consulter les offres", "Demande de stage", "Horaires Mairie"];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: defaultHello,
      options: initialOptions
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].sender === 'bot') {
        return [{
          sender: 'bot',
          text: defaultHello,
          options: initialOptions
        }];
      }
      return prev;
    });
  }, [language, candidateName]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (userMsgText) => {
    const textToSend = userMsgText || inputText;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!userMsgText) setInputText('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, userId, language })
      });

      const data = await response.json();
      let replyText = data.reply || (language === 'en' ? "I am at your full disposal to guide you through Soa Council services." : "Je suis à votre entière disposition pour vous guider auprès des services de la Mairie de Soa.");
      let replyOptions = data.options || [];

      if (language === 'en') {
        replyText = t(replyText);
        replyOptions = replyOptions.map(opt => t(opt));
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: replyText,
          options: replyOptions
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: language === 'en'
            ? "The reception desk service is experiencing a network issue. Please try again in a few moments."
            : "Le service d'accueil rencontre un souci de connexion réseau. Veuillez réessayer dans quelques instants.",
          options: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-widget-container">
      {!isOpen ? (
        <button 
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          title={tp("Ouvrir l'Accueil Citoyen & Guide Municipal", "Open Citizen Help & Municipal Guide")}
          aria-label={tp("Ouvrir l'accueil d'assistance municipale", "Open municipal assistance desk")}
        >
          <div className="fab-icon-wrapper">
            <i className="fa-solid fa-headset"></i>
          </div>
          <span className="fab-badge">{tp('ACCUEIL', 'HELP')}</span>
        </button>
      ) : (
        <div className="chatbot-window">
          {/* Header Chatbot */}
          <div className="chatbot-header">
            <div className="bot-info">
              <div className="bot-avatar">
                <i className="fa-solid fa-headset"></i>
              </div>
              <div>
                <h4>{tp('Accueil Citoyen & Guide Municipal', 'Citizen Reception & Municipal Guide')}</h4>
                <span className="online-indicator"> {tp('En ligne • Mairie de Soa', 'Online • Soa Council')}</span>
              </div>
            </div>
            <button className="close-chatbot-btn" onClick={() => setIsOpen(false)} title={tp("Fermer la fenêtre", "Close window")}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Corps de conversation */}
          <div className="chatbot-body">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message-row ${msg.sender}`}>
                <div className={`chat-bubble ${msg.sender}`}>
                  <p style={{ whitespace: 'pre-line' }}>{msg.text}</p>
                </div>
                {msg.options && msg.options.length > 0 && (
                  <div className="chat-options-chips">
                    {msg.options.map((opt, oIdx) => (
                      <button 
                        key={oIdx} 
                        className="chip-btn"
                        onClick={() => handleSend(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-message-row bot">
                <div className="chat-bubble bot typing">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Formulaire de message */}
          <form className="chatbot-footer" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <input 
              type="text"
              placeholder={tp("Posez votre question ici...", "Ask your question here...")}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="send-btn" disabled={!inputText.trim()}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
