import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, CdkDragStart, CdkDragEnd } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ScreensService } from '../../../state/screens.service';
import { ScreensQuery } from '../../../state/screens.query';
import { ScreenPage, UpdateScreenDto } from '../../../core/services/screen-api.service';
import { ComponentRegistryService } from '../../../core/services/component-registry.service';
import { CanvasComponent } from './canvas/canvas.component';
import { CanvasService } from './canvas/services/canvas.service';
import { CanvasQuery } from './canvas/services/canvas.query';
import { ComponentItem } from './models/component.model';

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
  imports: [CommonModule, FormsModule, DragDropModule, CanvasComponent],
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
  saving = false;
  autoSaving = false;
  previewMode = false;

  pageName = '';

  availableComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];
  filteredComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];
  componentCategories: Array<{ name: string; count: number; expanded: boolean }> = [];

  leftPanelCollapsed = false;
  rightPanelCollapsed = false;
  searchQuery = '';
  selectedCategory = '全部';
  isDragOver = false;

  toasts: Array<ToastMessage> = [];
  private toastCounter = 0;
  private destroy$ = new Subject<void>();
  private autoSaveTimer?: number;

  componentData$ = this.canvasQuery.componentData$;
  selectedComponentIds$ = this.canvasQuery.selectedComponentIds$;
  showGrid$ = this.canvasQuery.showGrid$;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private screensService: ScreensService,
    private screensQuery: ScreensQuery,
    private componentRegistry: ComponentRegistryService,
    private canvasService: CanvasService,
    private canvasQuery: CanvasQuery
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id') || '';
    this.canvasService.initPage(this.screenId);

    this.loadAvailableComponents();
    this.loadScreen();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
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

  private loadScreen(): void {
    this.loading = true;
    this.screensQuery.selectEntity(this.screenId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(screen => {
        if (screen) {
          this.screen = screen;
          this.pageName = screen.name;

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
            config: comp.config || {}
          }));

          componentItems.forEach(item => {
            this.canvasService.addComponent(item);
          });

          this.loading = false;
        }
      });

    this.screensService.loadScreens().subscribe();
  }

  private setupAutoSave(): void {
    this.autoSaveTimer = window.setInterval(() => {
      if (!this.saving && !this.previewMode) {
        this.autoSave();
      }
    }, 30000);
  }

  backToList(): void {
    this.router.navigate(['/screens']);
  }

  save(): void {
    if (this.saving) return;

    this.saving = true;
    const components = this.canvasQuery.getValue().componentData;

    const dto: UpdateScreenDto = {
      name: this.pageName,
      layout: {
        cols: 24,
        rows: 24
      },
      components: components.map(item => ({
        id: item.id,
        type: item.type,
        position: {
          x: Math.round(item.style.left),
          y: Math.round(item.style.top),
          width: Math.round(item.style.width),
          height: Math.round(item.style.height),
          zIndex: item.style.zIndex || 1
        },
        config: item.config
      }))
    };

    this.screensService.updateScreen(this.screenId, dto).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccessToast('保存成功', '页面已成功保存');
      },
      error: (error) => {
        this.saving = false;
        this.showErrorToast('保存失败', error.message || '保存页面时发生错误');
      }
    });
  }

  private autoSave(): void {
    if (!this.screen) return;

    this.autoSaving = true;
    const components = this.canvasQuery.getValue().componentData;

    const dto: UpdateScreenDto = {
      layout: {
        cols: 24,
        rows: 24
      },
      components: components.map(item => ({
        id: item.id,
        type: item.type,
        position: {
          x: Math.round(item.style.left),
          y: Math.round(item.style.top),
          width: Math.round(item.style.width),
          height: Math.round(item.style.height),
          zIndex: item.style.zIndex || 1
        },
        config: item.config
      }))
    };

    this.screensService.updateScreen(this.screenId, dto).subscribe({
      next: () => {
        this.autoSaving = false;
      },
      error: () => {
        this.autoSaving = false;
      }
    });
  }

  publish(): void {
    this.showWarningToast('确认发布', '正在发布页面...');

    this.screensService.publishScreen(this.screenId).subscribe({
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

    const dto: UpdateScreenDto = {
      name: this.pageName
    };

    this.screensService.updateScreen(this.screenId, dto).subscribe({
      next: () => {
        this.showSuccessToast('名称已更新', '页面名称已成功更新');
      },
      error: (error) => {
        this.showErrorToast('更新失败', error.message || '更新页面名称时发生错误');
      }
    });
  }

  onDragStarted(event: CdkDragStart): void {
    document.body.style.overflow = 'hidden';
  }

  onDragEnded(event: CdkDragEnd): void {
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
}
