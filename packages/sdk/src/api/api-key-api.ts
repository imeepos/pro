import { Observable, from } from 'rxjs';
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
import { GraphQLClient } from '../client/graphql-client.js';
import { AuthConfig, AuthMode } from '../types/auth-config.js';

interface ApiKeyRecord {
  id: number;
  key: string;
  name: string;
  description?: string;
  type: string;
  permissions?: string[];
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

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

interface ApiKeyEdge {
  cursor: string;
  node: ApiKeyRecord;
}

interface ApiKeyConnection {
  edges: ApiKeyEdge[];
  pageInfo: PageInfo;
  totalCount: number;
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

interface ApiKeySummaryStatsPayload {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  neverUsed: number;
  expiringSoon: number;
  totalUsage: number;
  averageDailyUsage: number;
  mostUsed?: ApiKeyStatsPayload;
  recentlyUsed?: ApiKeyStatsPayload;
}

export class ApiKeyApi {
  private readonly client: GraphQLClient;

  constructor(
    baseUrl?: string,
    tokenKey?: string,
    authMode?: AuthMode,
    client?: GraphQLClient,
  ) {
    if (!baseUrl) {
      throw new Error(`ApiKeyApi missing base url!`);
    }
    this.client = client ?? new GraphQLClient(baseUrl, tokenKey, authMode);
  }

  /**
   * 创建使用 JWT 认证的 API Key 客户端
   */
  static withJwt(baseUrl: string, tokenKey: string = 'access_token'): ApiKeyApi {
    return new ApiKeyApi(baseUrl, tokenKey, AuthMode.JWT);
  }

  /**
   * 创建使用 API Key 认证的 API Key 客户端
   */
  static withApiKey(baseUrl: string, tokenKey: string = 'api_key'): ApiKeyApi {
    return new ApiKeyApi(baseUrl, tokenKey, AuthMode.API_KEY);
  }

  /**
   * 创建自动模式认证的 API Key 客户端
   */
  static withAutoAuth(baseUrl: string, tokenKey: string = 'access_token'): ApiKeyApi {
    return new ApiKeyApi(baseUrl, tokenKey, AuthMode.AUTO);
  }

  /**
   * 使用自定义配置创建 API Key 客户端
   */
  static withConfig(baseUrl: string, config: AuthConfig): ApiKeyApi {
    const client = GraphQLClient.withConfig(baseUrl, config);
    return new ApiKeyApi(baseUrl, config.tokenKey, config.mode, client);
  }

  /**
   * 创建默认配置的 API Key 客户端（向后兼容）
   */
  static createDefault(baseUrl: string, tokenKey: string = 'access_token'): ApiKeyApi {
    return new ApiKeyApi(baseUrl, tokenKey, AuthMode.JWT);
  }

  findAll(filters?: ApiKeyFilters): Observable<ApiKeyListResponse> {
    return from(this.fetchList(filters));
  }

  findMyKeys(filters?: ApiKeyFilters): Observable<ApiKeyListResponse> {
    return this.findAll(filters);
  }

  findOne(id: number): Observable<ApiKey> {
    return from(this.fetchOne(id));
  }

  create(dto: CreateApiKeyDto): Observable<ApiKey> {
    const mutation = `
      mutation CreateApiKey($input: CreateApiKeyDto!) {
        createApiKey(input: $input) {
          id key name description type permissions
          isActive lastUsedAt usageCount expiresAt createdIp
          createdAt updatedAt isExpired isValid
        }
      }
    `;

    return from(
      this.client
        .mutate<{ createApiKey: ApiKeyRecord }>(mutation, { input: dto })
        .then(res => adaptApiKey(res.createApiKey))
    );
  }

  update(id: number, updates: UpdateApiKeyDto): Observable<ApiKey> {
    const mutation = `
      mutation UpdateApiKey($id: Int!, $input: UpdateApiKeyDto!) {
        updateApiKey(id: $id, input: $input) {
          id key name description type permissions
          isActive lastUsedAt usageCount expiresAt createdIp
          createdAt updatedAt isExpired isValid
        }
      }
    `;

    return from(
      this.client
        .mutate<{ updateApiKey: ApiKeyRecord }>(mutation, { id, input: updates })
        .then(res => adaptApiKey(res.updateApiKey))
    );
  }

  delete(id: number): Observable<void> {
    const mutation = `
      mutation RemoveApiKey($id: Int!) {
        removeApiKey(id: $id)
      }
    `;

    return from(
      this.client.mutate<{ removeApiKey: boolean }>(mutation, { id }).then(() => undefined)
    );
  }

  activate(id: number): Observable<ApiKey> {
    const mutation = `
      mutation EnableApiKey($id: Int!) {
        enableApiKey(id: $id)
      }
    `;

    return from(
      this.client
        .mutate<{ enableApiKey: boolean }>(mutation, { id })
        .then(() => this.fetchOne(id))
    );
  }

  deactivate(id: number): Observable<ApiKey> {
    const mutation = `
      mutation DisableApiKey($id: Int!) {
        disableApiKey(id: $id)
      }
    `;

    return from(
      this.client
        .mutate<{ disableApiKey: boolean }>(mutation, { id })
        .then(() => this.fetchOne(id))
    );
  }

  revoke(id: number): Observable<void> {
    return this.delete(id);
  }

  regenerate(id: number): Observable<ApiKeyRegenerationResponse> {
    const mutation = `
      mutation RegenerateApiKey($id: Int!) {
        regenerateApiKey(id: $id) {
          key
          warning
        }
      }
    `;

    return from(
      this.client
        .mutate<{ regenerateApiKey: { key: string; warning: string } }>(mutation, { id })
        .then(res =>
          this.fetchOne(id).then(apiKey => ({
            oldKeyId: id,
            newApiKey: { ...apiKey, key: res.regenerateApiKey.key },
            message: res.regenerateApiKey.warning,
          }))
        )
    );
  }

  getUsageStats(id: number): Observable<ApiKeyUsageStats> {
    const query = `
      query GetApiKeyStats($id: Int!) {
        apiKeyStats(id: $id) {
          id name usageCount lastUsedAt createdAt
          daysSinceCreation averageDailyUsage
        }
      }
    `;

    return from(
      this.client
        .query<{ apiKeyStats: ApiKeyStatsPayload }>(query, { id })
        .then(res => ({
          id: res.apiKeyStats.id,
          totalRequests: res.apiKeyStats.usageCount,
          requestsThisMonth: res.apiKeyStats.usageCount,
          requestsToday: 0,
          lastUsedAt: normalizeDate(res.apiKeyStats.lastUsedAt),
          averageRequestsPerDay: res.apiKeyStats.averageDailyUsage,
          peakUsageDay: undefined,
          endpointsUsed: [],
        }))
    );
  }

  validate(_request: ApiKeyValidationRequest): Observable<ApiKeyValidationResponse> {
    return from(
      Promise.resolve({
        valid: false,
        error: 'API Key 验证功能暂未开放',
      })
    );
  }

  bulkAction(action: ApiKeyBulkAction): Observable<void> {
    const tasks = action.keyIds.map((keyId: number) => {
      switch (action.action) {
        case 'activate': {
          const mutation = `mutation { enableApiKey(id: ${keyId}) }`;
          return this.client.mutate(mutation);
        }
        case 'deactivate': {
          const mutation = `mutation { disableApiKey(id: ${keyId}) }`;
          return this.client.mutate(mutation);
        }
        case 'revoke': {
          const mutation = `mutation { removeApiKey(id: ${keyId}) }`;
          return this.client.mutate(mutation);
        }
        case 'extend':
          if (!action.expiresAt) {
            return Promise.resolve();
          }
          return this.update(keyId, { expiresAt: action.expiresAt }).toPromise();
        default:
          return Promise.resolve();
      }
    });

    return from(Promise.all(tasks).then(() => undefined));
  }

  getActivityLogs(filters?: ApiKeyActivityFilters): Observable<ApiKeyActivityListResponse> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;

    return from(
      Promise.resolve({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      })
    );
  }

  getActivityLogsForApiKey(
    _id: number,
    filters?: ApiKeyActivityFilters,
  ): Observable<ApiKeyActivityListResponse> {
    return this.getActivityLogs(filters);
  }

  getStats(): Observable<ApiKeyStats> {
    return from(this.fetchSummaryStats());
  }

  extendExpiry(id: number, expiresAt: string): Observable<ApiKey> {
    return this.update(id, { expiresAt });
  }

  private async fetchList(filters?: ApiKeyFilters): Promise<ApiKeyListResponse> {
    const query = `
      query GetApiKeys($filter: ApiKeyQueryDto) {
        apiKeys(filter: $filter) {
          edges {
            node {
              id key name description type permissions
              isActive lastUsedAt usageCount expiresAt createdIp
              createdAt updatedAt isExpired isValid
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
        }
      }
    `;

    const filter = this.buildFilterInput(filters);
    const response = await this.client.query<{ apiKeys: ApiKeyConnection }>(query, { filter });

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const totalCount = response.apiKeys.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: response.apiKeys.edges.map(edge => adaptApiKey(edge.node)),
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNext: response.apiKeys.pageInfo.hasNextPage,
      hasPrev: response.apiKeys.pageInfo.hasPreviousPage,
    };
  }

  private async fetchOne(id: number): Promise<ApiKey> {
    const query = `
      query GetApiKey($id: Int!) {
        apiKey(id: $id) {
          id key name description type permissions
          isActive lastUsedAt usageCount expiresAt createdIp
          createdAt updatedAt isExpired isValid
        }
      }
    `;

    const response = await this.client.query<{ apiKey: ApiKeyRecord }>(query, { id });
    return adaptApiKey(response.apiKey);
  }

  private async fetchSummaryStats(): Promise<ApiKeyStats> {
    const query = `
      query GetApiKeySummary {
        apiKeySummary {
          total active inactive expired neverUsed expiringSoon
          totalUsage averageDailyUsage
          mostUsed { id name usageCount lastUsedAt createdAt daysSinceCreation averageDailyUsage }
          recentlyUsed { id name usageCount lastUsedAt createdAt daysSinceCreation averageDailyUsage }
        }
      }
    `;

    const response = await this.client.query<{ apiKeySummary: ApiKeySummaryStatsPayload }>(query);
    return adaptSummaryStats(response.apiKeySummary);
  }

  private buildFilterInput(filters?: ApiKeyFilters): Record<string, unknown> | undefined {
    if (!filters) {
      return undefined;
    }

    const input: Record<string, unknown> = {};

    if (filters.search) input['search'] = filters.search;
    if (filters.status) input['status'] = filters.status;
    if (filters.startDate) input['startDate'] = filters.startDate;
    if (filters.endDate) input['endDate'] = filters.endDate;
    if (filters.page) input['page'] = filters.page;
    if (filters.limit) input['limit'] = filters.limit;
    if (filters.sortBy) input['sortBy'] = filters.sortBy;
    if (filters.sortOrder) input['sortOrder'] = filters.sortOrder;

    return Object.keys(input).length > 0 ? input : undefined;
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
  let type: ApiKeyType = ApiKeyType.READ_ONLY;

  if (record.type) {
    const typeStr = typeof record.type === 'string' ? record.type.toLowerCase() : String(record.type).toLowerCase();
    switch (typeStr) {
      case 'admin':
        type = ApiKeyType.ADMIN;
        break;
      case 'read_write':
        type = ApiKeyType.READ_WRITE;
        break;
      case 'read_only':
      default:
        type = ApiKeyType.READ_ONLY;
        break;
    }
  }

  return {
    id: record.id,
    key: record.key,
    name: record.name,
    description: record.description,
    type,
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
    permissions: record.permissions || [],
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

function adaptApiKeyStats(stats: ApiKeyStatsPayload): ApiKey {
  return {
    id: stats.id,
    key: 'N/A',
    name: stats.name,
    description: undefined,
    type: ApiKeyType.READ_ONLY,
    status: ApiKeyStatus.ACTIVE,
    isActive: true,
    lastUsedAt: normalizeDate(stats.lastUsedAt),
    usageCount: stats.usageCount,
    expiresAt: undefined,
    createdIp: undefined,
    createdAt: normalizeDate(stats.createdAt) ?? new Date(),
    updatedAt: normalizeDate(stats.createdAt) ?? new Date(),
    isExpired: false,
    isValid: true,
    userId: 0,
    permissions: [],
  };
}

function adaptSummaryStats(payload: ApiKeySummaryStatsPayload): ApiKeyStats {
  const placeholder = createPlaceholderKey();

  return {
    total: payload.total,
    active: payload.active,
    inactive: payload.inactive,
    expired: payload.expired,
    revoked: 0, // 后端暂未提供此数据
    readOnly: payload.total, // 默认所有key都是只读类型
    readWrite: 0,
    admin: 0,
    expiringSoon: payload.expiringSoon,
    neverUsed: payload.neverUsed,
    mostUsed: payload.mostUsed ? adaptApiKeyStats(payload.mostUsed) : placeholder,
    recentlyUsed: payload.recentlyUsed ? adaptApiKeyStats(payload.recentlyUsed) : placeholder,
  };
}
