import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n';
import './TokenManager.css';

interface TokenManagerProps {
  authToken: string;
  onClose: () => void;
}

import { RELAY_API_URL } from '../config/urls';

export function TokenManager({ authToken, onClose }: TokenManagerProps) {
  const { t } = useLanguage();
  const [tokens, setTokens] = useState<string[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch(`${RELAY_API_URL}/api/tokens`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      }
    } catch (e) {
      console.error('Failed to fetch tokens', e);
    }
  }, [authToken]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleGenerateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${RELAY_API_URL}/api/tokens/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNewToken(data.token);
        fetchTokens();
      } else {
        setError(t('error'));
      }
    } catch (e) {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (token: string) => {
    try {
      const response = await fetch(`${RELAY_API_URL}/api/tokens/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        fetchTokens();
        if (newToken === token) {
          setNewToken(null);
        }
      }
    } catch (e) {
      console.error('Failed to revoke token', e);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
  };

  return (
    <div className="token-manager-overlay" onClick={onClose}>
      <div className="token-manager" onClick={e => e.stopPropagation()}>
        <div className="token-manager-header">
          <h2>{t('agentTokens')}</h2>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>

        <div className="token-manager-content">
          <p className="token-description">
            {t('tokenDescription')}
          </p>

          {error && <div className="token-error">{error}</div>}

          {newToken && (
            <div className="new-token-box">
              <div className="new-token-label">{t('newTokenWarning')}</div>
              <div className="new-token-value">
                <code>{newToken}</code>
                <button onClick={() => handleCopyToken(newToken)}>{t('copy')}</button>
              </div>
            </div>
          )}

          <button
            className="generate-token-btn"
            onClick={handleGenerateToken}
            disabled={loading}
          >
            {loading ? t('generating') : t('generateNewToken')}
          </button>

          <div className="token-list">
            <h3>{t('yourTokens')} ({tokens.length})</h3>
            {tokens.length === 0 ? (
              <p className="no-tokens">{t('noTokensYet')}</p>
            ) : (
              <ul>
                {tokens.map((token, idx) => (
                  <li key={idx}>
                    <code>{token.substring(0, 20)}...</code>
                    <div className="token-actions">
                      <button onClick={() => handleCopyToken(token)}>{t('copy')}</button>
                      <button className="revoke-btn" onClick={() => handleRevokeToken(token)}>{t('revoke')}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="config-example">
            <h3>{t('configExample')}</h3>
            <pre>{`# ~/.sessioncast.yml
machineId: my-machine
relay: wss://relay.sessioncast.io/ws
token: ${newToken || 'agt_xxxx...'}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
