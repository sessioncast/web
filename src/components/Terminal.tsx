import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { transformSnapshotForWrite } from '../utils/snapshotWriter';
import 'xterm/css/xterm.css';
import './Terminal.css';

// Regex to match file paths in terminal output (global for link scanning)
const FILE_PATH_REGEX = /((?:\/[\w.@-]+){2,}|~\/[\w.@/-]+|\.\.?\/[\w.@/-]+)/g;

interface TerminalProps {
  sessionId: string | null;
  sessionLabel: string | null;
  status: 'online' | 'offline';
  connectionStatus: string;
  onInput: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  onFileClick?: (path: string) => void;
  onShare?: () => void;
  theme: 'dark' | 'light';
  isLoading?: boolean;
}

const darkTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#264f78',
};

const lightTheme = {
  background: '#ffffff',
  foreground: '#1a1a1a',
  cursor: '#1a1a1a',
  cursorAccent: '#ffffff',
  selectionBackground: '#b4d5fe',
};

export function Terminal({
  sessionId,
  sessionLabel,
  status,
  connectionStatus,
  onInput,
  onResize,
  onFileClick,
  onShare,
  theme,
  isLoading
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Listen for fullscreen change (e.g. user presses Esc)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Cleanup on unmount or session change
  useEffect(() => {
    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
        setIsReady(false);
      }
    };
  }, [sessionId]);

  // Initialize terminal after DOM is ready
  useEffect(() => {
    if (!sessionId || !terminalRef.current || xtermRef.current) return;

    const initTimer = setTimeout(() => {
      if (!terminalRef.current) return;

      const xterm = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        rows: 24,
        cols: 80,
        scrollback: 0,
        theme: theme === 'light' ? lightTheme : darkTheme,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(terminalRef.current);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          try { fitAddonRef.current.fit(); } catch {}
        }
        setIsReady(true);
      }, 50);

      xterm.onData((data) => { onInput(data); });

      if (onFileClick) {
        xterm.registerLinkProvider({
          provideLinks(bufferLineNumber: number, callback: (links: any[] | undefined) => void) {
            const line = xterm.buffer.active.getLine(bufferLineNumber - 1);
            if (!line) { callback(undefined); return; }

            let lineText = '';
            for (let i = 0; i < line.length; i++) {
              lineText += line.getCell(i)?.getChars() || ' ';
            }

            const links: any[] = [];
            FILE_PATH_REGEX.lastIndex = 0;
            let match;
            while ((match = FILE_PATH_REGEX.exec(lineText)) !== null) {
              const filePath = match[1];
              const startX = match.index + (match[0].length - filePath.length);
              links.push({
                range: {
                  start: { x: startX + 1, y: bufferLineNumber },
                  end: { x: startX + filePath.length + 1, y: bufferLineNumber },
                },
                text: filePath,
                activate(_event: MouseEvent, text: string) {
                  console.log('[FileViewer] Link clicked:', text);
                  onFileClick(text);
                },
              });
            }
            callback(links.length > 0 ? links : undefined);
          },
        });
      }
    }, 100);

    return () => clearTimeout(initTimer);
  }, [sessionId, onInput, onFileClick]);

  // Handle container resize
  useEffect(() => {
    if (!isReady || !terminalRef.current) return;
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          const cols = xtermRef.current.cols;
          const rows = xtermRef.current.rows;
          if (onResize && cols > 0 && rows > 0) { onResize(cols, rows); }
        } catch {}
      }
    };
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(terminalRef.current);
    handleResize();
    return () => ro.disconnect();
  }, [isReady, onResize]);

  // Handle theme change
  useEffect(() => {
    if (xtermRef.current && isReady) {
      xtermRef.current.options.theme = theme === 'light' ? lightTheme : darkTheme;
    }
  }, [theme, isReady]);

  const writeToTerminal = useCallback((data: string) => {
    if (xtermRef.current && isReady) {
      try {
        xtermRef.current.write(transformSnapshotForWrite(data), () => {
          xtermRef.current?.scrollToBottom();
        });
      } catch (e) {
        console.error('Failed to write to terminal:', e);
      }
    }
  }, [isReady]);

  useEffect(() => {
    (window as any).__writeToTerminal = writeToTerminal;
    return () => { delete (window as any).__writeToTerminal; };
  }, [writeToTerminal]);

  return (
    <div className="terminal-container" data-tour="terminal" ref={containerRef}>
      {/* Header */}
      <div className="term-header">
        <div className="term-header-left">
          {sessionId ? (
            <div className="term-tab">
              <span className={`term-tab-dot ${status}`} />
              <span className="term-tab-name">{sessionLabel || sessionId}</span>
            </div>
          ) : (
            <span className="term-header-brand">SessionCast</span>
          )}
        </div>

        <div className="term-header-right">
          {sessionId && (
            <>
              {/* Connection status text */}
              <span className={`term-conn-label ${connectionStatus}`}>
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>

              {/* Share */}
              {onShare && status === 'online' && (
                <button className="term-header-btn" onClick={onShare} title="Share">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </button>
              )}

              {/* Fullscreen */}
              <button className="term-header-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/>
                    <polyline points="20 10 14 10 14 4"/>
                    <line x1="14" y1="10" x2="21" y2="3"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/>
                    <polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="terminal-content">
        {sessionId ? (
          <>
            <div ref={terminalRef} className="xterm-wrapper" />
            {isLoading && (
              <div className="terminal-loading-overlay">
                <div className="terminal-loading-spinner" />
                <span>Connecting to session...</span>
              </div>
            )}
          </>
        ) : (
          <div className="terminal-placeholder">
            <div className="placeholder-content">
              <div className="placeholder-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5"/>
                  <line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </div>
              <div className="placeholder-prompt">
                <span className="placeholder-cursor">_</span>
              </div>
              <h3 className="placeholder-title">Select a session</h3>
              <p className="placeholder-desc">Choose a session from the sidebar to start viewing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function getTerminalWriter(): ((data: string) => void) | null {
  return (window as any).__writeToTerminal || null;
}
