import { Injectable, inject } from '@angular/core';
import { fromEvent, merge, Subject, filter, takeUntil } from 'rxjs';
import { CanvasService } from '../canvas/services/canvas.service';
import { CanvasQuery } from '../canvas/services/canvas.query';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class KeyboardService {
  private readonly canvasService = inject(CanvasService);
  private readonly canvasQuery = inject(CanvasQuery);

  private readonly destroy$ = new Subject<void>();
  private enabled = true;
  private readonly isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  private readonly shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      ctrl: true,
      handler: () => this.saveScreen(),
      description: '保存页面'
    },
    {
      key: 'z',
      ctrl: true,
      handler: () => this.canvasService.undo(),
      description: '撤销'
    },
    {
      key: 'y',
      ctrl: true,
      handler: () => this.canvasService.redo(),
      description: '重做'
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      handler: () => this.canvasService.redo(),
      description: '重做（备用）'
    },
    {
      key: 'c',
      ctrl: true,
      handler: () => this.canvasService.copyComponents(),
      description: '复制'
    },
    {
      key: 'v',
      ctrl: true,
      handler: () => this.canvasService.pasteComponents(),
      description: '粘贴'
    },
    {
      key: 'x',
      ctrl: true,
      handler: () => this.canvasService.cutComponents(),
      description: '剪切'
    },
    {
      key: 'a',
      ctrl: true,
      handler: () => this.selectAll(),
      description: '全选'
    },
    {
      key: 'Delete',
      handler: () => this.deleteSelected(),
      description: '删除选中组件'
    },
    {
      key: 'Backspace',
      handler: () => this.deleteSelected(),
      description: '删除选中组件（备用）'
    },
    {
      key: 'Escape',
      handler: () => this.clearSelection(),
      description: '取消选中'
    },
    {
      key: 'ArrowUp',
      handler: () => this.moveSelectedComponents(0, -1),
      description: '向上移动1px'
    },
    {
      key: 'ArrowDown',
      handler: () => this.moveSelectedComponents(0, 1),
      description: '向下移动1px'
    },
    {
      key: 'ArrowLeft',
      handler: () => this.moveSelectedComponents(-1, 0),
      description: '向左移动1px'
    },
    {
      key: 'ArrowRight',
      handler: () => this.moveSelectedComponents(1, 0),
      description: '向右移动1px'
    },
    {
      key: 'ArrowUp',
      shift: true,
      handler: () => this.moveSelectedComponents(0, -10),
      description: '向上移动10px'
    },
    {
      key: 'ArrowDown',
      shift: true,
      handler: () => this.moveSelectedComponents(0, 10),
      description: '向下移动10px'
    },
    {
      key: 'ArrowLeft',
      shift: true,
      handler: () => this.moveSelectedComponents(-10, 0),
      description: '向左移动10px'
    },
    {
      key: 'ArrowRight',
      shift: true,
      handler: () => this.moveSelectedComponents(10, 0),
      description: '向右移动10px'
    }
  ];

  startListening(): void {
    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(
        filter(() => this.enabled),
        filter(event => !this.isInputFocused()),
        takeUntil(this.destroy$)
      )
      .subscribe(event => this.handleKeyDown(event));
  }

  stopListening(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const ctrlKey = this.isMac ? event.metaKey : event.ctrlKey;

    // 记录关键的快捷键事件
    if (event.key === 's' && ctrlKey) {
      console.log('⌨️ [KeyboardService] Ctrl+S 快捷键被按下');
      console.log('⌨️ [KeyboardService] 事件详情:', {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        target: event.target?.constructor?.name,
        enabled: this.enabled,
        isInputFocused: this.isInputFocused()
      });
    }

    for (const shortcut of this.shortcuts) {
      if (this.matchShortcut(event, shortcut, ctrlKey)) {
        if (event.key === 's' && ctrlKey) {
          console.log('⌨️ [KeyboardService] 保存快捷键匹配成功，准备执行保存');
        }
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    }
  }

  private matchShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut, ctrlKey: boolean): boolean {
    if (event.key !== shortcut.key) return false;

    const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === ctrlKey;
    const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
    const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;

    if (shortcut.ctrl === false && ctrlKey) return false;
    if (shortcut.shift === false && event.shiftKey) return false;
    if (shortcut.alt === false && event.altKey) return false;

    return ctrlMatch && shiftMatch && altMatch;
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = activeElement.getAttribute('contenteditable') === 'true';

    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isEditable
    );
  }

  private selectAll(): void {
    this.canvasService.selectAll();
  }

  private deleteSelected(): void {
    this.canvasService.deleteSelected();
  }

  private clearSelection(): void {
    this.canvasService.clearSelection();
    this.canvasService.deactivateComponent();
  }

  private moveSelectedComponents(deltaX: number, deltaY: number): void {
    const state = this.canvasQuery.getValue();
    const selectedIds = state.selectedComponentIds.length > 0
      ? state.selectedComponentIds
      : state.activeComponentId
      ? [state.activeComponentId]
      : [];

    if (selectedIds.length === 0) return;

    selectedIds.forEach(id => {
      this.canvasService.moveComponent(id, deltaX, deltaY);
    });

    this.canvasService.recordSnapshot();
  }

  private saveScreen(): void {
    console.log('⌨️ [KeyboardService] saveScreen 方法被调用');
    // 获取当前屏幕名称并传递给保存方法
    const screenName = this.canvasService.getCurrentScreenName();
    console.log('⌨️ [KeyboardService] 当前屏幕名称:', screenName);
    console.log('⌨️ [KeyboardService] 准备调用 triggerImmediateSave');
    this.canvasService.triggerImmediateSave(screenName);
    console.log('⌨️ [KeyboardService] triggerImmediateSave 已调用');
  }

  getShortcuts(): KeyboardShortcut[] {
    return [...this.shortcuts];
  }
}
