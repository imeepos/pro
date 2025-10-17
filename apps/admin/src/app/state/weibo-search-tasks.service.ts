import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';
import { WeiboSearchTasksStore } from './weibo-search-tasks.store';
import { WeiboSearchTasksQuery } from './weibo-search-tasks.query';
import { WeiboSearchTask, WeiboSearchTaskFilters, WeiboSearchTaskStatus } from '@pro/types';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import { graphql } from '../core/graphql/generated';
import type { WeiboSearchTasksQueryVariables } from '../core/graphql/generated/graphql';
import { WeiboSearchTaskStatus as GqlWeiboSearchTaskStatus } from '../core/graphql/generated/graphql';

const WeiboSearchTasksQueryDoc = graphql(`
  query WeiboSearchTasks(
    $page: Int
    $limit: Int
    $status: WeiboSearchTaskStatus
    $keyword: String
    $enabled: Boolean
    $sortBy: String
    $sortOrder: String
  ) {
    weiboSearchTasks(
      filter: {
        page: $page
        limit: $limit
        status: $status
        keyword: $keyword
        enabled: $enabled
        sortBy: $sortBy
        sortOrder: $sortOrder
      }
    ) {
      edges {
        node {
          id
          keyword
          status
          enabled
          startDate
          progress
          totalSegments
          enableAccountRotation
          weiboAccountId
          maxRetries
          retryCount
          nextRunAt
          latestCrawlTime
          currentCrawlTime
          errorMessage
          createdAt
          updatedAt
        }
      }
      totalCount
    }
  }
`);

const WeiboSearchTaskQueryDoc = graphql(`
  query WeiboSearchTask($id: Int!) {
    weiboSearchTask(id: $id) {
      id
      keyword
      status
      enabled
      startDate
      progress
      totalSegments
      enableAccountRotation
      weiboAccountId
      maxRetries
      retryCount
      nextRunAt
      latestCrawlTime
      currentCrawlTime
      errorMessage
      createdAt
      updatedAt
    }
  }
`);

const WeiboSearchTaskStatsQueryDoc = graphql(`
  query WeiboSearchTaskStats {
    weiboSearchTaskStats {
      total
      enabled
      running
      paused
      completed
      failed
    }
  }
`);

const CreateWeiboSearchTaskMutation = graphql(`
  mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
    createWeiboSearchTask(input: $input) {
      id
      keyword
      status
      enabled
      startDate
      createdAt
    }
  }
`);

const UpdateWeiboSearchTaskMutation = graphql(`
  mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskInput!) {
    updateWeiboSearchTask(id: $id, input: $input) {
      id
      keyword
      status
      enabled
      startDate
      progress
      totalSegments
      updatedAt
    }
  }
`);

const PauseWeiboSearchTaskMutation = graphql(`
  mutation PauseWeiboSearchTask($id: Int!, $input: PauseWeiboTaskInput) {
    pauseWeiboSearchTask(id: $id, input: $input) {
      id
      status
      updatedAt
    }
  }
`);

const ResumeWeiboSearchTaskMutation = graphql(`
  mutation ResumeWeiboSearchTask($id: Int!, $input: ResumeWeiboTaskInput) {
    resumeWeiboSearchTask(id: $id, input: $input) {
      id
      status
      updatedAt
    }
  }
`);

const RunWeiboSearchTaskNowMutation = graphql(`
  mutation RunWeiboSearchTaskNow($id: Int!, $input: RunWeiboTaskNowInput) {
    runWeiboSearchTaskNow(id: $id, input: $input) {
      id
      status
      nextRunAt
      updatedAt
    }
  }
`);

const RemoveWeiboSearchTaskMutation = graphql(`
  mutation RemoveWeiboSearchTask($id: Int!) {
    removeWeiboSearchTask(id: $id)
  }
`);

@Injectable({ providedIn: 'root' })
export class WeiboSearchTasksService {
  constructor(
    private store: WeiboSearchTasksStore,
    private query: WeiboSearchTasksQuery,
    private graphql: GraphqlGateway
  ) {}

  findAll(filters?: WeiboSearchTaskFilters): Observable<any> {
    this.setLoading(true);
    this.setError(null);

    const currentFilters = { ...this.query.filters, ...filters };

    return from(
      this.graphql.request(WeiboSearchTasksQueryDoc, this.buildQueryVariables(currentFilters))
    ).pipe(
      tap(response => {
        const tasks = response.weiboSearchTasks.edges.map(edge => edge.node as unknown as WeiboSearchTask);
        const totalCount = response.weiboSearchTasks.totalCount;

        this.store.update({
          tasks,
          total: totalCount,
          page: currentFilters.page || 1,
          limit: currentFilters.limit || 20,
          totalPages: Math.ceil(totalCount / (currentFilters.limit || 20)),
          filters: currentFilters
        });
      }),
      catchError(error => {
        this.setError(error.message || '获取任务列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  findOne(id: number): Observable<WeiboSearchTask> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(WeiboSearchTaskQueryDoc, { id: Number(id) })
    ).pipe(
      map(response => response.weiboSearchTask as unknown as WeiboSearchTask),
      tap(task => {
        this.store.update({ selectedTask: task });
      }),
      catchError(error => {
        this.setError(error.message || '获取任务详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  create(input: any): Observable<WeiboSearchTask> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(CreateWeiboSearchTaskMutation, { input })
    ).pipe(
      map(response => response.createWeiboSearchTask as unknown as WeiboSearchTask),
      tap(task => {
        const currentTasks = this.query.tasks || [];
        this.store.update({
          tasks: [task, ...currentTasks],
          selectedTask: task
        });
      }),
      catchError(error => {
        this.setError(error.message || '创建任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  update(id: number, input: any): Observable<WeiboSearchTask> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(UpdateWeiboSearchTaskMutation, { id: Number(id), input })
    ).pipe(
      map(response => response.updateWeiboSearchTask as unknown as WeiboSearchTask),
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
        this.setError(error.message || '更新任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  delete(id: number): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(RemoveWeiboSearchTaskMutation, { id: Number(id) })
    ).pipe(
      tap(() => {
        this.store.update(state => ({
          tasks: state.tasks.filter(task => task.id !== id),
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask
        }));
      }),
      catchError(error => {
        this.setError(error.message || '删除任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  pause(id: number, reason?: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const input = reason ? { reason } : undefined;

    return from(
      this.graphql.request(PauseWeiboSearchTaskMutation, { id: Number(id), input })
    ).pipe(
      tap(response => {
        const updatedTask = response.pauseWeiboSearchTask as unknown as Partial<WeiboSearchTask>;
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updatedTask } : task
          )
        }));
      }),
      catchError(error => {
        this.setError(error.message || '暂停任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  resume(id: number, reason?: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const input = reason ? { reason } : undefined;

    return from(
      this.graphql.request(ResumeWeiboSearchTaskMutation, { id: Number(id), input })
    ).pipe(
      tap(response => {
        const updatedTask = response.resumeWeiboSearchTask as unknown as Partial<WeiboSearchTask>;
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updatedTask } : task
          )
        }));
      }),
      catchError(error => {
        this.setError(error.message || '恢复任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  runNow(id: number, reason?: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const input = reason ? { reason } : undefined;

    return from(
      this.graphql.request(RunWeiboSearchTaskNowMutation, { id: Number(id), input })
    ).pipe(
      tap(response => {
        const updatedTask = response.runWeiboSearchTaskNow as unknown as Partial<WeiboSearchTask>;
        this.store.update(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updatedTask } : task
          )
        }));
      }),
      catchError(error => {
        this.setError(error.message || '执行任务失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  getStats(): Observable<any> {
    return from(
      this.graphql.request(WeiboSearchTaskStatsQueryDoc)
    ).pipe(
      map(response => response.weiboSearchTaskStats)
    );
  }

  updateFilters(filters: Partial<WeiboSearchTaskFilters>): void {
    this.store.update(state => ({
      filters: { ...state.filters, ...filters }
    }));
  }

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

  selectTask(task: WeiboSearchTask | null): void {
    this.store.update({ selectedTask: task });
  }

  clearError(): void {
    this.setError(null);
  }

  refresh(): Observable<any> {
    return this.findAll();
  }

  private buildQueryVariables(filters: WeiboSearchTaskFilters): WeiboSearchTasksQueryVariables {
    return {
      page: filters.page ?? undefined,
      limit: filters.limit ?? undefined,
      status: this.toGraphqlStatus(filters.status),
      keyword: filters.keyword ?? undefined,
      enabled: filters.enabled ?? undefined,
      sortBy: filters.sortBy ?? undefined,
      sortOrder: this.toGraphqlSortOrder(filters.sortOrder),
    };
  }

  private toGraphqlStatus(status?: WeiboSearchTaskStatus): GqlWeiboSearchTaskStatus | undefined {
    switch (status) {
      case WeiboSearchTaskStatus.PENDING:
        return GqlWeiboSearchTaskStatus.Pending;
      case WeiboSearchTaskStatus.RUNNING:
        return GqlWeiboSearchTaskStatus.Running;
      case WeiboSearchTaskStatus.PAUSED:
        return GqlWeiboSearchTaskStatus.Paused;
      case WeiboSearchTaskStatus.FAILED:
        return GqlWeiboSearchTaskStatus.Failed;
      case WeiboSearchTaskStatus.TIMEOUT:
        return GqlWeiboSearchTaskStatus.Timeout;
      default:
        return undefined;
    }
  }

  private toGraphqlSortOrder(order?: WeiboSearchTaskFilters['sortOrder']): string | undefined {
    return order ? order.toUpperCase() : undefined;
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
