import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subject, takeUntil } from 'rxjs';

import { WeiboSearchTask } from '@pro/types';

import { WeiboSearchTasksQuery } from '../../state/weibo-search-tasks.query';
import { WeiboSearchTasksService } from '../../state/weibo-search-tasks.service';

interface TaskTimeline {
  time: Date;
  title: string;
  description?: string;
  type: 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-weibo-search-task-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weibo-search-task-detail.component.html',
  styleUrls: ['./weibo-search-task-detail.component.scss'],
})
export class WeiboSearchTaskDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly refreshInterval$ = interval(30000);

  selectedTask$ = this.query.selectedTask$;
  loading$ = this.query.loading$;
  error$ = this.query.error$;

  taskId: number | null = null;
  task: WeiboSearchTask | null = null;
  timeline: TaskTimeline[] = [];

  constructor(
    private readonly service: WeiboSearchTasksService,
    private readonly query: WeiboSearchTasksQuery,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.loadTask();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSubscriptions(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        const numericId = Number(id);
        if (!Number.isNaN(numericId)) {
          this.taskId = numericId;
          this.loadTask();
        }
      }
    });

    this.selectedTask$.pipe(takeUntil(this.destroy$)).subscribe(task => {
      this.task = task;
      if (task) {
        this.generateTimeline(task);
      }
    });

    this.refreshInterval$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.taskId !== null) {
        this.loadTask();
      }
    });
  }

  private loadTask(): void {
    if (this.taskId === null) return;
    this.service.findOne(this.taskId).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => console.error('任务详情加载失败:', error),
    });
  }

  private generateTimeline(task: WeiboSearchTask): void {
    const timeline: TaskTimeline[] = [];
    const add = (entry: TaskTimeline) => timeline.push(entry);

    add({
      time: task.createdAt,
      title: '任务创建',
      description: `关键词：${task.keyword}`,
      type: 'success',
    });

    add({
      time: task.startDate,
      title: '监控开始',
      description: `起始时间：${this.formatDate(task.startDate)}`,
      type: 'info',
    });

    if (task.latestCrawlTime) {
      add({
        time: task.latestCrawlTime,
        title: '最新抓取完成',
        description: `抓取时间：${this.formatDateTime(task.latestCrawlTime)}`,
        type: 'success',
      });
    }

    if (task.nextRunAt) {
      add({
        time: task.nextRunAt,
        title: '下一次调度',
        description: `计划执行：${this.formatDateTime(task.nextRunAt)}`,
        type: this.isTaskDue(task) ? 'warning' : 'info',
      });
    }

    timeline.push({
      time: task.updatedAt,
      title: '最近更新',
      description: `更新时间：${this.formatDateTime(task.updatedAt)}`,
      type: 'info',
    });

    this.timeline = timeline.sort((a, b) => b.time.getTime() - a.time.getTime());
  }

  goBack(): void {
    this.router.navigate(['/weibo-search-tasks']);
  }

  editTask(): void {
    if (!this.task) return;
    this.router.navigate(['/weibo-search-tasks', this.task.id, 'edit']);
  }

  pauseTask(): void {
    if (!this.task) return;
    this.service.pause(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => alert(`暂停任务失败: ${error.message || '未知错误'}`),
    });
  }

  resumeTask(): void {
    if (!this.task) return;
    this.service.resume(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => alert(`恢复任务失败: ${error.message || '未知错误'}`),
    });
  }

  runNow(): void {
    if (!this.task) return;
    this.service.runNow(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
      error: error => alert(`执行任务失败: ${error.message || '未知错误'}`),
    });
  }

  deleteTask(): void {
    if (!this.task) return;
    if (!confirm('确定要删除这个任务吗？此操作不可恢复。')) return;

    this.service.delete(this.task.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.router.navigate(['/weibo-search-tasks']),
      error: error => alert(`删除任务失败: ${error.message || '未知错误'}`),
    });
  }

  canPauseTask(): boolean {
    return !!this.task?.enabled;
  }

  canResumeTask(): boolean {
    return !!this.task && !this.task.enabled;
  }

  canRunNowTask(): boolean {
    return !!this.task?.enabled;
  }

  shouldShowWarning(): boolean {
    if (!this.task) return false;
    if (!this.task.enabled) return true;
    return this.isTaskDue(this.task);
  }

  getWarningMessage(): string {
    if (!this.task) return '';
    if (!this.task.enabled) {
      return '任务已禁用，调度服务不会执行该任务。';
    }
    if (this.isTaskDue(this.task)) {
      return '任务已到达执行时间，请确认调度服务是否正常运行。';
    }
    return '';
  }

  formatTime(date?: Date): string {
    if (!date) return '-';
    const target = date instanceof Date ? date : new Date(date);
    return target.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatRelativeTime(date?: Date): string {
    if (!date) return '-';
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
  }

  private formatDate(date: Date): string {
    const target = date instanceof Date ? date : new Date(date);
    return target.toISOString().slice(0, 10);
  }

  private formatDateTime(date: Date): string {
    return this.formatTime(date);
  }

  private isTaskDue(task: WeiboSearchTask): boolean {
    if (!task.enabled) return false;
    if (!task.nextRunAt) return true;
    const nextRun = task.nextRunAt instanceof Date ? task.nextRunAt : new Date(task.nextRunAt);
    return !Number.isNaN(nextRun.getTime()) && nextRun.getTime() <= Date.now();
  }
}

