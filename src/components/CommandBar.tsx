import { useState, useRef, KeyboardEvent } from 'react';
import './CommandBar.css';

interface CommandBarProps {
  onSend: (command: string) => void;
  disabled: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

const SHELL_COMMANDS = [
  { label: 'ls -la', cmd: 'ls -la\n' },
  { label: 'git status', cmd: 'git status\n' },
  { label: 'pwd', cmd: 'pwd\n' },
  { label: 'clear', cmd: 'clear\n' },
];

const SIGNAL_COMMANDS = [
  { label: 'Ctrl+C', cmd: '\x03' },
  { label: 'Ctrl+D', cmd: '\x04' },
  { label: 'Ctrl+Z', cmd: '\x1a' },
];

export function CommandBar({ onSend, disabled, collapsed, onToggle }: CommandBarProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!command.trim() || disabled) return;

    onSend(command + '\n');
    setHistory(prev => [command, ...prev.slice(0, 99)]);
    setCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const handleQuickCommand = (cmd: string) => {
    if (disabled) return;
    onSend(cmd);
    inputRef.current?.focus();
  };

  if (collapsed) {
    return (
      <div className="cmdbar cmdbar-collapsed" data-tour="command-bar">
        <button className="cmdbar-expand-btn" onClick={onToggle} title="Show command bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          <span className="cmdbar-expand-text">Command Bar</span>
          <svg className="cmdbar-expand-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="cmdbar" data-tour="command-bar">
      {/* Quick commands */}
      <div className="cmdbar-shortcuts">
        <div className="cmdbar-shortcut-group">
          {SHELL_COMMANDS.map((qc) => (
            <button
              key={qc.label}
              className="cmdbar-chip"
              onClick={() => handleQuickCommand(qc.cmd)}
              disabled={disabled}
            >
              {qc.label}
            </button>
          ))}
        </div>
        <span className="cmdbar-divider" />
        <div className="cmdbar-shortcut-group">
          {SIGNAL_COMMANDS.map((qc) => (
            <button
              key={qc.label}
              className="cmdbar-chip cmdbar-chip-signal"
              onClick={() => handleQuickCommand(qc.cmd)}
              disabled={disabled}
            >
              {qc.label}
            </button>
          ))}
        </div>
        {onToggle && (
          <button className="cmdbar-collapse-btn" onClick={onToggle} title="Hide command bar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {/* Input */}
      <div className="cmdbar-input-row">
        <div className={`cmdbar-input-box ${disabled ? 'cmdbar-input-disabled' : ''}`}>
          <span className="cmdbar-prompt">$</span>
          <input
            ref={inputRef}
            type="text"
            className="cmdbar-input"
            placeholder={disabled ? 'No active session' : 'Type a command...'}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {history.length > 0 && !disabled && (
            <span className="cmdbar-hint">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          )}
          <button
            className="cmdbar-send"
            onClick={handleSubmit}
            disabled={disabled || !command.trim()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
