import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config/env';
import { useLanguage } from '../i18n';
import './ShareModal.css';

interface ShareModalProps {
  sessionId: string;
  authToken: string;
  onClose: () => void;
  onLinkCreated?: () => void;
}

interface ActiveLink {
  token: string;
  shareUrl: string;
  mode: string;
  targetEmail: string | null;
  remainingSeconds: number;
  createdAt: string;
}

type ShareMode = 'PUBLIC' | 'EMAIL';

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ShareModal({ sessionId, authToken, onClose, onLinkCreated }: ShareModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<ShareMode>('PUBLIC');
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLinks, setActiveLinks] = useState<ActiveLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Fetch active links on mount
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/session-share-links?sessionId=${encodeURIComponent(sessionId)}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setActiveLinks(data);
        }
      } catch {
        // Silently ignore — just won't show active links
      } finally {
        setLinksLoading(false);
      }
    };
    fetchLinks();
  }, [sessionId, authToken]);

  // Countdown timer for active links
  useEffect(() => {
    if (activeLinks.length === 0) return;
    const interval = setInterval(() => {
      setActiveLinks(prev =>
        prev
          .map(link => ({ ...link, remainingSeconds: link.remainingSeconds - 1 }))
          .filter(link => link.remainingSeconds > 0)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLinks.length]);

  const addEmail = useCallback((value: string) => {
    const email = value.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setEmailError(email);
      return;
    }
    if (emails.includes(email)) return;
    setEmails(prev => [...prev, email]);
    setEmailInput('');
    setEmailError(null);
  }, [emails]);

  const removeEmail = (index: number) => {
    setEmails(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(emailInput);
    } else if (e.key === 'Backspace' && emailInput === '' && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(',')) {
      // Split by comma and add each valid email
      const parts = value.split(',');
      for (const part of parts) {
        if (part.trim()) addEmail(part);
      }
    } else {
      setEmailInput(value);
      setEmailError(null);
    }
  };

  const handleCreate = async () => {
    if (mode === 'EMAIL' && emails.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = { sessionId, mode };
      if (mode === 'EMAIL') {
        body.targetEmails = emails.join(',');
      }

      const res = await fetch(`${API_URL}/api/share-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setShareUrl(data.shareUrl);
      onLinkCreated?.();

      // Add to active links list
      setActiveLinks(prev => [
        {
          token: data.token,
          shareUrl: data.shareUrl,
          mode,
          targetEmail: mode === 'EMAIL' ? emails.join(',') : null,
          remainingSeconds: 600,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, tokenId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (tokenId) {
      setCopiedToken(tokenId);
      setTimeout(() => setCopiedToken(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetToForm = () => {
    setShareUrl(null);
    setEmails([]);
    setEmailInput('');
    setEmailError(null);
    setError(null);
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>{t('shareTitle')}</h3>
          <button className="share-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="share-modal-body">
          {/* Active Links Section */}
          {!linksLoading && activeLinks.length > 0 && (
            <div className="share-active-links">
              <div className="share-active-links-header">{t('shareActiveLinks')}</div>
              {activeLinks.map(link => (
                <div key={link.token} className="share-active-link-item">
                  <div className="share-active-link-info">
                    <span className={`share-active-link-mode ${link.mode === 'PUBLIC' ? 'public' : 'email'}`}>
                      {link.mode === 'PUBLIC' ? t('sharePublicLabel') : ''}
                      {link.mode === 'EMAIL' && link.targetEmail
                        ? link.targetEmail.split(',').map((e, i) => (
                            <span key={i} className="share-link-email-chip">{e.trim()}</span>
                          ))
                        : null}
                    </span>
                    <span className={`share-active-link-timer ${link.remainingSeconds < 60 ? 'warning' : ''}`}>
                      {formatTime(link.remainingSeconds)}
                    </span>
                  </div>
                  <button
                    className="share-active-link-copy"
                    onClick={() => copyToClipboard(link.shareUrl, link.token)}
                  >
                    {copiedToken === link.token ? t('copied') : t('copy')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create new link / Result */}
          {!shareUrl ? (
            <>
              {activeLinks.length > 0 && (
                <div className="share-new-link-divider">{t('shareNewLink')}</div>
              )}

              <p className="share-modal-desc">{t('shareDescription')}</p>

              <div className="share-mode-group">
                <label className={`share-mode-option ${mode === 'PUBLIC' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="PUBLIC"
                    checked={mode === 'PUBLIC'}
                    onChange={() => setMode('PUBLIC')}
                  />
                  <div className="share-mode-content">
                    <span className="share-mode-label">{t('shareModePublic')}</span>
                    <span className="share-mode-desc">{t('shareModePublicDesc')}</span>
                  </div>
                </label>

                <label className={`share-mode-option ${mode === 'EMAIL' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="EMAIL"
                    checked={mode === 'EMAIL'}
                    onChange={() => setMode('EMAIL')}
                  />
                  <div className="share-mode-content">
                    <span className="share-mode-label">{t('shareModeEmail')}</span>
                    <span className="share-mode-desc">{t('shareModeEmailDescMulti')}</span>
                  </div>
                </label>
              </div>

              {mode === 'EMAIL' && (
                <div className="share-email-tags-container">
                  <div
                    className="share-email-tags-input"
                    onClick={() => emailInputRef.current?.focus()}
                  >
                    {emails.map((email, i) => (
                      <span key={i} className="share-email-tag">
                        {email}
                        <button
                          className="share-email-tag-remove"
                          onClick={e => { e.stopPropagation(); removeEmail(i); }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <input
                      ref={emailInputRef}
                      type="text"
                      className="share-email-tag-field"
                      placeholder={emails.length === 0 ? t('shareEmailPlaceholder') : ''}
                      value={emailInput}
                      onChange={handleEmailChange}
                      onKeyDown={handleEmailKeyDown}
                      onBlur={() => { if (emailInput.trim()) addEmail(emailInput); }}
                      autoFocus
                    />
                  </div>
                  {emailError && (
                    <p className="share-email-tag-error">"{emailError}" is not a valid email</p>
                  )}
                  <p className="share-email-tag-hint">{t('shareEmailTagHint')}</p>
                </div>
              )}

              {error && <p className="share-error">{error}</p>}

              <button
                className="share-create-btn"
                onClick={handleCreate}
                disabled={loading || (mode === 'EMAIL' && emails.length === 0)}
              >
                {loading ? t('shareCreating') : t('shareCreateLink')}
              </button>

              <p className="share-expire-note">{t('shareExpireNote')}</p>
            </>
          ) : (
            <div className="share-result">
              <div className="share-success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <p className="share-result-label">{t('shareLinkReady')}</p>

              <div className="share-url-box">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="share-url-input"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button className="share-copy-btn" onClick={() => copyToClipboard(shareUrl!)}>
                  {copied ? t('copied') : t('copy')}
                </button>
              </div>

              <p className="share-expire-note">{t('shareExpireNote')}</p>

              <button className="share-create-another-btn" onClick={resetToForm}>
                + {t('shareNewLink')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
