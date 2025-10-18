import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatusItem {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error' | 'loading';
  value?: number | string;
  unit?: string;
  lastUpdated?: Date;
  details?: Record<string, any>;
}

export interface StatusIndicatorConfig {
  type: 'badge' | 'card' | 'list' | 'grid';
  showDetails?: boolean;
  showTimestamp?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
  animated?: boolean;
}

@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-indicator" [ngClass]="getContainerClasses()">
      <!-- 单个状态指示器 -->
      <ng-container *ngIf="config.type === 'badge' && status">
        <div
          class="status-badge inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
          [ngClass]="getStatusClasses(status.status)"
        >
          <div class="relative">
            <div
              class="w-2 h-2 rounded-full"
              [ngClass]="{ 'animate-pulse': config.animated && isAnimating(status.status) }"
            ></div>
            <div
              *ngIf="config.animated && isAnimating(status.status)"
              class="absolute inset-0 w-2 h-2 rounded-full animate-ping"
            ></div>
          </div>
          <span>{{ status.name }}</span>
          <span *ngIf="status.value !== undefined" class="font-mono">
            {{ status.value }}{{ status.unit }}
          </span>
        </div>
      </ng-container>

      <!-- 卡片式状态指示器 -->
      <ng-container *ngIf="config.type === 'card' && status">
        <div class="status-card bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div
                  class="w-3 h-3 rounded-full"
                  [ngClass]="{ 'animate-pulse': config.animated && isAnimating(status.status) }"
                ></div>
                <div
                  *ngIf="config.animated && isAnimating(status.status)"
                  class="absolute inset-0 w-3 h-3 rounded-full animate-ping"
                ></div>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">{{ status.name }}</h4>
                <p class="text-sm text-gray-500">{{ getStatusText(status.status) }}</p>
              </div>
            </div>
            <div class="text-right">
              <div *ngIf="status.value !== undefined" class="text-lg font-semibold text-gray-900">
                {{ status.value }}
                <span *ngIf="status.unit" class="text-sm font-medium text-gray-500">{{ status.unit }}</span>
              </div>
              <div *ngIf="config.showTimestamp && status.lastUpdated" class="text-xs text-gray-500">
                {{ formatTimestamp(status.lastUpdated) }}
              </div>
            </div>
          </div>

          <!-- 详细信息 -->
          <div *ngIf="config.showDetails && status.details" class="mt-3 pt-3 border-t border-gray-100">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div *ngFor="let detail of getDetailItems(status.details)" class="flex justify-between">
                <span class="text-gray-500">{{ detail.key }}:</span>
                <span class="text-gray-900 font-medium">{{ detail.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- 列表式状态指示器 -->
      <ng-container *ngIf="config.type === 'list' && statusList">
        <div class="status-list space-y-2">
          <div
            *ngFor="let item of statusList"
            class="status-item flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="relative">
                <div
                  class="w-2 h-2 rounded-full"
                  [ngClass]="{ 'animate-pulse': config.animated && isAnimating(item.status) }"
                ></div>
                <div
                  *ngIf="config.animated && isAnimating(item.status)"
                  class="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                ></div>
              </div>
              <div>
                <span class="font-medium text-gray-900">{{ item.name }}</span>
                <span class="ml-2 text-sm text-gray-500">{{ getStatusText(item.status) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span *ngIf="item.value !== undefined" class="font-mono text-sm text-gray-900">
                {{ item.value }}{{ item.unit }}
              </span>
              <button
                *ngIf="config.showDetails && item.details"
                (click)="toggleDetails(item.id)"
                class="text-blue-600 hover:text-blue-800 text-sm"
              >
                详情
              </button>
            </div>
          </div>
        </div>

        <!-- 展开的详细信息 -->
        <div
          *ngFor="let item of statusList"
          [id]="'details-' + item.id"
          class="hidden mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div *ngFor="let detail of getDetailItems(item.details || {})" class="flex justify-between">
              <span class="text-gray-600">{{ detail.key }}:</span>
              <span class="text-gray-900 font-medium">{{ detail.value }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- 网格式状态指示器 -->
      <ng-container *ngIf="config.type === 'grid' && statusList">
        <div class="status-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            *ngFor="let item of statusList"
            class="status-grid-item bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-gray-900">{{ item.name }}</h4>
              <div class="relative">
                <div
                  class="w-2 h-2 rounded-full"
                  [ngClass]="{ 'animate-pulse': config.animated && isAnimating(item.status) }"
                ></div>
                <div
                  *ngIf="config.animated && isAnimating(item.status)"
                  class="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                ></div>
              </div>
            </div>
            <div class="text-lg font-semibold text-gray-900">
              {{ item.value || '--' }}
              <span *ngIf="item.unit" class="text-sm font-medium text-gray-500">{{ item.unit }}</span>
            </div>
            <div class="text-sm text-gray-500 mt-1">{{ getStatusText(item.status) }}</div>
            <div *ngIf="config.showTimestamp && item.lastUpdated" class="text-xs text-gray-400 mt-2">
              {{ formatTimestamp(item.lastUpdated) }}
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .status-indicator {
      @apply w-full;
    }

    .status-badge {
      @apply inline-flex items-center;
    }

    .status-card {
      @apply transition-all duration-200;
    }

    .status-card:hover {
      @apply shadow-md;
    }

    .status-item {
      @apply transition-colors duration-200;
    }

    .status-item:hover {
      @apply bg-gray-100;
    }

    .status-grid-item {
      @apply transition-all duration-200;
    }

    .status-grid-item:hover {
      @apply transform -translate-y-1 shadow-md;
    }

    .compact .status-card {
      @apply p-2;
    }

    .compact .status-item {
      @apply p-2;
    }

    .compact .status-grid-item {
      @apply p-2;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusIndicatorComponent implements OnChanges {
  @Input() status: StatusItem | undefined;
  @Input() statusList: StatusItem[] | undefined;
  @Input() config: StatusIndicatorConfig = {
    type: 'badge',
    showDetails: false,
    showTimestamp: true,
    autoRefresh: false,
    refreshInterval: 30000,
    compact: false,
    animated: true
  };

  @Output() statusClick = new EventEmitter<StatusItem>();
  @Output() refresh = new EventEmitter<void>();

  private expandedItems = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      if (this.config.autoRefresh) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }
  }

  // 获取容器样式类
  getContainerClasses(): string {
    const classes = ['status-indicator'];
    if (this.config.compact) {
      classes.push('compact');
    }
    return classes.join(' ');
  }

  // 获取状态样式类
  getStatusClasses(status: string): string {
    const baseClasses = ['inline-flex', 'items-center', 'gap-2', 'px-3', 'py-1', 'rounded-full', 'text-sm', 'font-medium'];

    switch (status) {
      case 'online':
        return [...baseClasses, 'bg-green-100', 'text-green-800'].join(' ');
      case 'offline':
        return [...baseClasses, 'bg-gray-100', 'text-gray-800'].join(' ');
      case 'warning':
        return [...baseClasses, 'bg-yellow-100', 'text-yellow-800'].join(' ');
      case 'error':
        return [...baseClasses, 'bg-red-100', 'text-red-800'].join(' ');
      case 'loading':
        return [...baseClasses, 'bg-blue-100', 'text-blue-800'].join(' ');
      default:
        return [...baseClasses, 'bg-gray-100', 'text-gray-800'].join(' ');
    }
  }

  // 判断是否需要动画
  isAnimating(status: string): boolean {
    return ['online', 'loading', 'warning'].includes(status);
  }

  // 获取状态文本
  getStatusText(status: string): string {
    switch (status) {
      case 'online':
        return '在线';
      case 'offline':
        return '离线';
      case 'warning':
        return '警告';
      case 'error':
        return '错误';
      case 'loading':
        return '加载中';
      default:
        return '未知';
    }
  }

  // 格式化时间戳
  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      return `${days}天前`;
    }
  }

  // 获取详细信息项
  getDetailItems(details: Record<string, any>): Array<{ key: string; value: string }> {
    return Object.entries(details).map(([key, value]) => ({
      key: this.formatDetailKey(key),
      value: this.formatDetailValue(value)
    }));
  }

  // 格式化详细信息键名
  private formatDetailKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  // 格式化详细信息值
  private formatDetailValue(value: any): string {
    if (value instanceof Date) {
      return this.formatTimestamp(value);
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    } else {
      return String(value);
    }
  }

  // 切换详细信息显示
  toggleDetails(itemId: string): void {
    const detailsElement = document.getElementById(`details-${itemId}`);
    if (detailsElement) {
      if (this.expandedItems.has(itemId)) {
        detailsElement.classList.add('hidden');
        this.expandedItems.delete(itemId);
      } else {
        detailsElement.classList.remove('hidden');
        this.expandedItems.add(itemId);
      }
    }
  }

  // 自动刷新
  private refreshTimer: any;

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.refresh.emit();
    }, this.config.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // 点击处理
  onStatusClick(item: StatusItem): void {
    this.statusClick.emit(item);
  }
}