import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
// Language support
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import './FileViewer.css';

// Get Prism language from filename
function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'css': 'css',
    'scss': 'css',
    'json': 'json',
    'py': 'python',
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'swift': 'swift',
    'go': 'go',
    'rs': 'rust',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
    'sql': 'sql',
    'md': 'markdown',
  };
  return langMap[ext] || 'plaintext';
}

export interface FileViewerContent {
  filename: string;
  contentType: string;  // 'text/markdown', 'text/html', 'image/png', etc.
  content: string;      // UTF-8 for text, base64 for images
  path?: string;
}

export interface FileTab {
  id: string;
  file: FileViewerContent;
  addedAt: number;
}

interface FileViewerProps {
  files: FileTab[];              // All received files (history)
  isOpen: boolean;
  onClose: () => void;
  onCloseFile: (id: string) => void;
  onFileRequest?: (path: string) => void;
  theme: 'dark' | 'light';
}

// File content renderer component
function FileContent({
  file,
  onContentClick
}: {
  file: FileViewerContent;
  onContentClick: (e: React.MouseEvent) => void;
}) {
  const { contentType, content, filename } = file;

  // Image
  if (contentType.startsWith('image/')) {
    return (
      <div className="file-viewer-image">
        <img
          src={`data:${contentType};base64,${content}`}
          alt={filename}
        />
      </div>
    );
  }

  // Markdown
  if (contentType === 'text/markdown' || filename.endsWith('.md')) {
    return (
      <div className="file-viewer-markdown" onClick={onContentClick}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // HTML
  if (contentType === 'text/html' || filename.endsWith('.html') || filename.endsWith('.htm')) {
    const sanitizedHtml = DOMPurify.sanitize(content, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target'],
    });
    return (
      <div
        className="file-viewer-html"
        onClick={onContentClick}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // Code with syntax highlighting
  const language = getLanguage(filename);
  const grammar = Prism.languages[language];

  if (grammar) {
    const lines = content.split('\n');
    const highlightedLines = lines.map(line =>
      Prism.highlight(line || ' ', grammar, language)
    );

    return (
      <div className="file-viewer-code">
        <pre className={`language-${language}`}>
          <code className={`language-${language}`}>
            {highlightedLines.map((html, index) => (
              <div key={index} className="code-line">
                <span className="line-number">{index + 1}</span>
                <span
                  className="line-content"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>
    );
  }

  // Plain text fallback
  return (
    <div className="file-viewer-text">
      <pre>{content}</pre>
    </div>
  );
}

export function FileViewer({ files, isOpen, onClose, onCloseFile, onFileRequest, theme }: FileViewerProps) {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [secondaryFileId, setSecondaryFileId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [tabWidth, setTabWidth] = useState(() => {
    const saved = localStorage.getItem('fileviewer-tab-width');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('fileviewer-panel-width');
    return saved ? parseInt(saved, 10) : 500; // pixels
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isPanelResizing, setIsPanelResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Get open files (tabs) - most recent 10
  const openFiles = useMemo(() => files.slice(-10), [files]);

  // Auto-select latest file when new file arrives
  useEffect(() => {
    if (openFiles.length > 0) {
      const latestFile = openFiles[openFiles.length - 1];
      setActiveFileId(latestFile.id);
    }
  }, [openFiles]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (splitMode) {
          setSplitMode(false);
          setSecondaryFileId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, splitMode]);

  // Handle link clicks within the content (Ctrl+Click for file links)
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;

    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Check if it's a file path
    if (href.startsWith('file://') || href.startsWith('./') || href.startsWith('../') || href.startsWith('~/')) {
      e.preventDefault();
      e.stopPropagation();
      onFileRequest?.(href);
    }
  }, [onFileRequest]);

  const activeFile = useMemo(() =>
    openFiles.find(f => f.id === activeFileId)?.file || null,
    [openFiles, activeFileId]
  );

  const secondaryFile = useMemo(() =>
    openFiles.find(f => f.id === secondaryFileId)?.file || null,
    [openFiles, secondaryFileId]
  );

  const handleTabClick = (id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: Open in split view
      if (!splitMode) {
        setSplitMode(true);
        setSecondaryFileId(id);
      } else if (id !== activeFileId) {
        setSecondaryFileId(id);
      }
    } else {
      setActiveFileId(id);
    }
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onCloseFile(id);

    // If closing active tab, switch to another
    if (id === activeFileId) {
      const remaining = openFiles.filter(f => f.id !== id);
      if (remaining.length > 0) {
        setActiveFileId(remaining[remaining.length - 1].id);
      } else {
        setActiveFileId(null);
      }
    }

    // If closing secondary tab in split mode
    if (id === secondaryFileId) {
      setSplitMode(false);
      setSecondaryFileId(null);
    }
  };

  const handleHistorySelect = (id: string) => {
    setActiveFileId(id);
    setShowHistory(false);
  };

  const getFileIcon = (filename: string, contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (filename.endsWith('.md')) return '📝';
    if (filename.endsWith('.html') || filename.endsWith('.htm')) return '🌐';
    if (filename.endsWith('.json')) return '📋';
    if (filename.endsWith('.css')) return '🎨';
    if (filename.endsWith('.js') || filename.endsWith('.ts')) return '⚡';
    return '📄';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Tab resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = tabWidth;
  }, [tabWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, Math.min(300, resizeStartWidth.current + delta));
      setTabWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('fileviewer-tab-width', String(tabWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, tabWidth]);

  // Panel resize handlers
  const handlePanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPanelResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelRef.current?.offsetWidth || 450;
  }, []);

  useEffect(() => {
    if (!isPanelResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartX.current - e.clientX;
      const newWidth = Math.max(350, Math.min(window.innerWidth * 0.9, resizeStartWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsPanelResizing(false);
      localStorage.setItem('fileviewer-panel-width', String(panelWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isPanelResizing, panelWidth]);

  return (
    <div
      ref={panelRef}
      className={`file-viewer-panel ${isOpen ? 'open' : ''} ${theme} ${splitMode ? 'split-mode' : ''} ${isPanelResizing ? 'resizing' : ''}`}
      style={{ width: panelWidth }}
    >
      {/* Panel resize handle */}
      <div
        className="panel-resize-handle"
        onMouseDown={handlePanelResizeStart}
        title="Drag to resize panel"
      />
      {/* Header with tabs */}
      <div className="file-viewer-header">
        <div className="file-viewer-tabs">
          {openFiles.map(({ id, file }, index) => (
            <div
              key={id}
              className={`file-tab ${id === activeFileId ? 'active' : ''} ${id === secondaryFileId ? 'secondary' : ''}`}
              style={{ width: tabWidth }}
              onClick={(e) => handleTabClick(id, e)}
              title={`${file.filename}\nCtrl+Click to open in split view`}
            >
              <span className="tab-icon">{getFileIcon(file.filename, file.contentType)}</span>
              <span className="tab-name">{file.filename}</span>
              <button
                className="tab-close"
                onClick={(e) => handleCloseTab(id, e)}
                title="Close"
              >
                ×
              </button>
              {index === openFiles.length - 1 && (
                <div
                  className="tab-resize-handle"
                  onMouseDown={handleResizeStart}
                  title="Drag to resize tabs"
                />
              )}
            </div>
          ))}
        </div>
        <div className="file-viewer-actions">
          <button
            className={`file-viewer-btn ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="History"
          >
            📚
          </button>
          <button
            className={`file-viewer-btn ${splitMode ? 'active' : ''}`}
            onClick={() => {
              if (splitMode) {
                setSplitMode(false);
                setSecondaryFileId(null);
              } else if (openFiles.length >= 2) {
                setSplitMode(true);
                // Set secondary to the file before active
                const activeIndex = openFiles.findIndex(f => f.id === activeFileId);
                const secondaryIndex = activeIndex > 0 ? activeIndex - 1 : openFiles.length - 1;
                if (secondaryIndex !== activeIndex) {
                  setSecondaryFileId(openFiles[secondaryIndex].id);
                }
              }
            }}
            title="Split View"
            disabled={openFiles.length < 2}
          >
            ⊞
          </button>
          <button
            className="file-viewer-btn"
            onClick={onClose}
            title="Close (ESC)"
          >
            ×
          </button>
        </div>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div className="file-viewer-history">
          <div className="history-header">
            <span>📚 File History ({files.length})</span>
            <button onClick={() => setShowHistory(false)}>×</button>
          </div>
          <div className="history-list">
            {[...files].reverse().map(({ id, file, addedAt }) => (
              <div
                key={id}
                className={`history-item ${id === activeFileId ? 'active' : ''}`}
                onClick={() => handleHistorySelect(id)}
              >
                <span className="history-icon">{getFileIcon(file.filename, file.contentType)}</span>
                <div className="history-info">
                  <span className="history-name">{file.filename}</span>
                  <span className="history-time">{formatTime(addedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className={`file-viewer-body ${splitMode ? 'split' : ''}`}>
        {/* Primary pane */}
        <div className="file-pane primary">
          {activeFile ? (
            <FileContent file={activeFile} onContentClick={handleContentClick} />
          ) : (
            <div className="file-viewer-empty">
              <p>No file selected</p>
            </div>
          )}
        </div>

        {/* Secondary pane (split view) */}
        {splitMode && (
          <div className="file-pane secondary">
            {secondaryFile ? (
              <FileContent file={secondaryFile} onContentClick={handleContentClick} />
            ) : (
              <div className="file-viewer-empty">
                <p>Ctrl+Click a tab to open here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="file-viewer-status">
        {activeFile && (
          <>
            <span className="status-path" title={activeFile.path || activeFile.filename}>
              {activeFile.path || activeFile.filename}
            </span>
            <span className="status-type">{activeFile.contentType}</span>
          </>
        )}
        {splitMode && <span className="status-split">Split View</span>}
      </div>
    </div>
  );
}

export default FileViewer;
