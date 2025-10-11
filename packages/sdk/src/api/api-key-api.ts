import { Observable } from 'rxjs';
import { getApiUrl } from '@pro/config';
import {
  ApiKey,
  ApiKeyActivityFilters,
  ApiKeyActivityListResponse,
  ApiKeyBulkAction,
  ApiKeyFilters,
  ApiKeyListResponse,
  ApiKeyRegenerationResponse,
  ApiKeyStats,
  ApiKeyStatus,
  ApiKeyType,
  ApiKeyUsageStats,
  ApiKeyValidationRequest,
  ApiKeyValidationResponse,
  CreateApiKeyDto,
  UpdateApiKeyDto,
} from '@pro/types';
import { HttpClient } from '../client/http-client';
import { fromPromise } from '../utils/observable-adapter';

interface ApiKeyRecord {
  id: number;
  key: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: string | Date | null;
  usageCount: number;
  expiresAt?: string | Date | null;
  createdIp?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  isExpired: boolean;
  isValid: boolean;
}

interface ApiKeyListPayload {
  items: ApiKeyRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface ApiKeyStatsPayload {
  id: number;
  name: string;
  usageCount: number;
  lastUsedAt?: string | Date | null;
  createdAt: string | Date;
  averageDailyUsage: number;
  daysSinceCreation: number;
}

export class ApiKeyApi {
  private readonly http: HttpClient;
  private readonly baseUrl = '/api/api-keys';

  constructor(baseUrl?: string) {
    const resolvedBaseUrl = baseUrl || getApiUrl();
    this.http = new HttpClient(resolvedBaseUrl);
  }

  findAll(filters?: ApiKeyFilters): Observable<ApiKeyListResponse> {
    return fromPromise(this.fetchList(filters));
  }

  findMyKeys(filters?: ApiKeyFilters): Observable<ApiKeyListResponse> {
    return this.findAll(filters);
  }

  findOne(id: number): Observable<ApiKey> {
    return fromPromise(this.fetchOne(id));
  }

  create(dto: CreateApiKeyDto): Observable<ApiKey> {
    return fromPromise(
      this.http.post<ApiKeyRecord>(this.baseUrl, dto).then((record) => adaptApiKey(record))
    );
  }

  update(id: number, updates: UpdateApiKeyDto): Observable<ApiKey> {
    return fromPromise(
      this.http.put<ApiKeyRecord>(`${this.baseUrl}/${id}`, updates).then((record) => adaptApiKey(record))
    );
  }

  delete(id: number): Observable<void> {
    return fromPromise(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  activate(id: number): Observable<ApiKey> {
    return fromPromise(
      this.http
        .put<void>(`${this.baseUrl}/${id}/enable`, {})
        .then(() => this.fetchOne(id))
    );
  }

  deactivate(id: number): Observable<ApiKey> {
    return fromPromise(
      this.http
        .put<void>(`${this.baseUrl}/${id}/disable`, {})
        .then(() => this.fetchOne(id))
    );
  }

  revoke(id: number): Observable<void> {
    return this.delete(id);
  }

  regenerate(id: number): Observable<ApiKeyRegenerationResponse> {
    return fromPromise(
      this.http
        .post<{ key: string }>(`${this.baseUrl}/${id}/regenerate`, {})
        .then((result) =>
          this.fetchOne(id).then((apiKey) => ({
            oldKeyId: id,
            newApiKey: { ...apiKey, key: result.key },
            message: '新的 API Key 已生成，请立即保存。',
          }))
        )
    );
  }

  getUsageStats(id: number): Observable<ApiKeyUsageStats> {
    return fromPromise(
      this.http.get<ApiKeyStatsPayload>(`${this.baseUrl}/${id}/stats`).then((stats) => ({
        id: stats.id,
        totalRequests: stats.usageCount,
        requestsThisMonth: stats.usageCount,
        requestsToday: 0,
        lastUsedAt: normalizeDate(stats.lastUsedAt),
        averageRequestsPerDay: stats.averageDailyUsage,
        peakUsageDay: undefined,
        endpointsUsed: [],
      }))
    );
  }

  validate(_request: ApiKeyValidationRequest): Observable<ApiKeyValidationResponse> {
    return fromPromise(
      Promise.resolve({
        valid: false,
        error: 'API Key 验证功能暂未开放',
      })
    );
  }

  bulkAction(action: ApiKeyBulkAction): Observable<void> {
    const tasks = action.keyIds.map((keyId) => {
      switch (action.action) {
        case 'activate':
          return this.http.put<void>(`${this.baseUrl}/${keyId}/enable`, {});
        case 'deactivate':
          return this.http.put<void>(`${this.baseUrl}/${keyId}/disable`, {});
        case 'revoke':
          return this.http.delete<void>(`${this.baseUrl}/${keyId}`);
        case 'extend':
          if (!action.expiresAt) {
            return Promise.resolve();
          }
          return this.http.put<void>(`${this.baseUrl}/${keyId}`, { expiresAt: action.expiresAt });
        default:
          return Promise.resolve();
      }
    });

    return fromPromise(Promise.all(tasks).then(() => undefined));
  }

  getActivityLogs(filters?: ApiKeyActivityFilters): Observable<ApiKeyActivityListResponse> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;

    return fromPromise(
      Promise.resolve({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      })
    );
  }

  getActivityLogsForApiKey(_id: number, filters?: ApiKeyActivityFilters): Observable<ApiKeyActivityListResponse> {
    return this.getActivityLogs(filters);
  }

  getStats(): Observable<ApiKeyStats> {
    return fromPromise(
      this.fetchList({ limit: 1000 }).then((list) => calculateStats(list.data))
    );
  }

  extendExpiry(id: number, expiresAt: string): Observable<ApiKey> {
    return this.update(id, { expiresAt });
  }

  private async fetchList(filters?: ApiKeyFilters): Promise<ApiKeyListResponse> {
    const payload = await this.http.get<ApiKeyListPayload>(this.baseUrl, this.buildQueryParams(filters));

    return {
      data: payload.items.map((item) => adaptApiKey(item)),
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
      totalPages: payload.totalPages,
      hasNext: payload.hasNext ?? payload.page < payload.totalPages,
      hasPrev: payload.hasPrev ?? payload.page > 1,
    };
  }

  private async fetchOne(id: number): Promise<ApiKey> {
    const record = await this.http.get<ApiKeyRecord>(`${this.baseUrl}/${id}`);
    return adaptApiKey(record);
  }

  private buildQueryParams(filters?: ApiKeyFilters): Record<string, unknown> {
    if (!filters) {
      return {};
    }

    const params: Record<string, unknown> = {};

    if (filters.search) params['search'] = filters.search;
    if (filters.status) params['status'] = filters.status;
    if (filters.startDate) params['startDate'] = filters.startDate;
    if (filters.endDate) params['endDate'] = filters.endDate;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;
    if (filters.sortBy) params['sortBy'] = filters.sortBy;
    if (filters.sortOrder) params['sortOrder'] = filters.sortOrder;

    return params;
  }
}

function normalizeDate(value?: string | Date | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function deriveStatus(isActive: boolean, isExpired: boolean): ApiKeyStatus {
  if (isExpired) {
    return ApiKeyStatus.EXPIRED;
  }

  return isActive ? ApiKeyStatus.ACTIVE : ApiKeyStatus.INACTIVE;
}

function adaptApiKey(record: ApiKeyRecord): ApiKey {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    description: undefined,
    type: ApiKeyType.READ_ONLY,
    status: deriveStatus(record.isActive, record.isExpired),
    isActive: record.isActive,
    lastUsedAt: normalizeDate(record.lastUsedAt),
    usageCount: record.usageCount ?? 0,
    expiresAt: normalizeDate(record.expiresAt),
    createdIp: record.createdIp ?? undefined,
    createdAt: normalizeDate(record.createdAt) ?? new Date(),
    updatedAt: normalizeDate(record.updatedAt) ?? new Date(),
    isExpired: record.isExpired,
    isValid: record.isValid,
    userId: 0,
    permissions: [],
  };
}

function createPlaceholderKey(): ApiKey {
  const now = new Date();

  return {
    id: 0,
    key: 'N/A',
    name: '未提供',
    description: undefined,
    type: ApiKeyType.READ_ONLY,
    status: ApiKeyStatus.INACTIVE,
    isActive: false,
    lastUsedAt: undefined,
    usageCount: 0,
    expiresAt: undefined,
    createdIp: undefined,
    createdAt: now,
    updatedAt: now,
    isExpired: false,
    isValid: false,
    userId: 0,
    permissions: [],
  };
}

function calculateStats(keys: ApiKey[]): ApiKeyStats {
  if (!keys.length) {
    const placeholder = createPlaceholderKey();

    return {
      total: 0,
      active: 0,
      inactive: 0,
      expired: 0,
      revoked: 0,
      readOnly: 0,
      readWrite: 0,
      admin: 0,
      expiringSoon: 0,
      neverUsed: 0,
      mostUsed: placeholder,
      recentlyUsed: placeholder,
    };
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  let mostUsed: ApiKey | null = null;
  let recentlyUsed: ApiKey | null = null;

  const summary = keys.reduce(
    (acc, key) => {
      acc.total += 1;

      if (key.status === ApiKeyStatus.ACTIVE) acc.active += 1;
      if (key.status === ApiKeyStatus.INACTIVE) acc.inactive += 1;
      if (key.status === ApiKeyStatus.EXPIRED) acc.expired += 1;
      if (key.status === ApiKeyStatus.REVOKED) acc.revoked += 1;

      if (key.type === ApiKeyType.READ_ONLY) acc.readOnly += 1;
      if (key.type === ApiKeyType.READ_WRITE) acc.readWrite += 1;
      if (key.type === ApiKeyType.ADMIN) acc.admin += 1;

      const expiresAt = key.expiresAt?.getTime?.() ?? new Date(key.expiresAt ?? '').getTime();
      if (!Number.isNaN(expiresAt) && expiresAt > now && expiresAt - now <= sevenDaysMs) {
        acc.expiringSoon += 1;
      }

      if (!key.usageCount) {
        acc.neverUsed += 1;
      }

      if (!mostUsed || key.usageCount > mostUsed.usageCount) {
        mostUsed = key;
      }

      const lastUsedAt = key.lastUsedAt?.getTime?.() ?? 0;
      const recentLastUsed = recentlyUsed?.lastUsedAt?.getTime?.() ?? 0;
      if (lastUsedAt >= recentLastUsed) {
        recentlyUsed = key;
      }

      return acc;
    },
    {
      total: 0,
      active: 0,
      inactive: 0,
      expired: 0,
      revoked: 0,
      readOnly: 0,
      readWrite: 0,
      admin: 0,
      expiringSoon: 0,
      neverUsed: 0,
    }
  );

  return {
    total: summary.total,
    active: summary.active,
    inactive: summary.inactive,
    expired: summary.expired,
    revoked: summary.revoked,
    readOnly: summary.readOnly,
    readWrite: summary.readWrite,
    admin: summary.admin,
    expiringSoon: summary.expiringSoon,
    neverUsed: summary.neverUsed,
    mostUsed: mostUsed ?? createPlaceholderKey(),
    recentlyUsed: recentlyUsed ?? createPlaceholderKey(),
  };
}
