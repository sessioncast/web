const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Detect OTE: hostname like "ote-relay.sessioncast.io", "ote2-relay.sessioncast.io", "ote2-app.sessioncast.io"
const oteMatch = hostname.match(/^(ote\d*)-(?:relay|app)\.sessioncast\.io$/);
const otePrefix = oteMatch ? oteMatch[1] : null;

export const WS_URL = isLocalhost
  ? `ws://${hostname}:8080/ws`
  : otePrefix
    ? `wss://${otePrefix}-relay.sessioncast.io/ws`
    : 'wss://relay.sessioncast.io/ws';

export const API_URL = isLocalhost
  ? `${window.location.protocol}//${hostname}:8080`
  : otePrefix
    ? `https://${otePrefix}-api.sessioncast.io`
    : 'https://api.sessioncast.io';

// Relay HTTP URL — used for agent token operations (/api/tokens/*)
export const RELAY_API_URL = isLocalhost
  ? `${window.location.protocol}//${hostname}:8080`
  : otePrefix
    ? `https://${otePrefix}-relay.sessioncast.io`
    : 'https://relay.sessioncast.io';

export const AUTH_URL = isLocalhost
  ? 'http://localhost:22081'
  : otePrefix
    ? `https://${otePrefix}-auth.sessioncast.io`
    : 'https://auth.sessioncast.io';
