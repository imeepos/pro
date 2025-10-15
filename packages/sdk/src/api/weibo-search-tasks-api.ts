import { Observable, from } from 'rxjs';
import { GraphQLClient } from '../client/graphql-client.js';
import {
  WeiboSearchTask,
  WeiboSearchTaskListResponse,
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  WeiboSearchTaskFilters,
  WeiboSearchTaskStatus,
} from '@pro/types';
import { TaskStats } from '../types/weibo-search-tasks.types.js';

interface WeiboSearchTaskNode {
  id: number;
  keyword: string;
  enabled: boolean;
  status: string;
  startDate: string | Date;
  nextRunAt?: string | Date;
  latestCrawlTime?: string | Date;
  currentCrawlTime?: string | Date;
  progress: number;
  totalSegments: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  enableAccountRotation: boolean;
  weiboAccountId?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PageInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface WeiboSearchTaskConnection {
  nodes: WeiboSearchTaskNode[];
  pageInfo: PageInfo;
}

interface WeiboSearchTaskStatsResponse {
  total: number;
  enabled: number;
  running: number;
  paused: number;
  failed: number;
  completed: number;
}

export class WeiboSearchTasksApi {
  private readonly client: GraphQLClient;

  constructor(baseUrl?: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error('baseUrl is required for WeiboSearchTasksApi');
    }
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  findAll(filters?: WeiboSearchTaskFilters): Observable<WeiboSearchTaskListResponse> {
    const query = `
      query GetWeiboSearchTasks($filter: WeiboSearchTaskFilterInput) {
        weiboSearchTasks(filter: $filter) {
          nodes {
            id keyword enabled status startDate nextRunAt
            latestCrawlTime currentCrawlTime progress totalSegments
            retryCount maxRetries errorMessage enableAccountRotation
            weiboAccountId createdAt updatedAt
          }
          pageInfo {
            total page pageSize totalPages
          }
        }
      }
    `;

    const filter = this.buildFilterInput(filters);

    return from(
      this.client
        .query<{ weiboSearchTasks: WeiboSearchTaskConnection }>(query, { filter })
        .then(res => ({
          data: res.weiboSearchTasks.nodes.map(node => this.adaptTask(node)),
          total: res.weiboSearchTasks.pageInfo.total,
          page: res.weiboSearchTasks.pageInfo.page,
          limit: res.weiboSearchTasks.pageInfo.pageSize,
          totalPages: res.weiboSearchTasks.pageInfo.totalPages,
        }))
    );
  }

  findOne(id: number): Observable<WeiboSearchTask> {
    const query = `
      query GetWeiboSearchTask($id: Int!) {
        weiboSearchTask(id: $id) {
          id keyword enabled status startDate nextRunAt
          latestCrawlTime currentCrawlTime progress totalSegments
          retryCount maxRetries errorMessage enableAccountRotation
          weiboAccountId createdAt updatedAt
        }
      }
    `;

    return from(
      this.client
        .query<{ weiboSearchTask: WeiboSearchTaskNode }>(query, { id })
        .then(res => this.adaptTask(res.weiboSearchTask))
    );
  }

  create(dto: CreateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskInput!) {
        createWeiboSearchTask(input: $input) {
          id keyword enabled status startDate nextRunAt
          latestCrawlTime currentCrawlTime progress totalSegments
          retryCount maxRetries errorMessage enableAccountRotation
          weiboAccountId createdAt updatedAt
        }
      }
    `;

    return from(
      this.client
        .mutate<{ createWeiboSearchTask: WeiboSearchTaskNode }>(mutation, { input: dto })
        .then(res => this.adaptTask(res.createWeiboSearchTask))
    );
  }

  update(id: number, updates: UpdateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    const mutation = `
      mutation UpdateWeiboSearchTask($id: Int!, $input: UpdateWeiboSearchTaskInput!) {
        updateWeiboSearchTask(id: $id, input: $input) {
          id keyword enabled status startDate nextRunAt
          latestCrawlTime currentCrawlTime progress totalSegments
          retryCount maxRetries errorMessage enableAccountRotation
          weiboAccountId createdAt updatedAt
        }
      }
    `;

    return from(
      this.client
        .mutate<{ updateWeiboSearchTask: WeiboSearchTaskNode }>(mutation, { id, input: updates })
        .then(res => this.adaptTask(res.updateWeiboSearchTask))
    );
  }

  delete(id: number): Observable<void> {
    const mutation = `
      mutation RemoveWeiboSearchTask($id: Int!) {
        removeWeiboSearchTask(id: $id)
      }
    `;

    return from(
      this.client.mutate<{ removeWeiboSearchTask: boolean }>(mutation, { id }).then(() => undefined)
    );
  }

  pause(id: number): Observable<WeiboSearchTask> {
    const mutation = `
      mutation PauseWeiboSearchTask($id: Int!) {
        pauseWeiboSearchTask(id: $id) {
          id keyword enabled status startDate nextRunAt
          latestCrawlTime currentCrawlTime progress totalSegments
          retryCount maxRetries errorMessage enableAccountRotation
          weiboAccountId createdAt updatedAt
        }
      }
    `;

    return from(
      this.client
        .mutate<{ pauseWeiboSearchTask: WeiboSearchTaskNode }>(mutation, { id })
        .then(res => this.adaptTask(res.pauseWeiboSearchTask))
    );
  }

  resume(id: number): Observable<WeiboSearchTask> {
    const mutation = `
      mutation ResumeWeiboSearchTask($id: Int!) {
        resumeWeiboSearchTask(id: $id) {
          id keyword enabled status startDate nextRunAt
          latestCrawlTime currentCrawlTime progress totalSegments
          retryCount maxRetries errorMessage enableAccountRotation
          weiboAccountId createdAt updatedAt
        }
      }
    `;

    return from(
      this.client
        .mutate<{ resumeWeiboSearchTask: WeiboSearchTaskNode }>(mutation, { id })
        .then(res => this.adaptTask(res.resumeWeiboSearchTask))
    );
  }

  runNow(id: number): Observable<WeiboSearchTask> {
    const mutation = `
      mutation RunWeiboSearchTaskNow($id: Int!) {
        runWeiboSearchTaskNow(id: $id) {
          id keyword enabled status startDate nextRunAt
          latestCrawlTime currentCrawlTime progress totalSegments
          retryCount maxRetries errorMessage enableAccountRotation
          weiboAccountId createdAt updatedAt
        }
      }
    `;

    return from(
      this.client
        .mutate<{ runWeiboSearchTaskNow: WeiboSearchTaskNode }>(mutation, { id })
        .then(res => this.adaptTask(res.runWeiboSearchTaskNow))
    );
  }

  pauseAll(): Observable<number> {
    const mutation = `
      mutation PauseAllWeiboSearchTasks {
        pauseAllWeiboSearchTasks
      }
    `;

    return from(
      this.client.mutate<{ pauseAllWeiboSearchTasks: number }>(mutation).then(res => res.pauseAllWeiboSearchTasks)
    );
  }

  resumeAll(): Observable<number> {
    const mutation = `
      mutation ResumeAllWeiboSearchTasks {
        resumeAllWeiboSearchTasks
      }
    `;

    return from(
      this.client.mutate<{ resumeAllWeiboSearchTasks: number }>(mutation).then(res => res.resumeAllWeiboSearchTasks)
    );
  }

  getStats(): Observable<TaskStats> {
    const query = `
      query GetWeiboSearchTaskStats {
        weiboSearchTaskStats {
          total enabled running paused failed completed
        }
      }
    `;

    return from(
      this.client.query<{ weiboSearchTaskStats: WeiboSearchTaskStatsResponse }>(query).then(res => {
        const stats = res.weiboSearchTaskStats;
        const pending = Math.max(
          stats.total - stats.running - stats.paused - stats.failed - stats.completed,
          0
        );

        return {
          total: stats.total,
          enabled: stats.enabled,
          running: stats.running,
          pending,
          failed: stats.failed,
          paused: stats.paused,
        };
      })
    );
  }

  private adaptTask(node: WeiboSearchTaskNode): WeiboSearchTask {
    return {
      id: node.id,
      keyword: node.keyword,
      enabled: node.enabled,
      status: this.parseTaskStatus(node.status),
      startDate: this.normalizeDate(node.startDate) ?? new Date(),
      crawlInterval: '1h',
      nextRunAt: this.normalizeDate(node.nextRunAt),
      latestCrawlTime: this.normalizeDate(node.latestCrawlTime),
      currentCrawlTime: this.normalizeDate(node.currentCrawlTime),
      progress: node.progress,
      totalSegments: node.totalSegments,
      noDataCount: 0,
      noDataThreshold: 3,
      retryCount: node.retryCount,
      maxRetries: node.maxRetries,
      errorMessage: node.errorMessage,
      enableAccountRotation: node.enableAccountRotation,
      weiboAccountId: node.weiboAccountId,
      createdAt: this.normalizeDate(node.createdAt) ?? new Date(),
      updatedAt: this.normalizeDate(node.updatedAt) ?? new Date(),
    };
  }

  private normalizeDate(value?: string | Date | null): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseTaskStatus(status: string): WeiboSearchTaskStatus {
    const statusMap: Record<string, WeiboSearchTaskStatus> = {
      'pending': WeiboSearchTaskStatus.PENDING,
      'running': WeiboSearchTaskStatus.RUNNING,
      'paused': WeiboSearchTaskStatus.PAUSED,
      'failed': WeiboSearchTaskStatus.FAILED,
      'timeout': WeiboSearchTaskStatus.TIMEOUT,
    };
    return statusMap[status] ?? WeiboSearchTaskStatus.PENDING;
  }

  private buildFilterInput(filters?: WeiboSearchTaskFilters): Record<string, unknown> | undefined {
    if (!filters) return undefined;

    const input: Record<string, unknown> = {};

    if (filters.keyword) input['keyword'] = filters.keyword;
    if (filters.status) input['status'] = filters.status;
    if (filters.enabled !== undefined) input['enabled'] = filters.enabled;
    if (filters.page) input['page'] = filters.page;
    if (filters.limit) input['limit'] = filters.limit;
    if (filters.sortBy) input['sortBy'] = filters.sortBy;
    if (filters.sortOrder) input['sortOrder'] = filters.sortOrder;

    return Object.keys(input).length > 0 ? input : undefined;
  }
}
