import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

import { SkerSDK } from '@pro/sdk';
import {
  RawData,
  RawDataFilters,
  RawDataListResponse,
  RawDataStats,
  CreateRawDataSourceDto,
  UpdateRawDataDto,
  ProcessingStatus,
  SourceType,
  SourcePlatform
} from '@pro/types';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private sdk: SkerSDK;

  private dataListSubject = new BehaviorSubject<RawData[]>([]);
  private selectedDataSubject = new BehaviorSubject<RawData | null>(null);
  private statsSubject = new BehaviorSubject<RawDataStats | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private paginationSubject = new BehaviorSubject<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });

  dataList$ = this.dataListSubject.asObservable();
  selectedData$ = this.selectedDataSubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  pagination$ = this.paginationSubject.asObservable();

  ProcessingStatus = ProcessingStatus;
  SourceType = SourceType;
  SourcePlatform = SourcePlatform;

  constructor() {
    this.sdk = new SkerSDK(environment.apiUrl);
  }

  loadDataList(filters?: RawDataFilters): void {
    this.setLoading(true);
    this.clearError();

    from(this.sdk.rawData.findAll(filters))
      .pipe(
        tap((response: RawDataListResponse) => {
          this.dataListSubject.next(response.data);
          this.paginationSubject.next({
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages
          });
          this.setLoading(false);
        }),
        catchError((error) => {
          this.handleError('加载数据列表失败', error);
          return of();
        })
      )
      .subscribe();
  }

  loadStats(): void {
    from(this.sdk.rawData.getStats())
      .pipe(
        tap((stats: RawDataStats) => {
          this.statsSubject.next(stats);
        }),
        catchError((error) => {
          console.warn('加载统计信息失败:', error);
          return of();
        })
      )
      .subscribe();
  }

  createData(dto: CreateRawDataSourceDto): Observable<RawData> {
    this.setLoading(true);
    this.clearError();

    return from(this.sdk.rawData.create(dto)).pipe(
      tap((data: RawData) => {
        this.setLoading(false);
        this.loadDataList();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('创建数据失败', error);
        return of();
      })
    );
  }

  updateData(id: number, updates: UpdateRawDataDto): Observable<RawData> {
    this.setLoading(true);
    this.clearError();

    return from(this.sdk.rawData.update(id, updates)).pipe(
      tap((data: RawData) => {
        this.setLoading(false);
        this.updateDataInList(data);
      }),
      catchError((error) => {
        this.handleError('更新数据失败', error);
        return of();
      })
    );
  }

  deleteData(id: number): Observable<void> {
    this.setLoading(true);
    this.clearError();

    return from(this.sdk.rawData.delete(id)).pipe(
      tap(() => {
        this.setLoading(false);
        this.removeDataFromList(id);
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('删除数据失败', error);
        return of();
      })
    );
  }

  processData(id: number): Observable<RawData> {
    this.setLoading(true);

    return from(this.sdk.rawData.process(id)).pipe(
      tap((data: RawData) => {
        this.setLoading(false);
        this.updateDataInList(data);
      }),
      catchError((error) => {
        this.handleError('处理数据失败', error);
        return of();
      })
    );
  }

  reprocessData(id: number): Observable<RawData> {
    this.setLoading(true);

    return from(this.sdk.rawData.reprocess(id)).pipe(
      tap((data: RawData) => {
        this.setLoading(false);
        this.updateDataInList(data);
      }),
      catchError((error) => {
        this.handleError('重新处理数据失败', error);
        return of();
      })
    );
  }

  selectData(data: RawData): void {
    this.selectedDataSubject.next(data);
  }

  clearSelectedData(): void {
    this.selectedDataSubject.next(null);
  }

  getData(id: number): Observable<RawData | null> {
    return from(this.sdk.rawData.findOne(id)).pipe(
      catchError(() => of(null))
    );
  }

  searchData(query: string): Observable<RawData[]> {
    const filters: RawDataFilters = {
      search: query,
      limit: 50
    };

    return from(this.sdk.rawData.findAll(filters)).pipe(
      map((response) => response.data),
      catchError(() => of([]))
    );
  }

  getDataByStatus(status: ProcessingStatus): Observable<RawData[]> {
    const filters: RawDataFilters = {
      processingStatus: status,
      limit: 100
    };

    return from(this.sdk.rawData.findAll(filters)).pipe(
      map((response) => response.data),
      catchError(() => of([]))
    );
  }

  bulkDeleteData(ids: number[]): Observable<void> {
    return from(this.sdk.rawData.bulkDelete(ids)).pipe(
      tap(() => {
        this.loadDataList();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('批量删除失败', error);
        return of();
      })
    );
  }

  bulkProcessData(ids: number[]): Observable<void> {
    return from(this.sdk.rawData.bulkProcess(ids)).pipe(
      tap(() => {
        this.loadDataList();
        this.loadStats();
      }),
      catchError((error) => {
        this.handleError('批量处理失败', error);
        return of();
      })
    );
  }

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

  private updateDataInList(updatedData: RawData): void {
    const currentList = this.dataListSubject.value;
    const index = currentList.findIndex(data => data.id === updatedData.id);

    if (index !== -1) {
      const updatedList = [...currentList];
      updatedList[index] = updatedData;
      this.dataListSubject.next(updatedList);
    }
  }

  private removeDataFromList(id: number): void {
    const currentList = this.dataListSubject.value;
    const filteredList = currentList.filter(data => data.id !== id);
    this.dataListSubject.next(filteredList);
  }

  clearAllData(): void {
    this.dataListSubject.next([]);
    this.selectedDataSubject.next(null);
    this.statsSubject.next(null);
    this.clearError();
    this.setLoading(false);
  }

  getProcessingStatusText(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.PENDING:
        return '等待处理';
      case ProcessingStatus.PROCESSING:
        return '处理中';
      case ProcessingStatus.COMPLETED:
        return '已完成';
      case ProcessingStatus.FAILED:
        return '处理失败';
      default:
        return '未知';
    }
  }

  getSourceTypeText(type: SourceType): string {
    switch (type) {
      case SourceType.WEIBO_HTML:
        return '微博HTML';
      case SourceType.WEIBO_API_JSON:
        return '微博API JSON';
      case SourceType.WEIBO_COMMENT:
        return '微博评论';
      case SourceType.JD:
        return '京东';
      case SourceType.CUSTOM:
        return '自定义';
      default:
        return '未知';
    }
  }

  getSourcePlatformText(platform: SourcePlatform): string {
    switch (platform) {
      case SourcePlatform.WEIBO:
        return '微博';
      case SourcePlatform.JD:
        return '京东';
      case SourcePlatform.CUSTOM:
        return '自定义';
      default:
        return '未知';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeTime(date: Date | string | undefined): string {
    if (!date) return '从未处理';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 30) return `${diffDays} 天前`;

    return this.formatDate(date);
  }
}