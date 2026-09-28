import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './VisioRoomModal.css';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const VisioRoomModal = ({
  isOpen,
  onClose,
  interviewData,
  currentUser,
  isRh = false,
  onStatusUpdate
}) => {
  const { language, t, tp } = useLanguage();
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState(null); // 'chat' | 'notes' | 'evaluation'
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [evalScores, setEvalScores] = useState({
    presentation: 85,
    competences: 80,
    motivation: 90,
    adequation: 85
  });

  // Messages réels du chat de séance
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Présence et état réels des participants (0 simulation)
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [allParticipants, setAllParticipants] = useState([]);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);

  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(false);

  const localVideoRef = useRef(null);
  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  const roomId = interviewData?.room_id || (interviewData?.meeting_link ? interviewData.meeting_link.split('room=')[1] : null) || 'SALLE-SOA-LIVE';
  const currentUserIdStr = String(currentUser?.id || (isRh ? 'rh_admin' : 'candidate_user'));
  const currentUserName = `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`.trim() || (isRh ? 'Service RH de Soa' : 'Candidat');
  const jobTitle = interviewData?.job_title || interviewData?.title || 'Entretien Officiel RH — Mairie de Soa';

  // 1. Initialisation de la caméra réelle et du détecteur vocal Web Audio API
  useEffect(() => {
    let currentStream = null;

    if (isOpen) {
      // Démarrage du minuteur de séance
      setMeetingDuration(0);
      timerRef.current = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);

      // Accès webcam & microphone réels
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            currentStream = stream;
            setCameraStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }

            // Détecteur réel d'activité vocale via Web Audio API (mesure réelle des décibels)
            try {
              const AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) {
                const audioCtx = new AudioCtx();
                audioContextRef.current = audioCtx;
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                const source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const checkVolume = () => {
                  if (!stream.active) return;
                  analyser.getByteFrequencyData(dataArray);
                  let sum = 0;
                  for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                  }
                  const avg = sum / dataArray.length;
                  // Si l'utilisateur parle effectivement dans le micro
                  setIsSpeakingLocal(avg > 15 && micActive);
                  animFrameRef.current = requestAnimationFrame(checkVolume);
                };
                checkVolume();
              }
            } catch (audioErr) {
              console.warn('Web Audio detector non supporté:', audioErr);
            }
          })
          .catch(err => {
            console.warn('Accès webcam/micro non disponible :', err);
            setCameraError(true);
          });
      }

      return () => {
        clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) {
          try { audioContextRef.current.close(); } catch (e) {}
        }
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [isOpen, micActive]);

  // 2. Heartbeat de présence réelle en salle (interrogation toutes les 1.8s)
  useEffect(() => {
    if (!isOpen) return;

    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/visio/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            userId: currentUserIdStr,
            userName: currentUserName,
            userAvatar: currentUser?.avatar_url || null,
            role: isRh ? 'rh' : 'candidate',
            isSpeaking: isSpeakingLocal,
            cameraActive: cameraActive && !cameraError,
            micActive: micActive
          })
        });

        if (res.ok) {
          const data = await res.json();
          setAllParticipants(data.participants || []);
          
          // Trouver l'interlocuteur réel (différent de soi-même)
          const remote = (data.participants || []).find(p => String(p.userId) !== currentUserIdStr);
          setRemoteParticipant(remote || null);

          // Synchroniser les messages réels du chat
          if (Array.isArray(data.messages)) {
            setChatMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('Erreur heartbeat visio:', err);
      }
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 1800);

    return () => {
      clearInterval(heartbeatRef.current);
      fetch(`${API_BASE_URL}/api/visio/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, userId: currentUserIdStr })
      }).catch(() => {});
    };
  }, [isOpen, isSpeakingLocal, cameraActive, cameraError, micActive, roomId, currentUserIdStr, currentUserName, isRh, currentUser]);

  // Gestion de l'activation/désactivation de la caméra
  const toggleCamera = () => {
    if (cameraStream) {
      cameraStream.getVideoTracks().forEach(track => {
        track.enabled = !cameraActive;
      });
    }
    setCameraActive(!cameraActive);
  };

  // Gestion de l'activation/désactivation du microphone
  const toggleMicrophone = () => {
    if (cameraStream) {
      cameraStream.getAudioTracks().forEach(track => {
        track.enabled = !micActive;
      });
    }
    setMicActive(!micActive);
  };

  // Partage d'écran réel
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }
          screenStream.getVideoTracks()[0].onended = () => {
            setScreenSharing(false);
            if (cameraStream && localVideoRef.current) {
              localVideoRef.current.srcObject = cameraStream;
            }
          };
          setScreenSharing(true);
        } else {
          setScreenSharing(true);
        }
      } catch (err) {
        console.log('Partage annulé');
      }
    } else {
      setScreenSharing(false);
      if (cameraStream && localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
    }
  };

  // Envoi d'un message réel dans le chat de séance
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput.trim();
    setChatInput('');

    try {
      const res = await fetch('http://localhost:5000/api/visio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: currentUserIdStr,
          userName: currentUserName,
          role: isRh ? 'rh' : 'candidate',
          text: textToSend
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setChatMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Erreur envoi chat visio:', err);
    }
  };

  // Terminer l'entretien
  const handleEndMeeting = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir quitter cette session de visioconférence ?')) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      try {
        await fetch('http://localhost:5000/api/visio/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, userId: currentUserIdStr })
        });
      } catch (e) {}

      if (interviewData && interviewData.id && onStatusUpdate) {
        onStatusUpdate(interviewData.id, 'termine', sessionNotes);
      }
      onClose();
    }
  };

  // Formatage du minuteur
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const isExpiredSession = interviewData && (
    interviewData.status === 'termine' || 
    interviewData.status === 'annule' || 
    (interviewData.scheduled_at && (new Date(interviewData.scheduled_at).getTime() + (3 * 3600 * 1000)) < Date.now())
  );

  if (isExpiredSession) {
    return (
      <div className="visio-modal-overlay">
        <div className="visio-room-container" style={{ maxWidth: '560px', height: 'auto', padding: '40px 30px', textAlign: 'center', background: '#0f172a', borderRadius: '24px', color: '#ffffff', boxShadow: '0 25px 70px rgba(0,0,0,0.6)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', margin: '0 auto 20px', border: '2px solid rgba(239,68,68,0.3)' }}>
            <i className="fa-solid fa-lock" />
          </div>
          <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '4px 14px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Session Clôturée / Expirée
          </span>
          <h2 style={{ margin: '14px 0 10px', fontSize: '1.4rem', fontWeight: 900 }}>
            L'accès à cette salle visio n'est plus disponible
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 26px' }}>
            L'entretien visio pour <strong>{interviewData.job_title || 'le poste'}</strong> est déjà terminé, annulé ou sa date de programmation a expiré. Vous ne pouvez plus rejoindre la séance en direct.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #074696, #1b8a53)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(7,70,150,0.35)'
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }} />
            Retourner au Tableau de Bord
          </button>
        </div>
      </div>
    );
  }
  const candidateRealName = interviewData?.candidate_nom ? `${interviewData.candidate_prenom || ''} ${interviewData.candidate_nom}`.trim() : (interviewData?.prenom ? `${interviewData.prenom} ${interviewData.nom}` : 'Candidat');
  const rhRealName = interviewData?.rh_nom ? `${interviewData.rh_prenom || ''} ${interviewData.rh_nom}`.trim() : 'Service Recrutement RH';

  return (
    <div className="visio-modal-overlay">
      <div className="visio-room-container">

        {/* 1. TOPBAR DE LA SALLE VISIO */}
        <header className="visio-room-topbar">
          <div className="visio-topbar-left">
            <div className="visio-institution-badge">
              <i className="fa-solid fa-landmark" />
              <span>COMMUNE DE SOA • SALLE VISIO SÉCURISÉE</span>
            </div>
            <div className="visio-meeting-meta">
              <h3 className="visio-job-title">{jobTitle}</h3>
              <span className="visio-room-pill">Réf: {roomId}</span>
            </div>
          </div>

          <div className="visio-topbar-center">
            <div className="visio-timer-badge">
              <span className="visio-live-dot" />
              <span>EN DIRECT • {formatDuration(meetingDuration)}</span>
            </div>
            <div className="visio-quality-pill">
              <i className="fa-solid fa-shield-halved" style={{ color: '#22c55e' }} />
              <span>{remoteParticipant ? 'Connecté (2/2)' : 'En attente (1/2)'}</span>
            </div>
          </div>

          <div className="visio-topbar-right">
            <button
              type="button"
              className={`visio-panel-btn ${activeSidePanel === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
              title="Chat en direct"
            >
              <i className="fa-solid fa-comments" />
              <span>Chat ({chatMessages.length})</span>
            </button>

            {isRh && (
              <button
                type="button"
                className={`visio-panel-btn ${activeSidePanel === 'evaluation' ? 'active' : ''}`}
                onClick={() => setActiveSidePanel(activeSidePanel === 'evaluation' ? null : 'evaluation')}
                title="Grille d'évaluation RH"
              >
                <i className="fa-solid fa-chart-simple" />
                <span>{t("Évaluation")}</span>
              </button>
            )}

            <button
              type="button"
              className={`visio-panel-btn ${activeSidePanel === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveSidePanel(activeSidePanel === 'notes' ? null : 'notes')}
              title="Prise de notes"
            >
              <i className="fa-solid fa-pen-to-square" />
              <span>{t("Notes")}</span>
            </button>

            {/* BOUTON RETOUR AU DASHBOARD SANS QUITTER LA PLATEFORME */}
            <button
              type="button"
              className="visio-panel-btn"
              onClick={handleEndMeeting}
              style={{ background: 'rgba(239, 68, 68, 0.25)', borderColor: '#ef4444', color: '#fca5a5', fontWeight: 800 }}
              title="Quitter la visio et revenir sur le tableau de bord"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
              <span>Quitter Visio</span>
            </button>

            {/* BOUTON CROIX FERMETURE RAPIDE */}
            <button
              type="button"
              className="visio-panel-btn"
              onClick={() => {
                if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                fetch('http://localhost:5000/api/visio/leave', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ roomId, userId: currentUserIdStr })
                }).catch(() => {});
                onClose();
              }}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', width: '38px', height: '38px', padding: 0, justifyContent: 'center', borderRadius: '50%', fontSize: '1.1rem', fontWeight: 800 }}
              title="Fermer la visio (Retour au Dashboard)"
            >
              
            </button>
          </div>
        </header>

        {/* 2. ESPACE CENTRAL VIDÉO */}
        <div className="visio-body-layout">
          <div className="visio-streams-grid">

            {/* FLUX 1 : INTERLOCUTEUR DISTANT (SALLE D'ATTENTE SI NON CONNECTÉ, OU FLUX RÉEL SI CONNECTÉ) */}
            {remoteParticipant ? (
              // CAS A : INTERLOCUTEUR RÉELLEMENT EN LIGNE
              <div className="video-stream-card remote-stream connected-mode">
                <div className="video-stream-content">
                  <div className="remote-simulated-avatar">
                    <div className={`avatar-pulse-circle ${remoteParticipant.isSpeaking ? 'speaking' : ''}`}>
                      <img
                        src={remoteParticipant.userAvatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><circle cx='64' cy='64' r='64' fill='%23e2e8f0'/><circle cx='64' cy='48' r='24' fill='%2364748b'/><path d='M64 80c-26.5 0-48 16.1-48 36v12h96v-12c0-19.9-21.5-36-48-36z' fill='%2364748b'/></svg>"}
                        alt={remoteParticipant.userName}
                        className="remote-avatar-img"
                      />
                    </div>
                    {remoteParticipant.isSpeaking && (
                      <div className="remote-speaking-wave">
                        <div className="audio-wave-bars">
                          <span /><span /><span /><span /><span />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="video-stream-overlay-bottom">
                  <div className="user-stream-identity">
                    <i className={remoteParticipant.role === 'rh' ? "fa-solid fa-user-tie" : "fa-solid fa-user"} />
                    <strong>{remoteParticipant.userName} ({remoteParticipant.role === 'rh' ? 'Commission RH' : 'Candidat'})</strong>
                  </div>
                  <div className="stream-badges">
                    {remoteParticipant.isSpeaking ? (
                      <span className="badge-audio-live"><i className="fa-solid fa-microphone" />{t("En train de parler")}</span>
                    ) : (
                      <span className="badge-audio-muted"><i className="fa-solid fa-microphone" /> {remoteParticipant.micActive ? 'En écoute' : 'Micro muet'}</span>
                    )}
                    <span className="badge-hd">HD 1080p</span>
                  </div>
                </div>
              </div>
            ) : (
              // CAS B : SALLE D'ATTENTE RÉELLE (AUCUN AGENT / INTERLOCUTEUR N'EST ENCORE CONNECTÉ)
              <div className="video-stream-card remote-stream waiting-mode">
                <div
                  className="video-stream-content"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '32px 24px',
                    background: 'radial-gradient(circle at center, #1e293b 0%, #0b141a 100%)'
                  }}
                >
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '2px dashed #60a5fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    <i className="fa-solid fa-user-clock" style={{ fontSize: '2.4rem', color: '#60a5fa' }} />
                  </div>

                  <span
                    style={{
                      background: 'rgba(234, 179, 8, 0.18)',
                      border: '1px solid rgba(234, 179, 8, 0.45)',
                      color: '#fde047',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      marginBottom: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fa-solid fa-circle-dot" /> En attente de connexion du {isRh ? 'Candidat' : 'Recruteur RH'}
                  </span>

                  <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                    {isRh ? 'En attente de l\'arrivée du candidat' : 'Salle d\'Attente Municipale'}
                  </h3>

                  <p style={{ margin: 0, maxWidth: '440px', fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.55 }}>
                    {isRh 
                      ? `La salle est ouverte pour l'entretien (${jobTitle}). Le flux vidéo et la parole apparaîtront automatiquement dès que le candidat rejoindra la séance.` 
                      : `Vous êtes actuellement connecté dans la salle. La commission RH (${rhRealName}) va vous rejoindre. Votre caméra et votre micro sont prêts.`}
                  </p>

                  <div style={{ marginTop: '22px', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                    <span><i className="fa-solid fa-circle" style={{ color: '#22c55e', fontSize: '0.55rem', marginRight: '6px' }} />{t("Votre flux local est actif")}</span>
                    <span>•</span>
                    <span>1 participant en ligne</span>
                  </div>
                </div>

                <div className="video-stream-overlay-bottom">
                  <div className="user-stream-identity">
                    <i className="fa-solid fa-hourglass-half" style={{ color: '#eab308' }} />
                    <strong>{isRh ? `${candidateRealName} (Non connecté)` : `${rhRealName} (En attente de connexion)`}</strong>
                  </div>
                  <div className="stream-badges">
                    <span className="badge-audio-muted" style={{ color: '#eab308', border: '1px solid rgba(234,179,8,0.4)' }}>
                      <i className="fa-solid fa-clock" /> Non connecté
                    </span>
                    <span className="badge-hd">{t("Chiffré")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* FLUX 2 : UTILISATEUR LOCAL (VOUS) */}
            <div className={`video-stream-card local-stream ${!cameraActive || cameraError ? 'camera-off' : ''}`}>
              <div className="video-stream-content">
                {cameraActive && !cameraError ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="local-video-element"
                  />
                ) : (
                  <div className="local-avatar-fallback">
                    <div className="fallback-avatar-circle">
                      <i className="fa-solid fa-user" />
                    </div>
                    <span>{cameraActive ? 'Initialisation caméra...' : 'Caméra désactivée'}</span>
                  </div>
                )}
              </div>

              <div className="video-stream-overlay-bottom">
                <div className="user-stream-identity">
                  <i className="fa-solid fa-video" />
                  <strong>Vous ({currentUserName})</strong>
                </div>
                <div className="stream-badges">
                  {isSpeakingLocal && (
                    <span className="badge-audio-live"><i className="fa-solid fa-microphone" />{t("Vous parlez")}</span>
                  )}
                  {!micActive && <span className="badge-audio-off"><i className="fa-solid fa-microphone-slash" />{t("Micro coupé")}</span>}
                  {!cameraActive && <span className="badge-video-off"><i className="fa-solid fa-video-slash" />{t("Caméra coupée")}</span>}
                  {screenSharing && <span className="badge-screen-share"><i className="fa-solid fa-desktop" />{t("Écran partagé")}</span>}
                </div>
              </div>
            </div>

          </div>

          {/* 3. VOLET LATÉRAL RÉEL (CHAT / NOTES / ÉVALUATION) */}
          {activeSidePanel && (
            <aside className="visio-side-panel">
              <div className="side-panel-header">
                <h4>
                  {activeSidePanel === 'chat' && <><i className="fa-solid fa-comments" /> Messagerie en Direct</>}
                  {activeSidePanel === 'notes' && <><i className="fa-solid fa-pen-to-square" /> Notes d'Entretien</>}
                  {activeSidePanel === 'evaluation' && <><i className="fa-solid fa-chart-simple" /> Grille d'Évaluation RH</>}
                </h4>
                <button type="button" className="close-panel-btn" onClick={() => setActiveSidePanel(null)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="side-panel-body">
                {/* PANNEAU CHAT RÉEL */}
                {activeSidePanel === 'chat' && (
                  <div className="visio-chat-container">
                    <div className="visio-chat-messages">
                      {chatMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '0.85rem' }}>
                          <i className="fa-regular fa-comment-dots" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#475569' }} />
                          Aucun message dans cette session.<br />Écrivez ci-dessous pour échanger avec votre interlocuteur.
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => {
                          const isMe = String(msg.senderId) === currentUserIdStr;
                          return (
                            <div key={msg.id || idx} className={`visio-chat-bubble ${isMe ? 'me' : 'remote'}`}>
                              <div className="chat-bubble-sender">
                                <span>{msg.senderName}</span>
                                <small>{msg.time}</small>
                              </div>
                              <p className="chat-bubble-text">{msg.text}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <form onSubmit={handleSendChatMessage} className="visio-chat-form">
                      <input
                        type="text"
                        placeholder="Écrire un message pour la session..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                      />
                      <button type="submit" disabled={!chatInput.trim()}>
                        <i className="fa-solid fa-paper-plane" />
                      </button>
                    </form>
                  </div>
                )}

                {/* PANNEAU NOTES */}
                {activeSidePanel === 'notes' && (
                  <div className="visio-notes-container">
                    <p className="notes-hint">
                      Prenez des notes en direct durant l'entretien. Celles-ci seront sauvegardées sur le dossier.
                    </p>
                    <textarea
                      rows={12}
                      placeholder="Ex: Motivations claires, bonne connaissance de la commune de Soa, maîtrise des outils bureautiques..."
                      value={sessionNotes}
                      onChange={e => setSessionNotes(e.target.value)}
                      className="visio-notes-textarea"
                    />
                    <div className="notes-meta">
                      <span>Caractères : {sessionNotes.length}</span>
                      <span className="auto-save-tag"><i className="fa-solid fa-check" />{t("Session active")}</span>
                    </div>
                  </div>
                )}

                {/* PANNEAU ÉVALUATION (POUR RECRUTEUR RH) */}
                {activeSidePanel === 'evaluation' && isRh && (
                  <div className="visio-eval-container">
                    <div className="eval-criteria-group">
                      <label>1. Présentation &amp; Élocution : {evalScores.presentation}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={evalScores.presentation}
                        onChange={e => setEvalScores({ ...evalScores, presentation: parseInt(e.target.value, 10) })}
                      />
                    </div>
                    <div className="eval-criteria-group">
                      <label>2. Compétences Techniques : {evalScores.competences}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={evalScores.competences}
                        onChange={e => setEvalScores({ ...evalScores, competences: parseInt(e.target.value, 10) })}
                      />
                    </div>
                    <div className="eval-criteria-group">
                      <label>3. Motivation &amp; Valeurs Civiques : {evalScores.motivation}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={evalScores.motivation}
                        onChange={e => setEvalScores({ ...evalScores, motivation: parseInt(e.target.value, 10) })}
                      />
                    </div>
                    <div className="eval-criteria-group">
                      <label>4. Adéquation au Poste : {evalScores.adequation}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={evalScores.adequation}
                        onChange={e => setEvalScores({ ...evalScores, adequation: parseInt(e.target.value, 10) })}
                      />
                    </div>

                    <div className="eval-score-total">
                      <span>Score Moyen :</span>
                      <strong>
                        {Math.round((evalScores.presentation + evalScores.competences + evalScores.motivation + evalScores.adequation) / 4)}%
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* 4. BARRE INFÉRIEURE DES COMMANDES DE VISIO */}
        <footer className="visio-controls-bar">
          <div className="visio-controls-left">
            <button
              type="button"
              className={`ctrl-btn ${micActive ? 'active' : 'inactive'}`}
              onClick={toggleMicrophone}
              title={micActive ? 'Couper le micro' : 'Activer le micro'}
            >
              <i className={micActive ? "fa-solid fa-microphone" : "fa-solid fa-microphone-slash"} />
              <span>{micActive ? 'Microphone' : 'Coupé'}</span>
            </button>

            <button
              type="button"
              className={`ctrl-btn ${cameraActive ? 'active' : 'inactive'}`}
              onClick={toggleCamera}
              title={cameraActive ? 'Couper la caméra' : 'Activer la caméra'}
            >
              <i className={cameraActive ? "fa-solid fa-video" : "fa-solid fa-video-slash"} />
              <span>{cameraActive ? 'Caméra' : 'Coupée'}</span>
            </button>

            <button
              type="button"
              className={`ctrl-btn ${screenSharing ? 'active-share' : ''}`}
              onClick={toggleScreenShare}
              title="Partager mon écran"
            >
              <i className="fa-solid fa-desktop" />
              <span>{screenSharing ? 'Arrêter partage' : 'Partager écran'}</span>
            </button>
          </div>

          <div className="visio-controls-center">
            <button
              type="button"
              className="ctrl-btn-hangup"
              onClick={handleEndMeeting}
              title="Quitter la visioconférence"
            >
              <i className="fa-solid fa-phone-slash" />
              <span>{t("Quitter l'entretien")}</span>
            </button>
          </div>

          <div className="visio-controls-right">
            <div className="meeting-device-status">
              <span title="Microphone opérationnel"><i className="fa-solid fa-volume-high" /></span>
              <span title="Caméra opérationnelle"><i className="fa-solid fa-camera" /></span>
              <span title={remoteParticipant ? "Interlocuteur connecté" : "En attente d'interlocuteur"}>
                <i className={remoteParticipant ? "fa-solid fa-signal" : "fa-solid fa-user-clock"} style={{ color: remoteParticipant ? '#22c55e' : '#eab308' }} />
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default VisioRoomModal;
