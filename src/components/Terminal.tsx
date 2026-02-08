import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { PaneInfo } from '../types';
import { PaneLayout } from './PaneLayout';
import 'xterm/css/xterm.css';
import './Terminal.css';

interface TerminalProps {
  sessionId: string | null;
  sessionLabel: string | null;
  status: 'online' | 'offline';
  connectionStatus: string;
  onInput: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  theme: 'dark' | 'light';
  viewMode?: 'single' | 'layout';
  selectedPane?: string | null;
  panes?: PaneInfo[];
  paneScreens?: Map<string, string>;
  onPaneInput?: (data: string, paneId: string) => void;
  onPaneClick?: (paneId: string) => void;
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
  theme,
  viewMode,
  selectedPane,
  panes,
  paneScreens,
  onPaneInput,
  onPaneClick,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

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
    // Don't initialize single xterm when in layout mode with multiple panes
    if (viewMode === 'layout' && panes && panes.length > 1) return;

    // Small delay to ensure DOM is fully rendered
    const initTimer = setTimeout(() => {
      if (!terminalRef.current) return;

      const xterm = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        rows: 24,
        cols: 80,
        scrollback: 1000,
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

    }, 100);

    return () => clearTimeout(initTimer);
  }, [sessionId, onInput, viewMode, panes]);

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
        // Data is already decoded (UTF-8 string) from useWebSocket
        xtermRef.current.write(data);
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
            <span className={`session-status ${status}`}>
              {status === 'online' ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </div>
      </div>
      <div className="terminal-content">
        {!sessionId ? (
          <div className="terminal-placeholder">
            <p>Select a session from the sidebar to connect</p>
          </div>
        ) : viewMode === 'layout' && panes && panes.length > 1 ? (
          <PaneLayout
            panes={panes}
            paneScreens={paneScreens || new Map()}
            activePaneId={selectedPane || null}
            onPaneClick={onPaneClick || (() => {})}
            onInput={onPaneInput || (() => {})}
            theme={theme}
          />
        ) : (
          <div ref={terminalRef} className="xterm-wrapper" />
        )}
      </div>
    </div>
  );
}

export function getTerminalWriter(): ((data: string) => void) | null {
  return (window as any).__writeToTerminal || null;
}
