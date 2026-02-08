import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { PaneInfo } from '../types';
import 'xterm/css/xterm.css';
import './PaneLayout.css';

interface PaneLayoutProps {
  panes: PaneInfo[];
  paneScreens: Map<string, string>;
  activePaneId: string | null;
  onPaneClick: (paneId: string) => void;
  onInput: (data: string, paneId: string) => void;
  theme: 'dark' | 'light';
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

export function PaneLayout({ panes, paneScreens, activePaneId, onPaneClick, onInput, theme }: PaneLayoutProps) {
  const termRefs = useRef<Map<string, { xterm: XTerm; fitAddon: FitAddon }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const totalCols = Math.max(...panes.map(p => p.left + p.width), 1);
  const totalRows = Math.max(...panes.map(p => p.top + p.height), 1);

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
            fontSize: 10,
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

          try { fitAddon.fit(); } catch {}

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
          ref.xterm.write(data);
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

  // Fit terminals on resize
  useEffect(() => {
    const handleResize = () => {
      for (const ref of termRefs.current.values()) {
        try { ref.fitAddon.fit(); } catch {}
      }
    };
    window.addEventListener('resize', handleResize);
    // Fit after a short delay to allow layout to settle
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [panes.map(p => p.id).join(',')]);

  return (
    <div
      ref={containerRef}
      className="pane-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${totalCols}, 1fr)`,
        gridTemplateRows: `repeat(${totalRows}, 1fr)`,
      }}
    >
      {panes.map(pane => (
        <div
          key={pane.id}
          className={`pane-cell ${activePaneId === pane.id ? 'active' : ''}`}
          style={{
            gridColumn: `${pane.left + 1} / ${pane.left + pane.width + 1}`,
            gridRow: `${pane.top + 1} / ${pane.top + pane.height + 1}`,
          }}
          onClick={() => onPaneClick(pane.id)}
        >
          <div className="pane-header">
            <span className="pane-title">{pane.title || `Pane ${pane.index}`}</span>
            {pane.active && <span className="pane-active-badge">active</span>}
          </div>
          <div className="pane-terminal" id={`pane-term-${pane.id}`} />
        </div>
      ))}
    </div>
  );
}
