import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  Observable,
  Subject,
  combineLatest,
  startWith,
  takeUntil,
  map
} from 'rxjs';

import {
  DataTableComponent,
  BatchActionsComponent
} from '../shared/components';
import { DataManagerService } from '../shared/services';
import { TableConfig, TableColumn, BatchAction, FilterConfig, SortConfig } from '../shared/types/data.types';

interface DataItem {
  id: string;
  name: string;
  type: string;
  status: 'success' | 'failed' | 'pending' | 'running';
  createdAt: string;
  updatedAt: string;
  progress?: number;
  error?: string;
}

@Component({
  selector: 'app-browser',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DataTableComponent,
    BatchActionsComponent
  ],
  template: `
    <div class="browser-container p-6">
      <!-- 页面标题和操作栏 -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">数据浏览器</h1>
          <p class="text-gray-600 mt-1">浏览和管理系统中的所有数据</p>
        </div>
        <div class="flex items-center gap-3">
          <select
            [(ngModel)]="selectedEntity"
            (change)="onEntityChange()"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="events">事件</option>
            <option value="weibo-search-tasks">微博搜索任务</option>
            <option value="media-type">媒体类型</option>
            <option value="api-keys">API密钥</option>
          </select>
          <button
            (click)="createNewItem()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            新建
          </button>
        </div>
      </div>

      <!-- 高级筛选器 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              [(ngModel)]="advancedFilters.status"
              (change)="applyAdvancedFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
              <option value="pending">待处理</option>
              <option value="running">运行中</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              [(ngModel)]="advancedFilters.type"
              (change)="applyAdvancedFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部类型</option>
              <option value="news">新闻</option>
              <option value="social">社交</option>
              <option value="video">视频</option>
              <option value="image">图片</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
            <input
              type="date"
              [(ngModel)]="advancedFilters.startDate"
              (change)="applyAdvancedFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="date"
              [(ngModel)]="advancedFilters.endDate"
              (change)="applyAdvancedFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <app-batch-actions
        *ngIf="selectedItems.length > 0"
        [selectedItems]="selectedItems"
        [totalItems]="totalItems"
        [actions]="batchActions"
        [config]="batchActionConfig"
        (selectAll)="onSelectAll($event)"
        (clearSelectionEvent)="clearSelection()"
        (actionExecute)="onBatchAction($event)"
      ></app-batch-actions>

      <!-- 数据表格 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <app-data-table
          [config]="tableConfig"
          [data]="data$ | async"
          [loading]="loading"
          [pagination]="pagination"
          [batchActions]="batchActions"
          (pageChange)="onPageChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
          (selectionChange)="onSelectionChange($event)"
          (refresh)="refreshData()"
        >
          <!-- 自定义操作列 -->
          <div actions>
            <button
              *ngIf="item?.status === 'failed'"
              (click)="retryItem(item)"
              class="px-3 py-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors mr-2"
            >
              重试
            </button>
            <button
              (click)="editItem(item)"
              class="px-3 py-1 text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors mr-2"
            >
              编辑
            </button>
            <button
              (click)="deleteItem(item)"
              class="px-3 py-1 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              删除
            </button>
          </div>
        </app-data-table>
      </div>

      <!-- 数据统计 -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="text-sm font-medium text-gray-500">总记录数</div>
          <div class="text-2xl font-bold text-gray-900">{{ totalItems }}</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="text-sm font-medium text-gray-500">成功</div>
          <div class="text-2xl font-bold text-green-600">{{ successCount }}</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="text-sm font-medium text-gray-500">失败</div>
          <div class="text-2xl font-bold text-red-600">{{ failedCount }}</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="text-sm font-medium text-gray-500">待处理</div>
          <div class="text-2xl font-bold text-yellow-600">{{ pendingCount }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .browser-container {
      @apply min-h-screen bg-gray-50;
    }

    .filter-grid {
      @apply grid grid-cols-1 md:grid-cols-4 gap-4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowserComponent implements OnInit, OnDestroy {
  private dataManager = inject(DataManagerService);
  private destroy$ = new Subject<void>();

  selectedEntity = 'events';
  loading = false;
  selectedItems: DataItem[] = [];
  totalItems = 0;
  successCount = 0;
  failedCount = 0;
  pendingCount = 0;

  // 高级筛选器
  advancedFilters = {
    status: '',
    type: '',
    startDate: '',
    endDate: ''
  };

  // 分页配置
  pagination = {
    currentPage: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100]
  };

  // 数据流
  data$ = new Observable<DataItem[]>();

  // 表格配置
  tableConfig: TableConfig<DataItem> = {
    columns: [
      {
        key: 'name',
        title: '名称',
        sortable: true,
        filterable: true,
        width: '200px'
      },
      {
        key: 'type',
        title: '类型',
        sortable: true,
        filterable: true,
        width: '120px',
        render: (value: string) => this.formatType(value)
      },
      {
        key: 'status',
        title: '状态',
        sortable: true,
        filterable: true,
        width: '120px',
        render: (value: string) => this.formatStatus(value)
      },
      {
        key: 'progress',
        title: '进度',
        sortable: true,
        width: '120px',
        render: (value: number) => value ? `${value}%` : '-'
      },
      {
        key: 'createdAt',
        title: '创建时间',
        sortable: true,
        width: '180px',
        formatter: (value: string) => this.formatDate(value)
      },
      {
        key: 'updatedAt',
        title: '更新时间',
        sortable: true,
        width: '180px',
        formatter: (value: string) => this.formatDate(value)
      }
    ],
    pageSize: 20,
    showPagination: true,
    showSizeChanger: true,
    showSelection: true,
    showActions: true,
    bordered: true,
    filterable: true
  };

  // 批量操作配置
  batchActionConfig = {
    position: 'top' as const,
    layout: 'horizontal' as const,
    showCount: true,
    showSelectAll: true,
    sticky: true,
    compact: false
  };

  // 批量操作
  batchActions: BatchAction[] = [
    {
      key: 'delete',
      label: '删除',
      icon: '🗑️',
      danger: true,
      minItems: 1,
      action: (items: DataItem[]) => this.batchDelete(items)
    },
    {
      key: 'export',
      label: '导出',
      icon: '📥',
      minItems: 1,
      action: (items: DataItem[]) => this.batchExport(items)
    },
    {
      key: 'retry',
      label: '重试',
      icon: '🔄',
      minItems: 1,
      action: (items: DataItem[]) => this.batchRetry(items)
    }
  ];

  ngOnInit(): void {
    this.initializeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dataManager.cleanup(this.selectedEntity);
  }

  // 初始化数据
  private initializeData(): void {
    const manager = this.dataManager.createManager({
      entity: this.selectedEntity,
      autoRefresh: true,
      refreshInterval: 30000,
      enableRealTime: true,
      pageSize: this.pagination.pageSize
    });

    this.data$ = manager.pipe(
      map(state => {
        this.totalItems = state.pagination.total;
        this.updateCounts(state.data);
        return state.data;
      }),
      takeUntil(this.destroy$)
    );

    // 加载数据
    this.loadData();
  }

  // 加载数据
  private loadData(): void {
    this.loading = true;
    this.dataManager.loadData(this.selectedEntity).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load data:', error);
        this.loading = false;
      }
    });
  }

  // 更新统计数据
  private updateCounts(data: DataItem[]): void {
    this.successCount = data.filter(item => item.status === 'success').length;
    this.failedCount = data.filter(item => item.status === 'failed').length;
    this.pendingCount = data.filter(item => item.status === 'pending').length;
  }

  // 事件处理
  onEntityChange(): void {
    this.selectedItems = [];
    this.pagination.currentPage = 1;
    this.dataManager.cleanup(this.selectedEntity);
    this.initializeData();
  }

  applyAdvancedFilters(): void {
    const filters: FilterConfig = {
      keyword: '',
      filters: {
        ...this.advancedFilters
      }
    };

    this.dataManager.applyFilter(this.selectedEntity, filters);
  }

  onPageChange(event: { page: number; pageSize: number }): void {
    this.pagination.currentPage = event.page;
    this.pagination.pageSize = event.pageSize;
    this.dataManager.changePage(this.selectedEntity, event.page, event.pageSize);
  }

  onSortChange(event: { field: string; order: 'asc' | 'desc' }): void {
    const sortConfig: SortConfig = {
      field: event.field,
      order: event.order
    };
    this.dataManager.applySort(this.selectedEntity, sortConfig);
  }

  onFilterChange(event: { keyword: string }): void {
    const filterConfig: FilterConfig = {
      keyword: event.keyword,
      filters: this.advancedFilters
    };
    this.dataManager.applyFilter(this.selectedEntity, filterConfig);
  }

  onSelectionChange(items: DataItem[]): void {
    this.selectedItems = items;
  }

  onSelectAll(selectAll: boolean): void {
    // 选择逻辑由数据表格组件处理
  }

  clearSelection(): void {
    this.selectedItems = [];
  }

  onBatchAction(event: { action: BatchAction; items: DataItem[] }): void {
    console.log('Batch action:', event.action.key, event.items);
  }

  refreshData(): void {
    this.loadData();
  }

  // 数据操作
  createNewItem(): void {
    console.log('Create new item for:', this.selectedEntity);
  }

  editItem(item: DataItem): void {
    console.log('Edit item:', item);
  }

  deleteItem(item: DataItem): void {
    if (confirm('确定要删除这个项目吗？')) {
      this.dataManager.deleteItems(this.selectedEntity, [item.id]).subscribe({
        next: (success) => {
          if (success) {
            console.log('Item deleted successfully');
          }
        },
        error: (error) => {
          console.error('Failed to delete item:', error);
        }
      });
    }
  }

  retryItem(item: DataItem): void {
    console.log('Retry item:', item);
  }

  // 批量操作
  batchDelete(items: DataItem[]): void {
    if (confirm(`确定要删除选中的 ${items.length} 个项目吗？`)) {
      const ids = items.map(item => item.id);
      this.dataManager.deleteItems(this.selectedEntity, ids).subscribe({
        next: (success) => {
          if (success) {
            console.log('Batch delete successful');
            this.clearSelection();
          }
        },
        error: (error) => {
          console.error('Batch delete failed:', error);
        }
      });
    }
  }

  batchExport(items: DataItem[]): void {
    console.log('Export items:', items.length);
  }

  batchRetry(items: DataItem[]): void {
    console.log('Retry items:', items.length);
  }

  // 工具方法
  private formatType(type: string): string {
    const typeMap: Record<string, string> = {
      'news': '新闻',
      'social': '社交',
      'video': '视频',
      'image': '图片'
    };
    return typeMap[type] || type;
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'success': '成功',
      'failed': '失败',
      'pending': '待处理',
      'running': '运行中'
    };
    return statusMap[status] || status;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  }
}