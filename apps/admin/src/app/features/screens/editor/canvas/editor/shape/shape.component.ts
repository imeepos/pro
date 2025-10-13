import { Component, Input, HostListener, ElementRef, OnInit, OnDestroy, ErrorHandler, ViewChild, AfterViewInit, ComponentRef, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CanvasService } from '../../services/canvas.service';
import { CanvasQuery } from '../../services/canvas.query';
import { RulerGridService } from '../../services/ruler-grid.service';
import { ErrorBoundaryService } from '../../services/error-boundary.service';
import { ComponentEventHandlerService } from '../../../services/component-event-handler.service';
import { ComponentRegistryService } from '@pro/components';
import { ComponentHostDirective } from '../../../component-host.directive';
import { ComponentItem, ComponentStyle, Point, ComponentErrorInfo } from '../../../models/component.model';
import { throttleFrame } from '../../../utils/throttle.util';
import { GeometryUtil } from '../../../utils/geometry.util';
import { ContextMenuComponent, MenuItem } from '../context-menu/context-menu.component';

@Component({
  selector: 'app-shape',
  standalone: true,
  imports: [CommonModule, ContextMenuComponent, ComponentHostDirective],
  templateUrl: './shape.component.html',
  styleUrls: ['./shape.component.scss']
})
export class ShapeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(ComponentHostDirective, { static: false }) componentHost!: ComponentHostDirective;
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
  showErrorDetails = false;

  private componentRef: ComponentRef<any> | null = null;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery,
    private rulerGridService: RulerGridService,
    private errorBoundary: ErrorBoundaryService,
    private elementRef: ElementRef,
    private eventHandler: ComponentEventHandlerService,
    private componentRegistry: ComponentRegistryService
  ) {}

  isSelected = false;
  isShowCoordinates = false;
  isEditMode = true; // 默认为编辑模式

  ngOnInit(): void {
    try {
      this.query.activeComponentId$.pipe(takeUntil(this.destroy$)).subscribe((activeId) => {
        this.isActive = activeId === this.component.id;
      });

      this.query.selectedComponentIds$.pipe(takeUntil(this.destroy$)).subscribe((selectedIds) => {
        this.isSelected = selectedIds.includes(this.component.id);
      });

      this.query.isShowCoordinates$.pipe(takeUntil(this.destroy$)).subscribe((show) => {
        this.isShowCoordinates = show;
      });

      // 订阅编辑模式状态
      this.query.editMode$.pipe(takeUntil(this.destroy$)).subscribe((mode) => {
        this.isEditMode = mode === 'edit';
        console.log('[ShapeComponent] 编辑模式变化', {
          componentId: this.component.id,
          componentType: this.component.type,
          editMode: mode,
          isEditMode: this.isEditMode
        });
      });

      this.validateComponent();
    } catch (error) {
      this.captureInitError(error);
    }
  }

  private validateComponent(): void {
    try {
      if (!this.component || !this.component.type) {
        this.setRenderError('组件类型无效', 'init');
        return;
      }

      if (!this.component.style) {
        this.setRenderError('组件样式缺失', 'init');
        return;
      }

      if (this.component.hasError) {
        this.hasRenderError = true;
        this.errorMessage = this.component.errorInfo?.message || '组件存在错误';
      } else {
        this.hasRenderError = false;
        this.errorMessage = '';
      }
    } catch (error) {
      this.setRenderError(
        error instanceof Error ? error.message : '未知错误',
        'init'
      );
    }
  }

  private captureInitError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorInfo = this.errorBoundary.captureError(this.component, err, 'init');

    this.hasRenderError = true;
    this.errorMessage = errorInfo.message;

    this.canvasService.updateComponent(this.component.id, {
      hasError: true,
      errorInfo
    });
  }

  private setRenderError(message: string, phase: ComponentErrorInfo['phase']): void {
    this.hasRenderError = true;
    this.errorMessage = message;

    const error = new Error(message);
    const errorInfo = this.errorBoundary.captureError(this.component, error, phase);

    this.canvasService.updateComponent(this.component.id, {
      hasError: true,
      errorInfo
    });
  }

  retryRender(): void {
    this.errorBoundary.clearError(this.component.id);
    this.hasRenderError = false;
    this.errorMessage = '';
    this.showErrorDetails = false;

    this.canvasService.updateComponent(this.component.id, {
      hasError: false,
      errorInfo: undefined
    });

    this.validateComponent();

    if (!this.hasRenderError) {
      this.createComponent();
    }
  }

  toggleErrorDetails(): void {
    this.showErrorDetails = !this.showErrorDetails;
  }

  getErrorPhaseText(phase: ComponentErrorInfo['phase']): string {
    const phaseMap: Record<ComponentErrorInfo['phase'], string> = {
      init: '初始化',
      render: '渲染',
      data: '数据处理',
      unknown: '未知'
    };
    return phaseMap[phase] || '未知';
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 从注册表中获取组件类
   */
  getComponentClass(): Type<any> | undefined {
    return this.componentRegistry.get(this.component.type);
  }

  /**
   * 获取组件配置参数
   */
  getComponentInputs(): Record<string, any> {
    return this.component.config || {};
  }

  /**
   * 动态创建组件实例
   */
  ngAfterViewInit(): void {
    // 如果已有渲染错误，跳过组件创建
    if (this.hasRenderError) {
      return;
    }

    // 使用更稳健的重试机制创建组件
    this.retryCreateComponent(0);
  }

  /**
   * 带重试机制的组件创建
   */
  private retryCreateComponent(attemptCount: number): void {
    // 最多重试5次
    if (attemptCount >= 5) {
      console.error('[ShapeComponent] 组件容器初始化超时，已重试5次', {
        componentId: this.component.id,
        componentType: this.component.type
      });
      this.setRenderError('组件容器初始化超时，请刷新页面重试', 'render');
      return;
    }

    // 检查 componentHost 是否已初始化
    if (!this.componentHost) {
      console.warn(`[ShapeComponent] componentHost 未初始化，第 ${attemptCount + 1} 次重试`, {
        componentId: this.component.id,
        componentType: this.component.type
      });

      // 递增延迟重试：50ms * (attemptCount + 1)
      const delay = 50 * (attemptCount + 1);
      setTimeout(() => {
        if (!this.hasRenderError) {
          this.retryCreateComponent(attemptCount + 1);
        }
      }, delay);
      return;
    }

    // componentHost 已就绪，创建组件
    this.createComponent();
  }

  private createComponent(): void {
    console.log('[ShapeComponent] createComponent 开始', {
      componentId: this.component.id,
      componentType: this.component.type,
      hasComponentHost: !!this.componentHost,
      hasViewContainer: !!this.componentHost?.viewContainerRef
    });

    const componentClass = this.getComponentClass();
    console.log('[ShapeComponent] 获取组件类', {
      componentType: this.component.type,
      hasComponentClass: !!componentClass,
      componentClassName: componentClass?.name
    });

    if (!componentClass) {
      console.error('[ShapeComponent] 组件类未找到', {
        componentType: this.component.type,
        registeredComponents: this.componentRegistry.getAll().map(c => c.type)
      });
      this.setRenderError(`组件类型 "${this.component.type}" 未注册`, 'render');
      return;
    }

    // 验证组件类的完整性
    if (!this.validateComponentClass(componentClass)) {
      console.error('[ShapeComponent] 组件类验证失败', {
        componentType: this.component.type,
        componentClass: componentClass?.name,
        isStandalone: (componentClass as any)?.ɵcmp?.standalone,
        hasFactory: !!(componentClass as any)?.ɵfac
      });
      this.setRenderError(`组件类 "${this.component.type}" 不是有效的 Angular 组件`, 'render');
      return;
    }

    try {
      // 优雅地检查 componentHost 是否已初始化
      if (!this.componentHost) {
        console.error('[ShapeComponent] componentHost 未初始化');
        this.setRenderError('组件容器未初始化，请稍后重试', 'render');
        return;
      }

      // 检查 viewContainerRef 是否可用
      if (!this.componentHost.viewContainerRef) {
        console.error('[ShapeComponent] viewContainerRef 未准备就绪');
        this.setRenderError('组件视图容器未准备就绪，请稍后重试', 'render');
        return;
      }

      const viewContainerRef = this.componentHost.viewContainerRef;
      console.log('[ShapeComponent] 清理现有组件');
      viewContainerRef.clear();

      console.log('[ShapeComponent] 创建组件实例', {
        componentType: this.component.type,
        componentClass: componentClass.name
      });

      // 异步组件创建过程
      this.createComponentAsync(viewContainerRef, componentClass)
        .then(componentRef => {
          if (!componentRef) {
            console.error('[ShapeComponent] 组件创建返回 null');
            this.setRenderError(`组件 "${this.component.type}" 创建失败`, 'render');
            return;
          }

          this.componentRef = componentRef;
          this.applyComponentInputs();
        })
        .catch(error => {
          this.handleComponentCreationError(error, componentClass);
        });

    } catch (error) {
      this.handleComponentCreationError(error, componentClass);
    }
  }

  /**
   * 验证组件类的完整性
   */
  private validateComponentClass(componentClass: any): boolean {
    try {
      // 检查是否为有效的 Angular 组件类
      if (!componentClass || typeof componentClass !== 'function') {
        return false;
      }

      // 检查组件是否有 Angular 的元数据
      const hasComponentMetadata = componentClass.ɵcmp || componentClass.decorators;
      if (!hasComponentMetadata) {
        console.warn('[ShapeComponent] 组件缺少 Angular 元数据', {
          componentType: this.component.type,
          componentClass: componentClass.name
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ShapeComponent] 组件类验证异常', error);
      return false;
    }
  }

  /**
   * 异步组件创建，优雅处理重试逻辑
   */
  private async createComponentAsync(viewContainerRef: any, componentClass: any): Promise<any> {
    const maxRetries = 3;

    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
      try {
        return viewContainerRef.createComponent(componentClass);
      } catch (error) {
        const isRetryableError = error instanceof Error && error.message.includes('NG0203');
        const isLastAttempt = retryCount === maxRetries;

        if (!isRetryableError || isLastAttempt) {
          throw error;
        }

        console.warn(`[ShapeComponent] NG0203 错误，第 ${retryCount + 1} 次重试`, {
          componentType: this.component.type,
          error: error.message
        });

        // 渐进式延迟重试
        await this.delay(100 * (retryCount + 1));
      }
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 应用组件输入并完成初始化
   */
  private applyComponentInputs(): void {
    if (!this.componentRef) return;

    console.log('[ShapeComponent] 组件实例创建成功', {
      hasComponentRef: !!this.componentRef,
      componentRefType: this.componentRef?.instance?.constructor?.name
    });

    const inputs = this.getComponentInputs();
    console.log('[ShapeComponent] 设置组件输入', {
      inputs,
      inputKeys: Object.keys(inputs)
    });

    Object.entries(inputs).forEach(([key, value]) => {
      if (this.componentRef) {
        console.log(`[ShapeComponent] 设置输入 ${key}:`, value);
        this.componentRef.setInput(key, value);
      }
    });

    console.log('[ShapeComponent] 触发变更检测');
    this.componentRef.changeDetectorRef.detectChanges();
    console.log('[ShapeComponent] 组件创建完成');
  }

  /**
   * 处理组件创建错误
   */
  private handleComponentCreationError(error: any, componentClass: any): void {
    let errorMessage = '组件创建失败';
    let errorDetails = '';

    if (error instanceof Error) {
      if (error.message.includes('NG0203')) {
        errorMessage = '动态组件创建失败 (NG0203)';
        errorDetails = '可能是由于生产构建时的代码压缩导致，请检查组件注册';
      } else if (error.message.includes('NG0201')) {
        errorMessage = '组件类型错误 (NG0201)';
        errorDetails = '组件不是有效的 Angular 组件';
      } else {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      }
    }

    console.error(`[ShapeComponent] 创建组件失败 (${this.component.type}):`, {
      error: errorMessage,
      errorType: typeof error,
      stack: errorDetails,
      componentId: this.component.id,
      componentType: this.component.type,
      componentClass: componentClass?.name,
      angularVersion: '17+',
      isProduction: !!(window as any)['ng']?.getInjector,
      registeredComponents: this.componentRegistry.getAll().map(c => c.type)
    });

    this.setRenderError(errorMessage, 'render');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
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

    // 在预览模式下触发点击事件
    if (this.eventHandler.getIsPreviewMode()) {
      this.eventHandler.handleComponentClick(this.component, event);
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

      const shouldSnap = this.rulerGridService.getState().snapToGrid && !e.shiftKey;

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
        newLeft = this.rulerGridService.snapToGridPosition(newLeft);
        newTop = this.rulerGridService.snapToGridPosition(newTop);
      }

      newLeft = Math.max(0, newLeft);
      newTop = Math.max(0, newTop);

      // 计算最终位置，先处理吸附，再统一更新
      let finalStyle = { left: newLeft, top: newTop };

      if (this.editor) {
        // 创建包含新位置的临时组件对象，用于对齐计算
        const dragComponent = {
          ...this.component,
          style: {
            ...this.component.style,
            left: newLeft,
            top: newTop
          }
        };

        const snapStyle = this.editor.showMarkLine(dragComponent);
        if (snapStyle) {
          // 吸附样式与计算的位置合并
          finalStyle = { ...finalStyle, ...snapStyle };
        }
      }

      this.canvasService.updateComponentStyle(this.component.id, finalStyle);
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
        if (newStyle.left !== undefined) newStyle.left = this.rulerGridService.snapToGridPosition(newStyle.left);
        if (newStyle.top !== undefined) newStyle.top = this.rulerGridService.snapToGridPosition(newStyle.top);
        if (newStyle.width !== undefined) newStyle.width = this.rulerGridService.snapToGridPosition(newStyle.width);
        if (newStyle.height !== undefined) newStyle.height = this.rulerGridService.snapToGridPosition(newStyle.height);
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

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent): void {
    if (this.eventHandler.getIsPreviewMode()) {
      this.eventHandler.handleComponentHover(this.component, event);
    }
  }

  @HostListener('mouseleave', ['$event'])
  onMouseLeave(event: MouseEvent): void {
    if (this.eventHandler.getIsPreviewMode()) {
      this.eventHandler.handleComponentLeave(this.component, event);
    }
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
}
