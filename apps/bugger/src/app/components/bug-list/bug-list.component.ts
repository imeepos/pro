import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BugService } from '../../services/bug.service';
import { Bug, BugFilters, BugPriority, BugStatus } from '@pro/types';
import { Subscription } from 'rxjs';
import { BugFilterStateService } from '../../services/bug-filter-state.service';

@Component({
  selector: 'app-bug-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in">
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Bug列表</h1>
          <p class="text-gray-600 mt-1">管理和追踪所有Bug报告</p>
        </div>
        <button (click)="createNewBug()" class="btn-primary">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          提交Bug
        </button>
      </div>

      <!-- 筛选器 -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              [(ngModel)]="filters.search"
              (keyup)="onSearchChange()"
              placeholder="搜索Bug标题..."
              class="form-input">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select [(ngModel)]="selectedStatus" (change)="onFilterChange()" class="form-input">
              <option value="">全部状态</option>
              <option [value]="statusEnum.OPEN">待处理</option>
              <option [value]="statusEnum.IN_PROGRESS">进行中</option>
              <option [value]="statusEnum.RESOLVED">已解决</option>
              <option [value]="statusEnum.CLOSED">已关闭</option>
              <option [value]="statusEnum.REJECTED">已拒绝</option>
              <option [value]="statusEnum.REOPENED">已重新打开</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <select [(ngModel)]="selectedPriority" (change)="onFilterChange()" class="form-input">
              <option value="">全部优先级</option>
              <option [value]="priorityEnum.LOW">低</option>
              <option [value]="priorityEnum.MEDIUM">中</option>
              <option [value]="priorityEnum.HIGH">高</option>
              <option [value]="priorityEnum.CRITICAL">紧急</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">排序</label>
            <select [(ngModel)]="sortBy" (change)="onSortChange()" class="form-input">
              <option value="createdAt">创建时间</option>
              <option value="updatedAt">更新时间</option>
              <option value="priority">优先级</option>
              <option value="status">状态</option>
              <option value="title">标题</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Bug列表 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Bug列表</h3>
            <span class="text-sm text-gray-500">共 {{ total }} 个Bug</span>
          </div>
        </div>

        <div class="divide-y divide-gray-200">
          <div *ngIf="loading" class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-500">加载中...</p>
          </div>

          <div *ngIf="!loading && bugs.length === 0" class="p-8 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">暂无Bug记录</h3>
            <p class="mt-1 text-sm text-gray-500">开始提交第一个Bug报告</p>
          </div>

          <div *ngFor="let bug of bugs" class="p-4 hover:bg-gray-50 cursor-pointer transition-colors" (click)="viewBug(bug.id)">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <h3 class="text-lg font-medium text-gray-900">{{ bug.title }}</h3>
                  <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + getPriorityClass(bug.priority)">
                    {{ getPriorityText(bug.priority) }}
                  </span>
                  <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + getStatusClass(bug.status)">
                    {{ getStatusText(bug.status) }}
                  </span>
                </div>
                <p class="text-gray-600 mb-2 line-clamp-2">{{ bug.description }}</p>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span>创建于 {{ bug.createdAt | date:'short' }}</span>
                  <span *ngIf="bug.assigneeId">分配给 {{ bug.assigneeId }}</span>
                  <span *ngIf="bug.comments && bug.comments.length > 0">{{ bug.comments.length }} 个评论</span>
                  <span *ngIf="bug.attachments && bug.attachments.length > 0">{{ bug.attachments.length }} 个附件</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div *ngIf="total > 0" class="p-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              显示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ (currentPage * pageSize < total ? currentPage * pageSize : total) }} 条，共 {{ total }} 条
            </div>
            <div class="flex space-x-2">
              <button
                (click)="previousPage()"
                [disabled]="currentPage === 1"
                class="btn-secondary"
                [class.opacity-50]="currentPage === 1">
                上一页
              </button>
              <span class="px-3 py-2 text-sm text-gray-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                (click)="nextPage()"
                [disabled]="currentPage >= totalPages"
                class="btn-secondary"
                [class.opacity-50]="currentPage >= totalPages">
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  `]
})
export class BugListComponent implements OnInit, OnDestroy {
  bugs: Bug[] = [];
  loading = true;
  total = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  filters: BugFilters = {};

  selectedStatus: BugStatus | '' = '';
  selectedPriority: BugPriority | '' = '';
  sortBy: BugFilters['sortBy'] = 'createdAt';

  readonly statusEnum = BugStatus;
  readonly priorityEnum = BugPriority;

  private filtersSubscription?: Subscription;

  constructor(
    private bugService: BugService,
    private router: Router,
    private bugFilterState: BugFilterStateService
  ) {}

  ngOnInit(): void {
    this.filtersSubscription = this.bugFilterState.filters$.subscribe((filters) => {
      this.applyFilters(filters);
      this.loadBugs();
    });
  }

  ngOnDestroy(): void {
    this.filtersSubscription?.unsubscribe();
  }

  loadBugs(): void {
    this.loading = true;
    const requestFilters: BugFilters = {
      ...this.filters,
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: this.sortBy ?? 'createdAt',
      sortOrder: this.filters.sortOrder ?? 'desc'
    };

    this.bugService.getBugs(requestFilters).subscribe(result => {
      if (result.success && result.data) {
        this.bugs = result.data.bugs;
        this.total = result.data.total;
        this.totalPages = Math.ceil(this.total / this.pageSize);
      } else {
        this.bugs = [];
        this.total = 0;
        this.totalPages = 0;
      }
      this.loading = false;
    });
  }

  onSearchChange(): void {
    const search = this.filters.search?.trim();
    this.bugFilterState.update({
      search: search ? search : undefined,
      page: 1
    });
  }

  onFilterChange(): void {
    this.bugFilterState.update({
      status: this.selectedStatus ? [this.selectedStatus] : undefined,
      priority: this.selectedPriority ? [this.selectedPriority] : undefined,
      page: 1
    });
  }

  onSortChange(): void {
    this.bugFilterState.update({
      sortBy: this.sortBy,
      page: 1
    });
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.bugFilterState.update({
        page: this.currentPage - 1
      });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.bugFilterState.update({
        page: this.currentPage + 1
      });
    }
  }

  viewBug(id: string): void {
    this.router.navigate(['/bugs', id]);
  }

  createNewBug(): void {
    this.router.navigate(['/bugs', 'new']);
  }

  getPriorityClass(priority: BugPriority): string {
    const classes = {
      [this.priorityEnum.LOW]: 'bg-green-100 text-green-800',
      [this.priorityEnum.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [this.priorityEnum.HIGH]: 'bg-red-100 text-red-800',
      [this.priorityEnum.CRITICAL]: 'bg-red-200 text-red-900 font-bold',
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  getPriorityText(priority: BugPriority): string {
    const texts = {
      [this.priorityEnum.LOW]: '低',
      [this.priorityEnum.MEDIUM]: '中',
      [this.priorityEnum.HIGH]: '高',
      [this.priorityEnum.CRITICAL]: '紧急',
    };
    return texts[priority] || priority;
  }

  getStatusClass(status: BugStatus): string {
    const classes = {
      [this.statusEnum.OPEN]: 'bg-blue-100 text-blue-800',
      [this.statusEnum.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
      [this.statusEnum.RESOLVED]: 'bg-green-100 text-green-800',
      [this.statusEnum.CLOSED]: 'bg-gray-100 text-gray-800',
      [this.statusEnum.REJECTED]: 'bg-red-100 text-red-800',
      [this.statusEnum.REOPENED]: 'bg-purple-100 text-purple-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: BugStatus): string {
    const texts = {
      [this.statusEnum.OPEN]: '待处理',
      [this.statusEnum.IN_PROGRESS]: '进行中',
      [this.statusEnum.RESOLVED]: '已解决',
      [this.statusEnum.CLOSED]: '已关闭',
      [this.statusEnum.REJECTED]: '已拒绝',
      [this.statusEnum.REOPENED]: '已重新打开',
    };
    return texts[status] || status;
  }

  private applyFilters(filters: BugFilters): void {
    this.filters = {
      ...filters,
      status: filters.status ? [...filters.status] : undefined,
      priority: filters.priority ? [...filters.priority] : undefined,
      tagIds: filters.tagIds ? [...filters.tagIds] : undefined,
      category: filters.category ? [...filters.category] : undefined,
    };

    this.currentPage = filters.page ?? 1;
    this.pageSize = filters.limit ?? 10;
    this.sortBy = filters.sortBy ?? 'createdAt';

    this.selectedStatus = filters.status?.[0] ?? '';
    this.selectedPriority = filters.priority?.[0] ?? '';
  }
}
