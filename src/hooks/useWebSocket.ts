import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionStatus, Message, SessionInfo } from '../types';
import pako from 'pako';

// Decode base64 to UTF-8 string
function decodeBase64(base64Data: string): string {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

// Decompress gzip data from base64
function decompressGzip(base64Data: string): string {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decompressed = pako.ungzip(bytes);
  return new TextDecoder('utf-8').decode(decompressed);
}

const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

interface UseWebSocketOptions {
  url: string;
  token?: string | null;
  onScreen?: (sessionId: string, data: string) => void;
  onSessionList?: (sessions: SessionInfo[]) => void;
  onSessionStatus?: (sessionId: string, status: string) => void;
}

export function useWebSocket({
  url,
  token,
  onScreen,
  onSessionList,
  onSessionStatus,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const currentSessionRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    // Add token as query parameter for authentication
    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');
      reconnectAttempts.current = 0;

      ws.send(JSON.stringify({ type: 'listSessions' }));

      if (currentSessionRef.current) {
        ws.send(JSON.stringify({
          type: 'register',
          role: 'viewer',
          session: currentSessionRef.current,
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);

        switch (message.type) {
          case 'screen':
            if (message.session && message.payload) {
              try {
                const decoded = decodeBase64(message.payload);
                onScreen?.(message.session, decoded);
              } catch (e) {
                console.error('Failed to decode screen data:', e);
              }
            }
            break;
          case 'screenGz':
            // Handle gzip compressed screen data
            if (message.session && message.payload) {
              try {
                const decompressed = decompressGzip(message.payload);
                onScreen?.(message.session, decompressed);
              } catch (e) {
                console.error('Failed to decompress screen data:', e);
              }
            }
            break;
          case 'sessionList':
            if (message.sessions) {
              onSessionList?.(message.sessions);
            }
            break;
          case 'sessionStatus':
            if (message.session && message.status) {
              onSessionStatus?.(message.session, message.status);
            }
            break;
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setStatus('disconnected');
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [url, token, onScreen, onSessionList, onSessionStatus]);

  const scheduleReconnect = useCallback(() => {
    const attempts = reconnectAttempts.current++;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, attempts),
      MAX_RECONNECT_DELAY
    );
    const jitter = Math.random() * delay * 0.2;

    console.log(`Reconnecting in ${delay + jitter}ms...`);
    setTimeout(connect, delay + jitter);
  }, [connect]);

  const joinSession = useCallback((sessionId: string) => {
    currentSessionRef.current = sessionId;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'register',
        role: 'viewer',
        session: sessionId,
      }));
    }
  }, []);

  const sendKeys = useCallback((sessionId: string, keys: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'keys',
        session: sessionId,
        payload: keys,
      }));
    }
  }, []);

  const refreshSessions = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'listSessions' }));
    }
  }, []);

  const createSession = useCallback((machineId: string, sessionName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'createSession',
        meta: {
          machineId,
          sessionName,
        },
      }));
    }
  }, []);

  const sendResize = useCallback((sessionId: string, cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        session: sessionId,
        meta: {
          cols: String(cols),
          rows: String(rows),
        },
      }));
    }
  }, []);

  const killSession = useCallback((sessionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'killSession',
        session: sessionId,
      }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    status,
    joinSession,
    sendKeys,
    refreshSessions,
    createSession,
    sendResize,
    killSession,
  };
}
