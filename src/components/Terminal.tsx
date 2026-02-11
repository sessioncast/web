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
  theme,
  isLoading
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [keyboardHidden, setKeyboardHidden] = useState(false);

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

    // Small delay to ensure DOM is fully rendered
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

      // Fit after a delay
      setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          try {
            fitAddonRef.current.fit();
          } catch (e) {
            // ignore
          }
        }
        setIsReady(true);
      }, 50);

      xterm.onData((data) => {
        onInput(data);
      });

      // Register file path link provider (xterm.js official API)
      // Highlights file paths on hover, click opens FileViewer
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

  // Handle window resize
  useEffect(() => {
    if (!isReady) return;

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          // Send new size to server
          const cols = xtermRef.current.cols;
          const rows = xtermRef.current.rows;
          if (onResize && cols > 0 && rows > 0) {
            onResize(cols, rows);
          }
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Trigger initial resize
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
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
    return () => {
      delete (window as any).__writeToTerminal;
    };
  }, [writeToTerminal]);

  return (
    <div className="terminal-container" data-tour="terminal">
      <div className="terminal-header">
        <div className="header-left">
          <span className={`connection-status ${connectionStatus}`} />
          <span className="session-title">
            {sessionLabel || sessionId || 'Select a session'}
          </span>
        </div>
        <div className="header-right">
          {sessionId && (
            <>
              <button
                className={`keyboard-toggle ${keyboardHidden ? 'hidden-state' : ''}`}
                onClick={() => {
                  const textarea = terminalRef.current?.querySelector('textarea');
                  if (keyboardHidden) {
                    textarea?.focus();
                    setKeyboardHidden(false);
                  } else {
                    textarea?.blur();
                    setKeyboardHidden(true);
                  }
                }}
                title={keyboardHidden ? 'Show keyboard' : 'Hide keyboard'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="14" rx="2" />
                  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
                  {keyboardHidden && <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5" />}
                </svg>
              </button>
              <span className={`session-status ${status}`}>
                {status === 'online' ? 'Connected' : (
                  <>
                    Disconnected — <a href="mailto:devload@sessioncast.io" className="support-link">Help</a>
                  </>
                )}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="terminal-content">
        {sessionId ? (
          <>
            <div
              ref={terminalRef}
              className="xterm-wrapper"
              onTouchStart={keyboardHidden ? (e) => {
                // Prevent xterm from focusing textarea when keyboard is hidden
                const textarea = terminalRef.current?.querySelector('textarea');
                if (textarea) {
                  e.preventDefault();
                  textarea.blur();
                }
              } : undefined}
            />
            {isLoading && (
              <div className="terminal-loading-overlay">
                <div className="terminal-loading-spinner" />
                <span>Connecting to session...</span>
              </div>
            )}
          </>
        ) : (
          <div className="terminal-placeholder">
            <p>Select a session from the sidebar to connect</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function getTerminalWriter(): ((data: string) => void) | null {
  return (window as any).__writeToTerminal || null;
}
