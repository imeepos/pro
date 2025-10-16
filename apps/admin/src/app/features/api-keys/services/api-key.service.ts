import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

import { SkerSDK } from '@pro/sdk';
import {
  ApiKey,
  ApiKeyFilters,
  ApiKeyListResponse,
  ApiKeyStats,
  ApiKeyUsageStats,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyRegenerationResponse
} from '@pro/types';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private sdk: SkerSDK;

  // 状态管理
  private apiKeysSubject = new BehaviorSubject<ApiKey[]>([]);
  private selectedApiKeySubject = new BehaviorSubject<ApiKey | null>(null);
  private statsSubject = new BehaviorSubject<ApiKeyStats | null>(null);
  private usageStatsSubject = new BehaviorSubject<Map<number, ApiKeyUsageStats>>(new Map());
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private paginationSubject = new BehaviorSubject<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });

  // 公开的 Observable
  apiKeys$ = this.apiKeysSubject.asObservable();
  selectedApiKey$ = this.selectedApiKeySubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  usageStats$ = this.usageStatsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  pagination$ = this.paginationSubject.asObservable();

  constructor() {
    this.sdk = new SkerSDK(environment.apiUrl);
  }

  // 加载 API Keys 列表
  loadApiKeys(filters?: ApiKeyFilters): void {
    this.setLoading(true);
    this.clearError();

    this.sdk.apiKey.findMyKeys(filters)
      .pipe(
        tap((response: ApiKeyListResponse) => {
          this.apiKeysSubject.next(response.data);
          this.paginationSubject.next({
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages
          });
          this.setLoading(false);
        }),
        catchError((error) => {
          this.handleError('加载 API Keys 失败', error);
          return of();
        })
      )
      .subscribe();
  }

  // 加载统计信息
  loadStats(): void {
    this.sdk.apiKey.getStats()
      .pipe(
        tap((stats: ApiKeyStats) => {
          this.statsSubject.next(stats);
        }),
        catchError((error) => {
          console.warn('加载统计信息失败:', error);
          return of();
        })
      )
      .subscribe();
  }

  // 加载使用统计
  loadUsageStats(apiKeyId: number): void {
    this.sdk.apiKey.getUsageStats(apiKeyId)
      .pipe(
        tap((stats: ApiKeyUsageStats) => {
          const currentStats = new Map(this.usageStatsSubject.value);
          currentStats.set(apiKeyId, stats);
          this.usageStatsSubject.next(currentStats);
        }),
        catchError((error) => {
          console.warn(`加载 API Key ${apiKeyId} 使用统计失败:`, error);
          return of();
        })
      )
      .subscribe();
  }

  // 创建 API Key
  createApiKey(dto: CreateApiKeyDto): Observable<ApiKey> {
    this.setLoading(true);
    this.clearError();

    return this.sdk.apiKey.create(dto).pipe(
      tap((apiKey: ApiKey) => {
        this.setLoading(false);
        // 重新加载列表以获取最新的数据
        this.loadApiKeys();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('创建 API Key 失败', error);
        return of();
      })
    );
  }

  // 更新 API Key
  updateApiKey(id: number, updates: UpdateApiKeyDto): Observable<ApiKey> {
    console.log('🔍 [API Key Service] 开始更新 API Key:', { id, updates });
    this.setLoading(true);
    this.clearError();

    return this.sdk.apiKey.update(id, updates).pipe(
      tap((apiKey: ApiKey) => {
        console.log('✅ [API Key Service] API Key 更新成功:', apiKey);
        this.setLoading(false);
        this.updateApiKeyInList(apiKey);
      }),
      catchError((error) => {
        console.error('❌ [API Key Service] API Key 更新失败:', error);
        this.handleError('更新 API Key 失败', error);
        return of();
      })
    );
  }

  // 删除 API Key
  deleteApiKey(id: number): Observable<void> {
    this.setLoading(true);
    this.clearError();

    return this.sdk.apiKey.delete(id).pipe(
      tap(() => {
        this.setLoading(false);
        this.removeApiKeyFromList(id);
        this.loadStats(); // 更新统计信息
      }),
      catchError((error) => {
        this.handleError('删除 API Key 失败', error);
        return of();
      })
    );
  }

  // 激活 API Key
  activateApiKey(id: number): Observable<ApiKey> {
    this.setLoading(true);

    return this.sdk.apiKey.activate(id).pipe(
      tap((apiKey: ApiKey) => {
        this.setLoading(false);
        this.updateApiKeyInList(apiKey);
      }),
      catchError((error) => {
        this.handleError('激活 API Key 失败', error);
        return of();
      })
    );
  }

  // 停用 API Key
  deactivateApiKey(id: number): Observable<ApiKey> {
    this.setLoading(true);

    return this.sdk.apiKey.deactivate(id).pipe(
      tap((apiKey: ApiKey) => {
        this.setLoading(false);
        this.updateApiKeyInList(apiKey);
      }),
      catchError((error) => {
        this.handleError('停用 API Key 失败', error);
        return of();
      })
    );
  }

  // 撤销 API Key
  revokeApiKey(id: number): Observable<void> {
    this.setLoading(true);

    return this.sdk.apiKey.revoke(id).pipe(
      tap(() => {
        this.setLoading(false);
        this.loadApiKeys(); // 重新加载列表
        this.loadStats(); // 更新统计信息
      }),
      catchError((error) => {
        this.handleError('撤销 API Key 失败', error);
        return of();
      })
    );
  }

  // 重新生成 API Key
  regenerateApiKey(id: number): Observable<ApiKeyRegenerationResponse> {
    this.setLoading(true);

    return this.sdk.apiKey.regenerate(id).pipe(
      tap((response: ApiKeyRegenerationResponse) => {
        this.setLoading(false);
        this.loadApiKeys(); // 重新加载列表
      }),
      catchError((error) => {
        this.handleError('重新生成 API Key 失败', error);
        return of();
      })
    );
  }

  // 验证 API Key
  validateApiKey(apiKey: string): Observable<boolean> {
    return this.sdk.apiKey.validate({ apiKey }).pipe(
      map((response) => response.valid),
      catchError(() => of(false))
    );
  }

  // 选择 API Key
  selectApiKey(apiKey: ApiKey): void {
    this.selectedApiKeySubject.next(apiKey);
  }

  // 清除选择的 API Key
  clearSelectedApiKey(): void {
    this.selectedApiKeySubject.next(null);
  }

  // 获取单个 API Key
  getApiKey(id: number): Observable<ApiKey | null> {
    return this.sdk.apiKey.findOne(id).pipe(
      catchError(() => of(null))
    );
  }

  // 搜索 API Keys
  searchApiKeys(query: string): Observable<ApiKey[]> {
    const filters: ApiKeyFilters = {
      search: query,
      limit: 50 // 限制搜索结果数量
    };

    return this.sdk.apiKey.findMyKeys(filters).pipe(
      map((response) => response.data),
      catchError(() => of([]))
    );
  }

  // 获取即将过期的 API Keys
  getExpiringSoonApiKeys(days: number = 7): Observable<ApiKey[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const filters: ApiKeyFilters = {
      startDate: now.toISOString(),
      endDate: futureDate.toISOString(),
      limit: 100
    };

    return this.sdk.apiKey.findMyKeys(filters).pipe(
      map((response) => response.data.filter(key => key.isActive && !key.isExpired)),
      catchError(() => of([]))
    );
  }

  // 批量操作
  bulkActivateApiKeys(ids: number[]): Observable<void> {
    return this.sdk.apiKey.bulkAction({
      action: 'activate',
      keyIds: ids
    }).pipe(
      tap(() => {
        this.loadApiKeys();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('批量激活失败', error);
        return of();
      })
    );
  }

  bulkDeactivateApiKeys(ids: number[]): Observable<void> {
    return this.sdk.apiKey.bulkAction({
      action: 'deactivate',
      keyIds: ids
    }).pipe(
      tap(() => {
        this.loadApiKeys();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('批量停用失败', error);
        return of();
      })
    );
  }

  bulkRevokeApiKeys(ids: number[]): Observable<void> {
    return this.sdk.apiKey.bulkAction({
      action: 'revoke',
      keyIds: ids
    }).pipe(
      tap(() => {
        this.loadApiKeys();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('批量撤销失败', error);
        return of();
      })
    );
  }

  // 私有方法
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  private clearError(): void {
    this.errorSubject.next(null);
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    const errorMessage = error?.error?.message || error?.message || message;
    this.setError(errorMessage);
    this.setLoading(false);
  }

  private updateApiKeyInList(updatedApiKey: ApiKey): void {
    console.log('🔍 [API Key Service] 更新列表中的 API Key:', updatedApiKey);
    const currentApiKeys = this.apiKeysSubject.value;
    const index = currentApiKeys.findIndex(key => key.id === updatedApiKey.id);

    if (index !== -1) {
      const updatedList = [...currentApiKeys];
      const oldKey = updatedList[index];
      updatedList[index] = updatedApiKey;
      console.log('🔄 [API Key Service] 列表更新:', {
        id: updatedApiKey.id,
        oldType: oldKey.type,
        newType: updatedApiKey.type,
        oldStatus: oldKey.status,
        newStatus: updatedApiKey.status
      });
      this.apiKeysSubject.next(updatedList);
    } else {
      console.warn('⚠️ [API Key Service] 未找到要更新的 API Key:', updatedApiKey.id);
    }
  }

  private removeApiKeyFromList(id: number): void {
    const currentApiKeys = this.apiKeysSubject.value;
    const filteredList = currentApiKeys.filter(key => key.id !== id);
    this.apiKeysSubject.next(filteredList);
  }

  // 清理方法
  clearAllData(): void {
    this.apiKeysSubject.next([]);
    this.selectedApiKeySubject.next(null);
    this.statsSubject.next(null);
    this.usageStatsSubject.next(new Map());
    this.clearError();
    this.setLoading(false);
  }
}
