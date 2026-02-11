import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { API_URL, WS_URL } from '../config/env';
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

type ViewerState = 'loading' | 'valid' | 'expired' | 'invalid' | 'error';

export function ShareViewer() {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [state, setState] = useState<ViewerState>('loading');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [connected, setConnected] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Validate share link token
  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }

    fetch(`${API_URL}/api/share-links/${token}`)
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
        } else {
          setState('expired');
        }
      })
      .catch(() => {
        setState('error');
      });
  }, [token]);

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

  // Initialize terminal
  useEffect(() => {
    if (state !== 'valid' || !terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true, // Read-only
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#ececf1',
        cursor: '#ececf1',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [state]);

  // WebSocket connection
  useEffect(() => {
    if (state !== 'valid' || !token) return;

    const wsUrl = `${WS_URL}?shareToken=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'screen' && message.payload) {
          const decoded = decodeBase64(message.payload);
          xtermRef.current?.write(decoded);
        } else if (message.type === 'screenGz' && message.payload) {
          const decompressed = decompressGzip(message.payload);
          xtermRef.current?.write(decompressed);
        }
      } catch (e) {
        console.error('Failed to process message:', e);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (event.code === 4403) {
        setState('expired');
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [state, token]);

  const formatTime = useCallback((seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }, []);

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

      <div className="share-viewer-terminal" ref={terminalRef} />

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
