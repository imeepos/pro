import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

const SCREEN_FIELD_SELECTION = `
  id
  name
  description
  layout {
    width
    height
    background
    cols
    rows
    grid {
      size
      enabled
    }
  }
  components {
    id
    type
    position {
      x
      y
      width
      height
      zIndex
    }
    config
    dataSource {
      type
      url
      data
      refreshInterval
    }
  }
  status
  isDefault
  createdBy
  createdAt
  updatedAt
`;

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
  extensions?: Record<string, any>;
}

export interface GraphQLQueryOptions {
  variables?: Record<string, any>;
  operationName?: string;
  headers?: Record<string, string>;
  context?: Record<string, any>;
}

export interface QueryBuilder {
  select(fields: string[]): QueryBuilder;
  where(conditions: Record<string, any>): QueryBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  build(): string;
}

@Injectable({
  providedIn: 'root'
})
export class GraphQLService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private cache = new Map<string, any>();

  // 查询构建器类
  createQueryBuilder(entity: string): QueryBuilder {
    return new GraphQLQueryBuilder(entity);
  }

  // 执行GraphQL查询
  query<T = any>(
    query: string,
    options: GraphQLQueryOptions = {}
  ): Observable<GraphQLResponse<T>> {
    const url = `${this.apiUrl}/graphql`;
    const cacheKey = this.getCacheKey(query, options);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey));
    }

    const body = {
      query,
      variables: options.variables || {},
      operationName: options.operationName
    };

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    return this.http.post<GraphQLResponse<T>>(url, body, { headers }).pipe(
      tap(response => {
        if (response.errors) {
          console.warn('[GraphQL] Query warnings:', response.errors);
        }
        // 缓存成功的响应
        if (response.data) {
          this.cache.set(cacheKey, response);
          // 设置缓存过期时间
          setTimeout(() => {
            this.cache.delete(cacheKey);
          }, 5 * 60 * 1000); // 5分钟
        }
      }),
      catchError(error => {
        console.error('[GraphQL] Query error:', error);
        return this.handleGraphQLError(error);
      }),
      shareReplay(1)
    );
  }

  // 执行GraphQL变更
  mutate<T = any>(
    mutation: string,
    options: GraphQLQueryOptions = {}
  ): Observable<GraphQLResponse<T>> {
    const url = `${this.apiUrl}/graphql`;

    // 清除相关缓存
    this.invalidateCache(mutation);

    const body = {
      query: mutation,
      variables: options.variables || {},
      operationName: options.operationName
    };

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    return this.http.post<GraphQLResponse<T>>(url, body, { headers }).pipe(
      tap(response => {
        if (response.errors) {
          console.warn('[GraphQL] Mutation warnings:', response.errors);
        }
      }),
      catchError(error => {
        console.error('[GraphQL] Mutation error:', error);
        return this.handleGraphQLError(error);
      })
    );
  }

  // 订阅GraphQL变更
  subscribe<T = any>(
    subscription: string,
    options: GraphQLQueryOptions = {}
  ): Observable<GraphQLResponse<T>> {
    // 在实际应用中，这里应该使用WebSocket连接
    // 这里提供一个基础实现
    console.warn('[GraphQL] Subscription not fully implemented, falling back to polling');
    return this.poll<T>(subscription, options);
  }

  // 轮询实现（订阅的降级方案）
  private poll<T = any>(
    query: string,
    options: GraphQLQueryOptions,
    interval: number = 5000
  ): Observable<GraphQLResponse<T>> {
    return new Observable<GraphQLResponse<T>>(subscriber => {
      const poll = () => {
        this.query<T>(query, options).subscribe({
          next: response => subscriber.next(response),
          error: error => subscriber.error(error)
        });
      };

      // 立即执行一次
      poll();

      // 设置定时器
      const timer = setInterval(poll, interval);

      // 清理函数
      return () => {
        clearInterval(timer);
      };
    });
  }

  // 预构建的查询方法
  getDataStats(type?: string): Observable<GraphQLResponse> {
    const query = this.createQueryBuilder('dataStats')
      .select(['totalCount', 'successCount', 'failedCount', 'pendingCount', 'lastUpdated'])
      .where(type ? { type } : {})
      .build();

    return this.query(query);
  }

  getRecentActivity(limit = 10): Observable<GraphQLResponse> {
    const query = this.createQueryBuilder('activities')
      .select(['id', 'type', 'message', 'timestamp', 'user', 'details'])
      .orderBy('timestamp', 'DESC')
      .limit(limit)
      .build();

    return this.query(query);
  }

  getSystemStatus(): Observable<GraphQLResponse> {
    const query = this.createQueryBuilder('systemStatus')
      .select(['cpu', 'memory', 'disk', 'network', 'services'])
      .build();

    return this.query(query);
  }

  // 数据管理查询
  listData(
    entity: string,
    filters: Record<string, any> = {},
    pagination: { page?: number; pageSize?: number } = {},
    sort: { field?: string; order?: 'ASC' | 'DESC' } = {}
  ): Observable<GraphQLResponse> {
    const query = this.createQueryBuilder(entity)
      .select(['id', 'createdAt', 'updatedAt', 'status', ...Object.keys(filters)])
      .where(filters)
      .orderBy(sort.field || 'createdAt', sort.order || 'DESC')
      .limit(pagination.pageSize || 20)
      .offset(((pagination.page || 1) - 1) * (pagination.pageSize || 20))
      .build();

    return this.query(query);
  }

  createData(entity: string, data: Record<string, any>): Observable<GraphQLResponse> {
    const normalizedEntity = entity.trim().toLowerCase();

    if (normalizedEntity === 'screen' || normalizedEntity === 'screens') {
      const mutation = `
        mutation CreateScreen($input: CreateScreenInput!) {
          createScreen(input: $input) {
            ${SCREEN_FIELD_SELECTION}
          }
        }
      `;

      return this.mutate(mutation, {
        variables: { input: data }
      });
    }

    const mutation = `
      mutation Create${entity.charAt(0).toUpperCase() + entity.slice(1)}($input: ${entity}Input!) {
        create${entity.charAt(0).toUpperCase() + entity.slice(1)}(input: $input) {
          id
          createdAt
          status
        }
      }
    `;

    return this.mutate(mutation, {
      variables: { input: data }
    });
  }

  updateData(entity: string, id: string, data: Record<string, any>): Observable<GraphQLResponse> {
    const normalizedEntity = entity.trim().toLowerCase();

    if (normalizedEntity === 'screen' || normalizedEntity === 'screens') {
      const mutation = `
        mutation UpdateScreen($id: ID!, $input: UpdateScreenInput!) {
          updateScreen(id: $id, input: $input) {
            ${SCREEN_FIELD_SELECTION}
          }
        }
      `;

      return this.mutate(mutation, {
        variables: { id, input: data }
      });
    }

    const mutation = `
      mutation Update${entity.charAt(0).toUpperCase() + entity.slice(1)}($id: ID!, $input: ${entity}Input!) {
        update${entity.charAt(0).toUpperCase() + entity.slice(1)}(id: $id, input: $input) {
          id
          updatedAt
          status
        }
      }
    `;

    return this.mutate(mutation, {
      variables: { id, input: data }
    });
  }

  deleteData(entity: string, ids: string[]): Observable<GraphQLResponse> {
    const mutation = `
      mutation Delete${entity.charAt(0).toUpperCase() + entity.slice(1)}($ids: [ID!]!) {
        delete${entity.charAt(0).toUpperCase() + entity.slice(1)}(ids: $ids) {
          success
          deletedCount
        }
      }
    `;

    return this.mutate(mutation, {
      variables: { ids }
    });
  }

  // 工具方法
  private getCacheKey(query: string, options: GraphQLQueryOptions): string {
    return JSON.stringify({ query, variables: options.variables });
  }

  private invalidateCache(mutation: string): void {
    // 基于变更类型清除相关缓存
    const cacheKeys = Array.from(this.cache.keys());
    cacheKeys.forEach(key => {
      if (key.includes('query') && !key.includes('mutation')) {
        this.cache.delete(key);
      }
    });
  }

  private handleGraphQLError(error: any): Observable<never> {
    const message = error?.error?.errors?.[0]?.message || error?.message || 'Unknown GraphQL error';
    return throwError(() => new Error(`GraphQL Error: ${message}`));
  }
}

// GraphQL查询构建器实现
class GraphQLQueryBuilder implements QueryBuilder {
  private fields: string[] = [];
  private conditions: Record<string, any> = {};
  private ordering: Array<{ field: string; direction: 'ASC' | 'DESC' }> = [];
  private limitCount?: number;
  private offsetCount?: number;

  constructor(private entity: string) {}

  select(fields: string[]): QueryBuilder {
    this.fields = fields;
    return this;
  }

  where(conditions: Record<string, any>): QueryBuilder {
    this.conditions = { ...this.conditions, ...conditions };
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.ordering.push({ field, direction });
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetCount = count;
    return this;
  }

  build(): string {
    let query = `query${this.entity.charAt(0).toUpperCase() + this.entity.slice(1)}(`;

    // 构建参数
    const params: string[] = [];
    const args: string[] = [];

    if (Object.keys(this.conditions).length > 0) {
      params.push(`$filter: ${this.entity}Filter`);
      args.push(`filter: $filter`);
    }

    if (this.limitCount) {
      params.push(`$limit: Int`);
      args.push(`limit: $limit`);
    }

    if (this.offsetCount) {
      params.push(`$offset: Int`);
      args.push(`offset: $offset`);
    }

    if (this.ordering.length > 0) {
      params.push(`$orderBy: [${this.entity}OrderBy!]`);
      args.push(`orderBy: $orderBy`);
    }

    query += params.join(', ');
    query += `) {\n  ${this.entity.toLowerCase()}(`;
    query += args.join(', ');
    query += `) {\n    `;

    // 选择字段
    if (this.fields.length > 0) {
      query += this.fields.join('\n    ');
    } else {
      query += 'id\n    createdAt\n    updatedAt\n    status';
    }

    query += '\n  }\n}';

    return query;
  }
}
