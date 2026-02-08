import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionStatus, Message, SessionInfo } from '../types';
import { FileViewerContent } from '../components/FileViewer';
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

// Derive MIME content type from filename extension or agent language field
function deriveContentType(filename: string, language?: string): string {
  // Check language field from agent (e.g., 'markdown', 'html', 'javascript')
  if (language) {
    const langMap: Record<string, string> = {
      'markdown': 'text/markdown',
      'html': 'text/html',
      'json': 'application/json',
      'xml': 'text/xml',
      'css': 'text/css',
      'yaml': 'text/yaml',
    };
    if (langMap[language]) return langMap[language];
  }

  // Fallback: derive from file extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const extMap: Record<string, string> = {
    'md': 'text/markdown',
    'html': 'text/html',
    'htm': 'text/html',
    'json': 'application/json',
    'xml': 'text/xml',
    'css': 'text/css',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
  };
  return extMap[ext] || 'text/plain';
}

const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

interface UseWebSocketOptions {
  url: string;
  token?: string | null;
  onScreen?: (sessionId: string, data: string) => void;
  onPaneScreen?: (sessionId: string, paneId: string, data: string) => void;
  onSessionList?: (sessions: SessionInfo[]) => void;
  onSessionStatus?: (sessionId: string, status: string) => void;
  onFileView?: (sessionId: string, file: FileViewerContent) => void;
}

export function useWebSocket({
  url,
  token,
  onScreen,
  onPaneScreen,
  onSessionList,
  onSessionStatus,
  onFileView,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const currentSessionRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs for callbacks to prevent reconnection on callback changes
  const onScreenRef = useRef(onScreen);
  const onPaneScreenRef = useRef(onPaneScreen);
  const onSessionListRef = useRef(onSessionList);
  const onSessionStatusRef = useRef(onSessionStatus);
  const onFileViewRef = useRef(onFileView);

  // Update refs when callbacks change
  useEffect(() => {
    onScreenRef.current = onScreen;
    onPaneScreenRef.current = onPaneScreen;
    onSessionListRef.current = onSessionList;
    onSessionStatusRef.current = onSessionStatus;
    onFileViewRef.current = onFileView;
  }, [onScreen, onPaneScreen, onSessionList, onSessionStatus, onFileView]);

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

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
                if (message.meta?.pane) {
                  onPaneScreenRef.current?.(message.session, message.meta.pane, decoded);
                } else {
                  onScreenRef.current?.(message.session, decoded);
                }
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
                if (message.meta?.pane) {
                  onPaneScreenRef.current?.(message.session, message.meta.pane, decompressed);
                } else {
                  onScreenRef.current?.(message.session, decompressed);
                }
              } catch (e) {
                console.error('Failed to decompress screen data:', e);
              }
            }
            break;
          case 'paneLayout':
            // Pane layout changed - refresh session list to get updated panes
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'listSessions' }));
            }
            break;
          case 'sessionList':
            if (message.sessions) {
              onSessionListRef.current?.(message.sessions);
            }
            break;
          case 'sessionStatus':
            if (message.session && message.status) {
              onSessionStatusRef.current?.(message.session, message.status);
            }
            break;
          case 'file_view':
            if (message.session && message.payload && message.meta) {
              try {
                // Agent sends meta.filePath, web may also use meta.path or meta.filename
                const filePath = message.meta.filePath || message.meta.path || message.meta.filename || 'unknown';
                const filename = filePath.split('/').pop() || filePath;

                // Derive content type from meta.contentType, meta.language, or file extension
                const contentType = message.meta.contentType || deriveContentType(filename, message.meta.language);
                const isBase64 = contentType.startsWith('image/');
                const content = isBase64 ? message.payload : decodeBase64(message.payload);

                const fileContent: FileViewerContent = {
                  filename,
                  contentType,
                  content,
                  path: filePath,
                };
                onFileViewRef.current?.(message.session, fileContent);
              } catch (e) {
                console.error('Failed to process file_view:', e);
              }
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
  }, [url, token]); // Only reconnect when url or token changes

  const scheduleReconnect = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const attempts = reconnectAttempts.current++;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, attempts),
      MAX_RECONNECT_DELAY
    );
    const jitter = Math.random() * delay * 0.2;

    console.log(`Reconnecting in ${delay + jitter}ms...`);
    reconnectTimeoutRef.current = setTimeout(connect, delay + jitter);
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

  const sendKeys = useCallback((sessionId: string, keys: string, paneId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: Record<string, unknown> = {
        type: 'keys',
        session: sessionId,
        payload: keys,
      };
      if (paneId) {
        msg.meta = { pane: paneId };
      }
      wsRef.current.send(JSON.stringify(msg));
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

  const requestFileView = useCallback((sessionId: string, filePath: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'requestFileView',
        session: sessionId,
        meta: {
          filePath: filePath,
          path: filePath,
        },
      }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      // Clear reconnect timeout on cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
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
    requestFileView,
  };
}
