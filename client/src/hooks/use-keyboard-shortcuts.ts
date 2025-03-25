import { useEffect } from 'react';
import { trackEvent } from '@/lib/amplitude';

interface ShortcutHandlers {
  addNewItem?: () => void;
  togglePriority?: () => void;
  focusNext?: () => void;
  focusPrev?: () => void;
  complete?: () => void;
  delete?: () => void;
}

interface KeyboardOptions {
  enabled?: boolean;
  trackingPrefix?: string;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, options: KeyboardOptions = {}) {
  const { enabled = true, trackingPrefix = '' } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const startTime = performance.now();

      // Add new item: Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handlers.addNewItem?.();
        trackKeyboardShortcut('new_item', startTime);
      }

      // Toggle priority: Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlers.togglePriority?.();
        trackKeyboardShortcut('toggle_priority', startTime);
      }

      // Focus next: Alt + Down
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        handlers.focusNext?.();
        trackKeyboardShortcut('focus_next', startTime);
      }

      // Focus previous: Alt + Up
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        handlers.focusPrev?.();
        trackKeyboardShortcut('focus_prev', startTime);
      }

      // Complete item: Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlers.complete?.();
        trackKeyboardShortcut('complete', startTime);
      }

      // Delete item: Ctrl/Cmd + Backspace
      if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') {
        e.preventDefault();
        handlers.delete?.();
        trackKeyboardShortcut('delete', startTime);
      }
    };

    const trackKeyboardShortcut = (action: string, startTime: number) => {
      const endTime = performance.now();
      trackEvent('Keyboard.Shortcut.Used', {
        action: `${trackingPrefix}${action}`,
        component: trackingPrefix || 'global',
        responseTime: endTime - startTime
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers, trackingPrefix]);
}
