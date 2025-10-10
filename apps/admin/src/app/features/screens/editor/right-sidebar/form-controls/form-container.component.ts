import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormMetadata, FormChangeEvent } from '../../models/form-metadata.model';
import { FormItemComponent } from './form-item.component';
import { FLOWBITE_CONTROLS } from '../flowbite-controls';

@Component({
  selector: 'app-form-container',
  standalone: true,
  imports: [CommonModule, FormItemComponent, ...FLOWBITE_CONTROLS],
  template: `
    <div class="form-container space-y-4">
      <!-- 顶级表单项（非分组） -->
      <ng-container *ngFor="let item of config">
        <!-- 分组项目 - 使用增强的Flowbite Card/Accordion -->
        <div *ngIf="isItemGroup(item)" class="flowbite-accordion">
          <div class="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
            <!-- Card Header -->
            <button
              (click)="toggleGroup(getItemKey(item))"
              class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              [attr.aria-expanded]="isGroupExpanded(getItemKey(item))"
              [attr.aria-controls]="'group-content-' + getItemKey(item)"
            >
              <div class="flex items-center space-x-3">
                <!-- 展开图标 -->
                <div class="flex-shrink-0">
                  <svg
                    [class]="'w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ' + (isGroupExpanded(getItemKey(item)) ? 'rotate-90' : '')"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>

                <!-- 分组图标和标题 -->
                <div class="flex items-center space-x-3 flex-1">
                  <!-- 根据分组类型显示不同图标 -->
                  <div class="flex-shrink-0">
                    <!-- 基础属性图标 -->
                    <svg *ngIf="getItemKey(item) === 'common'" class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                    </svg>
                    <!-- 配置属性图标 -->
                    <svg *ngIf="getItemKey(item) === 'config'" class="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                    </svg>
                    <!-- 默认图标 -->
                    <svg *ngIf="getItemKey(item) !== 'common' && getItemKey(item) !== 'config'" class="w-5 h-5 text-purple-500 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                    </svg>
                  </div>

                  <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {{ item.label }}
                    </h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{ getItemTypeDescription(getItemKey(item)) }}
                    </p>
                  </div>
                </div>

                <!-- 项目数量徽章和状态 -->
                <div class="flex items-center space-x-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class]="'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'">
                    {{ item.children?.length || 0 }} 项
                  </span>

                  <!-- 加载状态指示器 -->
                  <div *ngIf="isLoadingGroup(getItemKey(item))" class="flex items-center space-x-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                </div>
              </div>
            </button>

            <!-- Card Content -->
            <div
              [id]="'group-content-' + getItemKey(item)"
              class="border-t border-gray-100 dark:border-gray-700"
              [class.hidden]="!isGroupExpanded(getItemKey(item))"
            >
              <div class="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                <!-- 骨架屏效果 -->
                <div *ngIf="isLoadingGroup(getItemKey(item))" class="space-y-4">
                  <div class="animate-pulse space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div class="animate-pulse space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                </div>

                <!-- 实际内容 -->
                <ng-container *ngIf="!isLoadingGroup(getItemKey(item))">
                  <div class="space-y-4">
                    <app-form-item
                      *ngFor="let child of item.children"
                      [metadata]="child"
                      [formData]="formData"
                      (valueChange)="onValueChange($event)"
                      class="animate-fade-in"
                    />
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
        </div>

        <!-- 非分组项目 - 独立的卡片 -->
        <div *ngIf="item.type !== 'group'" class="flowbite-single-item">
          <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200">
            <app-form-item
              [metadata]="item"
              [formData]="formData"
              (valueChange)="onValueChange($event)"
            />
          </div>
        </div>
      </ng-container>

      <!-- 空状态提示 -->
      <div *ngIf="!config || config.length === 0" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
          <svg class="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无配置项</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          此组件目前没有可配置的属性选项。
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    .flowbite-accordion {
      @apply transition-all duration-200;
    }

    .flowbite-accordion:hover {
      @apply shadow-sm;
    }

    .flowbite-single-item {
      @apply transition-all duration-200;
    }

    /* 深色模式适配 */
    :host(.dark) .flowbite-accordion {
      @apply border-gray-700;
    }

    /* 聚焦样式 */
    .flowbite-accordion button:focus {
      @apply ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900;
    }

    /* 平滑过渡 */
    * {
      @apply transition-colors duration-200;
    }

    /* 优化的卡片样式 */
    .flowbite-accordion > div {
      @apply transform transition-all duration-300;
    }

    .flowbite-accordion > div:hover {
      @apply -translate-y-0.5 shadow-lg;
    }

    /* 徽章动画 */
    span[class*="rounded-full"] {
      @apply transition-all duration-200;
    }

    /* 加载状态优化 */
    .animate-spin {
      @apply transition-transform duration-300;
    }
  `]
})
export class FormContainerComponent implements OnInit {
  @Input() config: FormMetadata[] = [];
  @Input() formData: any = {};
  @Output() change = new EventEmitter<FormChangeEvent>();

  // 分组展开状态管理
  private expandedGroups = new Set<string>();
  private loadingGroups = new Set<string>();

  ngOnInit(): void {
    // 初始化时展开所有分组
    this.initializeExpandedGroups();
  }

  /**
   * 初始化展开的分组
   */
  private initializeExpandedGroups(): void {
    this.config.forEach(item => {
      if (item.type === 'group') {
        // 默认展开所有分组
        this.expandedGroups.add(this.getItemKey(item));
      }
    });
  }

  /**
   * 切换分组展开/折叠状态
   */
  toggleGroup(groupKey: string): void {
    if (this.expandedGroups.has(groupKey)) {
      this.expandedGroups.delete(groupKey);
    } else {
      this.expandedGroups.add(groupKey);
      // 模拟加载状态
      this.setGroupLoading(groupKey, true);
      setTimeout(() => {
        this.setGroupLoading(groupKey, false);
      }, 300);
    }
  }

  /**
   * 检查分组是否展开
   */
  isGroupExpanded(groupKey: string): boolean {
    return this.expandedGroups.has(groupKey);
  }

  /**
   * 设置分组加载状态
   */
  setGroupLoading(groupKey: string, loading: boolean): void {
    if (loading) {
      this.loadingGroups.add(groupKey);
    } else {
      this.loadingGroups.delete(groupKey);
    }
  }

  /**
   * 检查分组是否正在加载
   */
  isLoadingGroup(groupKey: string): boolean {
    return this.loadingGroups.has(groupKey);
  }

  /**
   * 获取项目的键值（处理string | string[]类型）
   */
  getItemKey(item: FormMetadata): string {
    return Array.isArray(item.key) ? item.key[0] : item.key;
  }

  /**
   * 检查项目是否为分组
   */
  isItemGroup(item: FormMetadata): boolean {
    return item.type === 'group';
  }

  /**
   * 检查项目是否正在加载（模板用）
   */
  isItemLoading(item: FormMetadata): boolean {
    if (!this.isItemGroup(item)) {
      return false;
    }
    return this.isLoadingGroup(this.getItemKey(item));
  }

  /**
   * 展开所有分组
   */
  expandAll(): void {
    this.config.forEach(item => {
      if (item.type === 'group') {
        this.expandedGroups.add(this.getItemKey(item));
      }
    });
  }

  /**
   * 折叠所有分组
   */
  collapseAll(): void {
    this.expandedGroups.clear();
  }

  /**
   * 处理表单值变化
   */
  onValueChange(event: FormChangeEvent): void {
    this.change.emit(event);
  }

  /**
   * 获取分组统计信息
   */
  getGroupStats(): { total: number; expanded: number; collapsed: number } {
    const groups = this.config.filter(item => item.type === 'group');
    const total = groups.length;
    const expanded = groups.filter(item => this.expandedGroups.has(this.getItemKey(item))).length;
    const collapsed = total - expanded;

    return { total, expanded, collapsed };
  }

  /**
   * 获取项目类型描述
   */
  getItemTypeDescription(key: string): string {
    const descriptions: { [key: string]: string } = {
      'common': '组件的基础信息和身份标识',
      'config': '组件的功能配置和行为选项',
      'style': '组件的视觉样式和外观设置',
      'data': '组件的数据源和内容配置',
      'events': '组件的事件和交互设置',
      'layout': '组件的布局和位置配置'
    };

    return descriptions[key] || '组件的配置选项';
  }
}
