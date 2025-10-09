import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ComponentItem } from '../models/component.model';
import { StyleEditorComponent } from './style-module/style-editor.component';
import { AttrEditorComponent } from './attr-module/attr-editor.component';
import { CanvasConfigPanelComponent } from '../canvas/config-panel/canvas-config-panel.component';
import { CanvasQuery } from '../canvas/services/canvas.query';
import { DataModuleComponent } from '../data-module/data-module.component';
import { DataPluginInitializerService } from '../data-plugins/data-plugin-initializer.service';
import { EventConfigPanelComponent } from './event-module/event-config-panel.component';

// 注意：由于Flowbite Angular API可能不兼容，我们使用原生HTML+Tailwind CSS实现
// 这样可以更好地控制样式和交互效果

type TabType = 'style' | 'attr' | 'data' | 'event' | 'canvas';

// 标签页状态接口
interface TabState {
  hasChanges: boolean;
  hasErrors: boolean;
  lastModified?: Date;
}

// 标签页数据接口
interface TabData {
  key: TabType;
  label: string;
  icon: string;
  showWhenActive: boolean;
  tooltip?: string;
}

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    // 内部组件
    StyleEditorComponent,
    AttrEditorComponent,
    CanvasConfigPanelComponent,
    DataModuleComponent,
    EventConfigPanelComponent
  ],
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  // 组件状态
  activeComponent: ComponentItem | null = null;
  activeTab: TabType = 'attr';

  // 标签页状态管理
  tabStates: Record<TabType, TabState> = {
    style: { hasChanges: false, hasErrors: false },
    attr: { hasChanges: false, hasErrors: false },
    data: { hasChanges: false, hasErrors: false },
    event: { hasChanges: false, hasErrors: false },
    canvas: { hasChanges: false, hasErrors: false }
  };

  private destroy$ = new Subject<void>();

  // 标签页配置
  tabs: TabData[] = [
    {
      key: 'style',
      label: '样式',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      showWhenActive: true,
      tooltip: '编辑组件样式属性'
    },
    {
      key: 'attr',
      label: '属性',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      showWhenActive: true,
      tooltip: '编辑组件基本属性'
    },
    {
      key: 'data',
      label: '数据',
      icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      showWhenActive: true,
      tooltip: '管理组件数据绑定'
    },
    {
      key: 'event',
      label: '事件',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      showWhenActive: true,
      tooltip: '配置组件事件处理'
    },
    {
      key: 'canvas',
      label: '画布',
      icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 15a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z',
      showWhenActive: false,
      tooltip: '画布全局设置'
    }
  ];

  constructor(
    private canvasQuery: CanvasQuery,
    private dataPluginInitializer: DataPluginInitializerService
  ) {}

  ngOnInit(): void {
    this.canvasQuery.activeComponent$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(component => {
      this.activeComponent = component || null;
      this.onComponentChange(component || null);
    });

    // 初始化标签页状态
    this.initializeTabStates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 获取可见的标签页
  get visibleTabs(): TabData[] {
    return this.activeComponent
      ? this.tabs.filter(t => t.showWhenActive)
      : this.tabs.filter(t => !t.showWhenActive);
  }

  // 标签页切换事件处理
  onTabChange(tabKey: string): void {
    const newTab = tabKey as TabType;
    if (newTab !== this.activeTab) {
      this.activeTab = newTab;
      this.markTabAsVisited(newTab);
    }
  }

  // 获取标签页工具提示
  getTabTooltip(tabKey: TabType): string {
    const tab = this.tabs.find(t => t.key === tabKey);
    const state = this.tabStates[tabKey];
    let tooltip = tab?.tooltip || tab?.label || '';

    if (state.hasChanges) {
      tooltip += ' (有未保存的更改)';
    }
    if (state.hasErrors) {
      tooltip += ' (存在错误)';
    }

    return tooltip;
  }

  // 切换折叠状态
  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  // 展开并设置特定标签页
  expandAndSetTab(tab: TabType): void {
    this.collapsed = false;
    this.activeTab = tab;
    this.collapsedChange.emit(false);
    this.markTabAsVisited(tab);
  }

  // 标记标签页状态为已更改
  markTabAsChanged(tabKey: TabType, hasErrors = false): void {
    this.tabStates[tabKey] = {
      ...this.tabStates[tabKey],
      hasChanges: true,
      hasErrors,
      lastModified: new Date()
    };
  }

  // 标记标签页状态为已保存
  markTabAsSaved(tabKey: TabType): void {
    this.tabStates[tabKey] = {
      hasChanges: false,
      hasErrors: false
    };
  }

  // 检查是否有未保存的更改
  hasUnsavedChanges(): boolean {
    return Object.values(this.tabStates).some(state => state.hasChanges);
  }

  // 获取所有未保存的标签页
  getUnsavedTabs(): TabType[] {
    return Object.entries(this.tabStates)
      .filter(([_, state]) => state.hasChanges)
      .map(([key, _]) => key as TabType);
  }

  // 重置所有标签页状态
  resetAllTabStates(): void {
    Object.keys(this.tabStates).forEach(key => {
      this.markTabAsSaved(key as TabType);
    });
  }

  // 组件变更处理
  private onComponentChange(component: ComponentItem | null): void {
    // 根据组件状态调整标签页
    if (component && this.activeTab === 'canvas') {
      this.activeTab = 'attr';
    } else if (!component && this.activeTab !== 'canvas') {
      this.activeTab = 'canvas';
    }

    // 重置标签页状态（组件切换时通常需要重置状态）
    if (component) {
      this.resetTabStatesForComponent();
    }
  }

  // 初始化标签页状态
  private initializeTabStates(): void {
    // 这里可以根据需要初始化一些默认状态
    this.tabStates.canvas.hasChanges = false;
  }

  // 标记标签页为已访问
  private markTabAsVisited(tabKey: TabType): void {
    // 可以用于统计或用户体验优化
  }

  // 为组件切换重置标签页状态
  private resetTabStatesForComponent(): void {
    // 重置与组件相关的标签页状态
    ['style', 'attr', 'data', 'event'].forEach(key => {
      this.markTabAsSaved(key as TabType);
    });
  }
}
