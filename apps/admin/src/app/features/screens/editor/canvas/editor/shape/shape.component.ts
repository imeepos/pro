import { Component, Input, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { CanvasService } from '../../services/canvas.service';
import { CanvasQuery } from '../../services/canvas.query';
import { ComponentItem, ComponentStyle, Point } from '../../../models/component.model';
import { throttleFrame } from '../../../utils/throttle.util';
import { GeometryUtil } from '../../../utils/geometry.util';
import { ContextMenuComponent, MenuItem } from '../context-menu/context-menu.component';

@Component({
  selector: 'app-shape',
  standalone: true,
  imports: [CommonModule, ContextMenuComponent],
  templateUrl: './shape.component.html',
  styleUrls: ['./shape.component.scss']
})
export class ShapeComponent implements OnInit, OnDestroy {
  @Input() component!: ComponentItem;
  @Input() editor?: any;

  isActive = false;
  private isDragging = false;
  private isResizing = false;
  private isRotating = false;
  private destroy$ = new Subject<void>();

  resizePoints = ['lt', 't', 'rt', 'r', 'rb', 'b', 'lb', 'l'];

  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;

  hasRenderError = false;
  errorMessage = '';

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery,
    private elementRef: ElementRef
  ) {}

  isSelected = false;

  ngOnInit(): void {
    this.query.activeComponentId$.pipe(takeUntil(this.destroy$)).subscribe((activeId) => {
      this.isActive = activeId === this.component.id;
    });

    this.query.selectedComponentIds$.pipe(takeUntil(this.destroy$)).subscribe((selectedIds) => {
      this.isSelected = selectedIds.includes(this.component.id);
    });

    this.validateComponent();
  }

  private validateComponent(): void {
    try {
      if (!this.component || !this.component.type) {
        this.setRenderError('组件类型无效');
        return;
      }

      if (!this.component.style) {
        this.setRenderError('组件样式缺失');
        return;
      }

      this.hasRenderError = false;
    } catch (error) {
      this.setRenderError(error instanceof Error ? error.message : '未知错误');
    }
  }

  private setRenderError(message: string): void {
    this.hasRenderError = true;
    this.errorMessage = message;
    console.error(`[ShapeComponent] ${this.component?.type || 'Unknown'}: ${message}`);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    // 阻止事件冒泡到父组件
    event.stopPropagation();

    // 阻止默认行为（如文本选择等）
    event.preventDefault();

    // 添加调试日志
    console.log('[ShapeComponent] onMouseDown triggered:', {
      componentId: this.component.id,
      componentType: this.component.type,
      target: event.target,
      targetClasses: (event.target as HTMLElement).className,
      isLocked: this.component.locked,
      hasError: this.hasRenderError,
      button: event.button
    });

    // 只处理左键点击
    if (event.button !== 0) {
      console.log('[ShapeComponent] Non-left button click ignored');
      return;
    }

    // 检查是否应该触发拖拽 - 放宽条件，允许子元素触发
    const shouldStartDrag = this.shouldStartDrag(event.target as HTMLElement);

    console.log('[ShapeComponent] shouldStartDrag:', shouldStartDrag);

    if (shouldStartDrag) {
      // 激活组件
      this.canvasService.activateComponent(this.component.id);

      // 开始拖拽
      this.startDrag(event);
    } else {
      console.log('[ShapeComponent] Drag not started due to shouldStartDrag returning false');
    }
  }

  /**
   * 处理组件内容区域的鼠标按下事件
   * 确保内容区域的点击也能触发拖拽
   */
  onContentMouseDown(event: MouseEvent): void {
    console.log('[ShapeComponent] onContentMouseDown triggered');
    // 直接调用主要的鼠标事件处理器
    this.onMouseDown(event);
  }

  /**
   * 检查是否应该开始拖拽
   * 放宽条件，允许组件内的子元素触发拖拽
   */
  private shouldStartDrag(target: HTMLElement): boolean {
    // 如果组件被锁定，不允许拖拽
    if (this.component.locked) {
      console.log('[ShapeComponent] Component is locked, drag disabled');
      return false;
    }

    // 如果组件有渲染错误，不允许拖拽
    if (this.hasRenderError) {
      console.log('[ShapeComponent] Component has render error, drag disabled');
      return false;
    }

    // 检查目标元素或其父元素是否包含不应拖拽的类
    const noDragClasses = ['resize-point', 'rotate-point', 'delete-btn', 'context-menu'];
    const targetElement = target as HTMLElement;

    // 检查当前元素及其父元素是否包含禁止拖拽的类
    let currentElement: HTMLElement | null = targetElement;
    while (currentElement && currentElement !== this.elementRef.nativeElement) {
      const classList = Array.from(currentElement.classList);

      if (noDragClasses.some(noDragClass => classList.includes(noDragClass))) {
        console.log('[ShapeComponent] Target contains no-drag class:', classList);
        return false;
      }

      currentElement = currentElement.parentElement;
    }

    // 检查是否在组件边界内（包括所有子元素）
    const isInsideComponent = this.elementRef.nativeElement.contains(targetElement);

    console.log('[ShapeComponent] Drag check result:', {
      isInsideComponent,
      targetClassList: Array.from(targetElement.classList),
      willStartDrag: isInsideComponent
    });

    return isInsideComponent;
  }

  private startDrag(event: MouseEvent): void {
    if (this.component.locked) {
      console.log('[ShapeComponent] Component locked, drag cancelled');
      return;
    }

    console.log('[ShapeComponent] Starting drag:', {
      componentId: this.component.id,
      componentType: this.component.type,
      startPosition: {
        left: this.component.style.left,
        top: this.component.style.top
      }
    });

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = this.component.style.left;
    const startTop = this.component.style.top;
    const scale = this.query.getValue().scale;

    this.isDragging = true;

    const move = throttleFrame((e: MouseEvent) => {
      if (!this.isDragging) {
        console.log('[ShapeComponent] Drag move ignored - not dragging');
        return;
      }

      const state = this.query.getValue();
      const shouldSnap = state.snapToGrid && !e.shiftKey;

      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // 只在第一次移动或每次第10次移动时记录日志
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        console.log('[ShapeComponent] Drag move:', {
          componentId: this.component.id,
          deltaX,
          deltaY,
          newPosition: { left: newLeft, top: newTop },
          shouldSnap
        });
      }

      if (shouldSnap) {
        newLeft = this.snapValue(newLeft, state.gridSize);
        newTop = this.snapValue(newTop, state.gridSize);
      }

      newLeft = Math.max(0, newLeft);
      newTop = Math.max(0, newTop);

      this.canvasService.updateComponentStyle(this.component.id, { left: newLeft, top: newTop });

      if (this.editor && state.showMarkLine) {
        const snapStyle = this.editor.showMarkLine(this.component);
        if (snapStyle) {
          this.canvasService.updateComponentStyle(this.component.id, snapStyle);
        }
      }
    });

    const up = () => {
      console.log('[ShapeComponent] Drag ended:', {
        componentId: this.component.id,
        finalPosition: {
          left: this.component.style.left,
          top: this.component.style.top
        }
      });

      this.isDragging = false;
      if (this.editor) {
        this.editor.hideMarkLine();
      }
      this.canvasService.recordSnapshot();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onDelete(): void {
    this.canvasService.removeComponent(this.component.id);
  }

  getTransform(): string {
    return `rotate(${this.component.style.rotate}deg)`;
  }

  onResizeStart(point: string, event: MouseEvent): void {
    if (this.component.locked) return;

    event.stopPropagation();
    event.preventDefault();

    this.isResizing = true;
    const scale = this.query.getValue().scale;
    const editorRect = this.elementRef.nativeElement.closest('.editor-container')?.getBoundingClientRect();

    if (!editorRect) return;

    const move = throttleFrame((e: MouseEvent) => {
      if (!this.isResizing) return;

      const state = this.query.getValue();
      const shouldSnap = state.snapToGrid && !e.shiftKey;

      const curPosition: Point = {
        x: (e.clientX - editorRect.left) / scale,
        y: (e.clientY - editorRect.top) / scale
      };

      const newStyle = GeometryUtil.calculateResizedPosition(
        point,
        this.component.style,
        curPosition
      );

      if (shouldSnap) {
        if (newStyle.left !== undefined) newStyle.left = this.snapValue(newStyle.left, state.gridSize);
        if (newStyle.top !== undefined) newStyle.top = this.snapValue(newStyle.top, state.gridSize);
        if (newStyle.width !== undefined) newStyle.width = this.snapValue(newStyle.width, state.gridSize);
        if (newStyle.height !== undefined) newStyle.height = this.snapValue(newStyle.height, state.gridSize);
      }

      if (newStyle.left !== undefined) newStyle.left = Math.max(0, newStyle.left);
      if (newStyle.top !== undefined) newStyle.top = Math.max(0, newStyle.top);

      this.canvasService.updateComponentStyle(this.component.id, newStyle);
    });

    const up = () => {
      this.isResizing = false;
      this.canvasService.recordSnapshot();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  onRotateStart(event: MouseEvent): void {
    if (this.component.locked) return;

    event.stopPropagation();
    event.preventDefault();

    this.isRotating = true;
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startAngle = Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX
    ) * (180 / Math.PI);

    const initialRotate = this.component.style.rotate || 0;

    const move = throttleFrame((e: MouseEvent) => {
      if (!this.isRotating) return;

      const currentAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      ) * (180 / Math.PI);

      let rotate = initialRotate + (currentAngle - startAngle);

      rotate = (rotate + 360) % 360;

      this.canvasService.updateComponentStyle(this.component.id, { rotate });
    });

    const up = () => {
      this.isRotating = false;
      this.canvasService.recordSnapshot();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  getResizePointCursor(point: string): string {
    const cursors: Record<string, string> = {
      lt: 'nwse-resize',
      t: 'ns-resize',
      rt: 'nesw-resize',
      r: 'ew-resize',
      rb: 'nwse-resize',
      b: 'ns-resize',
      lb: 'nesw-resize',
      l: 'ew-resize'
    };
    return cursors[point] || 'default';
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.showContextMenu = true;
  }

  get contextMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];

    if (this.component.isGroup) {
      items.push({
        label: '拆分组合',
        icon: '📂',
        handler: () => this.decomposeGroup()
      });
    }

    items.push(
      {
        label: '复制',
        icon: '📋',
        shortcut: 'Ctrl+C',
        handler: () => this.copy()
      },
      {
        label: '剪切',
        icon: '✂️',
        shortcut: 'Ctrl+X',
        handler: () => this.cut()
      },
      {
        label: '删除',
        icon: '🗑️',
        shortcut: 'Delete',
        handler: () => this.onDelete()
      },
      {
        label: '复制组件',
        icon: '📑',
        shortcut: 'Ctrl+D',
        handler: () => this.duplicate()
      },
      { divider: true, label: '', handler: () => {} },
      {
        label: this.component.locked ? '解锁' : '锁定',
        icon: this.component.locked ? '🔓' : '🔒',
        handler: () => this.toggleLock()
      },
      {
        label: this.component.display === false ? '显示' : '隐藏',
        icon: this.component.display === false ? '👁️' : '🙈',
        handler: () => this.toggleVisibility()
      }
    );

    return items;
  }

  closeContextMenu(): void {
    this.showContextMenu = false;
  }

  private copy(): void {
    this.canvasService.activateComponent(this.component.id);
    this.canvasService.copyComponents();
  }

  private cut(): void {
    this.canvasService.activateComponent(this.component.id);
    this.canvasService.cutComponents();
  }

  private duplicate(): void {
    this.canvasService.duplicateComponent(this.component.id);
  }

  private toggleLock(): void {
    this.canvasService.toggleComponentLock(this.component.id);
  }

  private toggleVisibility(): void {
    this.canvasService.toggleComponentVisibility(this.component.id);
  }

  private decomposeGroup(): void {
    if (this.component.isGroup) {
      this.canvasService.decomposeComponent(this.component.id);
    }
  }

  private snapValue(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }
}
