import { useState, useCallback, useRef, useEffect } from 'react';
import { SessionList } from './components/SessionList';
import { Terminal, getTerminalWriter } from './components/Terminal';
import { CommandBar } from './components/CommandBar';
import { Login } from './components/Login';
import { TokenManager } from './components/TokenManager';
import { OnboardingGuide } from './components/OnboardingGuide';
import { InteractiveTour } from './components/onboarding';
import { useWebSocket } from './hooks/useWebSocket';
import { useOnboardingStore } from './stores/OnboardingStore';
import { mockAgentService } from './services/MockAgentService';
import { SessionInfo, PaneInfo } from './types';
import { WS_URL } from './config/urls';
import './App.css';

// Extract email from JWT token
function getEmailFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.email || decoded.sub || null;
  } catch {
    return null;
  }
}

function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    // Check URL for token (OAuth2 redirect)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('auth_token', urlToken);
      window.history.replaceState({}, document.title, '/');
      return urlToken;
    }
    return localStorage.getItem('auth_token');
  });
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const currentSessionRef = useRef<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  // Pane-related state
  const [viewMode, setViewMode] = useState<'single' | 'layout'>('single');
  const [selectedPane, setSelectedPane] = useState<string | null>(null);
  const [paneScreens, setPaneScreens] = useState<Map<string, string>>(new Map());
  const [sessionPanes, setSessionPanes] = useState<Map<string, PaneInfo[]>>(new Map());

  const viewModeRef = useRef<'single' | 'layout'>('single');
  const selectedPaneRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    selectedPaneRef.current = selectedPane;
  }, [selectedPane]);

  // Onboarding store
  const { isDemoMode, demoSession, isTourActive, endDemoMode } = useOnboardingStore();

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const handleLoginSuccess = useCallback((token: string) => {
    setAuthToken(token);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
  }, []);

  const [showTokenManager, setShowTokenManager] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updatedSessions, setUpdatedSessions] = useState<Set<string>>(new Set());
  const [hiddenSessions, setHiddenSessions] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('hidden_sessions');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const handleScreen = useCallback((sessionId: string, data: string, paneId?: string | null) => {
    if (sessionId === currentSessionRef.current) {
      if (paneId) {
        // Multi-pane: update pane-specific screen data
        setPaneScreens(prev => {
          const next = new Map(prev);
          next.set(paneId, data);
          return next;
        });
        // Also write to main terminal if this is the selected pane in single mode
        if (selectedPaneRef.current === paneId && viewModeRef.current === 'single') {
          const writer = getTerminalWriter();
          if (writer) writer(data);
        }
      } else {
        // Single pane: write directly (backward compat)
        const writer = getTerminalWriter();
        if (writer) {
          writer(data);
        }
      }
    } else {
      // Mark session as having new updates (only if not currently viewing)
      setUpdatedSessions(prev => {
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
    }
  }, []);

  const handleSessionList = useCallback((newSessions: SessionInfo[]) => {
    setSessions(newSessions);
  }, []);

  const handleSessionStatus = useCallback((sessionId: string, status: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, status: status as 'online' | 'offline' } : s
    ));
  }, []);

  const handlePaneLayout = useCallback((sessionId: string, panes: PaneInfo[]) => {
    setSessionPanes(prev => {
      const next = new Map(prev);
      next.set(sessionId, panes);
      return next;
    });
    // Also update sessions with pane info
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, panes } : s
    ));
    // Auto-switch view mode when pane layout changes for current session
    if (sessionId === currentSessionRef.current) {
      if (panes.length > 1 && viewModeRef.current === 'single' && !selectedPaneRef.current) {
        setViewMode('layout');
        viewModeRef.current = 'layout';
      } else if (panes.length <= 1 && viewModeRef.current === 'layout') {
        setViewMode('single');
        viewModeRef.current = 'single';
      }
    }
  }, []);

  const { status, joinSession, sendKeys, createSession, sendResize, killSession } = useWebSocket({
    url: WS_URL,
    token: authToken,
    onScreen: handleScreen,
    onSessionList: handleSessionList,
    onSessionStatus: handleSessionStatus,
    onPaneLayout: handlePaneLayout,
  });

  const handleCreateSession = useCallback((machineId: string, sessionName: string) => {
    createSession(machineId, sessionName);
  }, [createSession]);

  const handleKillSession = useCallback((sessionId: string) => {
    killSession(sessionId);
  }, [killSession]);

  const handleHideSession = useCallback((sessionId: string) => {
    setHiddenSessions(prev => {
      const next = new Set(prev);
      next.add(sessionId);
      localStorage.setItem('hidden_sessions', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Filter out hidden sessions
  const visibleSessions = sessions.filter(s => !hiddenSessions.has(s.id));

  // Merge demo session with real sessions when in demo mode
  const allSessions: SessionInfo[] = isDemoMode && demoSession
    ? [demoSession, ...visibleSessions]
    : visibleSessions;

  // Handle demo session input
  const handleDemoInput = useCallback((data: string) => {
    mockAgentService.handleInput(data);
  }, []);

  const handleSelectSession = useCallback((sessionId: string, paneId?: string | null) => {
    currentSessionRef.current = sessionId;
    setCurrentSession(sessionId);
    setPaneScreens(new Map()); // Clear pane screens when switching sessions

    if (paneId === 'layout') {
      setViewMode('layout');
      viewModeRef.current = 'layout';
      setSelectedPane(null);
      selectedPaneRef.current = null;
    } else if (paneId) {
      setViewMode('single');
      viewModeRef.current = 'single';
      setSelectedPane(paneId);
      selectedPaneRef.current = paneId;
    } else {
      setViewMode('single');
      viewModeRef.current = 'single';
      setSelectedPane(null);
      selectedPaneRef.current = null;
    }

    if (sessionId === 'demo-session') {
      // Connect mock agent to terminal
      setTimeout(() => {
        const writer = getTerminalWriter();
        mockAgentService.attachToTerminal(writer);
      }, 200);
    } else {
      // Disconnect mock agent and join real session
      mockAgentService.detach();
      joinSession(sessionId);
    }

    setSidebarOpen(false); // Close sidebar on mobile after selection
    // Clear update indicator when selecting session
    setUpdatedSessions(prev => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  }, [joinSession]);

  const handleSelectDemoSession = useCallback(() => {
    if (demoSession) {
      handleSelectSession(demoSession.id);
    }
  }, [demoSession, handleSelectSession]);

  const handleSendCommand = useCallback((command: string) => {
    if (currentSession === 'demo-session') {
      mockAgentService.handleInput(command);
    } else if (currentSession) {
      sendKeys(currentSession, command, selectedPane || undefined);
    }
  }, [currentSession, sendKeys, selectedPane]);

  // Cleanup demo mode when real sessions are available
  useEffect(() => {
    if (sessions.length > 0 && isDemoMode && !isTourActive) {
      endDemoMode();
      mockAgentService.detach();
    }
  }, [sessions.length, isDemoMode, isTourActive, endDemoMode]);

  const currentSessionInfo = allSessions.find(s => s.id === currentSession);
  const isDemoSession = currentSession === 'demo-session';

  // Show login page if not authenticated
  if (!authToken) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      {/* Interactive Tour */}
      <InteractiveTour onSelectDemoSession={handleSelectDemoSession} />

      {/* Mobile sidebar toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <SessionList
        sessions={allSessions}
        currentSession={currentSession}
        selectedPane={selectedPane}
        onSelectSession={handleSelectSession}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onManageTokens={() => setShowTokenManager(true)}
        isOpen={sidebarOpen}
        onCreateSession={handleCreateSession}
        onKillSession={handleKillSession}
        onHideSession={handleHideSession}
        updatedSessions={updatedSessions}
        userEmail={getEmailFromToken(authToken)}
      />
      {showTokenManager && authToken && (
        <TokenManager
          authToken={authToken}
          onClose={() => setShowTokenManager(false)}
        />
      )}
      <div className="main-content">
        {allSessions.length === 0 && !isTourActive ? (
          <OnboardingGuide authToken={authToken} onAuthError={handleLogout} />
        ) : (
          <>
            <Terminal
              sessionId={currentSession}
              sessionLabel={currentSessionInfo?.label || null}
              status={currentSessionInfo?.status || 'offline'}
              connectionStatus={isDemoSession ? 'connected' : status}
              onInput={isDemoSession ? handleDemoInput : (data) => currentSession && sendKeys(currentSession, data, selectedPane || undefined)}
              onResize={(cols, rows) => !isDemoSession && currentSession && sendResize(currentSession, cols, rows)}
              theme={theme}
              viewMode={viewMode}
              selectedPane={selectedPane}
              panes={currentSession ? sessionPanes.get(currentSession) : undefined}
              paneScreens={paneScreens}
              onPaneInput={(data, paneId) => currentSession && sendKeys(currentSession, data, paneId)}
              onPaneClick={(paneId) => {
                setSelectedPane(paneId);
                selectedPaneRef.current = paneId;
              }}
            />
            <CommandBar
              onSend={handleSendCommand}
              disabled={!currentSession || (!isDemoSession && currentSessionInfo?.status !== 'online')}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
