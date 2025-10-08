import { Component, OnInit, OnDestroy, ViewContainerRef, ViewChild, ComponentRef, createComponent, EnvironmentInjector, QueryList, ViewChildren, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { GridsterModule, GridsterConfig, GridsterItem } from 'angular-gridster2';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ScreensService } from '../../../state/screens.service';
import { ScreensQuery } from '../../../state/screens.query';
import { ScreenPage, UpdateScreenDto } from '../../../core/services/screen-api.service';
import { ComponentRegistryService } from '../../../core/services/component-registry.service';
import { ComponentHostDirective } from './component-host.directive';

interface ScreenGridsterItem extends GridsterItem {
  id?: string;
  type?: string;
  componentRef?: ComponentRef<any>;
}

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
  imports: [CommonModule, FormsModule, GridsterModule, DragDropModule, ComponentHostDirective],
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
export class ScreenEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(ComponentHostDirective) componentHosts!: QueryList<ComponentHostDirective>;
  screenId: string = '';
  screen: ScreenPage | null = null;
  loading = false;
  saving = false;
  autoSaving = false;
  previewMode = false;
previewDevice: 'desktop' | 'tablet' | 'mobile' = 'desktop';
realPreviewMode = false;

  pageName = '';
  canvasCols = 24;
  canvasRows = 24;

  gridsterOptions: GridsterConfig = {};
  gridsterItems: Array<ScreenGridsterItem> = [];

  availableComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];
  filteredComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];
  componentCategories: Array<{ name: string; count: number; expanded: boolean }> = [];

  // UI状态
  leftPanelCollapsed = false;
  rightPanelCollapsed = false;
  selectedComponentType = '';
  searchQuery = '';
  selectedCategory = '全部';
  showGridLines = true;

  // 历史记录（撤销重做）
  private history: Array<Array<ScreenGridsterItem>> = [];
  private historyIndex = -1;
  private maxHistorySize = 50;

  // Toast通知系统
  toasts: Array<ToastMessage> = [];
  private toastCounter = 0;

  private destroy$ = new Subject<void>();
  private autoSaveTimer?: number;
  private componentCounter = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private screensService: ScreensService,
    private screensQuery: ScreensQuery,
    private componentRegistry: ComponentRegistryService,
    private environmentInjector: EnvironmentInjector
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id') || '';

    this.loadAvailableComponents();
    this.initGridsterOptions();
    this.loadScreen();
    this.setupAutoSave();
  }

  ngAfterViewInit(): void {
    this.componentHosts.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.renderAllComponents();
    });
  }

  ngOnDestroy(): void {
    this.gridsterItems.forEach(item => {
      if (item.componentRef) {
        item.componentRef.destroy();
      }
    });
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

  selectComponent(item: ScreenGridsterItem): void {
    this.selectedComponentType = item.id || '';
  }

  private initGridsterOptions(): void {
    this.gridsterOptions = {
      gridType: 'fixed',
      displayGrid: this.showGridLines ? 'always' : 'none',
      pushItems: true,
      draggable: {
        enabled: !this.previewMode
      },
      resizable: {
        enabled: !this.previewMode
      },
      minCols: this.canvasCols,
      maxCols: this.canvasCols,
      minRows: this.canvasRows,
      maxRows: this.canvasRows,
      fixedColWidth: 80,
      fixedRowHeight: 60,
      margin: 10,
      itemChangeCallback: (item: GridsterItem) => {
        this.onGridsterItemChange(item);
      }
    };
  }

  private loadScreen(): void {
    this.loading = true;
    this.screensQuery.selectEntity(this.screenId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(screen => {
        if (screen) {
          this.screen = screen;
          this.pageName = screen.name;
          this.canvasCols = screen.layout.cols;
          this.canvasRows = screen.layout.rows;

          this.gridsterItems = screen.components.map(comp => ({
            x: comp.position.x,
            y: comp.position.y,
            cols: comp.position.width,
            rows: comp.position.height,
            id: comp.id,
            type: comp.type
          }));

          // 初始化历史记录
          this.history = [JSON.parse(JSON.stringify(this.gridsterItems))];
          this.historyIndex = 0;

          this.loading = false;

          setTimeout(() => {
            this.renderAllComponents();
          }, 100);
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
    const dto: UpdateScreenDto = {
      name: this.pageName,
      layout: {
        cols: this.canvasCols,
        rows: this.canvasRows
      },
      components: this.gridsterItems.map(item => ({
        id: item.id || '',
        type: item.type || '',
        position: {
          x: item.x || 0,
          y: item.y || 0,
          width: item.cols || 1,
          height: item.rows || 1,
          zIndex: 1
        },
        config: {}
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
    const dto: UpdateScreenDto = {
      layout: {
        cols: this.canvasCols,
        rows: this.canvasRows
      },
      components: this.gridsterItems.map(item => ({
        id: item.id || '',
        type: item.type || '',
        position: {
          x: item.x || 0,
          y: item.y || 0,
          width: item.cols || 1,
          height: item.rows || 1,
          zIndex: 1
        },
        config: {}
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

  updateCanvasGrid(): void {
    if (this.gridsterOptions.api) {
      this.gridsterOptions.minCols = this.canvasCols;
      this.gridsterOptions.maxCols = this.canvasCols;
      this.gridsterOptions.minRows = this.canvasRows;
      this.gridsterOptions.maxRows = this.canvasRows;
      this.gridsterOptions.api.optionsChanged!();
    }
  }

  onComponentDrop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const componentType = event.item.data;
    this.addComponentToCanvas(componentType);
  }

  private addComponentToCanvas(componentType: string): void {
    this.componentCounter++;
    const newItem: ScreenGridsterItem = {
      x: 0,
      y: 0,
      cols: 4,
      rows: 3,
      id: `comp-${Date.now()}-${this.componentCounter}`,
      type: componentType
    };

    this.gridsterItems.push(newItem);
    this.saveToHistory();
  }

  private renderAllComponents(): void {
    const hostsArray = this.componentHosts.toArray();

    this.gridsterItems.forEach((item, index) => {
      if (index < hostsArray.length && !item.componentRef) {
        const host = hostsArray[index];
        this.renderComponentInHost(item, host.viewContainerRef);
      }
    });
  }

  private renderComponentInHost(item: ScreenGridsterItem, viewContainerRef: ViewContainerRef): void {
    if (!item.type) return;

    const componentClass = this.componentRegistry.get(item.type);
    if (!componentClass) {
      console.error(`组件类型未找到: ${item.type}`);
      return;
    }

    viewContainerRef.clear();
    const componentRef = viewContainerRef.createComponent(componentClass);
    item.componentRef = componentRef;
  }

  removeComponent(item: ScreenGridsterItem): void {
    if (item.componentRef) {
      item.componentRef.destroy();
    }

    const index = this.gridsterItems.indexOf(item);
    if (index > -1) {
      this.gridsterItems.splice(index, 1);
      this.saveToHistory();
    }
  }

  private onGridsterItemChange(item: GridsterItem): void {
    this.saveToHistory();
  }

  // 撤销重做功能
  private saveToHistory(): void {
    // 删除当前索引之后的历史记录
    this.history = this.history.slice(0, this.historyIndex + 1);

    // 添加新的历史记录
    this.history.push(JSON.parse(JSON.stringify(this.gridsterItems)));

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): void {
    if (this.canUndo()) {
      this.historyIndex--;
      this.gridsterItems = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      setTimeout(() => this.renderAllComponents(), 100);
    }
  }

  redo(): void {
    if (this.canRedo()) {
      this.historyIndex++;
      this.gridsterItems = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      setTimeout(() => this.renderAllComponents(), 100);
    }
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  toggleGridLines(): void {
    this.showGridLines = !this.showGridLines;
    this.gridsterOptions.displayGrid = this.showGridLines ? 'always' : 'none';
    if (this.gridsterOptions.api) {
      this.gridsterOptions.api.optionsChanged!();
    }
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

  // 预览功能
  readonly previewDevices = [
    { id: 'desktop', name: '桌面', width: '100%', height: '100%', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'tablet', name: '平板', width: '768px', height: '1024px', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'mobile', name: '手机', width: '375px', height: '667px', icon: 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' }
  ];

  togglePreview(): void {
    this.previewMode = !this.previewMode;

    if (this.previewMode) {
      this.showInfoToast('预览模式', '已进入预览模式，无法编辑组件');
    } else {
      this.previewDevice = 'desktop';
      this.realPreviewMode = false;
      this.showInfoToast('编辑模式', '已退出预览模式');
    }

    this.updateGridsterForPreview();
  }

  setPreviewDevice(device: 'desktop' | 'tablet' | 'mobile'): void {
    this.previewDevice = device;
    this.showInfoToast('设备切换', `已切换到${this.getDeviceName(device)}预览`);
  }

  toggleRealPreview(): void {
    this.realPreviewMode = !this.realPreviewMode;

    if (this.realPreviewMode) {
      this.showInfoToast('真实预览', '已开启真实预览模式');
    } else {
      this.showInfoToast('普通预览', '已切换回普通预览模式');
    }
  }

  private getDeviceName(device: string): string {
    const deviceConfig = this.previewDevices.find(d => d.id === device);
    return deviceConfig?.name || '未知设备';
  }

  private getPreviewDeviceStyle(): any {
    if (this.previewMode && this.previewDevice !== 'desktop') {
      const device = this.previewDevices.find(d => d.id === this.previewDevice);
      if (device) {
        return {
          width: device.width,
          height: device.height,
          maxWidth: '90vw',
          maxHeight: '90vh',
          margin: '0 auto',
          border: this.realPreviewMode ? 'none' : '2px solid #e5e7eb',
          borderRadius: this.realPreviewMode ? '0' : '12px',
          overflow: 'hidden',
          boxShadow: this.realPreviewMode ? 'none' : '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          background: this.realPreviewMode ? 'white' : '#1f2937'
        };
      }
    }
    return {};
  }

  private updateGridsterForPreview(): void {
    this.gridsterOptions.draggable!.enabled = !this.previewMode;
    this.gridsterOptions.resizable!.enabled = !this.previewMode;

    if (this.gridsterOptions.api) {
      this.gridsterOptions.api.optionsChanged!();
    }
  }
}
