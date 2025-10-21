import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';

import { WeiboSearchTask, WeiboSearchTaskFilters } from '@pro/types';

import {
  CreateWeiboSearchTaskDocument,
  PauseWeiboSearchTaskDocument,
  RemoveWeiboSearchTaskDocument,
  ResumeWeiboSearchTaskDocument,
  RunWeiboSearchTaskNowDocument,
  UpdateWeiboSearchTaskDocument,
  WeiboSearchTaskDocument,
  WeiboSearchTaskStatsDocument,
  WeiboSearchTasksDocument,
} from '../core/graphql/generated/graphql';

import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import { WeiboSearchTasksQuery } from './weibo-search-tasks.query';
import { WeiboSearchTasksStore } from './weibo-search-tasks.store';

@Injectable({ providedIn: 'root' })
export class WeiboSearchTasksService {
  constructor(
    private readonly store: WeiboSearchTasksStore,
    private readonly query: WeiboSearchTasksQuery,
    private readonly graphql: GraphqlGateway,
  ) {}

  findAll(filters?: WeiboSearchTaskFilters): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const currentFilters = { ...this.query.filters, ...filters };
    const variables = this.buildQueryVariables(currentFilters);

    return from(
      this.graphql.request(WeiboSearchTasksDocument, variables),
    ).pipe(
      tap(response => {
        const tasks = response.weiboSearchTasks.edges.map(edge => this.adaptTask(edge.node));
        const totalCount = response.weiboSearchTasks.totalCount;
        const limit = currentFilters.limit || 20;
        const page = currentFilters.page || 1;

        this.store.update({
          tasks,
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          filters: currentFilters,
        });
      }),
      catchError(error => {
        this.setError(error.message || '获取任务列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined),
    );
  }

  findOne(id: number): Observable<WeiboSearchTask> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(WeiboSearchTaskDocument, { id: Number(id) }),
    ).pipe(
      map(response => this.adaptTask(response.weiboSearchTask)),
      tap(task => {
        this.store.update({ selectedTask: task });
      }),
      catchError(error => {
        this.setError(error.message || '获取任务详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  create(input: any): Observable<WeiboSearchTask> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(CreateWeiboSearchTaskDocument, { input }),
    ).pipe(
      map(response => this.adaptTask(response.createWeiboSearchTask)),
      tap(task => {
        const currentTasks = this.query.tasks || [];
        this.store.update({
          tasks: [task, ...currentTasks],
          selectedTask: task,
        });
      }),
      catchError(error => {
        this.setError(error.message || '创建任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  update(id: number, input: any): Observable<WeiboSearchTask> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(UpdateWeiboSearchTaskDocument, { id: Number(id), input }),
    ).pipe(
      map(response => this.adaptTask(response.updateWeiboSearchTask)),
      tap(task => this.updateTaskInStore(task)),
      catchError(error => {
        this.setError(error.message || '更新任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  delete(id: number): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(RemoveWeiboSearchTaskDocument, { id: Number(id) }),
    ).pipe(
      tap(() => {
        this.store.update(state => ({
          tasks: state.tasks.filter(task => task.id !== id),
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
        }));
      }),
      catchError(error => {
        this.setError(error.message || '删除任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined),
    );
  }

  pause(id: number, reason?: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const input = reason ? { reason } : undefined;

    return from(
      this.graphql.request(PauseWeiboSearchTaskDocument, { id: Number(id), input }),
    ).pipe(
      tap(response => this.updateTaskInStore(this.adaptTask(response.pauseWeiboSearchTask))),
      catchError(error => {
        this.setError(error.message || '暂停任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined),
    );
  }

  resume(id: number, reason?: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const input = reason ? { reason } : undefined;

    return from(
      this.graphql.request(ResumeWeiboSearchTaskDocument, { id: Number(id), input }),
    ).pipe(
      tap(response => this.updateTaskInStore(this.adaptTask(response.resumeWeiboSearchTask))),
      catchError(error => {
        this.setError(error.message || '恢复任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined),
    );
  }

  runNow(id: number, reason?: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const input = reason ? { reason } : undefined;

    return from(
      this.graphql.request(RunWeiboSearchTaskNowDocument, { id: Number(id), input }),
    ).pipe(
      tap(response => this.updateTaskInStore(this.adaptTask(response.runWeiboSearchTaskNow))),
      catchError(error => {
        this.setError(error.message || '执行任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined),
    );
  }

  getStats(): Observable<{ total: number; enabled: number; disabled: number }> {
    return from(
      this.graphql.request(WeiboSearchTaskStatsDocument),
    ).pipe(
      map(response => response.weiboSearchTaskStats),
    );
  }

  updateFilters(filters: Partial<WeiboSearchTaskFilters>): void {
    this.store.update(state => ({
      filters: { ...state.filters, ...filters },
    }));
  }

  resetFilters(): void {
    this.store.update({
      filters: {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    });
  }

  selectTask(task: WeiboSearchTask | null): void {
    this.store.update({ selectedTask: task });
  }

  clearError(): void {
    this.setError(null);
  }

  refresh(): Observable<void> {
    return this.findAll();
  }

  private buildQueryVariables(filters: WeiboSearchTaskFilters): Record<string, unknown> {
    return {
      page: filters.page ?? undefined,
      limit: filters.limit ?? undefined,
      keyword: filters.keyword ?? undefined,
      enabled: filters.enabled ?? undefined,
      sortBy: filters.sortBy ?? undefined,
      sortOrder: filters.sortOrder ? filters.sortOrder.toUpperCase() : undefined,
    };
  }

  private updateTaskInStore(task: WeiboSearchTask): void {
    this.store.update(state => ({
      tasks: state.tasks.map(existing => (existing.id === task.id ? task : existing)),
      selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask,
    }));
  }

  private adaptTask(node: any): WeiboSearchTask {
    return {
      id: Number(node.id),
      keyword: node.keyword,
      enabled: Boolean(node.enabled),
      crawlInterval: node.crawlInterval,
      startDate: this.parseDate(node.startDate),
      latestCrawlTime: this.parseOptionalDate(node.latestCrawlTime),
      nextRunAt: this.parseOptionalDate(node.nextRunAt),
      createdAt: this.parseDate(node.createdAt),
      updatedAt: this.parseDate(node.updatedAt),
    };
  }

  private parseDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    throw new Error(`无法解析日期: ${String(value)}`);
  }

  private parseOptionalDate(value: unknown): Date | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
