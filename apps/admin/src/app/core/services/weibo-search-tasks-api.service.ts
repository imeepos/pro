import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WeiboSearchTask,
  WeiboSearchTaskListResponse,
  CreateWeiboSearchTaskDto,
  UpdateWeiboSearchTaskDto,
  WeiboSearchTaskFilters,
  ApiResponse
} from '@pro/types';
import { getApiUrl } from '@pro/config';

@Injectable({
  providedIn: 'root'
})
export class WeiboSearchTasksApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${getApiUrl()}/weibo-search-tasks`;
  }

  // 获取任务列表
  findAll(filters?: WeiboSearchTaskFilters): Observable<WeiboSearchTaskListResponse> {
    const params = this.buildQueryParams(filters);
    return this.http.get<WeiboSearchTaskListResponse>(this.baseUrl, { params });
  }

  // 获取单个任务
  findOne(id: number): Observable<WeiboSearchTask> {
    return this.http.get<WeiboSearchTask>(`${this.baseUrl}/${id}`);
  }

  // 创建任务
  create(dto: CreateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    return this.http.post<WeiboSearchTask>(this.baseUrl, dto);
  }

  // 更新任务
  update(id: number, updates: UpdateWeiboSearchTaskDto): Observable<WeiboSearchTask> {
    return this.http.put<WeiboSearchTask>(`${this.baseUrl}/${id}`, updates);
  }

  // 删除任务
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // 暂停任务
  pause(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/pause`, {});
  }

  // 恢复任务
  resume(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/resume`, {});
  }

  // 立即执行任务
  runNow(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/run-now`, {});
  }

  // 获取任务统计
  getStats(): Observable<{
    total: number;
    enabled: number;
    running: number;
    pending: number;
    failed: number;
    paused: number;
  }> {
    return this.http.get<any>(`${this.baseUrl}/stats`);
  }

  // 构建查询参数
  private buildQueryParams(filters?: WeiboSearchTaskFilters): any {
    if (!filters) return {};

    const params: any = {};

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