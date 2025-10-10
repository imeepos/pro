import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { WeiboSearchTasksStore } from './weibo-search-tasks.store';
import { WeiboSearchTasksQuery } from './weibo-search-tasks.query';
import { SkerSDK } from '@pro/sdk';
import {
  WeiboSearchTask,
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  WeiboSearchTaskFilters,
  WeiboSearchTaskStatus
} from '@pro/types';

@Injectable({ providedIn: 'root' })
export class WeiboSearchTasksService {
  private readonly sdk: SkerSDK;
  constructor(
    private store: WeiboSearchTasksStore,
    private query: WeiboSearchTasksQuery
  ) {
    this.sdk = inject(SkerSDK);
  }

  // 获取任务列表
  findAll(filters?: WeiboSearchTaskFilters): Observable<any> {
    this.updateLoading(true);
    this.updateError(null);

    const currentFilters = { ...this.query.filters, ...filters };

    return this.sdk.weiboSearchTasks.findAll(currentFilters).pipe(
      tap(response => {
        this.store.update({
          tasks: response.data,
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
          filters: currentFilters
        });
      }),
      catchError(error => {
        this.updateError(error.message || '获取任务列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 获取单个任务
  findOne(id: number): Observable<WeiboSearchTask> {
    this.updateLoading(true);
    this.updateError(null);

    return this.sdk.weiboSearchTasks.findOne(id).pipe(
      tap(task => {
        this.store.update({ selectedTask: task });
      }),
      catchError(error => {
        this.updateError(error.message || '获取任务详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 创建任务
  create(dto: CreateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    this.updateLoading(true);
    this.updateError(null);

    return this.sdk.weiboSearchTasks.create(dto).pipe(
      tap(task => {
        const currentTasks = this.query.tasks || [];
        this.store.update({
          tasks: [task, ...currentTasks],
          selectedTask: task
        });
      }),
      catchError(error => {
        this.updateError(error.message || '创建任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 更新任务
  update(id: number, updates: UpdateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    this.updateLoading(true);
    this.updateError(null);

    return this.sdk.weiboSearchTasks.update(id, updates).pipe(
      tap(updatedTask => {
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updatedTask } : task
          ),
          selectedTask: state.selectedTask?.id === id
            ? { ...state.selectedTask, ...updatedTask }
            : state.selectedTask
        }));
      }),
      catchError(error => {
        this.updateError(error.message || '更新任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 删除任务
  delete(id: number): Observable<void> {
    this.updateLoading(true);
    this.updateError(null);

    return this.sdk.weiboSearchTasks.delete(id).pipe(
      tap(() => {
        this.store.update(state => ({
          tasks: state.tasks.filter(task => task.id !== id),
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask
        }));
      }),
      catchError(error => {
        this.updateError(error.message || '删除任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 暂停任务
  pause(id: number): Observable<void> {
    this.updateLoading(true);

    return this.sdk.weiboSearchTasks.pause(id).pipe(
      tap(() => {
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, enabled: false, status: WeiboSearchTaskStatus.PAUSED } : task
          )
        }));
      }),
      catchError(error => {
        this.updateError(error.message || '暂停任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 恢复任务
  resume(id: number): Observable<void> {
    this.updateLoading(true);

    return this.sdk.weiboSearchTasks.resume(id).pipe(
      tap(() => {
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, enabled: true, status: WeiboSearchTaskStatus.PENDING, nextRunAt: new Date() } : task
          )
        }));
      }),
      catchError(error => {
        this.updateError(error.message || '恢复任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 立即执行任务
  runNow(id: number): Observable<void> {
    this.updateLoading(true);

    return this.sdk.weiboSearchTasks.runNow(id).pipe(
      tap(() => {
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, status: WeiboSearchTaskStatus.RUNNING, nextRunAt: new Date() } : task
          )
        }));
      }),
      catchError(error => {
        this.updateError(error.message || '执行任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.updateLoading(false))
    );
  }

  // 获取任务统计
  getStats(): Observable<any> {
    return this.sdk.weiboSearchTasks.getStats();
  }

  // 更新筛选条件
  updateFilters(filters: Partial<WeiboSearchTaskFilters>): void {
    this.store.update(state => ({
      filters: { ...state.filters, ...filters }
    }));
  }

  // 重置筛选条件
  resetFilters(): void {
    this.store.update({
      filters: {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    });
  }

  // 选择任务
  selectTask(task: WeiboSearchTask | null): void {
    this.store.update({ selectedTask: task });
  }

  // 清除错误
  clearError(): void {
    this.updateError(null);
  }

  // 刷新列表
  refresh(): Observable<any> {
    return this.findAll();
  }

  // 私有方法
  private updateLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private updateError(error: string | null): void {
    this.store.update({ error });
  }
}