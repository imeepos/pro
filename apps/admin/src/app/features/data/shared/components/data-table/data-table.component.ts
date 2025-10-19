import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  TableConfig,
  TableState,
  BatchAction,
  PaginationConfig,
  FilterConfig,
  SortConfig
} from '../../types/data.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    // 暂时不导入，后面会添加实际的Angular组件
  ],
  template: `
    <div class="data-table-container">
      <!-- 筛选工具栏 -->
      <div class="flex items-center justify-between mb-4" *ngIf="config.filterable">
        <div class="flex items-center gap-2">
          <input
            type="text"
            [placeholder]="searchPlaceholder"
            [(ngModel)]="searchKeyword"
            (input)="onSearchChange()"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            (click)="resetFilters()"
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            重置
          </button>
        </div>

        <div class="flex items-center gap-2">
          <div *ngIf="config.showSelection && selectedRows.length > 0" class="flex items-center gap-2">
            <span class="text-sm text-gray-600">已选择 {{ selectedRows.length }} 项</span>
            <div class="flex gap-1">
              <button
                *ngFor="let action of batchActions"
                [disabled]="action.disabled || selectedRows.length === 0"
                [ngClass]="{
                  'px-3 py-1.5 rounded-lg text-sm transition-colors': true,
                  'bg-red-500 text-white hover:bg-red-600': action.danger,
                  'bg-blue-500 text-white hover:bg-blue-600': !action.danger,
                  'opacity-50 cursor-not-allowed': action.disabled || selectedRows.length === 0
                }"
                (click)="executeBatchAction(action)"
                [title]="action.label"
              >
                <span *ngIf="action.icon" class="mr-1">{{ action.icon }}</span>
                {{ action.label }}
              </button>
            </div>
          </div>

          <button
            (click)="refreshData()"
            class="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            [disabled]="loading"
          >
            {{ loading ? '加载中...' : '刷新' }}
          </button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200" [ngClass]="getTableClasses()">
          <!-- 表头 -->
          <thead class="bg-gray-50">
            <tr>
              <!-- 选择列 -->
              <th *ngIf="config.showSelection" class="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  [checked]="isAllSelected"
                  [indeterminate]="isIndeterminate"
                  (change)="toggleAllSelection()"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>

              <!-- 数据列 -->
              <th
                *ngFor="let column of config.columns"
                [style.width]="column.width"
                class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                [ngClass]="getAlignClass(column.align)"
              >
                <div class="flex items-center gap-1">
                  <span>{{ column.title }}</span>

                  <!-- 排序控件 -->
                  <div *ngIf="column.sortable" class="flex flex-col">
                    <button
                      (click)="sort(column.key as string, 'asc')"
                      [ngClass]="getSortClass(column.key as string, 'asc')"
                      class="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      ▲
                    </button>
                    <button
                      (click)="sort(column.key as string, 'desc')"
                      [ngClass]="getSortClass(column.key as string, 'desc')"
                      class="text-gray-400 hover:text-gray-600 p-0.5 -mt-1"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </th>

              <!-- 操作列 -->
              <th *ngIf="config.showActions" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>

          <!-- 表体 -->
          <tbody class="bg-white divide-y divide-gray-200">
            <ng-container *ngIf="!loading">
              <!-- 数据行 -->
              <tr
                *ngFor="let item of displayData; trackBy: trackByFn"
                class="hover:bg-gray-50 transition-colors"
                [ngClass]="{ 'bg-blue-50': isSelected(item) }"
              >
                <!-- 选择框 -->
                <td *ngIf="config.showSelection" class="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    [checked]="isSelected(item)"
                    (change)="toggleSelection(item)"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>

                <!-- 数据单元格 -->
                <td
                  *ngFor="let column of config.columns"
                  class="px-6 py-4 whitespace-nowrap text-sm"
                  [ngClass]="getAlignClass(column.align)"
                >
                  <ng-container *ngIf="column.render">
                    {{ column.render(getNestedValue(item, column.key as string), item) }}
                  </ng-container>
                  <ng-container *ngIf="column.formatter">
                    {{ column.formatter(getNestedValue(item, column.key as string)) }}
                  </ng-container>
                  <ng-container *ngIf="!column.render && !column.formatter">
                    {{ getNestedValue(item, column.key as string) }}
                  </ng-container>
                </td>

                <!-- 操作列 -->
                <td *ngIf="config.showActions" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <ng-content select="[actions]"></ng-content>
                </td>
              </tr>

              <!-- 空数据提示 -->
              <tr *ngIf="displayData.length === 0">
                <td
                  [colSpan]="config.columns.length + (config.showSelection ? 1 : 0) + (config.showActions ? 1 : 0)"
                  class="px-6 py-12 text-center text-gray-500"
                >
                  <div class="flex flex-col items-center">
                    <div class="text-4xl mb-2">📊</div>
                    <div class="text-lg font-medium">暂无数据</div>
                    <div class="text-sm">{{ searchKeyword ? '没有找到匹配的记录' : '当前没有任何数据' }}</div>
                  </div>
                </td>
              </tr>
            </ng-container>

            <!-- 加载状态 -->
            <tr *ngIf="loading">
              <td
                [colSpan]="config.columns.length + (config.showSelection ? 1 : 0) + (config.showActions ? 1 : 0)"
                class="px-6 py-12 text-center"
              >
                <div class="flex items-center justify-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span class="ml-2 text-gray-600">加载中...</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div *ngIf="config.showPagination && !loading" class="flex items-center justify-between mt-4">
        <div class="text-sm text-gray-700">
          显示第 {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} 到
          {{ Math.min(pagination.currentPage * pagination.pageSize, pagination.total) }} 条，
          共 {{ pagination.total }} 条记录
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="changePage(pagination.currentPage - 1)"
            [disabled]="pagination.currentPage <= 1"
            class="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>

          <div class="flex items-center gap-1">
            <span class="text-sm text-gray-700">第</span>
            <input
              type="number"
              [(ngModel)]="pagination.currentPage"
              (change)="goToPage()"
              [min]="1"
              [max]="getTotalPages()"
              class="w-16 px-2 py-1 border border-gray-300 rounded text-center"
            />
            <span class="text-sm text-gray-700">页 / 共 {{ getTotalPages() }} 页</span>
          </div>

          <button
            (click)="changePage(pagination.currentPage + 1)"
            [disabled]="pagination.currentPage >= getTotalPages()"
            class="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>

          <select
            *ngIf="config.showSizeChanger"
            [(ngModel)]="pagination.pageSize"
            (change)="changePageSize()"
            class="ml-4 px-3 py-1 border border-gray-300 rounded-lg"
          >
            <option *ngFor="let size of pagination.pageSizeOptions" [value]="size">
              {{ size }} 条/页
            </option>
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .data-table-container {
      @apply w-full;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T = any> implements OnChanges {
  @Input() config: TableConfig<T> = {
    columns: [],
    pageSize: 10,
    showPagination: true,
    showSizeChanger: true,
    showSelection: false,
    showActions: false,
    bordered: false,
    size: 'middle',
    filterable: true
  };

  @Input() data: T[] = [];
  @Input() loading = false;
  @Input() pagination: PaginationConfig = {
    currentPage: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100]
  };
  @Input() batchActions: BatchAction[] = [];
  @Input() searchPlaceholder = '搜索...';

  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() sortChange = new EventEmitter<{ field: string; order: 'asc' | 'desc' }>();
  @Output() filterChange = new EventEmitter<{ keyword: string }>();
  @Output() selectionChange = new EventEmitter<T[]>();
  @Output() refresh = new EventEmitter<void>();

  searchKeyword = '';
  selectedRows: T[] = [];
  currentSort: SortConfig = { field: '', order: null };
  displayData: T[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.applyFiltersAndSort();
    }
  }

  // 搜索处理
  onSearchChange(): void {
    this.applyFiltersAndSort();
    this.filterChange.emit({ keyword: this.searchKeyword });
  }

  // 重置筛选
  resetFilters(): void {
    this.searchKeyword = '';
    this.currentSort = { field: '', order: null };
    this.applyFiltersAndSort();
    this.filterChange.emit({ keyword: '' });
  }

  // 排序处理
  sort(field: string, order: 'asc' | 'desc'): void {
    if (this.currentSort.field === field && this.currentSort.order === order) {
      this.currentSort = { field: '', order: null };
    } else {
      this.currentSort = { field, order };
    }
    this.applyFiltersAndSort();
    this.sortChange.emit({ field, order });
  }

  // 分页处理
  changePage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.pagination.currentPage = page;
      this.pageChange.emit({ page, pageSize: this.pagination.pageSize });
    }
  }

  goToPage(): void {
    const page = Math.max(1, Math.min(this.pagination.currentPage, this.getTotalPages()));
    if (page !== this.pagination.currentPage) {
      this.changePage(page);
    }
  }

  changePageSize(): void {
    this.pagination.currentPage = 1;
    this.pageChange.emit({ page: 1, pageSize: this.pagination.pageSize });
  }

  getTotalPages(): number {
    return Math.ceil(this.pagination.total / this.pagination.pageSize);
  }

  // 选择处理
  toggleSelection(item: T): void {
    const index = this.selectedRows.findIndex(row => this.getTrackById(row) === this.getTrackById(item));
    if (index >= 0) {
      this.selectedRows.splice(index, 1);
    } else {
      this.selectedRows.push(item);
    }
    this.selectionChange.emit([...this.selectedRows]);
  }

  toggleAllSelection(): void {
    if (this.isAllSelected) {
      this.selectedRows = [];
    } else {
      this.selectedRows = [...this.displayData];
    }
    this.selectionChange.emit([...this.selectedRows]);
  }

  isSelected(item: T): boolean {
    return this.selectedRows.some(row => this.getTrackById(row) === this.getTrackById(item));
  }

  get isAllSelected(): boolean {
    return this.displayData.length > 0 && this.selectedRows.length === this.displayData.length;
  }

  get isIndeterminate(): boolean {
    return this.selectedRows.length > 0 && this.selectedRows.length < this.displayData.length;
  }

  // 批量操作
  executeBatchAction(action: BatchAction): void {
    if (!action.disabled && this.selectedRows.length > 0) {
      action.action(this.selectedRows);
    }
  }

  // 刷新数据
  refreshData(): void {
    this.refresh.emit();
  }

  // 数据处理
  private applyFiltersAndSort(): void {
    let filteredData = [...this.data];

    // 搜索筛选
    if (this.searchKeyword) {
      const keyword = this.searchKeyword.toLowerCase();
      filteredData = filteredData.filter(item => {
        return this.config.columns.some(column => {
          const value = this.getNestedValue(item, column.key as string);
          return value?.toString().toLowerCase().includes(keyword);
        });
      });
    }

    // 排序
    if (this.currentSort.field && this.currentSort.order) {
      filteredData.sort((a, b) => {
        const aValue = this.getNestedValue(a, this.currentSort.field);
        const bValue = this.getNestedValue(b, this.currentSort.field);

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return this.currentSort.order === 'desc' ? -comparison : comparison;
      });
    }

    this.displayData = filteredData;
  }

  // 工具方法
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getTrackById(item: any): any {
    return item.id || item._id || JSON.stringify(item);
  }

  trackByFn(index: number, item: T): any {
    return this.getTrackById(item);
  }

  getTableClasses(): string {
    const classes = ['min-w-full', 'divide-y', 'divide-gray-200'];
    if (this.config.bordered) {
      classes.push('border', 'border-gray-200');
    }
    if (this.config.size === 'small') {
      classes.push('text-xs');
    } else if (this.config.size === 'large') {
      classes.push('text-base');
    }
    return classes.join(' ');
  }

  getAlignClass(align?: string): string {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  }

  getSortClass(field: string, order: 'asc' | 'desc'): string {
    if (this.currentSort.field === field && this.currentSort.order === order) {
      return 'text-blue-600';
    }
    return 'text-gray-400 hover:text-gray-600';
  }
}