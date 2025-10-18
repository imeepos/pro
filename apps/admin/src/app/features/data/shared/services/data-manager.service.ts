import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError, shareReplay } from 'rxjs/operators';
import { GraphQLService } from './graphql.service';
import { WebSocketService } from './websocket.service';
import { RealTimeDataService } from './websocket.service';
import { DataStats, FilterConfig, SortConfig, PaginationConfig, RealTimeUpdate } from '../types/data.types';

export interface DataManagerConfig {
  entity: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
  pageSize?: number;
  cacheEnabled?: boolean;
}

export interface DataState<T = any> {
  data: T[];
  loading: boolean;
  error?: string;
  stats: DataStats;
  pagination: PaginationConfig;
  filter: FilterConfig;
  sort: SortConfig;
  realTimeUpdates: RealTimeUpdate<T>[];
}

@Injectable({
  providedIn: 'root'
})
export class DataManagerService<T = any> {
  private graphqlService = inject(GraphQLService);
  private wsService = inject(WebSocketService);
  private realTimeService = inject(RealTimeDataService);

  private dataManagers = new Map<string, BehaviorSubject<DataState<T>>>();

  // 创建数据管理器
  createManager(config: DataManagerConfig): Observable<DataState<T>> {
    const managerId = config.entity;

    if (this.dataManagers.has(managerId)) {
      return this.dataManagers.get(managerId)!.asObservable();
    }

    // 初始化状态
    const initialState: DataState<T> = {
      data: [],
      loading: false,
      stats: {
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
        lastUpdated: new Date().toISOString()
      },
      pagination: {
        currentPage: 1,
        pageSize: config.pageSize || 20,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100]
      },
      filter: {
        keyword: '',
        filters: {},
        dateRange: undefined
      },
      sort: {
        field: 'createdAt',
        order: 'desc'
      },
      realTimeUpdates: []
    };

    const state$ = new BehaviorSubject<DataState<T>>(initialState);
    this.dataManagers.set(managerId, state$);

    // 设置实时更新
    if (config.enableRealTime) {
      this.setupRealTimeUpdates(config.entity);
    }

    // 设置自动刷新
    if (config.autoRefresh) {
      this.setupAutoRefresh(config, state$);
    }

    return state$.asObservable();
  }

  // 获取数据管理器
  getManager(entity: string): Observable<DataState<T>> | null {
    const manager = this.dataManagers.get(entity);
    return manager ? manager.asObservable() : null;
  }

  // 加载数据
  loadData(entity: string): Observable<T[]> {
    const manager = this.dataManagers.get(entity);
    if (!manager) return of([]);

    const currentState = manager.value;
    manager.next({ ...currentState, loading: true });

    const sortForGraphQL = {
      field: currentState.sort.field,
      order: currentState.sort.order?.toUpperCase() as 'ASC' | 'DESC' | undefined
    };

    return this.graphqlService.listData(
      entity,
      { ...currentState.filter.filters, keyword: currentState.filter.keyword },
      { page: currentState.pagination.currentPage, pageSize: currentState.pagination.pageSize },
      sortForGraphQL
    ).pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.[entity] || [];
      }),
      tap(data => {
        const updatedState = {
          ...currentState,
          data,
          loading: false,
          error: undefined,
          pagination: {
            ...currentState.pagination,
            total: Array.isArray(data) ? data.length : 0
          },
          stats: this.calculateStats(data)
        };
        manager.next(updatedState);
      }),
      catchError(error => {
        const updatedState = {
          ...currentState,
          loading: false,
          error: error.message || 'Failed to load data'
        };
        manager.next(updatedState);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  // 应用筛选
  applyFilter(entity: string, filter: Partial<FilterConfig>): void {
    const manager = this.dataManagers.get(entity);
    if (!manager) return;

    const currentState = manager.value;
    const updatedState = {
      ...currentState,
      filter: { ...currentState.filter, ...filter },
      pagination: { ...currentState.pagination, currentPage: 1 }
    };

    manager.next(updatedState);
    this.loadData(entity);
  }

  // 应用排序
  applySort(entity: string, sort: SortConfig): void {
    const manager = this.dataManagers.get(entity);
    if (!manager) return;

    const currentState = manager.value;
    const normalizedSort = {
      field: sort.field,
      order: sort.order === null ? null : (sort.order?.toLowerCase() as 'asc' | 'desc' | null)
    };

    const updatedState = {
      ...currentState,
      sort: normalizedSort
    };

    manager.next(updatedState);
    this.loadData(entity);
  }

  // 分页
  changePage(entity: string, page: number, pageSize?: number): void {
    const manager = this.dataManagers.get(entity);
    if (!manager) return;

    const currentState = manager.value;
    const updatedState = {
      ...currentState,
      pagination: {
        ...currentState.pagination,
        currentPage: page,
        pageSize: pageSize || currentState.pagination.pageSize
      }
    };

    manager.next(updatedState);
    this.loadData(entity);
  }

  // 创建数据项
  createItem(entity: string, data: Partial<T>): Observable<T | null> {
    return this.graphqlService.createData(entity, data).pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.[`create${entity.charAt(0).toUpperCase() + entity.slice(1)}`] || null;
      }),
      tap(() => {
        // 重新加载数据
        this.loadData(entity);
      }),
      catchError(error => {
        console.error(`Failed to create ${entity}:`, error);
        return of(null);
      })
    );
  }

  // 更新数据项
  updateItem(entity: string, id: string, data: Partial<T>): Observable<T | null> {
    return this.graphqlService.updateData(entity, id, data).pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.[`update${entity.charAt(0).toUpperCase() + entity.slice(1)}`] || null;
      }),
      tap(() => {
        // 重新加载数据
        this.loadData(entity);
      }),
      catchError(error => {
        console.error(`Failed to update ${entity}:`, error);
        return of(null);
      })
    );
  }

  // 删除数据项
  deleteItems(entity: string, ids: string[]): Observable<boolean> {
    return this.graphqlService.deleteData(entity, ids).pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.[`delete${entity.charAt(0).toUpperCase() + entity.slice(1)}`]?.success || false;
      }),
      tap(() => {
        // 重新加载数据
        this.loadData(entity);
      }),
      catchError(error => {
        console.error(`Failed to delete ${entity}:`, error);
        return of(false);
      })
    );
  }

  // 批量操作
  batchOperation(entity: string, operation: string, ids: string[], data?: any): Observable<any> {
    // 根据操作类型执行相应的批量操作
    switch (operation) {
      case 'delete':
        return this.deleteItems(entity, ids);
      case 'update':
        // 假设有批量更新的API
        return this.batchUpdate(entity, ids, data);
      default:
        return of(null);
    }
  }

  // 批量更新
  private batchUpdate(entity: string, ids: string[], data: Partial<T>): Observable<boolean> {
    // 这里可以实现实际的批量更新逻辑
    // 暂时使用循环调用单个更新
    const updateObservables = ids.map(id => this.updateItem(entity, id, data));

    return combineLatest(updateObservables).pipe(
      map(results => results.every(result => result !== null)),
      catchError(() => of(false))
    );
  }

  // 刷新数据
  refreshData(entity: string): void {
    this.loadData(entity);
  }

  // 获取统计信息
  getStats(entity: string): Observable<DataStats> {
    return this.graphqlService.getDataStats(entity).pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.dataStats || {
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
          lastUpdated: new Date().toISOString()
        };
      }),
      catchError(() => {
        return of({
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
          lastUpdated: new Date().toISOString()
        });
      })
    );
  }

  // 获取最近活动
  getRecentActivity(limit = 10): Observable<any[]> {
    return this.graphqlService.getRecentActivity(limit).pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.activities || [];
      }),
      catchError(() => of([]))
    );
  }

  // 获取系统状态
  getSystemStatus(): Observable<any> {
    return this.graphqlService.getSystemStatus().pipe(
      map(response => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }
        return response.data?.systemStatus || {};
      }),
      catchError(() => of({}))
    );
  }

  // 导出数据
  exportData(entity: string, format: 'csv' | 'json' | 'excel' = 'csv'): Observable<Blob> {
    // 这里可以实现数据导出逻辑
    console.log(`Exporting ${entity} data as ${format}`);
    return of(new Blob());
  }

  // 设置实时更新
  private setupRealTimeUpdates(entity: string): void {
    this.realTimeService.subscribeToData<T>(entity).subscribe(() => {
      this.loadData(entity);
    });

    this.wsService.subscribeToRealTimeUpdates(entity).subscribe(update => {
      const manager = this.dataManagers.get(entity);
      if (!manager) return;

      const currentState = manager.value;
      const updatedState = {
        ...currentState,
        realTimeUpdates: [...currentState.realTimeUpdates, update]
      };

      manager.next(updatedState);
    });
  }

  // 设置自动刷新
  private setupAutoRefresh(config: DataManagerConfig, state$: BehaviorSubject<DataState<T>>): void {
    const interval = config.refreshInterval || 30000; // 默认30秒

    setInterval(() => {
      if (!state$.value.loading) {
        this.loadData(config.entity);
      }
    }, interval);
  }

  // 计算统计信息
  private calculateStats(data: any[]): DataStats {
    if (!Array.isArray(data)) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const total = data.length;
    const success = data.filter(item => item.status === 'success').length;
    const failed = data.filter(item => item.status === 'failed').length;
    const pending = data.filter(item => item.status === 'pending').length;

    return {
      total,
      success,
      failed,
      pending,
      lastUpdated: new Date().toISOString()
    };
  }

  // 清理管理器
  cleanup(entity: string): void {
    const manager = this.dataManagers.get(entity);
    if (manager) {
      manager.complete();
      this.dataManagers.delete(entity);
    }

    this.realTimeService.cleanup(entity);
  }

  // 清理所有管理器
  cleanupAll(): void {
    this.dataManagers.forEach((manager, entity) => {
      manager.complete();
      this.realTimeService.cleanup(entity);
    });
    this.dataManagers.clear();
    this.realTimeService.cleanupAll();
  }
}