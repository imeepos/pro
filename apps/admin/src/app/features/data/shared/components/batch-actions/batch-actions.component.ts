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
import { BatchAction } from '../types/data.types';

export interface BatchActionConfig {
  position: 'top' | 'bottom' | 'float';
  layout: 'horizontal' | 'vertical';
  showCount?: boolean;
  showSelectAll?: boolean;
  sticky?: boolean;
  compact?: boolean;
}

@Component({
  selector: 'app-batch-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="batch-actions-container"
      [ngClass]="getContainerClasses()"
      *ngIf="selectedItems.length > 0"
    >
      <!-- 选择信息 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- 已选择数量 -->
          <div *ngIf="config.showCount" class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">已选择</span>
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
              {{ selectedItems.length }}
            </span>
            <span *ngIf="totalItems > 0" class="text-sm text-gray-500">
              / {{ totalItems }}
            </span>
          </div>

          <!-- 全选按钮 -->
          <div *ngIf="config.showSelectAll && totalItems > 0" class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="isAllSelected"
              [indeterminate]="isIndeterminate"
              (change)="toggleSelectAll()"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label class="text-sm text-gray-700 cursor-pointer">全选</label>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-2" [ngClass]="getLayoutClasses()">
          <button
            *ngFor="let action of actions"
            [disabled]="action.disabled || isActionDisabled(action)"
            [ngClass]="getButtonClasses(action)"
            (click)="executeAction(action)"
            [title]="getActionTooltip(action)"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <span *ngIf="action.icon" class="mr-1">{{ action.icon }}</span>
            <span>{{ action.label }}</span>
            <span *ngIf="action.showConfirm && action.showCount" class="ml-1 opacity-75">
              ({{ selectedItems.length }})
            </span>
          </button>

          <!-- 清空选择 -->
          <button
            (click)="clearSelection()"
            class="px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            title="清空选择"
          >
            清空
          </button>
        </div>
      </div>

      <!-- 进度指示器 -->
      <div *ngIf="loading" class="mt-3 pt-3 border-t border-gray-200">
        <div class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span class="text-sm text-gray-600">{{ loadingText }}</span>
          <div *ngIf="progress > 0" class="flex-1 bg-gray-200 rounded-full h-2 ml-4">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              [style.width.%]="progress"
            ></div>
          </div>
        </div>
      </div>

      <!-- 批量操作结果 -->
      <div *ngIf="operationResult" class="mt-3 pt-3 border-t border-gray-200">
        <div class="flex items-center gap-2 text-sm" [ngClass]="getResultClasses()">
          <span>{{ getResultIcon() }}</span>
          <span>{{ operationResult.message }}</span>
          <span *ngIf="operationResult.details" class="text-gray-500">
            ({{ operationResult.details }})
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .batch-actions-container {
      @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4;
      transition: all 0.3s ease-in-out;
    }

    .batch-actions-container.sticky-top {
      @apply sticky top-0 z-10;
    }

    .batch-actions-container.sticky-bottom {
      @apply sticky bottom-0 z-10;
    }

    .batch-actions-container.floating {
      @apply fixed bottom-4 right-4 z-50 shadow-lg max-w-md;
    }

    .batch-actions-container.compact {
      @apply p-2;
    }

    .batch-actions-container:hover {
      @apply shadow-md;
    }

    button:disabled {
      @apply opacity-50 cursor-not-allowed;
    }

    button:disabled:hover {
      @apply transform-none;
    }

    .action-success {
      @apply text-green-600 bg-green-50 border-green-200;
    }

    .action-error {
      @apply text-red-600 bg-red-50 border-red-200;
    }

    .action-warning {
      @apply text-yellow-600 bg-yellow-50 border-yellow-200;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchActionsComponent<T = any> implements OnChanges {
  @Input() selectedItems: T[] = [];
  @Input() totalItems = 0;
  @Input() actions: BatchAction[] = [];
  @Input() config: BatchActionConfig = {
    position: 'top',
    layout: 'horizontal',
    showCount: true,
    showSelectAll: true,
    sticky: false,
    compact: false
  };

  @Input() loading = false;
  @Input() loadingText = '正在执行批量操作...';
  @Input() progress = 0;
  @Input() operationResult: {
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: string;
  } | undefined;

  @Output() selectAll = new EventEmitter<boolean>();
  @Output() clearSelectionEvent = new EventEmitter<void>();
  @Output() actionExecute = new EventEmitter<{ action: BatchAction; items: T[] }>();

  private resultTimer: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.operationResult && this.operationResult) {
      this.clearResultTimer();
      this.resultTimer = setTimeout(() => {
        this.operationResult = null;
      }, 5000);
    }
  }

  // 计算属性
  get isAllSelected(): boolean {
    return this.selectedItems.length > 0 && this.selectedItems.length === this.totalItems;
  }

  get isIndeterminate(): boolean {
    return this.selectedItems.length > 0 && this.selectedItems.length < this.totalItems;
  }

  // 样式类计算
  getContainerClasses(): string {
    const classes = ['batch-actions-container'];

    if (this.config.sticky && this.config.position === 'top') {
      classes.push('sticky-top');
    } else if (this.config.sticky && this.config.position === 'bottom') {
      classes.push('sticky-bottom');
    } else if (this.config.position === 'float') {
      classes.push('floating');
    }

    if (this.config.compact) {
      classes.push('compact');
    }

    return classes.join(' ');
  }

  getLayoutClasses(): string {
    return this.config.layout === 'vertical'
      ? 'flex-col items-start gap-2'
      : 'flex-row items-center gap-2';
  }

  getButtonClasses(action: BatchAction): string {
    let classes = [];

    if (action.danger) {
      classes = [
        'text-white',
        'bg-red-600',
        'hover:bg-red-700',
        'focus:ring-red-500'
      ];
    } else {
      classes = [
        'text-white',
        'bg-blue-600',
        'hover:bg-blue-700',
        'focus:ring-blue-500'
      ];
    }

    if (action.disabled || this.isActionDisabled(action)) {
      classes.push('opacity-50', 'cursor-not-allowed');
    }

    return classes.join(' ');
  }

  getResultClasses(): string {
    if (!this.operationResult) return '';

    switch (this.operationResult.type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }

  getResultIcon(): string {
    if (!this.operationResult) return '';

    switch (this.operationResult.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  }

  // 操作判断
  isActionDisabled(action: BatchAction): boolean {
    if (this.selectedItems.length === 0) return true;

    // 检查最小选择数量
    if (action.minItems && this.selectedItems.length < action.minItems) return true;

    // 检查最大选择数量
    if (action.maxItems && this.selectedItems.length > action.maxItems) return true;

    return false;
  }

  getActionTooltip(action: BatchAction): string {
    if (action.disabled) return action.disabledReason || '此操作当前不可用';

    if (action.minItems && this.selectedItems.length < action.minItems) {
      return `至少需要选择 ${action.minItems} 项`;
    }

    if (action.maxItems && this.selectedItems.length > action.maxItems) {
      return `最多只能选择 ${action.maxItems} 项`;
    }

    return action.description || action.label;
  }

  // 操作处理
  toggleSelectAll(): void {
    const shouldSelectAll = !this.isAllSelected;
    this.selectAll.emit(shouldSelectAll);
  }

  clearSelection(): void {
    this.clearSelectionEvent.emit();
  }

  executeAction(action: BatchAction): void {
    if (!action.disabled && !this.isActionDisabled(action)) {
      this.actionExecute.emit({ action, items: this.selectedItems });
    }
  }

  // 清除定时器
  private clearResultTimer(): void {
    if (this.resultTimer) {
      clearTimeout(this.resultTimer);
      this.resultTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearResultTimer();
  }
}