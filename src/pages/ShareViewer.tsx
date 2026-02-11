import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal as XTerm } from 'xterm';
import { API_URL, AUTH_URL, WS_URL } from '../config/env';
import { useLanguage } from '../i18n';
import pako from 'pako';
import 'xterm/css/xterm.css';
import './ShareViewer.css';

function decodeBase64(base64Data: string): string {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function decompressGzip(base64Data: string): string {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decompressed = pako.ungzip(bytes);
  return new TextDecoder('utf-8').decode(decompressed);
}

function getEmailFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.email || decoded.sub || null;
  } catch {
    return null;
  }
}

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

// PKCE helpers (same as Login component)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

type ViewerState = 'loading' | 'login_required' | 'valid' | 'expired' | 'invalid' | 'error' | 'email_denied';

const BASE_FONT_SIZE = 14;
const CLIENT_ID = 'sessioncast-platform';
const CLIENT_SECRET = 'Zqvg5foaN3ZCtd4sGLumgeTZ6azGBXK7';
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

export function ShareViewer() {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [state, setState] = useState<ViewerState>('loading');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle OAuth callback (code exchange) if redirected back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const codeVerifier = sessionStorage.getItem('code_verifier');
    sessionStorage.removeItem('code_verifier');

    const exchangeParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });

    fetch(`${AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: exchangeParams.toString(),
    })
      .then(res => {
        if (!res.ok) throw new Error('Token exchange failed');
        return res.json();
      })
      .then(data => {
        localStorage.setItem('auth_token', data.access_token);
        // Redirect back to share page (clean URL)
        const savedPath = sessionStorage.getItem('share_redirect');
        sessionStorage.removeItem('share_redirect');
        if (savedPath) {
          window.location.href = savedPath;
        } else {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        }
      })
      .catch(() => {
        setState('error');
      });
  }, []);

  // Check auth and validate token
  useEffect(() => {
    // Skip if handling OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) return;

    if (!token) {
      setState('invalid');
      return;
    }

    const authToken = localStorage.getItem('auth_token');
    if (!authToken || isTokenExpired(authToken)) {
      setState('login_required');
      return;
    }

    const email = getEmailFromToken(authToken);
    setUserEmail(email);

    // Validate share link with logged-in email
    const url = email
      ? `${API_URL}/api/share-links/${token}?email=${encodeURIComponent(email)}`
      : `${API_URL}/api/share-links/${token}`;

    fetch(url)
      .then(res => {
        if (res.ok) return res.json();
        if (res.status === 404) {
          setState('invalid');
          return null;
        }
        throw new Error(`HTTP ${res.status}`);
      })
      .then(data => {
        if (!data) return;
        if (data.valid) {
          setState('valid');
          setRemainingSeconds(data.remainingSeconds);
        } else if (data.emailRequired && data.emailMismatch) {
          setState('email_denied');
        } else {
          setState('expired');
        }
      })
      .catch(() => {
        setState('error');
      });
  }, [token]);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    // Save share path for redirect after login
    sessionStorage.setItem('share_redirect', window.location.pathname);

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${AUTH_URL}/oauth/authorize?${params.toString()}`;
  };

  // Countdown timer
  useEffect(() => {
    if (state !== 'valid' || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setState('expired');
          wsRef.current?.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Scale terminal to fit the wrapper container, then center it
  const scaleTerminal = useCallback(() => {
    const wrapper = wrapperRef.current;
    const termEl = terminalRef.current;
    if (!wrapper || !termEl) return;

    const xtermScreen = termEl.querySelector('.xterm-screen') as HTMLElement;
    if (!xtermScreen) return;

    const termWidth = xtermScreen.offsetWidth;
    const termHeight = xtermScreen.offsetHeight;
    if (termWidth === 0 || termHeight === 0) return;

    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;

    const scaleX = wrapperWidth / termWidth;
    const scaleY = wrapperHeight / termHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Center the scaled terminal within the wrapper
    const scaledWidth = termWidth * scale;
    const scaledHeight = termHeight * scale;
    const offsetX = Math.max(0, (wrapperWidth - scaledWidth) / 2);
    const offsetY = Math.max(0, (wrapperHeight - scaledHeight) / 2);

    termEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (state !== 'valid' || !terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: BASE_FONT_SIZE,
      theme: {
        background: '#1e1e1e',
        foreground: '#ececf1',
        cursor: '#ececf1',
      },
    });

    term.open(terminalRef.current);
    xtermRef.current = term;

    // Delay initial scale to ensure xterm has rendered
    const scaleTimeout = setTimeout(scaleTerminal, 100);

    // Use ResizeObserver on wrapper for accurate resize tracking
    const ro = new ResizeObserver(() => scaleTerminal());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      clearTimeout(scaleTimeout);
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, [state, scaleTerminal]);

  // WebSocket connection
  useEffect(() => {
    if (state !== 'valid' || !token) return;

    const wsUrl = `${WS_URL}?shareToken=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'terminalSize' && message.meta) {
          const cols = parseInt(message.meta.cols);
          const rows = parseInt(message.meta.rows);
          if (cols > 0 && rows > 0 && xtermRef.current) {
            xtermRef.current.resize(cols, rows);
            requestAnimationFrame(scaleTerminal);
          }
        } else if (message.type === 'screen' && message.payload) {
          xtermRef.current?.write(decodeBase64(message.payload));
        } else if (message.type === 'screenGz' && message.payload) {
          xtermRef.current?.write(decompressGzip(message.payload));
        }
      } catch (e) {
        console.error('Failed to process message:', e);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (event.code === 4403) setState('expired');
    };

    ws.onerror = () => setConnected(false);

    wsRef.current = ws;
    return () => { ws.close(); wsRef.current = null; };
  }, [state, token, scaleTerminal]);

  const formatTime = useCallback((seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }, []);

  // --- Render States ---

  if (state === 'loading') {
    return (
      <div className="share-viewer-overlay">
        <div className="share-viewer-message">
          <div className="share-spinner" />
          <p>{t('shareLoading')}</p>
        </div>
      </div>
    );
  }

  if (state === 'login_required') {
    return (
      <div className="share-viewer-overlay">
        <div className="share-viewer-message">
          <svg className="share-lock-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h2>{t('shareLoginRequired')}</h2>
          <p>{t('shareLoginPrompt')}</p>
          <button
            className="share-google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loginLoading}
          >
            <svg className="share-google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loginLoading ? t('loading') : t('loginWithGoogle')}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'email_denied') {
    return (
      <div className="share-viewer-overlay">
        <div className="share-viewer-message">
          <div className="share-icon-error">!</div>
          <h2>{t('shareEmailDeniedTitle')}</h2>
          <p>{t('shareEmailDeniedMessage')}</p>
          {userEmail && <p className="share-email-info">{userEmail}</p>}
        </div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="share-viewer-overlay">
        <div className="share-viewer-message">
          <div className="share-icon-error">!</div>
          <h2>{t('shareInvalidTitle')}</h2>
          <p>{t('shareInvalidMessage')}</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="share-viewer-overlay">
        <div className="share-viewer-message">
          <div className="share-icon-error">!</div>
          <h2>{t('error')}</h2>
          <p>{t('shareErrorMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="share-viewer">
      <div className="share-viewer-header">
        <div className="share-header-left">
          <svg className="share-logo" width="24" height="24" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
            <rect x="24" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
            <rect x="4" y="28" width="16" height="12" rx="3" fill="#8b5cf6"/>
          </svg>
          <span className="share-brand">SessionCast</span>
          <span className="share-badge-readonly">{t('shareReadOnly')}</span>
        </div>
        <div className="share-header-right">
          {!connected && state === 'valid' && (
            <span className="share-status-disconnected">{t('shareDisconnected')}</span>
          )}
          <span className={`share-timer ${remainingSeconds < 60 ? 'warning' : ''}`}>
            {formatTime(remainingSeconds)}
          </span>
        </div>
      </div>

      <div className="share-viewer-terminal-wrapper" ref={wrapperRef}>
        <div className="share-viewer-terminal" ref={terminalRef} />
      </div>

      {state === 'expired' && (
        <div className="share-viewer-expired-overlay">
          <div className="share-viewer-message">
            <div className="share-icon-expired">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2>{t('shareExpiredTitle')}</h2>
            <p>{t('shareExpiredMessage')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
