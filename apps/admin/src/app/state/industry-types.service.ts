import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize } from 'rxjs';
import { IndustryTypesStore } from './industry-types.store';
import { IndustryTypesQuery } from './industry-types.query';
import {
  IndustryTypeApi,
  IndustryType,
  CreateIndustryTypeDto,
  UpdateIndustryTypeDto
} from '@pro/sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IndustryTypesService {
  private api: IndustryTypeApi;

  constructor(
    private store: IndustryTypesStore,
    private query: IndustryTypesQuery
  ) {
    this.api = new IndustryTypeApi(environment.apiUrl || 'http://localhost:3000');
  }

  loadIndustryTypes(): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return new Observable(observer => {
      from(this.api.getIndustryTypes()).pipe(
        tap(industryTypes => {
          this.store.set(industryTypes);
          observer.next();
          observer.complete();
        }),
        catchError(error => {
          this.setError(error.message || '加载行业类型列表失败');
          observer.error(error);
          return throwError(() => error);
        }),
        finalize(() => this.setLoading(false))
      ).subscribe();
    });
  }

  loadIndustryTypeById(id: number): Observable<IndustryType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.getIndustryTypeById(id)).pipe(
      catchError(error => {
        this.setError(error.message || '加载行业类型详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  createIndustryType(dto: CreateIndustryTypeDto): Observable<IndustryType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.createIndustryType(dto)).pipe(
      tap(industryType => {
        this.store.add(industryType);
      }),
      catchError(error => {
        this.setError(error.message || '创建行业类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateIndustryType(id: number, dto: UpdateIndustryTypeDto): Observable<IndustryType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.updateIndustryType(id, dto)).pipe(
      tap(industryType => {
        this.store.update(industryType.id, industryType);
      }),
      catchError(error => {
        this.setError(error.message || '更新行业类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteIndustryType(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.deleteIndustryType(Number(id))).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除行业类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
