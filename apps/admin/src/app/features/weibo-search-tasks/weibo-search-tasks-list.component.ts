import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { WeiboSearchTask, WeiboSearchTaskFilters } from '@pro/types';

import { SelectComponent } from '../../shared/components/select';
import type { SelectOption } from '../../shared/components/select';
import { ToastService } from '../../shared/services/toast.service';
import { WeiboSearchTasksQuery } from '../../state/weibo-search-tasks.query';
import { WeiboSearchTasksService } from '../../state/weibo-search-tasks.service';

@Component({
  selector: 'app-weibo-search-tasks-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectComponent,
  ],
  templateUrl: './weibo-search-tasks-list.component.html',
  styleUrls: ['./weibo-search-tasks-list.component.scss'],
})
export class WeiboSearchTasksListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  tasks$ = this.query.tasks$;
  loading$ = this.query.loading$;
  error$ = this.query.error$;
  total$ = this.query.total$;
  page$ = this.query.page$;
  limit$ = this.query.limit$;
  totalPages$ = this.query.totalPages$;
  filters$ = this.query.filters$;

  total = 0;
  page = 1;
  limit = 20;
  totalPages = 0;

  searchKeyword = '';
  selectedEnabled: '' | 'true' | 'false' = '';

  enabledOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: 'true', label: '启用' },
    { value: 'false', label: '禁用' },
  ];

  constructor(
    private readonly service: WeiboSearchTasksService,
    private readonly query: WeiboSearchTasksQuery,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSubscriptions(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (typeof params['keyword'] === 'string') {
        this.searchKeyword = params['keyword'];
      }
      if (typeof params['enabled'] === 'string') {
        this.selectedEnabled = params['enabled'] === 'true'
          ? 'true'
          : params['enabled'] === 'false'
            ? 'false'
            : '';
      }
    });

    this.total$.pipe(takeUntil(this.destroy$)).subscribe(total => (this.total = total));
    this.page$.pipe(takeUntil(this.destroy$)).subscribe(page => (this.page = page));
    this.limit$.pipe(takeUntil(this.destroy$)).subscribe(limit => (this.limit = limit));
    this.totalPages$.pipe(takeUntil(this.destroy$)).subscribe(pages => (this.totalPages = pages));
  }

  loadTasks(): void {
    this.service.findAll().pipe(takeUntil(this.destroy$)).subscribe();
  }

  applyFilters(): void {
    const filters: Partial<WeiboSearchTaskFilters> = {};

    if (this.searchKeyword.trim()) {
      filters.keyword = this.searchKeyword.trim();
    }

    if (this.selectedEnabled === 'true') {
      filters.enabled = true;
    } else if (this.selectedEnabled === 'false') {
      filters.enabled = false;
    }

    this.service.updateFilters(filters);
    this.loadTasks();
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedEnabled = '';
    this.service.resetFilters();
    this.loadTasks();
  }

  onPageChange(page: number): void {
    this.service.updateFilters({ page });
    this.loadTasks();
  }

  onPageSizeChange(limit: number): void {
    this.service.updateFilters({ page: 1, limit });
    this.loadTasks();
  }

  createTask(): void {
    this.router.navigate(['/weibo-search-tasks/create']);
  }

  viewTask(task: WeiboSearchTask): void {
    this.router.navigate(['/weibo-search-tasks', task.id]);
  }

  editTask(task: WeiboSearchTask): void {
    this.router.navigate(['/weibo-search-tasks', task.id, 'edit']);
  }

  pauseTask(task: WeiboSearchTask): void {
    this.service.pause(task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => {
        console.error('暂停任务失败:', error);
        this.toast.error(error.message || '暂停任务失败');
      },
    });
  }

  resumeTask(task: WeiboSearchTask): void {
    this.service.resume(task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => {
        console.error('恢复任务失败:', error);
        this.toast.error(error.message || '恢复任务失败');
      },
    });
  }

  runTaskNow(task: WeiboSearchTask): void {
    this.service.runNow(task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => {
        console.error('执行任务失败:', error);
        this.toast.error(error.message || '执行任务失败');
      },
    });
  }

  deleteTask(task: WeiboSearchTask): void {
    this.service.delete(task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => {
        console.error('删除任务失败:', error);
        this.toast.error(error.message || '删除任务失败');
      },
    });
  }

  canPauseTask(task: WeiboSearchTask): boolean {
    return task.enabled;
  }

  canResumeTask(task: WeiboSearchTask): boolean {
    return !task.enabled;
  }

  canRunNowTask(task: WeiboSearchTask): boolean {
    return task.enabled;
  }

  isTaskDue(task: WeiboSearchTask): boolean {
    if (!task.enabled) return false;
    if (!task.nextRunAt) return true;
    const nextRun = task.nextRunAt instanceof Date ? task.nextRunAt : new Date(task.nextRunAt);
    return !Number.isNaN(nextRun.getTime()) && nextRun.getTime() <= Date.now();
  }

  formatTime(date?: Date): string {
    if (!date) return '-';
    try {
      const target = date instanceof Date ? date : new Date(date);
      const diffMs = Date.now() - target.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return '刚刚';
      if (diffMinutes < 60) return `${diffMinutes}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;

      return target.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  }

  formatDateTime(date?: Date): string {
    if (!date) return '-';
    try {
      const target = date instanceof Date ? date : new Date(date);
      return target.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  }

  trackByTaskId(index: number, task: WeiboSearchTask): number {
    return task.id;
  }
}

