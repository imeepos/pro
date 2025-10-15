import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * 键盘快捷键 Hook
 * 提供键盘快捷键注册和管理功能
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const matchedShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = (shortcut.ctrlKey ?? false) === event.ctrlKey;
      const altMatch = (shortcut.altKey ?? false) === event.altKey;
      const shiftMatch = (shortcut.shiftKey ?? false) === event.shiftKey;
      const metaMatch = (shortcut.metaKey ?? false) === event.metaKey;

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
    });

    if (matchedShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchedShortcut.callback();
    }
  }, [shortcuts, enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcuts.map(shortcut => ({
      ...shortcut,
      displayKey: formatShortcutKey(shortcut)
    }))
  };
};

/**
 * 格式化快捷键显示文本
 */
function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

/**
 * 全屏相关快捷键 Hook
 */
export const useFullscreenShortcuts = (
  toggleFullscreen: () => void,
  exitFullscreen: () => void,
  options: UseKeyboardShortcutsOptions = {}
) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'F11',
      callback: toggleFullscreen,
      description: '切换全屏模式'
    },
    {
      key: 'f',
      ctrlKey: true,
      callback: toggleFullscreen,
      description: '切换全屏模式'
    },
    {
      key: 'Escape',
      callback: exitFullscreen,
      description: '退出全屏模式'
    }
  ];

  return useKeyboardShortcuts(shortcuts, options);
};
