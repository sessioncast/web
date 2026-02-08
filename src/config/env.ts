// Environment configuration
const hostname = window.location.hostname;

const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Service URLs
export const API_URL = isLocalhost
  ? `${window.location.protocol}//${hostname}:8080`
  : 'https://api.sessioncast.io';

export const AUTH_URL = isLocalhost
  ? 'http://localhost:22081'
  : 'https://auth.sessioncast.io';

export const WS_URL = isLocalhost
  ? `ws://${hostname}:8080/ws`
  : 'wss://relay.sessioncast.io/ws';

export const RELAY_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
