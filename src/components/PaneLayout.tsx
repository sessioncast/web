import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { PaneInfo } from '../types';
import { transformSnapshotForWrite } from '../utils/snapshotWriter';
import 'xterm/css/xterm.css';
import './PaneLayout.css';
import './Terminal.css';

interface PaneLayoutProps {
  panes: PaneInfo[];
  paneScreens: Map<string, string>;
  activePaneId: string | null;
  onPaneClick: (paneId: string) => void;
  onInput: (data: string, paneId: string) => void;
  onPaneResize?: (paneId: string, cols: number, rows: number) => void;
  sessionLabel?: string | null;
  status?: 'online' | 'offline';
  connectionStatus?: string;
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

export function PaneLayout({ panes, paneScreens, activePaneId, onPaneClick, onInput, onPaneResize, sessionLabel, status, connectionStatus, theme, isLoading }: PaneLayoutProps) {
  const termRefs = useRef<Map<string, { xterm: XTerm; fitAddon: FitAddon }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total dimensions for percentage positioning
  const totalCols = Math.max(...panes.map(p => p.left + p.width), 1);
  const totalRows = Math.max(...panes.map(p => p.top + p.height), 1);

  // Close tmux separator gaps: extend non-origin panes backward by 1 unit
  const adjustedPanes = panes.map(p => {
    const adjLeft = p.left > 0 ? p.left - 1 : 0;
    const adjTop = p.top > 0 ? p.top - 1 : 0;
    const adjWidth = p.width + (p.left > 0 ? 1 : 0);
    const adjHeight = p.height + (p.top > 0 ? 1 : 0);
    return { ...p, adjLeft, adjTop, adjWidth, adjHeight };
  });

  // Initialize terminals for each pane
  useEffect(() => {
    const currentPaneIds = new Set(panes.map(p => p.id));

    // Clean up removed panes
    for (const [id, ref] of termRefs.current.entries()) {
      if (!currentPaneIds.has(id)) {
        ref.xterm.dispose();
        termRefs.current.delete(id);
      }
    }

    // Initialize new panes
    for (const pane of panes) {
      if (!termRefs.current.has(pane.id)) {
        const el = document.getElementById(`pane-term-${pane.id}`);
        if (el) {
          const xterm = new XTerm({
            cursorBlink: false,
            fontSize: 12,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            scrollback: 0,
            theme: theme === 'light' ? lightTheme : darkTheme,
          });
          const fitAddon = new FitAddon();
          xterm.loadAddon(fitAddon);
          xterm.open(el);

          xterm.onData((data) => {
            onInput(data, pane.id);
          });

          termRefs.current.set(pane.id, { xterm, fitAddon });
        }
      }
    }

    return () => {
      // Cleanup all on unmount
      for (const ref of termRefs.current.values()) {
        ref.xterm.dispose();
      }
      termRefs.current.clear();
    };
  }, [panes.map(p => p.id).join(',')]); // Re-run when pane IDs change

  // Write screen data to terminals
  useEffect(() => {
    for (const [paneId, data] of paneScreens.entries()) {
      const ref = termRefs.current.get(paneId);
      if (ref) {
        try {
          ref.xterm.write(transformSnapshotForWrite(data));
        } catch {}
      }
    }
  }, [paneScreens]);

  // Update theme
  useEffect(() => {
    for (const ref of termRefs.current.values()) {
      ref.xterm.options.theme = theme === 'light' ? lightTheme : darkTheme;
    }
  }, [theme]);

  // Fit terminals to container (window resize, CommandBar toggle, etc.)
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      for (const [paneId, ref] of termRefs.current.entries()) {
        try {
          ref.fitAddon.fit();
          const cols = ref.xterm.cols;
          const rows = ref.xterm.rows;
          if (onPaneResize && cols > 0 && rows > 0) {
            onPaneResize(paneId, cols, rows);
          }
        } catch {}
      }
    };

    const ro = new ResizeObserver(() => handleResize());
    ro.observe(containerRef.current);
    setTimeout(handleResize, 200);
    return () => ro.disconnect();
  }, [panes.map(p => p.id).join(','), onPaneResize]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="header-left">
          <span className={`connection-status ${connectionStatus || 'disconnected'}`} />
          <span className="session-title">
            {sessionLabel || 'Multi-Pane'}
          </span>
        </div>
        <div className="header-right">
          <span className={`session-status ${status || 'offline'}`}>
            {status === 'online' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="pane-container">
      {isLoading && (
        <div className="terminal-loading-overlay">
          <div className="terminal-loading-spinner" />
          <span>Connecting to session...</span>
        </div>
      )}
      {adjustedPanes.map(pane => {
        const isActive = activePaneId === pane.id;
        return (
          <div
            key={pane.id}
            className={`pane-cell ${isActive ? 'active' : ''}`}
            style={{
              position: 'absolute',
              left: `${(pane.adjLeft / totalCols) * 100}%`,
              top: `${(pane.adjTop / totalRows) * 100}%`,
              width: `${(pane.adjWidth / totalCols) * 100}%`,
              height: `${(pane.adjHeight / totalRows) * 100}%`,
            }}
            onClick={() => onPaneClick(pane.id)}
          >
            <div className="pane-header">
              <span className="pane-title">Pane {pane.index}</span>
              {isActive && <span className="pane-active-badge">active</span>}
            </div>
            <div className="pane-terminal" id={`pane-term-${pane.id}`} />
          </div>
        );
      })}
      </div>
    </div>
  );
}
