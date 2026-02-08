import { useState, useEffect } from 'react';

/**
 * Hook to track Ctrl (or Cmd on Mac) key state
 * Adds 'ctrl-pressed' class to document body when Ctrl is held
 */
export function useCtrlKey(): boolean {
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
        document.body.classList.add('ctrl-pressed');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false);
        document.body.classList.remove('ctrl-pressed');
      }
    };

    // Handle blur (when window loses focus, reset state)
    const handleBlur = () => {
      setIsCtrlPressed(false);
      document.body.classList.remove('ctrl-pressed');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.body.classList.remove('ctrl-pressed');
    };
  }, []);

  return isCtrlPressed;
}

export default useCtrlKey;
