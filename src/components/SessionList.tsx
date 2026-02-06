import { useState } from 'react';
import { SessionInfo } from '../types';
import { useLanguage } from '../i18n';
import { useOnboardingStore } from '../stores/OnboardingStore';
import './SessionList.css';

interface SessionListProps {
  sessions: SessionInfo[];
  currentSession: string | null;
  onSelectSession: (sessionId: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout?: () => void;

  isOpen?: boolean;
  onCreateSession?: (machineId: string, sessionName: string) => void;
  onKillSession?: (sessionId: string) => void;
  onHideSession?: (sessionId: string) => void;
  updatedSessions?: Set<string>;
  userEmail?: string | null;
}

export function SessionList({ sessions, currentSession, onSelectSession, theme, onToggleTheme, onLogout, isOpen, onCreateSession, onKillSession, onHideSession, updatedSessions, userEmail }: SessionListProps) {
  const { t, lang, setLang } = useLanguage();
  const { startTour } = useOnboardingStore();
  const [creatingForMachine, setCreatingForMachine] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const handleStartTour = () => {
    startTour();
  };

  const groupedSessions = sessions.reduce((acc, session) => {
    const machine = session.machineId || 'Unknown';
    if (!acc[machine]) {
      acc[machine] = [];
    }
    acc[machine].push(session);
    return acc;
  }, {} as Record<string, SessionInfo[]>);

  const toggleLanguage = () => {
    setLang(lang === 'ko' ? 'en' : 'ko');
  };

  const handleCreateSession = (machineId: string) => {
    if (!newSessionName.trim()) return;
    onCreateSession?.(machineId, newSessionName.trim());
    setNewSessionName('');
    setCreatingForMachine(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, machineId: string) => {
    if (e.key === 'Enter') {
      handleCreateSession(machineId);
    } else if (e.key === 'Escape') {
      setCreatingForMachine(null);
      setNewSessionName('');
    }
  };

  const handleMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpenFor(menuOpenFor === sessionId ? null : sessionId);
  };

  const handleKillSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm(lang === 'ko' ? '이 세션을 종료하시겠습니까?' : 'Kill this session?')) {
      onKillSession?.(sessionId);
    }
    setMenuOpenFor(null);
  };

  const handleHideSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onHideSession?.(sessionId);
    setMenuOpenFor(null);
  };

  return (
    <div className={`session-list ${isOpen ? 'open' : ''}`} data-tour="session-list">
      <div className="session-list-header">
        <div className="brand-logo">
          <svg className="logo-svg" width="32" height="32" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
            <rect x="24" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
            <rect x="4" y="28" width="16" height="12" rx="3" fill="#8b5cf6"/>
          </svg>
          <span className="logo-text">Session<span className="logo-highlight">Cast</span></span>
        </div>
      </div>
      <div className="header-actions-row">
        <button className="action-btn" onClick={toggleLanguage} title={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}>
          {lang === 'ko' ? 'EN' : 'KO'}
        </button>
        <button className="action-btn" onClick={onToggleTheme} title={theme === 'dark' ? (lang === 'ko' ? '라이트 모드' : 'Light mode') : (lang === 'ko' ? '다크 모드' : 'Dark mode')} data-tour="theme-toggle">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>


      </div>
      <div className="session-groups">
        {Object.entries(groupedSessions).map(([machineId, machineSessions]) => (
          <div key={machineId} className="session-group">
            <div className="group-header">
              <span>{machineId}</span>
              {onCreateSession && machineSessions.some(s => s.status === 'online') && (
                <button
                  className="add-session-btn"
                  onClick={() => setCreatingForMachine(creatingForMachine === machineId ? null : machineId)}
                  title={lang === 'ko' ? '새 세션' : 'New session'}
                >
                  +
                </button>
              )}
            </div>
            {creatingForMachine === machineId && (
              <div className="create-session-input">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, machineId)}
                  placeholder={lang === 'ko' ? '세션 이름' : 'Session name'}
                  autoFocus
                />
                <button onClick={() => handleCreateSession(machineId)} disabled={!newSessionName.trim()}>
                  {lang === 'ko' ? '생성' : 'Create'}
                </button>
              </div>
            )}
            {machineSessions.map((session) => {
              const hasUpdate = updatedSessions?.has(session.id) && currentSession !== session.id;
              const isMenuOpen = menuOpenFor === session.id;
              return (
                <div
                  key={session.id}
                  className={`session-item ${currentSession === session.id ? 'active' : ''} ${hasUpdate ? 'has-update' : ''}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className={`status-dot ${session.status}`} />
                  <span className="session-label">{session.label || session.id}</span>
                  {hasUpdate && <span className="update-indicator" />}
                  {(onKillSession || onHideSession) && (
                    <div className="session-menu-container">
                      <button
                        className="session-menu-btn"
                        onClick={(e) => handleMenuClick(e, session.id)}
                        title={lang === 'ko' ? '메뉴' : 'Menu'}
                      >
                        ⋮
                      </button>
                      {isMenuOpen && (
                        <div className="session-menu">
                          {onHideSession && (
                            <button onClick={(e) => handleHideSession(e, session.id)}>
                              {lang === 'ko' ? '숨기기' : 'Hide'}
                            </button>
                          )}
                          {onKillSession && session.status === 'online' && (
                            <button className="danger" onClick={(e) => handleKillSession(e, session.id)}>
                              {lang === 'ko' ? '종료' : 'Kill'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="no-sessions">{t('noSessions')}</div>
        )}
      </div>

      {/* Footer - ThreadCast style */}
      <div className="session-list-footer">
        {/* Help button */}
        <button className="footer-item help-btn" onClick={handleStartTour} data-tour="help-button">
          <span className="footer-icon">?</span>
          <span className="footer-text">{lang === 'ko' ? '도움말' : 'Help'}</span>
        </button>

        {/* User info */}
        {userEmail && (
          <div className="footer-user-section">
            <div className="user-avatar">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{userEmail.split('@')[0]}</span>
              <span className="user-email-small">{userEmail}</span>
            </div>
          </div>
        )}

        {/* Logout button */}
        {onLogout && (
          <button className="footer-item logout-footer-btn" onClick={onLogout}>
            <span className="footer-icon">↪</span>
            <span className="footer-text">{lang === 'ko' ? '로그아웃' : 'Logout'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
