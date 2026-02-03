import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import './OnboardingGuide.css';

interface OnboardingGuideProps {
  authToken: string;
  onAuthError?: () => void;
}

// API URL - use Platform API server, not app server
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : 'https://api.sessioncast.io';
const RELAY_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export function OnboardingGuide({ authToken, onAuthError }: OnboardingGuideProps) {
  const { t } = useLanguage();
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchOrCreateToken();
  }, [authToken]);

  const fetchOrCreateToken = async () => {
    try {
      const listResponse = await fetch(`${API_URL}/api/tokens`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      // Handle 401 - redirect to login
      if (listResponse.status === 401) {
        onAuthError?.();
        return;
      }

      if (listResponse.ok) {
        const data = await listResponse.json();
        if (data.tokens && data.tokens.length > 0) {
          setAgentToken(data.tokens[0]);
          setLoading(false);
          return;
        }
      }

      const generateResponse = await fetch(`${API_URL}/api/tokens/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      // Handle 401 - redirect to login
      if (generateResponse.status === 401) {
        onAuthError?.();
        return;
      }

      if (generateResponse.ok) {
        const data = await generateResponse.json();
        setAgentToken(data.token);
      }
    } catch (e) {
      console.error('Failed to fetch/create token', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const configContent = `# ~/.sessioncast.yml
machineId: my-machine
relay: ${RELAY_URL}
token: ${agentToken || 'loading...'}`;

  if (loading) {
    return (
      <div className="onboarding-guide">
        <div className="loading-spinner">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="onboarding-guide">
      <div className="onboarding-header">
        <h1>{t('welcome')}</h1>
        <p>{t('noMachines')}</p>
      </div>

      <div className="setup-steps">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>{t('step1Title')}</h3>
            <p>{t('step1Desc')}</p>
            <div className="code-block">
              <code>git clone https://github.com/devload/sessioncast.git</code>
              <code>cd sessioncast/agent</code>
              <code>./mvnw clean package -DskipTests</code>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>{t('step2Title')}</h3>
            <p>{t('step2Desc')} <code>~/.sessioncast.yml</code></p>
            <div className="config-block">
              <pre>{configContent}</pre>
              <button
                className="copy-btn"
                onClick={() => handleCopy(configContent)}
              >
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
            <div className="token-info">
              <span className="token-label">{t('yourAgentToken')}</span>
              <code className="token-value">{agentToken}</code>
              <button
                className="copy-token-btn"
                onClick={() => agentToken && handleCopy(agentToken)}
              >
                {t('copyToken')}
              </button>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>{t('step3Title')}</h3>
            <p>{t('step3Desc')}</p>
            <div className="code-block">
              <code>tmux new-session -d -s work</code>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>{t('step4Title')}</h3>
            <p>{t('step4Desc')}</p>
            <div className="code-block">
              <code>java -jar target/host-agent-1.0.0.jar</code>
            </div>
            <p className="hint">{t('step4Hint')}</p>
          </div>
        </div>
      </div>

      <div className="onboarding-footer">
        <p>{t('footerConnected')}</p>
        <p className="security-note">{t('footerSecurity')}</p>
      </div>
    </div>
  );
}
