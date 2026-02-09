import { useState, useCallback, useRef, useEffect } from 'react';
import { SessionList } from './components/SessionList';
import { Terminal, getTerminalWriter } from './components/Terminal';
import { PaneLayout } from './components/PaneLayout';
import { CommandBar } from './components/CommandBar';
import { Login } from './components/Login';
import { TokenManager } from './components/TokenManager';
import { OnboardingGuide } from './components/OnboardingGuide';
import { InteractiveTour } from './components/onboarding';
import { FileViewer, type FileViewerContent, type FileTab } from './components/FileViewer';
import { useWebSocket } from './hooks/useWebSocket';
import { useCtrlKey } from './hooks/useCtrlKey';
import { useOnboardingStore } from './stores/OnboardingStore';
import { mockAgentService } from './services/MockAgentService';
import { SessionInfo } from './types';
import { WS_URL } from './config/env';
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

// Check if JWT token is expired
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
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
    const savedToken = localStorage.getItem('auth_token');
    // Auto-logout if token is expired
    if (isTokenExpired(savedToken)) {
      localStorage.removeItem('auth_token');
      return null;
    }
    return savedToken;
  });
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const currentSessionRef = useRef<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

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

  // FileViewer state
  const [fileViewerFiles, setFileViewerFiles] = useState<FileTab[]>([]);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  // Pane state
  const [activePaneId, setActivePaneId] = useState<string | null>(null);
  const [paneScreens, setPaneScreens] = useState<Map<string, string>>(new Map());

  // Track Ctrl/Cmd key for file click hints
  useCtrlKey();

  const handleScreen = useCallback((sessionId: string, data: string) => {
    // Use ref to always get current session value
    if (sessionId === currentSessionRef.current) {
      const writer = getTerminalWriter();
      if (writer) {
        writer(data);
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

  const handlePaneScreen = useCallback((sessionId: string, paneId: string, data: string) => {
    if (sessionId === currentSessionRef.current) {
      setPaneScreens(prev => {
        const next = new Map(prev);
        next.set(paneId, data);
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

  const handleFileView = useCallback((sessionId: string, file: FileViewerContent) => {
    if (sessionId === currentSessionRef.current) {
      const newTab: FileTab = {
        id: `${file.filename}-${Date.now()}`,
        file,
        addedAt: Date.now(),
      };
      setFileViewerFiles(prev => [...prev, newTab]);
      setIsFileViewerOpen(true);
    }
  }, []);

  const handleCloseFileViewer = useCallback(() => {
    setIsFileViewerOpen(false);
    setFileViewerFiles([]);
  }, []);

  const handleCloseFile = useCallback((id: string) => {
    setFileViewerFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      if (next.length === 0) {
        setIsFileViewerOpen(false);
      }
      return next;
    });
  }, []);

  const { status, joinSession, sendKeys, createSession, sendResize, killSession, requestFileView } = useWebSocket({
    url: WS_URL,
    token: authToken,
    onScreen: handleScreen,
    onPaneScreen: handlePaneScreen,
    onSessionList: handleSessionList,
    onSessionStatus: handleSessionStatus,
    onFileView: handleFileView,
  });

  const handleFileRequest = useCallback((path: string) => {
    if (currentSessionRef.current) {
      requestFileView(currentSessionRef.current, path);
    }
  }, [requestFileView]);

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

  const handleSelectSession = useCallback((sessionId: string) => {
    currentSessionRef.current = sessionId;
    setCurrentSession(sessionId);

    // Clear pane screens when switching sessions
    setPaneScreens(new Map());
    setActivePaneId(null);

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
      sendKeys(currentSession, command);
    }
  }, [currentSession, sendKeys]);

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
        onSelectSession={handleSelectSession}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
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
            {currentSessionInfo?.panes && currentSessionInfo.panes.length > 1 ? (
              <PaneLayout
                panes={currentSessionInfo.panes}
                paneScreens={paneScreens}
                activePaneId={activePaneId}
                onPaneClick={setActivePaneId}
                onInput={(data, paneId) => currentSession && sendKeys(currentSession, data, paneId)}
                theme={theme}
              />
            ) : (
              <Terminal
                sessionId={currentSession}
                sessionLabel={currentSessionInfo?.label || null}
                status={currentSessionInfo?.status || 'offline'}
                connectionStatus={isDemoSession ? 'connected' : status}
                onInput={isDemoSession ? handleDemoInput : (data) => currentSession && sendKeys(currentSession, data)}
                onResize={(cols, rows) => !isDemoSession && currentSession && sendResize(currentSession, cols, rows)}
                onFileClick={handleFileRequest}
                theme={theme}
              />
            )}
            <CommandBar
              onSend={handleSendCommand}
              disabled={!currentSession || (!isDemoSession && currentSessionInfo?.status !== 'online')}
            />
          </>
        )}
      </div>
      <FileViewer
        files={fileViewerFiles}
        isOpen={isFileViewerOpen}
        onClose={handleCloseFileViewer}
        onCloseFile={handleCloseFile}
        onFileRequest={handleFileRequest}
        theme={theme}
      />
    </div>
  );
}

export default App;
