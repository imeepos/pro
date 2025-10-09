import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { WeiboSearchTasksService } from '../../state/weibo-search-tasks.service';
import { WeiboSearchTasksQuery } from '../../state/weibo-search-tasks.query';
import { WeiboSearchTask, WeiboSearchTaskStatus, WeiboSearchTaskFilters } from '@pro/types';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-weibo-search-tasks-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './weibo-search-tasks-list.component.html',
  styleUrls: ['./weibo-search-tasks-list.component.scss']
})
export class WeiboSearchTasksListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 数据流
  tasks$ = this.query.tasks$;
  loading$ = this.query.loading$;
  error$ = this.query.error$;
  total$ = this.query.total$;
  page$ = this.query.page$;
  limit$ = this.query.limit$;
  totalPages$ = this.query.totalPages$;
  filters$ = this.query.filters$;

  // 本地状态
  total = 0;
  page = 1;
  limit = 20;
  totalPages = 0;

  // 组件状态
  searchKeyword = '';
  selectedStatus: WeiboSearchTaskStatus | '' = '';
  selectedEnabled: boolean | '' = '';

  // 枚举
  taskStatus = WeiboSearchTaskStatus;

  constructor(
    private service: WeiboSearchTasksService,
    private query: WeiboSearchTasksQuery,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 初始化订阅
  private initializeSubscriptions(): void {
    // 监听路由参数变化
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['keyword']) this.searchKeyword = params['keyword'];
      if (params['status']) this.selectedStatus = params['status'] as WeiboSearchTaskStatus;
      if (params['enabled'] !== undefined) this.selectedEnabled = params['enabled'] === 'true' ? true : params['enabled'] === 'false' ? false : '';
    });

    // 监听分页变化
    this.total$.pipe(takeUntil(this.destroy$)).subscribe(total => {
      this.total = total;
    });

    this.page$.pipe(takeUntil(this.destroy$)).subscribe(page => {
      this.page = page;
    });

    this.limit$.pipe(takeUntil(this.destroy$)).subscribe(limit => {
      this.limit = limit;
    });

    this.totalPages$.pipe(takeUntil(this.destroy$)).subscribe(totalPages => {
      this.totalPages = totalPages;
    });
  }

  // 加载任务列表
  loadTasks(): void {
    this.service.findAll();
  }

  // 应用筛选条件
  applyFilters(): void {
    const filters: Partial<WeiboSearchTaskFilters> = {};

    if (this.searchKeyword.trim()) {
      filters.keyword = this.searchKeyword.trim();
    }

    if (this.selectedStatus) {
      filters.status = this.selectedStatus;
    }

    if (this.selectedEnabled !== '') {
      filters.enabled = this.selectedEnabled as boolean;
    }

    this.service.updateFilters(filters);
    this.loadTasks();
  }

  // 重置筛选条件
  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedStatus = '';
    this.selectedEnabled = '';
    this.service.resetFilters();
    this.loadTasks();
  }

  // 分页变化
  onPageChange(page: number): void {
    this.service.updateFilters({ page });
    this.loadTasks();
  }

  // 每页条数变化
  onPageSizeChange(limit: number): void {
    this.service.updateFilters({ page: 1, limit });
    this.loadTasks();
  }

  // 创建任务
  createTask(): void {
    this.router.navigate(['/weibo-search-tasks/create']);
  }

  // 查看任务详情
  viewTask(task: WeiboSearchTask): void {
    this.router.navigate(['/weibo-search-tasks', task.id]);
  }

  // 编辑任务
  editTask(task: WeiboSearchTask): void {
    this.router.navigate(['/weibo-search-tasks', task.id, 'edit']);
  }

  // 暂停任务
  pauseTask(task: WeiboSearchTask): void {
    this.service.pause(task.id).subscribe({
      next: () => {
        // 成功处理在 service 中完成
      },
      error: (error) => {
        console.error('暂停任务失败:', error);
      }
    });
  }

  // 恢复任务
  resumeTask(task: WeiboSearchTask): void {
    this.service.resume(task.id).subscribe({
      next: () => {
        // 成功处理在 service 中完成
      },
      error: (error) => {
        console.error('恢复任务失败:', error);
      }
    });
  }

  // 立即执行任务
  runTaskNow(task: WeiboSearchTask): void {
    this.service.runNow(task.id).subscribe({
      next: () => {
        // 成功处理在 service 中完成
      },
      error: (error) => {
        console.error('执行任务失败:', error);
      }
    });
  }

  // 删除任务
  deleteTask(task: WeiboSearchTask): void {
    this.service.delete(task.id).subscribe({
      next: () => {
        // 成功处理在 service 中完成
      },
      error: (error) => {
        console.error('删除任务失败:', error);
      }
    });
  }

  // 获取状态标签颜色
  getStatusColor(status: WeiboSearchTaskStatus): string {
    switch (status) {
      case WeiboSearchTaskStatus.RUNNING:
        return 'processing';
      case WeiboSearchTaskStatus.PENDING:
        return 'default';
      case WeiboSearchTaskStatus.PAUSED:
        return 'warning';
      case WeiboSearchTaskStatus.FAILED:
        return 'error';
      case WeiboSearchTaskStatus.TIMEOUT:
        return 'error';
      default:
        return 'default';
    }
  }

  // 获取状态文本
  getStatusText(status: WeiboSearchTaskStatus): string {
    switch (status) {
      case WeiboSearchTaskStatus.RUNNING:
        return '运行中';
      case WeiboSearchTaskStatus.PENDING:
        return '等待中';
      case WeiboSearchTaskStatus.PAUSED:
        return '已暂停';
      case WeiboSearchTaskStatus.FAILED:
        return '失败';
      case WeiboSearchTaskStatus.TIMEOUT:
        return '超时';
      default:
        return '未知';
    }
  }

  // 格式化时间
  formatTime(date?: Date): string {
    if (!date) return '-';
    try {
      const now = new Date();
      const targetDate = new Date(date);
      const diffMs = now.getTime() - targetDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return '刚刚';
      if (diffMinutes < 60) return `${diffMinutes}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;

      return targetDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return new Date(date).toLocaleString();
    }
  }

  // 格式化日期时间
  formatDateTime(date?: Date): string {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return new Date(date).toLocaleString();
    }
  }

  // 格式化进度
  formatProgress(current: number, total: number): string {
    if (total === 0) return '0%';
    return Math.round((current / total) * 100) + '%';
  }

  // 检查是否可以暂停
  canPauseTask(task: WeiboSearchTask): boolean {
    return task.enabled && task.status !== WeiboSearchTaskStatus.PAUSED;
  }

  // 检查是否可以恢复
  canResumeTask(task: WeiboSearchTask): boolean {
    return !task.enabled || task.status === WeiboSearchTaskStatus.PAUSED;
  }

  // 检查是否可以立即执行
  canRunNowTask(task: WeiboSearchTask): boolean {
    return task.enabled && task.status !== WeiboSearchTaskStatus.RUNNING;
  }

  // trackBy函数
  trackByTaskId(index: number, task: WeiboSearchTask): number {
    return task.id;
  }

  // 计算完成率
  getCompletionRate(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  }

  // 最小值函数
  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}