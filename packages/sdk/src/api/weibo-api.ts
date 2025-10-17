import { Observable, from } from 'rxjs';
import { GraphQLClient } from '../client/graphql-client.js';
import {
  WeiboAccount,
  WeiboAccountFilters,
  WeiboAccountListResponse,
  WeiboAccountStats,
  WeiboAccountStatus,
  WeiboLoginSession,
} from '@pro/types';

interface WeiboAccountNode {
  id: number;
  nickname: string;
  avatar?: string;
  uid: string;
  status: string;
  hasCookies: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastCheckAt?: string | Date;
}

interface PageInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface WeiboAccountConnection {
  nodes: WeiboAccountNode[];
  pageInfo: PageInfo;
}

interface WeiboAccountStatsResponse {
  total: number;
  todayNew: number;
  online: number;
}

interface WeiboLoginSessionResponse {
  sessionId: string;
  qrCodeUrl: string;
  status: string;
  expiresAt: string | Date;
  userId: string;
  createdAt: string | Date;
}

export class WeiboApi {
  private readonly client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    if (!baseUrl) {
      throw new Error('baseUrl is required for WeiboApi');
    }
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  getAccounts(filters?: WeiboAccountFilters): Observable<WeiboAccountListResponse> {
    const query = `
      query GetWeiboAccounts($filter: WeiboAccountFilterDto) {
        weiboAccounts(filter: $filter) {
          nodes {
            id nickname avatar uid status hasCookies
            createdAt updatedAt lastCheckAt
          }
          pageInfo {
            total page pageSize totalPages
          }
        }
      }
    `;

    const filter = filters ? this.buildFilterInput(filters) : undefined;

    return from(
      this.client
        .query<{ weiboAccounts: WeiboAccountConnection }>(query, { filter })
        .then(res => ({
          data: res.weiboAccounts.nodes.map(node => this.adaptWeiboAccount(node)),
          total: res.weiboAccounts.pageInfo.total,
          page: res.weiboAccounts.pageInfo.page,
          limit: res.weiboAccounts.pageInfo.pageSize,
          totalPages: res.weiboAccounts.pageInfo.totalPages,
          hasNext: res.weiboAccounts.pageInfo.page < res.weiboAccounts.pageInfo.totalPages,
          hasPrev: res.weiboAccounts.pageInfo.page > 1,
        }))
    );
  }

  getAccount(id: number): Observable<WeiboAccount> {
    const query = `
      query GetWeiboAccount($id: Int!) {
        weiboAccount(id: $id) {
          id nickname avatar uid status hasCookies
          createdAt updatedAt lastCheckAt
        }
      }
    `;

    return from(
      this.client
        .query<{ weiboAccount: WeiboAccountNode }>(query, { id })
        .then(res => this.adaptWeiboAccount(res.weiboAccount))
    );
  }

  removeAccount(id: number): Observable<void> {
    const mutation = `
      mutation RemoveWeiboAccount($id: Int!) {
        removeWeiboAccount(id: $id)
      }
    `;

    return from(
      this.client.mutate<{ removeWeiboAccount: boolean }>(mutation, { id }).then(() => undefined)
    );
  }

  checkAccount(id: number): Observable<void> {
    const mutation = `
      mutation CheckWeiboAccount($id: Int!) {
        checkWeiboAccount(id: $id)
      }
    `;

    return from(
      this.client.mutate<{ checkWeiboAccount: boolean }>(mutation, { id }).then(() => undefined)
    );
  }

  checkAllAccounts(): Observable<void> {
    const mutation = `
      mutation CheckAllWeiboAccounts {
        checkAllWeiboAccounts
      }
    `;

    return from(
      this.client.mutate<{ checkAllWeiboAccounts: boolean }>(mutation).then(() => undefined)
    );
  }

  getAccountStats(): Observable<WeiboAccountStats> {
    const query = `
      query GetWeiboAccountStats {
        weiboAccountStats {
          total todayNew online
        }
      }
    `;

    return from(
      this.client
        .query<{ weiboAccountStats: WeiboAccountStatsResponse }>(query)
        .then(res => ({
          total: res.weiboAccountStats.total,
          active: res.weiboAccountStats.online,
          inactive: 0,
          suspended: 0,
          expired: 0,
          healthy: res.weiboAccountStats.online,
          unhealthy: res.weiboAccountStats.total - res.weiboAccountStats.online,
        }))
    );
  }

  startLogin(): Observable<WeiboLoginSession> {
    const mutation = `
      mutation StartWeiboLogin {
        startWeiboLogin {
          sessionId qrCodeUrl status expiresAt userId createdAt
        }
      }
    `;

    return from(
      this.client
        .mutate<{ startWeiboLogin: WeiboLoginSessionResponse }>(mutation)
        .then(res => this.adaptLoginSession(res.startWeiboLogin))
    );
  }

  getLoginSession(sessionId: string): Observable<WeiboLoginSession> {
    const query = `
      query GetWeiboLoginSession($sessionId: String!) {
        weiboLoginSession(sessionId: $sessionId) {
          sessionId qrCodeUrl status expiresAt userId createdAt
        }
      }
    `;

    return from(
      this.client
        .query<{ weiboLoginSession: WeiboLoginSessionResponse }>(query, { sessionId })
        .then(res => this.adaptLoginSession(res.weiboLoginSession))
    );
  }

  private adaptWeiboAccount(node: WeiboAccountNode): WeiboAccount {
    return {
      id: node.id,
      userId: 0,
      username: node.uid,
      nickname: node.nickname,
      uid: node.uid,
      status: this.parseAccountStatus(node.status),
      cookies: node.hasCookies ? 'present' : undefined,
      isHealthy: node.status === 'active',
      errorCount: 0,
      createdAt: this.normalizeDate(node.createdAt) ?? new Date(),
      updatedAt: this.normalizeDate(node.updatedAt) ?? new Date(),
      lastCheckAt: this.normalizeDate(node.lastCheckAt),
    };
  }

  private adaptLoginSession(data: WeiboLoginSessionResponse): WeiboLoginSession {
    return {
      id: 0,
      accountId: 0,
      sessionToken: data.sessionId,
      qrCodeUrl: data.qrCodeUrl,
      status: this.parseLoginStatus(data.status),
      expiresAt: this.normalizeDate(data.expiresAt) ?? new Date(),
      createdAt: this.normalizeDate(data.createdAt) ?? new Date(),
      updatedAt: this.normalizeDate(data.createdAt) ?? new Date(),
    };
  }

  private normalizeDate(value?: string | Date | null): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseAccountStatus(status: string): WeiboAccountStatus {
    const statusMap: Record<string, WeiboAccountStatus> = {
      'active': WeiboAccountStatus.ACTIVE,
      'inactive': WeiboAccountStatus.INACTIVE,
      'suspended': WeiboAccountStatus.SUSPENDED,
      'expired': WeiboAccountStatus.EXPIRED,
    };
    return statusMap[status] ?? WeiboAccountStatus.INACTIVE;
  }

  private parseLoginStatus(status: string): WeiboLoginSession['status'] {
    const validStatuses: ReadonlySet<WeiboLoginSession['status']> = new Set([
      'pending',
      'scanned',
      'confirmed',
      'expired',
      'failed',
    ]);

    const candidate = status as WeiboLoginSession['status'];
    return validStatuses.has(candidate) ? candidate : 'pending';
  }

  private buildFilterInput(filters: WeiboAccountFilters): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    if (filters.search) input['search'] = filters.search;
    if (filters.status) input['status'] = filters.status;
    if (filters.userId) input['userId'] = filters.userId;
    if (filters.isHealthy !== undefined) input['isHealthy'] = filters.isHealthy;
    if (filters.page) input['page'] = filters.page;
    if (filters.limit) input['limit'] = filters.limit;
    if (filters.sortBy) input['sortBy'] = filters.sortBy;
    if (filters.sortOrder) input['sortOrder'] = filters.sortOrder;
    return Object.keys(input).length > 0 ? input : {};
  }
}
