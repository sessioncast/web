import { useState } from 'react';
import { SessionInfo } from '../types';
import { useLanguage } from '../i18n';
import { useOnboardingStore } from '../stores/OnboardingStore';
import './SessionList.css';

interface SessionListProps {
  sessions: SessionInfo[];
  currentSession: string | null;
  selectedPane?: string | null;
  onSelectSession: (sessionId: string, paneId?: string | null) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout?: () => void;

  isOpen?: boolean;
  onCreateSession?: (machineId: string, sessionName: string) => void;
  onKillSession?: (sessionId: string) => void;
  onHideSession?: (sessionId: string) => void;
  onShareSession?: (sessionId: string) => void;
  updatedSessions?: Set<string>;
  userEmail?: string | null;
  onClearOfflineSessions?: () => void;
}

export function SessionList({ sessions, currentSession, selectedPane, onSelectSession, theme, onToggleTheme, onLogout, isOpen, onCreateSession, onKillSession, onHideSession, onShareSession, updatedSessions, userEmail, onClearOfflineSessions }: SessionListProps) {
  const { t, lang, setLang } = useLanguage();
  const { startTour } = useOnboardingStore();
  const [creatingForMachine, setCreatingForMachine] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const handleStartTour = () => {
    startTour();
  };

  const toggleExpanded = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
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
      {/* Header */}
      <div className="session-list-header">
        <div className="brand-logo">
          <svg className="logo-svg" width="28" height="28" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
            <rect x="24" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
            <rect x="4" y="28" width="16" height="12" rx="3" fill="#8b5cf6"/>
          </svg>
          <span className="logo-text">Session<span className="logo-highlight">Cast</span></span>
        </div>
        <div className="header-actions">
          <button className="header-icon-btn" onClick={toggleLanguage} title={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}>
            <span className="lang-badge">{lang === 'ko' ? 'EN' : 'KO'}</span>
          </button>
          <button className="header-icon-btn" onClick={onToggleTheme} title={theme === 'dark' ? (lang === 'ko' ? '라이트 모드' : 'Light mode') : (lang === 'ko' ? '다크 모드' : 'Dark mode')} data-tour="theme-toggle">
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Session groups */}
      <div className="session-groups">
        {Object.entries(groupedSessions).map(([machineId, machineSessions]) => {
          const onlineCount = machineSessions.filter(s => s.status === 'online').length;
          return (
            <div key={machineId} className="session-group">
              <div className="group-header">
                <svg className="group-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <span className="group-name">{machineId}</span>
                {onlineCount > 0 && (
                  <span className="group-online-badge">{onlineCount}</span>
                )}
                {onCreateSession && machineSessions.some(s => s.status === 'online') && (
                  <button
                    className="group-action-btn"
                    onClick={() => setCreatingForMachine(creatingForMachine === machineId ? null : machineId)}
                    title={lang === 'ko' ? '새 세션' : 'New session'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                )}
                {onClearOfflineSessions && machineSessions.every(s => s.status === 'offline') && (
                  <button
                    className="group-action-btn group-action-danger"
                    onClick={() => onClearOfflineSessions()}
                    title={lang === 'ko' ? 'Offline 세션 정리' : 'Clear offline sessions'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                </div>
              )}
              {machineSessions.map((session) => {
                const hasUpdate = updatedSessions?.has(session.id) && currentSession !== session.id;
                const isMenuOpen = menuOpenFor === session.id;
                const hasMultiplePanes = session.panes && session.panes.length > 1;
                const isExpanded = expandedSessions.has(session.id);

                return (
                  <div key={session.id}>
                    <div
                      className={`session-item ${currentSession === session.id ? 'active' : ''} ${hasUpdate ? 'has-update' : ''}`}
                      onClick={() => onSelectSession(session.id, hasMultiplePanes ? 'layout' : undefined)}
                    >
                      {hasMultiplePanes && (
                        <span className="tree-toggle" onClick={(e) => toggleExpanded(session.id, e)}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </span>
                      )}
                      <span className={`status-dot ${session.status}`} />
                      <span className="session-label">{session.label || session.id}</span>
                      {hasMultiplePanes && (
                        <span className="pane-count">{session.panes!.length}</span>
                      )}
                      {hasUpdate && <span className="update-indicator" />}
                      {(onKillSession || onHideSession) && (
                        <div className="session-menu-container">
                          <button
                            className="session-menu-btn"
                            onClick={(e) => handleMenuClick(e, session.id)}
                            title={lang === 'ko' ? '메뉴' : 'Menu'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="2"/>
                              <circle cx="12" cy="12" r="2"/>
                              <circle cx="12" cy="19" r="2"/>
                            </svg>
                          </button>
                          {isMenuOpen && (
                            <div className="session-menu">
                              {onShareSession && session.status === 'online' && (
                                <button onClick={(e) => { e.stopPropagation(); onShareSession(session.id); setMenuOpenFor(null); }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                    <polyline points="16 6 12 2 8 6"/>
                                    <line x1="12" y1="2" x2="12" y2="15"/>
                                  </svg>
                                  {t('shareButton')}
                                </button>
                              )}
                              {onHideSession && (
                                <button onClick={(e) => handleHideSession(e, session.id)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                  </svg>
                                  {lang === 'ko' ? '숨기기' : 'Hide'}
                                </button>
                              )}
                              {onKillSession && session.status === 'online' && (
                                <button className="danger" onClick={(e) => handleKillSession(e, session.id)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                  </svg>
                                  {lang === 'ko' ? '종료' : 'Kill'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {hasMultiplePanes && isExpanded && (
                      <div className="pane-tree">
                        {session.panes!.map((pane, idx) => (
                          <div
                            key={pane.id}
                            className={`pane-tree-item ${currentSession === session.id && selectedPane === pane.id ? 'active' : ''}`}
                            onClick={() => onSelectSession(session.id, pane.id)}
                          >
                            <span className="tree-line">{idx === session.panes!.length - 1 ? '└' : '├'}</span>
                            <span className="pane-label">{pane.title || `Pane ${pane.index}`}</span>
                            <span className="pane-size">{pane.width}x{pane.height}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {sessions.length === 0 && (
          <div className="no-sessions">
            <div className="no-sessions-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <p>{t('noSessions')}</p>
            <p className="support-hint">
              {t('supportMessage')}<br />
              <a href="mailto:devload@sessioncast.io">devload@sessioncast.io</a>
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="session-list-footer">
        <button className="footer-help-btn" onClick={handleStartTour} data-tour="help-button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>{lang === 'ko' ? '도움말' : 'Help'}</span>
        </button>

        {userEmail && (
          <div className="footer-user">
            <div className="user-avatar">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{userEmail.split('@')[0]}</span>
              <span className="user-email">{userEmail}</span>
            </div>
            {onLogout && (
              <button className="logout-btn" onClick={onLogout} title={lang === 'ko' ? '로그아웃' : 'Logout'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
