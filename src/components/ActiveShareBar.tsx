import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/env';
import { useLanguage } from '../i18n';
import './ActiveShareBar.css';

interface ActiveLink {
  token: string;
  shareUrl: string;
  mode: string;
  targetEmail: string | null;
  remainingSeconds: number;
}

interface ActiveShareBarProps {
  sessionId: string | null;
  authToken: string;
  refreshKey?: number;
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function ActiveShareBar({ sessionId, authToken, refreshKey }: ActiveShareBarProps) {
  const { t } = useLanguage();
  const [links, setLinks] = useState<ActiveLink[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!sessionId) { setLinks([]); return; }
    try {
      const res = await fetch(
        `${API_URL}/api/session-share-links?sessionId=${encodeURIComponent(sessionId)}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch {
      // silently ignore
    }
  }, [sessionId, authToken]);

  // Fetch on mount, sessionId change, or refresh trigger
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks, refreshKey]);

  // Also re-fetch periodically (every 30s) to catch new links
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(fetchLinks, 30000);
    return () => clearInterval(interval);
  }, [sessionId, fetchLinks]);

  // Countdown
  useEffect(() => {
    if (links.length === 0) return;
    const interval = setInterval(() => {
      setLinks(prev =>
        prev
          .map(l => ({ ...l, remainingSeconds: l.remainingSeconds - 1 }))
          .filter(l => l.remainingSeconds > 0)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [links.length]);

  const handleCopy = async (url: string, token: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (links.length === 0) return null;

  return (
    <div className={`active-share-bar ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="active-share-bar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="active-share-bar-count">{links.length}</span>
        {collapsed && <span className="active-share-bar-label">{t('shareActiveLinks')}</span>}
      </button>

      {!collapsed && (
        <div className="active-share-bar-links">
          {links.map(link => (
            <div key={link.token} className="active-share-bar-item">
              <span className="active-share-bar-mode">
                {link.mode === 'PUBLIC'
                  ? t('sharePublicLabel')
                  : link.targetEmail?.split(',').map((e, i) => (
                      <span key={i} className="asb-email">{e.trim()}</span>
                    ))
                }
              </span>
              <span className={`active-share-bar-timer ${link.remainingSeconds < 60 ? 'warning' : ''}`}>
                {formatTime(link.remainingSeconds)}
              </span>
              <button
                className="active-share-bar-copy"
                onClick={() => handleCopy(link.shareUrl, link.token)}
              >
                {copiedToken === link.token ? '✓' : t('copy')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
