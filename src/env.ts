/**
 * SessionCast Environment Configuration
 *
 * OTE(테스트 환경) URL 자동 감지:
 *   - ote-app.sessioncast.io  → OTE1 (기존 호환, "ote" 접두사)
 *   - ote2-app.sessioncast.io → OTE2
 *   - ote3-app.sessioncast.io → OTE3
 *
 * localhost → 로컬 개발 서버
 * 그 외    → 프로덕션 (app.sessioncast.io)
 */

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

// OTE 환경 감지: "ote-app.sessioncast.io" 또는 "ote2-app.sessioncast.io" 등
const oteMatch = hostname.match(/^(ote\d*)-/);

export const IS_OTE = !!oteMatch;
export const OTE_PREFIX = oteMatch ? oteMatch[1] : '';

const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

export const PLATFORM_API_URL = isLocalhost
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : IS_OTE
    ? `https://${OTE_PREFIX}-api.sessioncast.io`
    : 'https://api.sessioncast.io';

export const AUTH_URL = isLocalhost
  ? 'http://localhost:22081'
  : IS_OTE
    ? `https://${OTE_PREFIX}-auth.sessioncast.io`
    : 'https://auth.sessioncast.io';

export const WS_URL = isLocalhost
  ? `ws://${window.location.hostname}:8080/ws`
  : IS_OTE
    ? `wss://${OTE_PREFIX}-relay.sessioncast.io/ws`
    : 'wss://relay.sessioncast.io/ws';
