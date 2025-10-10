import { Observable } from 'rxjs';
import { HttpClient } from '../client/http-client';
import { getApiUrl } from '@pro/config';
import {
  WeiboSearchTask,
  WeiboSearchTaskListResponse,
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  WeiboSearchTaskFilters
} from '@pro/types';
import { TaskStats } from '../types/weibo-search-tasks.types';

/**
 * 微博搜索任务 API 接口封装
 * 将 Angular 中的 WeiboSearchTasksApiService 功能迁移到 SDK
 */
export class WeiboSearchTasksApi {
  private readonly http: HttpClient;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // 如果没有提供 baseUrl，使用 getApiUrl() 获取基础 URL
    const baseApiUrl = baseUrl || getApiUrl();
    this.http = new HttpClient(baseApiUrl);
    this.baseUrl = '/weibo-search-tasks';
  }

  /**
   * 获取任务列表
   */
  findAll(filters?: WeiboSearchTaskFilters): Observable<WeiboSearchTaskListResponse> {
    return new Observable<WeiboSearchTaskListResponse>((subscriber) => {
      const params = this.buildQueryParams(filters);
      this.http.get<WeiboSearchTaskListResponse>(this.baseUrl, params)
        .then((response) => {
          subscriber.next(response);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 获取单个任务
   */
  findOne(id: number): Observable<WeiboSearchTask> {
    return new Observable<WeiboSearchTask>((subscriber) => {
      this.http.get<WeiboSearchTask>(`${this.baseUrl}/${id}`)
        .then((response) => {
          subscriber.next(response);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 创建任务
   */
  create(dto: CreateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    return new Observable<WeiboSearchTask>((subscriber) => {
      this.http.post<WeiboSearchTask>(this.baseUrl, dto)
        .then((response) => {
          subscriber.next(response);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 更新任务
   */
  update(id: number, updates: UpdateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    return new Observable<WeiboSearchTask>((subscriber) => {
      this.http.put<WeiboSearchTask>(`${this.baseUrl}/${id}`, updates)
        .then((response) => {
          subscriber.next(response);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 删除任务
   */
  delete(id: number): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.http.delete<void>(`${this.baseUrl}/${id}`)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 暂停任务
   */
  pause(id: number): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.http.post<void>(`${this.baseUrl}/${id}/pause`, {})
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 恢复任务
   */
  resume(id: number): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.http.post<void>(`${this.baseUrl}/${id}/resume`, {})
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 立即执行任务
   */
  runNow(id: number): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.http.post<void>(`${this.baseUrl}/${id}/run-now`, {})
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 获取任务统计
   */
  getStats(): Observable<TaskStats> {
    return new Observable<TaskStats>((subscriber) => {
      this.http.get<TaskStats>(`${this.baseUrl}/stats`)
        .then((response) => {
          subscriber.next(response);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 构建查询参数
   */
  private buildQueryParams(filters?: WeiboSearchTaskFilters): Record<string, unknown> {
    if (!filters) return {};

    const params: Record<string, unknown> = {};

    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.status) params.status = filters.status;
    if (filters.enabled !== undefined) params.enabled = filters.enabled;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }
}