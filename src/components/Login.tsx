import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n';
import { AUTH_URL, API_URL } from '../config/env';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}
const CLIENT_ID = 'sessioncast-platform';
const CLIENT_SECRET = 'Zqvg5foaN3ZCtd4sGLumgeTZ6azGBXK7';
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

// PKCE helper functions
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

export function Login({ onLoginSuccess }: LoginProps) {
  const { t, lang, setLang } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for authorization code in URL (redirect from Auth Server)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    // Legacy: check for direct token (from old flow)
    const token = params.get('token');

    if (token) {
      localStorage.setItem('auth_token', token);
      onLoginSuccess(token);
      window.history.replaceState({}, document.title, '/');
      return;
    }

    if (code) {
      // Exchange code for token
      exchangeCodeForToken(code);
    }

    if (errorParam) {
      if (errorParam === 'domain_not_allowed') {
        setError(t('domainNotAllowed'));
      } else if (errorParam === 'oauth_failed') {
        setError(t('loginFailed'));
      } else {
        setError(errorParam);
      }
      window.history.replaceState({}, document.title, '/');
    }
  }, [onLoginSuccess, t]);

  const exchangeCodeForToken = async (code: string) => {
    setLoading(true);
    try {
      const codeVerifier = sessionStorage.getItem('code_verifier');
      sessionStorage.removeItem('code_verifier');

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        ...(codeVerifier && { code_verifier: codeVerifier }),
      });

      const response = await fetch(`${AUTH_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Token exchange failed');
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.access_token);

      // Call Platform API to trigger user auto-registration
      // This ensures user appears in admin dashboard
      try {
        await fetch(`${API_URL}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
      } catch (e) {
        // Non-critical - continue with login
        console.warn('Platform API call failed (non-critical):', e);
      }

      // Check if we need to redirect back to a share page
      const shareRedirect = sessionStorage.getItem('share_redirect');
      if (shareRedirect) {
        sessionStorage.removeItem('share_redirect');
        window.location.href = shareRedirect;
        return;
      }

      onLoginSuccess(data.access_token);
      window.history.replaceState({}, document.title, '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store code verifier for later
    sessionStorage.setItem('code_verifier', codeVerifier);

    // Redirect to Auth Server
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

  const toggleLanguage = () => {
    setLang(lang === 'ko' ? 'en' : 'ko');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button className="lang-toggle" onClick={toggleLanguage}>
          {lang === 'ko' ? 'EN' : 'KO'}
        </button>

        <div className="login-header">
          <div className="login-logo">
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
              <rect x="24" y="8" width="16" height="16" rx="3" fill="#8b5cf6"/>
              <rect x="4" y="28" width="16" height="12" rx="3" fill="#8b5cf6"/>
            </svg>
          </div>
          <h1>Session<span className="title-highlight">Cast</span></h1>
          <p>{t('loginSubtitle')}</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          className="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? `${t('loading')}` : t('loginWithGoogle')}
        </button>

        <div className="login-footer">
          <p>{lang === 'ko' ? '허가된 도메인만 접근할 수 있습니다' : 'Only authorized domains can access this system'}</p>
        </div>
      </div>
    </div>
  );
}
