import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ScreensService } from '../../../state/screens.service';
import { ScreensQuery } from '../../../state/screens.query';
import { ScreenPage, UpdateScreenDto } from '@pro/sdk';
import { ComponentRegistryService } from '@pro/components';
import { CanvasComponent } from './canvas/canvas.component';
import { LayerPanelComponent } from './canvas/layer-panel/layer-panel.component';
import { RightSidebarComponent } from './right-sidebar/right-sidebar.component';
import { CanvasService } from './canvas/services/canvas.service';
import { CanvasQuery } from './canvas/services/canvas.query';
import { ComponentItem } from './models/component.model';
import { KeyboardService } from './services/keyboard.service';
import { FullscreenService } from './services/fullscreen.service';
import { ImportExportService } from './canvas/services/import-export.service';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

@Component({
  selector: 'app-screen-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasComponent, LayerPanelComponent, RightSidebarComponent],
  templateUrl: './screen-editor.component.html',
  styleUrls: ['./screen-editor.component.scss'],
  animations: [
    trigger('toastAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'translateX(100%) scale(0.8)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'translateX(0) scale(1)'
      })),
      transition('void => *', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('* => void', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ])
  ]
})
export class ScreenEditorComponent implements OnInit, OnDestroy {
  screenId: string = '';
  screen: ScreenPage | null = null;
  loading = false;
  previewMode = false;

  pageName = '';

  availableComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];
  filteredComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];
  componentCategories: Array<{ name: string; count: number; expanded: boolean }> = [];

  leftPanelCollapsed = false;
  rightPanelCollapsed = false;
  layerPanelCollapsed = false;
  searchQuery = '';
  selectedCategory = '全部';
  isDragOver = false;

  toasts: Array<ToastMessage> = [];
  private toastCounter = 0;
  private destroy$ = new Subject<void>();
  private fallbackSaveTimer?: number;
  private savingToastTimer?: ReturnType<typeof setTimeout>;

  componentData$ = this.canvasQuery.componentData$;
  selectedComponentIds$ = this.canvasQuery.selectedComponentIds$;
  showGrid$ = this.canvasQuery.showGrid$;
  snapToGrid$ = this.canvasQuery.snapToGrid$;
  showMarkLine$ = this.canvasQuery.showMarkLine$;
  darkTheme$ = this.canvasQuery.darkTheme$;
  isShowCoordinates$ = this.canvasQuery.isShowCoordinates$;

  // 新增的保存状态流
  isDirty$ = this.canvasQuery.isDirty$;
  saveStatus$ = this.canvasQuery.saveStatus$;

  // 全屏状态
  isFullscreen$ = this.fullscreenService.isFullscreen$;

  @ViewChild('editorContainer', { read: ElementRef }) editorContainer?: ElementRef<HTMLElement>;

  private readonly keyboardService = inject(KeyboardService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private screensService: ScreensService,
    private screensQuery: ScreensQuery,
    private componentRegistry: ComponentRegistryService,
    private canvasService: CanvasService,
    private canvasQuery: CanvasQuery,
    private fullscreenService: FullscreenService,
    private importExportService: ImportExportService
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id') || '';
    this.canvasService.initPage(this.screenId);

    this.loadAvailableComponents();
    this.loadScreen();
    this.setupFallbackSave();
    this.setupBeforeUnloadListener();
    this.setupSaveStatusListener();
    this.setupKeyboardShortcuts();
    this.setupFullscreenListener();
    this.keyboardService.startListening();
  }

  ngOnDestroy(): void {
    this.keyboardService.stopListening();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.fallbackSaveTimer) {
      clearInterval(this.fallbackSaveTimer);
    }
    if (this.savingToastTimer) {
      clearTimeout(this.savingToastTimer);
    }
  }

  private loadAvailableComponents(): void {
    this.availableComponents = this.componentRegistry.getAll().map(item => ({
      type: item.metadata.type,
      name: item.metadata.name,
      icon: item.metadata.icon,
      category: item.metadata.category
    }));

    this.initComponentCategories();
    this.filterComponents();
  }

  private initComponentCategories(): void {
    const categories = new Map<string, number>();

    // 统计各分类组件数量
    this.availableComponents.forEach(comp => {
      categories.set(comp.category, (categories.get(comp.category) || 0) + 1);
    });

    // 构建分类数组，包括"全部"分类
    this.componentCategories = [
      { name: '全部', count: this.availableComponents.length, expanded: true },
      ...Array.from(categories.entries())
        .filter(([name]) => name !== '全部')
        .map(([name, count]) => ({ name, count, expanded: true }))
        .sort((a, b) => a.name.localeCompare(b.name))
    ];
  }

  filterComponents(): void {
    let filtered = [...this.availableComponents];

    // 按分类过滤
    if (this.selectedCategory !== '全部') {
      filtered = filtered.filter(comp => comp.category === this.selectedCategory);
    }

    // 按搜索关键词过滤
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(comp =>
        comp.name.toLowerCase().includes(query) ||
        comp.category.toLowerCase().includes(query)
      );
    }

    this.filteredComponents = filtered;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.filterComponents();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterComponents();
  }

  toggleCategory(category: string): void {
    const cat = this.componentCategories.find(c => c.name === category);
    if (cat) {
      cat.expanded = !cat.expanded;
    }
  }

  toggleLeftPanel(): void {
    this.leftPanelCollapsed = !this.leftPanelCollapsed;
  }

  toggleRightPanel(): void {
    this.rightPanelCollapsed = !this.rightPanelCollapsed;
  }

  toggleLayerPanel(): void {
    this.layerPanelCollapsed = !this.layerPanelCollapsed;
  }

  private loadScreen(): void {
    this.loading = true;

    // 1. 先发起详情请求获取完整数据
    this.screensService.loadScreen(this.screenId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (screen) => {
          if (screen) {
            this.screen = screen;
            this.pageName = screen.name;

            // 设置CanvasService的当前屏幕名称，供KeyboardService使用
            this.canvasService.setCurrentScreenName(screen.name);

            // 2. 根据页面配置设置画布尺寸
            if (screen.layout) {
              // 直接使用像素尺寸设置画布
              const canvasWidth = screen.layout.width || 1920;
              const canvasHeight = screen.layout.height || 1080;
              this.canvasService.setCanvasSize(canvasWidth, canvasHeight);
            }

            // 3. 清空画布并加载组件
            this.canvasService.clearCanvas();

            const componentItems: ComponentItem[] = screen.components.map(comp => ({
              id: comp.id,
              type: comp.type,
              component: comp.type,
              style: {
                top: comp.position.y,
                left: comp.position.x,
                width: comp.position.width,
                height: comp.position.height,
                rotate: 0,
                zIndex: comp.position.zIndex || 1
              },
              config: comp.config || {},
              dataSource: comp.dataSource,
              locked: false,
              display: true,
              isGroup: false
            }));

            componentItems.forEach(item => {
              this.canvasService.addComponent(item);
            });

            this.loading = false;
          }
        },
        error: (err) => {
          this.loading = false;
          this.showErrorToast('加载失败', '无法加载页面详情');
          console.error('Failed to load screen:', err);
        }
      });
  }

  private setupFallbackSave(): void {
    // 5分钟兜底保存定时器
    this.fallbackSaveTimer = window.setInterval(() => {
      if (this.canvasQuery.getValue().isDirty && !this.previewMode) {
        this.canvasService.triggerImmediateSave(this.getCurrentPageName());
      }
    }, 300000); // 5分钟
  }

  private setupBeforeUnloadListener(): void {
    // 监听页面离开事件
    window.addEventListener('beforeunload', (event) => {
      if (this.canvasQuery.getValue().isDirty) {
        // 显示浏览器默认的离开提示
        event.preventDefault();
        event.returnValue = '您有未保存的更改，确定要离开吗？';
        return event.returnValue;
      }
    });
  }

  private setupSaveStatusListener(): void {
    // 监听保存状态变化
    this.canvasQuery.saveStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.handleSaveStatusChange(status);
    });
  }

  private handleSaveStatusChange(status: 'saved' | 'saving' | 'unsaved' | 'error' | 'retrying'): void {
    console.log('🔄 [ScreenEditor] 保存状态变化:', status);

    switch (status) {
      case 'saved':
        // 只在从保存中或错误状态恢复时显示成功提示
        const currentStatus = this.canvasQuery.getValue().saveStatus;
        if (currentStatus === 'saving' || currentStatus === 'error') {
          this.clearSaveToasts();
          this.showSuccessToast('保存成功', '页面已自动保存');
          console.log('✅ [ScreenEditor] 保存成功提示已显示');
        }
        break;
      case 'saving':
        // 只在长时间保存时才显示提示
        this.showSavingToastWithDelay();
        break;
      case 'error':
        // 显示更详细的保存失败提示
        this.clearSaveToasts();
        const errorInfo = this.canvasService.getErrorState();
        const userFriendlyMessage = this.canvasService.getUserFriendlyErrorMessage();

        console.error('❌ [ScreenEditor] 保存失败:', errorInfo);

        if (errorInfo?.type === 'network') {
          this.showErrorToast('网络错误', userFriendlyMessage || '网络连接异常，请检查网络后重试');
        } else if (errorInfo?.type === 'permission') {
          this.showErrorToast('权限错误', userFriendlyMessage || '权限不足，请重新登录后重试');
        } else if (errorInfo?.type === 'server') {
          this.showErrorToast('服务器错误', userFriendlyMessage || '服务器暂时不可用，请稍后重试');
        } else {
          this.showErrorToast('保存失败', userFriendlyMessage || '保存时发生未知错误，请重试');
        }
        break;
      case 'unsaved':
        // 脏数据状态，不需要特别提示
        console.log('ℹ️ [ScreenEditor] 页面有未保存的修改');
        break;
      case 'retrying':
        // 重试保存状态，显示重试提示
        this.clearSaveToasts();
        this.showToast({
          type: 'info',
          title: '正在重试保存',
          message: '网络恢复后正在重新保存...',
          persistent: true,
          duration: 0
        });
        console.log('🔄 [ScreenEditor] 重试保存提示已显示');
        break;
    }
  }

  private showSavingToast(): void {
    // 移除之前的保存中提示
    this.clearSaveToasts();
    this.showToast({
      type: 'info',
      title: '正在保存',
      message: '页面数据正在保存中...',
      persistent: true,
      duration: 0
    });
  }

  private showSavingToastWithDelay(): void {
    // 清除之前的延迟定时器
    if (this.savingToastTimer) {
      clearTimeout(this.savingToastTimer);
    }

    // 如果保存时间超过1秒才显示提示
    this.savingToastTimer = setTimeout(() => {
      this.showSavingToast();
    }, 1000);
  }

  private clearSaveToasts(): void {
    // 清除保存中提示的定时器
    if (this.savingToastTimer) {
      clearTimeout(this.savingToastTimer);
      this.savingToastTimer = undefined;
    }

    // 清除所有与保存相关的toast
    this.toasts = this.toasts.filter(toast =>
      !['正在保存', '保存成功', '保存失败'].includes(toast.title)
    );
  }

  private setupKeyboardShortcuts(): void {
    // 添加F11 全屏快捷键、Ctrl+Shift+C 坐标显示快捷键、Ctrl+Shift+E 导出、Ctrl+O 导入
    // Ctrl+S 保存快捷键已移至KeyboardService统一管理
    const keyboardShortcut = (event: KeyboardEvent) => {
      // F11 全屏
      if (event.key === 'F11') {
        event.preventDefault();
        this.toggleFullscreen();
      }

      // Ctrl+Shift+C 切换坐标显示
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        this.toggleCoordinates();
      }

      // Ctrl+Shift+E 导出
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        this.exportCanvas();
      }

      // Ctrl+O 导入
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        this.importCanvas();
      }
    };

    document.addEventListener('keydown', keyboardShortcut);

    // 确保在组件销毁时移除事件监听器
    this.destroy$.subscribe(() => {
      document.removeEventListener('keydown', keyboardShortcut);
    });
  }

  async backToList(): Promise<void> {
    if (this.canvasQuery.getValue().isDirty) {
      // 如果有未保存的更改，先保存
      this.canvasService.triggerImmediateSave(this.getCurrentPageName());
      // 等待保存完成
      await this.waitForSaveComplete();
    }
    this.router.navigate(['/screens']);
  }

  private waitForSaveComplete(): Promise<void> {
    return new Promise((resolve) => {
      const checkSaveStatus = () => {
        if (this.canvasQuery.getValue().saveStatus !== 'saving') {
          resolve();
        } else {
          setTimeout(checkSaveStatus, 100);
        }
      };
      checkSaveStatus();
    });
  }

  save(): void {
    console.log('💾 [ScreenEditor] 保存按钮被点击');

    // 检查基本条件
    if (!this.screenId) {
      console.error('❌ [ScreenEditor] screenId 为空');
      this.showErrorToast('保存失败', '页面ID缺失，无法保存');
      return;
    }

    const currentState = this.canvasQuery.getValue();
    console.log('💾 [ScreenEditor] 当前页面信息:', {
      screenId: this.screenId,
      pageName: this.getCurrentPageName(),
      isDirty: currentState.isDirty,
      saveStatus: currentState.saveStatus,
      componentCount: currentState.componentData.length,
      networkStatus: this.canvasService.getNetworkStatus()
    });

    // 检查是否有需要保存的内容
    if (!currentState.isDirty && currentState.saveStatus === 'saved') {
      console.log('ℹ️ [ScreenEditor] 页面没有修改，无需保存');
      this.showInfoToast('提示', '页面没有修改，无需保存');
      return;
    }

    // 检查网络状态
    const networkStatus = this.canvasService.getNetworkStatus();
    if (!networkStatus.isOnline) {
      console.warn('⚠️ [ScreenEditor] 网络离线，无法保存');
      this.showErrorToast('保存失败', '网络连接不可用，请检查网络后重试');
      return;
    }

    // 给用户即时反馈
    this.showInfoToast('保存中', '正在保存页面数据...');

    // 触发立即保存，包含页面名称
    this.canvasService.triggerImmediateSave(this.getCurrentPageName());
    console.log('💾 [ScreenEditor] triggerImmediateSave 已调用');
  }

  // 为CanvasService提供页面名称
  private getCurrentPageName(): string {
    return this.pageName.trim() || this.screen?.name || '未命名页面';
  }

  // 移除原有的autoSave方法，使用CanvasService的智能保存机制

  publish(): void {
    this.showWarningToast('确认发布', '正在发布页面...');

    this.screensService.publishScreen(this.screenId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccessToast('发布成功', '页面已成功发布到生产环境');
      },
      error: (error) => {
        this.showErrorToast('发布失败', error.message || '发布页面时发生错误');
      }
    });
  }

  updatePageName(): void {
    if (!this.pageName.trim()) {
      this.showErrorToast('错误', '页面名称不能为空');
      return;
    }

    // 更新CanvasService的当前屏幕名称
    this.canvasService.setCurrentScreenName(this.getCurrentPageName());

    // 触发立即保存，包含新的页面名称
    this.canvasService.triggerImmediateSave(this.getCurrentPageName());
    this.showSuccessToast('名称已更新', '页面名称正在保存...');
  }

  onComponentDragStart(event: DragEvent, comp: { type: string; name: string; icon: string; category: string }): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('componentType', comp.type);
      event.dataTransfer.setData('componentName', comp.name);

      // 创建拖拽时的预览图像
      const dragImage = event.currentTarget as HTMLElement;
      if (dragImage) {
        event.dataTransfer.setDragImage(dragImage, 50, 25);
      }
    }

    document.body.style.overflow = 'hidden';
  }

  onComponentDragEnd(event: DragEvent): void {
    document.body.style.overflow = '';
  }

  undo(): void {
    this.canvasService.undo();
  }

  redo(): void {
    this.canvasService.redo();
  }

  canUndo(): boolean {
    return this.canvasService.canUndo();
  }

  canRedo(): boolean {
    return this.canvasService.canRedo();
  }

  toggleGridLines(): void {
    this.canvasService.toggleGrid();
  }

  toggleTheme(): void {
    this.canvasService.toggleTheme();
  }

  toggleSnapToGrid(): void {
    this.canvasService.toggleSnapToGrid();
  }

  toggleMarkLine(): void {
    this.canvasService.toggleMarkLine();
  }

  toggleCoordinates(): void {
    this.canvasService.toggleCoordinates();
  }

  // Toast通知系统方法
  showToast(toast: Omit<ToastMessage, 'id'>): void {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${this.toastCounter++}`,
      duration: 4000,
      ...toast
    };

    this.toasts.push(newToast);

    // 自动移除Toast
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.removeToast(newToast.id);
      }, newToast.duration);
    }
  }

  showSuccessToast(title: string, message?: string): void {
    this.showToast({
      type: 'success',
      title,
      message
    });
  }

  showErrorToast(title: string, message?: string): void {
    this.showToast({
      type: 'error',
      title,
      message,
      duration: 6000
    });
  }

  showWarningToast(title: string, message?: string): void {
    this.showToast({
      type: 'warning',
      title,
      message
    });
  }

  showInfoToast(title: string, message?: string): void {
    this.showToast({
      type: 'info',
      title,
      message
    });
  }

  removeToast(toastId: string): void {
    const index = this.toasts.findIndex(toast => toast.id === toastId);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  clearAllToasts(): void {
    this.toasts = [];
  }

  togglePreview(): void {
    this.previewMode = !this.previewMode;
    this.canvasService.setEditMode(this.previewMode ? 'preview' : 'edit');

    if (this.previewMode) {
      this.showInfoToast('预览模式', '已进入预览模式，无法编辑组件');
    } else {
      this.showInfoToast('编辑模式', '已退出预览模式');
    }
  }

  private setupFullscreenListener(): void {
    this.fullscreenService.isFullscreen$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isFullscreen => {
      this.canvasService.setFullscreenState(isFullscreen);
    });
  }

  async toggleFullscreen(): Promise<void> {
    try {
      const element = this.editorContainer?.nativeElement;
      await this.fullscreenService.toggleFullscreen(element);
    } catch (error) {
      this.showErrorToast('全屏失败', '您的浏览器不支持全屏功能或已被禁用');
    }
  }

  exportCanvas(): void {
    const screenName = this.getCurrentPageName();
    this.importExportService.exportCanvas(screenName);
    this.showSuccessToast('导出成功', `已导出项目：${screenName}`);
  }

  importCanvas(): void {
    if (this.canvasQuery.getValue().isDirty) {
      const confirmed = confirm('当前有未保存的更改，导入新项目将丢失这些更改。是否继续？');
      if (!confirmed) {
        return;
      }
    }

    this.importExportService.importCanvas(
      () => {
        this.showSuccessToast('导入成功', '项目已成功导入');
        this.canvasService.recordSnapshot();
      },
      (error: string) => {
        this.showErrorToast('导入失败', error);
      }
    );
  }
}
