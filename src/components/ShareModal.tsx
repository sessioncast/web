import { useState } from 'react';
import { API_URL } from '../config/env';
import { useLanguage } from '../i18n';
import './ShareModal.css';

interface ShareModalProps {
  sessionId: string;
  authToken: string;
  onClose: () => void;
}

type ShareMode = 'PUBLIC' | 'EMAIL';

export function ShareModal({ sessionId, authToken, onClose }: ShareModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<ShareMode>('PUBLIC');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (mode === 'EMAIL' && !email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = { sessionId, mode };
      if (mode === 'EMAIL') body.targetEmail = email.trim();

      const res = await fetch(`${API_URL}/api/share-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setShareUrl(data.shareUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>{t('shareTitle')}</h3>
          <button className="share-modal-close" onClick={onClose}>&times;</button>
        </div>

        {!shareUrl ? (
          <div className="share-modal-body">
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
                  <span className="share-mode-desc">{t('shareModeEmailDesc')}</span>
                </div>
              </label>
            </div>

            {mode === 'EMAIL' && (
              <input
                type="email"
                className="share-email-input"
                placeholder={t('shareEmailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            )}

            {error && <p className="share-error">{error}</p>}

            <button
              className="share-create-btn"
              onClick={handleCreate}
              disabled={loading || (mode === 'EMAIL' && !email.trim())}
            >
              {loading ? t('shareCreating') : t('shareCreateLink')}
            </button>

            <p className="share-expire-note">{t('shareExpireNote')}</p>
          </div>
        ) : (
          <div className="share-modal-body share-result">
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
              <button className="share-copy-btn" onClick={handleCopy}>
                {copied ? t('copied') : t('copy')}
              </button>
            </div>

            <p className="share-expire-note">{t('shareExpireNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
