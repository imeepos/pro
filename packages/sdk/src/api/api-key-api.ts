import { Observable } from 'rxjs';
import { HttpClient } from '../client/http-client';
import { getApiUrl } from '@pro/config';
import {
  ApiKey,
  ApiKeyListResponse,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyFilters,
  ApiKeyUsageStats,
  ApiKeyRegenerationResponse,
  ApiKeyValidationRequest,
  ApiKeyValidationResponse,
  ApiKeyBulkAction,
  ApiKeyActivityFilters,
  ApiKeyActivityListResponse,
  ApiKeyStats
} from '@pro/types';

/**
 * API Key 管理 API 接口封装
 * 提供完整的 API Key CRUD 操作和管理功能
 */
export class ApiKeyApi {
  private readonly http: HttpClient;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const baseApiUrl = baseUrl || getApiUrl();
    this.http = new HttpClient(baseApiUrl);
    this.baseUrl = '/api/api-keys';
  }

  /**
   * 获取 API Key 列表
   */
  findAll(filters?: ApiKeyFilters): Observable<ApiKeyListResponse> {
    return new Observable<ApiKeyListResponse>((subscriber) => {
      const params = this.buildQueryParams(filters);
      this.http.get<ApiKeyListResponse>(this.baseUrl, params)
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
   * 获取单个 API Key
   */
  findOne(id: number): Observable<ApiKey> {
    return new Observable<ApiKey>((subscriber) => {
      this.http.get<ApiKey>(`${this.baseUrl}/${id}`)
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
   * 创建新的 API Key
   */
  create(dto: CreateApiKeyDto): Observable<ApiKey> {
    return new Observable<ApiKey>((subscriber) => {
      this.http.post<ApiKey>(this.baseUrl, dto)
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
   * 更新 API Key
   */
  update(id: number, updates: UpdateApiKeyDto): Observable<ApiKey> {
    return new Observable<ApiKey>((subscriber) => {
      this.http.put<ApiKey>(`${this.baseUrl}/${id}`, updates)
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
   * 删除 API Key
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
   * 激活 API Key
   */
  activate(id: number): Observable<ApiKey> {
    return new Observable<ApiKey>((subscriber) => {
      this.http.post<ApiKey>(`${this.baseUrl}/${id}/activate`, {})
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
   * 停用 API Key
   */
  deactivate(id: number): Observable<ApiKey> {
    return new Observable<ApiKey>((subscriber) => {
      this.http.post<ApiKey>(`${this.baseUrl}/${id}/deactivate`, {})
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
   * 撤销 API Key
   */
  revoke(id: number): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.http.post<void>(`${this.baseUrl}/${id}/revoke`, {})
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
   * 重新生成 API Key
   */
  regenerate(id: number): Observable<ApiKeyRegenerationResponse> {
    return new Observable<ApiKeyRegenerationResponse>((subscriber) => {
      this.http.post<ApiKeyRegenerationResponse>(`${this.baseUrl}/${id}/regenerate`, {})
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
   * 获取 API Key 使用统计
   */
  getUsageStats(id: number): Observable<ApiKeyUsageStats> {
    return new Observable<ApiKeyUsageStats>((subscriber) => {
      this.http.get<ApiKeyUsageStats>(`${this.baseUrl}/${id}/usage-stats`)
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
   * 验证 API Key
   */
  validate(request: ApiKeyValidationRequest): Observable<ApiKeyValidationResponse> {
    return new Observable<ApiKeyValidationResponse>((subscriber) => {
      this.http.post<ApiKeyValidationResponse>(`${this.baseUrl}/validate`, request)
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
   * 批量操作 API Key
   */
  bulkAction(action: ApiKeyBulkAction): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.http.post<void>(`${this.baseUrl}/bulk-action`, action)
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
   * 获取 API Key 活动日志
   */
  getActivityLogs(filters?: ApiKeyActivityFilters): Observable<ApiKeyActivityListResponse> {
    return new Observable<ApiKeyActivityListResponse>((subscriber) => {
      const params = this.buildActivityQueryParams(filters);
      this.http.get<ApiKeyActivityListResponse>(`${this.baseUrl}/activity-logs`, params)
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
   * 获取特定 API Key 的活动日志
   */
  getActivityLogsForApiKey(id: number, filters?: ApiKeyActivityFilters): Observable<ApiKeyActivityListResponse> {
    return new Observable<ApiKeyActivityListResponse>((subscriber) => {
      const params = this.buildActivityQueryParams(filters);
      this.http.get<ApiKeyActivityListResponse>(`${this.baseUrl}/${id}/activity-logs`, params)
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
   * 获取 API Key 统计信息
   */
  getStats(): Observable<ApiKeyStats> {
    return new Observable<ApiKeyStats>((subscriber) => {
      this.http.get<ApiKeyStats>(`${this.baseUrl}/stats`)
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
   * 延长 API Key 有效期
   */
  extendExpiry(id: number, expiresAt: string): Observable<ApiKey> {
    return new Observable<ApiKey>((subscriber) => {
      this.http.post<ApiKey>(`${this.baseUrl}/${id}/extend-expiry`, { expiresAt })
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
   * 获取当前用户的 API Key 列表
   */
  findMyKeys(filters?: ApiKeyFilters): Observable<ApiKeyListResponse> {
    return new Observable<ApiKeyListResponse>((subscriber) => {
      const params = this.buildQueryParams(filters);
      this.http.get<ApiKeyListResponse>(`${this.baseUrl}/my-keys`, params)
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
  private buildQueryParams(filters?: ApiKeyFilters): Record<string, unknown> {
    if (!filters) return {};

    const params: Record<string, unknown> = {};

    if (filters.search) params['search'] = filters.search;
    if (filters.type) params['type'] = filters.type;
    if (filters.status) params['status'] = filters.status;
    if (filters.userId) params['userId'] = filters.userId;
    if (filters.isActive !== undefined) params['isActive'] = filters.isActive;
    if (filters.isExpired !== undefined) params['isExpired'] = filters.isExpired;
    if (filters.startDate) params['startDate'] = filters.startDate;
    if (filters.endDate) params['endDate'] = filters.endDate;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;
    if (filters.sortBy) params['sortBy'] = filters.sortBy;
    if (filters.sortOrder) params['sortOrder'] = filters.sortOrder;

    return params;
  }

  /**
   * 构建活动日志查询参数
   */
  private buildActivityQueryParams(filters?: ApiKeyActivityFilters): Record<string, unknown> {
    if (!filters) return {};

    const params: Record<string, unknown> = {};

    if (filters.apiKeyId) params['apiKeyId'] = filters.apiKeyId;
    if (filters.action) params['action'] = filters.action;
    if (filters.startDate) params['startDate'] = filters.startDate;
    if (filters.endDate) params['endDate'] = filters.endDate;
    if (filters.ip) params['ip'] = filters.ip;
    if (filters.statusCode) params['statusCode'] = filters.statusCode;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;
    if (filters.sortBy) params['sortBy'] = filters.sortBy;
    if (filters.sortOrder) params['sortOrder'] = filters.sortOrder;

    return params;
  }
}