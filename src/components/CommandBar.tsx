import { useState, useRef, KeyboardEvent } from 'react';
import './CommandBar.css';

interface CommandBarProps {
  onSend: (command: string) => void;
  disabled: boolean;
}

const QUICK_COMMANDS = [
  { label: 'ls -la', cmd: 'ls -la\n' },
  { label: 'git status', cmd: 'git status\n' },
  { label: 'pwd', cmd: 'pwd\n' },
  { label: 'clear', cmd: 'clear\n' },
  { label: 'Ctrl+C', cmd: '\x03' },
  { label: 'Ctrl+D', cmd: '\x04' },
  { label: 'Ctrl+Z', cmd: '\x1a' },
];

export function CommandBar({ onSend, disabled }: CommandBarProps) {
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

  return (
    <div className="command-bar">
      <div className="quick-commands">
        {QUICK_COMMANDS.map((qc) => (
          <button
            key={qc.label}
            className="quick-cmd-btn"
            onClick={() => handleQuickCommand(qc.cmd)}
            disabled={disabled}
          >
            {qc.label}
          </button>
        ))}
      </div>
      <div className="command-input-container">
        <input
          ref={inputRef}
          type="text"
          className="command-input"
          placeholder="Enter command..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={disabled || !command.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
