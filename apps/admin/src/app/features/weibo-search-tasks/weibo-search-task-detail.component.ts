import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { WeiboSearchTasksService } from '../../state/weibo-search-tasks.service';
import { WeiboSearchTasksQuery } from '../../state/weibo-search-tasks.query';
import { WeiboSearchTask, WeiboSearchTaskStatus } from '@pro/types';

interface TaskTimeline {
  time: Date;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Component({
  selector: 'app-weibo-search-task-detail',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './weibo-search-task-detail.component.html',
  styleUrls: ['./weibo-search-task-detail.component.scss']
})
export class WeiboSearchTaskDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshInterval$ = interval(30000); // 每30秒刷新一次

  // 数据流
  selectedTask$ = this.query.selectedTask$;
  loading$ = this.query.loading$;
  error$ = this.query.error$;

  // 组件状态
  taskId: number | null = null;
  task: WeiboSearchTask | null = null;
  timeline: TaskTimeline[] = [];

  // 枚举
  taskStatus = WeiboSearchTaskStatus;

  constructor(
    private service: WeiboSearchTasksService,
    private query: WeiboSearchTasksQuery,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.loadTask();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 初始化订阅
  private initializeSubscriptions(): void {
    // 监听路由参数
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.taskId = +id;
        this.loadTask();
      }
    });

    // 监听选中的任务
    this.selectedTask$.pipe(takeUntil(this.destroy$)).subscribe(task => {
      this.task = task;
      if (task) {
        this.generateTimeline();
      }
    });

    // 定时刷新
    this.refreshInterval$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.taskId) {
        this.loadTask();
      }
    });
  }

  // 加载任务详情
  private loadTask(): void {
    if (this.taskId) {
      this.service.findOne(this.taskId);
    }
  }

  // 生成时间线
  private generateTimeline(): void {
    if (!this.task) return;

    const timeline: TaskTimeline[] = [];

    // 创建时间
    timeline.push({
      time: new Date(this.task.createdAt),
      title: '任务创建',
      description: `关键词"${this.task.keyword}"监控任务已创建`,
      type: 'success'
    });

    // 更新时间
    if (this.task.updatedAt && this.task.updatedAt !== this.task.createdAt) {
      timeline.push({
        time: new Date(this.task.updatedAt),
        title: '任务更新',
        description: '任务配置已更新',
        type: 'info'
      });
    }

    // 起始抓取时间
    if (this.task.currentCrawlTime) {
      timeline.push({
        time: new Date(this.task.currentCrawlTime),
        title: '历史数据回溯进度',
        description: `已回溯至${this.formatTime(this.task.currentCrawlTime)}`,
        type: 'info'
      });
    }

    // 最新数据时间
    if (this.task.latestCrawlTime) {
      timeline.push({
        time: new Date(this.task.latestCrawlTime),
        title: '最新数据',
        description: `抓取到${this.formatTime(this.task.latestCrawlTime)}的数据`,
        type: 'success'
      });
    }

    // 下次执行时间
    if (this.task.nextRunAt && this.task.enabled) {
      timeline.push({
        time: new Date(this.task.nextRunAt),
        title: '下次执行',
        description: `计划在${this.formatTime(this.task.nextRunAt)}执行`,
        type: 'info'
      });
    }

    // 错误信息
    if (this.task.errorMessage) {
      timeline.push({
        time: new Date(this.task.updatedAt),
        title: '执行错误',
        description: this.task.errorMessage,
        type: 'error'
      });
    }

    // 按时间排序
    this.timeline = timeline.sort((a, b) => b.time.getTime() - a.time.getTime());
  }

  // 返回列表
  goBack(): void {
    this.router.navigate(['/weibo-search-tasks']);
  }

  // 编辑任务
  editTask(): void {
    if (this.task) {
      this.router.navigate(['/weibo-search-tasks', this.task.id, 'edit']);
    }
  }

  // 暂停任务
  pauseTask(): void {
    if (this.task) {
      this.service.pause(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          // 成功处理在 service 中完成
        },
        error: (error) => {
          console.error('暂停任务失败:', error);
        }
      });
    }
  }

  // 恢复任务
  resumeTask(): void {
    if (this.task) {
      this.service.resume(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          // 成功处理在 service 中完成
        },
        error: (error) => {
          console.error('恢复任务失败:', error);
        }
      });
    }
  }

  // 立即执行
  runNow(): void {
    if (this.task) {
      this.service.runNow(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          // 成功处理在 service 中完成
        },
        error: (error) => {
          console.error('执行任务失败:', error);
        }
      });
    }
  }

  // 删除任务
  deleteTask(): void {
    if (this.task && confirm('确定要删除这个任务吗？此操作不可恢复。')) {
      this.service.delete(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.router.navigate(['/weibo-search-tasks']);
        },
        error: (error) => {
          console.error('删除任务失败:', error);
        }
      });
    }
  }

  // 获取状态颜色
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
      return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return new Date(date).toLocaleString();
    }
  }

  // 格式化相对时间
  formatRelativeTime(date?: Date): string {
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

  // 格式化进度
  formatProgress(current: number, total: number): string {
    if (total === 0) return '0%';
    return Math.round((current / total) * 100) + '%';
  }

  // 检查是否可以暂停
  canPauseTask(): boolean {
    return this.task !== null && this.task.enabled && this.task.status !== WeiboSearchTaskStatus.PAUSED;
  }

  // 检查是否可以恢复
  canResumeTask(): boolean {
    return this.task !== null && (!this.task.enabled || this.task.status === WeiboSearchTaskStatus.PAUSED);
  }

  // 检查是否可以立即执行
  canRunNowTask(): boolean {
    return this.task !== null && this.task.enabled && this.task.status !== WeiboSearchTaskStatus.RUNNING;
  }

  // 获取进度状态
  getProgressStatus(): 'normal' | 'success' | 'exception' {
    if (!this.task) return 'normal';
    if (this.task.status === WeiboSearchTaskStatus.FAILED || this.task.status === WeiboSearchTaskStatus.TIMEOUT) {
      return 'exception';
    }
    if (this.task.progress === this.task.totalSegments && this.task.totalSegments > 0) {
      return 'success';
    }
    return 'normal';
  }

  // 计算完成率
  getCompletionRate(): number {
    if (!this.task || this.task.totalSegments === 0) return 0;
    return Math.round((this.task.progress / this.task.totalSegments) * 100);
  }

  // 判断是否显示警告
  shouldShowWarning(): boolean {
    if (!this.task) return false;
    return (
      this.task.status === WeiboSearchTaskStatus.FAILED ||
      this.task.status === WeiboSearchTaskStatus.TIMEOUT ||
      this.task.noDataCount > 0 ||
      !!this.task.errorMessage
    );
  }

  // 获取警告信息
  getWarningMessage(): string {
    if (!this.task) return '';

    if (this.task.errorMessage) {
      return this.task.errorMessage;
    }

    if (this.task.noDataCount > 0) {
      return `连续 ${this.task.noDataCount} 次未获取到数据，可能存在配置问题`;
    }

    return '任务执行遇到问题，请检查配置';
  }
}