import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormMetadata, FormChangeEvent } from '../../models/form-metadata.model';
import { FormItemComponent } from './form-item.component';

@Component({
  selector: 'app-form-container',
  standalone: true,
  imports: [CommonModule, FormItemComponent],
  template: `
    <div class="form-container space-y-4">
      <!-- 顶级表单项（非分组） -->
      <ng-container *ngFor="let item of config">
        <!-- 分组项目 - 使用Flowbite Card/Accordion -->
        <div *ngIf="item.type === 'group'" class="flowbite-card">
          <div class="group relative">
            <!-- Card Header - 可点击的展开/折叠区域 -->
            <button
              (click)="toggleGroup(item.key as string)"
              class="w-full flex items-center justify-between p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              [attr.aria-expanded]="isGroupExpanded(item.key as string)"
              [attr.aria-controls]="'group-content-' + (item.key as string)"
            >
              <div class="flex items-center space-x-3">
                <!-- 展开图标 -->
                <svg
                  [class]="'w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ' + (isGroupExpanded(item.key as string) ? 'rotate-90' : '')"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>

                <!-- 分组图标 -->
                <svg class="w-5 h-5 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>

                <!-- 分组标题 -->
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {{ item.label }}
                </h4>

                <!-- 项目数量徽章 -->
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {{ item.children?.length || 0 }}
                </span>
              </div>

              <!-- 加载状态指示器 -->
              <div *ngIf="isLoadingGroup(item.key as string)" class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span class="text-xs text-gray-500 dark:text-gray-400">加载中...</span>
              </div>
            </button>

            <!-- Card Content - 可折叠的内容区域 -->
            <div
              [id]="'group-content-' + (item.key as string)"
              class="overflow-hidden transition-all duration-300 ease-in-out"
              [style.max-height]="isGroupExpanded(item.key as string) ? '2000px' : '0px'"
              [style.opacity]="isGroupExpanded(item.key as string) ? '1' : '0'"
            >
              <div class="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                <div class="pl-8 space-y-3">
                  <!-- 骨架屏效果 -->
                  <div *ngIf="isLoadingGroup(item.key as string)" class="space-y-3">
                    <div class="animate-pulse">
                      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div class="animate-pulse">
                      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    </div>
                  </div>

                  <!-- 实际内容 -->
                  <ng-container *ngIf="!isLoadingGroup(item.key as string)">
                    <app-form-item
                      *ngFor="let child of item.children"
                      [metadata]="child"
                      [formData]="formData"
                      (valueChange)="onValueChange($event)"
                      class="transform transition-all duration-200"
                      [style.animation]="'fadeInUp 0.3s ease-out'"
                    />
                  </ng-container>
                </div>
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
      <div *ngIf="!config || config.length === 0" class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-gray-500 dark:text-gray-400 text-sm">暂无配置项</p>
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

    .flowbite-card {
      @apply transition-all duration-200;
    }

    .flowbite-card:hover {
      @apply shadow-sm;
    }

    .flowbite-single-item {
      @apply transition-all duration-200;
    }

    /* 深色模式适配 */
    :host(.dark) .flowbite-card {
      @apply border-gray-700;
    }

    /* 聚焦样式 */
    .flowbite-card button:focus {
      @apply ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900;
    }

    /* 平滑过渡 */
    * {
      @apply transition-colors duration-200;
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
        this.expandedGroups.add(item.key as string);
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
   * 展开所有分组
   */
  expandAll(): void {
    this.config.forEach(item => {
      if (item.type === 'group') {
        this.expandedGroups.add(item.key as string);
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
    const expanded = groups.filter(item => this.expandedGroups.has(item.key as string)).length;
    const collapsed = total - expanded;

    return { total, expanded, collapsed };
  }
}
