import { useEffect } from 'react';

interface ShortcutHandlers {
  onFavorite?: () => void;
  onPin?: () => void;
  onAlarm?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  isActive: boolean;
}

export const useKeepKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    if (!handlers.isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
      // Don't fire if modifier key held (except we allow plain letters)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          handlers.onFavorite?.();
          break;
        case 'p':
          e.preventDefault();
          handlers.onPin?.();
          break;
        case 'a':
          e.preventDefault();
          handlers.onAlarm?.();
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          handlers.onDelete?.();
          break;
        case 'escape':
          e.preventDefault();
          handlers.onEscape?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
