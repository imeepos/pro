import { Injectable } from '@angular/core';
import { Observable, tap, catchError, throwError, finalize } from 'rxjs';
import { ScreensStore } from './screens.store';
import { ScreensQuery } from './screens.query';
import { ScreenApiService, ScreenPage, CreateScreenDto, UpdateScreenDto } from '../core/services/screen-api.service';

@Injectable({ providedIn: 'root' })
export class ScreensService {
  constructor(
    private store: ScreensStore,
    private query: ScreensQuery,
    private api: ScreenApiService
  ) {}

  loadScreens(page = 1, limit = 20): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return new Observable(observer => {
      this.api.getScreens(page, limit).pipe(
        tap(response => {
          this.store.set(response.items);
          this.store.update({
            total: response.total,
            page: response.page,
            limit: response.limit
          });
          observer.next();
          observer.complete();
        }),
        catchError(error => {
          this.setError(error.message || '加载页面列表失败');
          observer.error(error);
          return throwError(() => error);
        }),
        finalize(() => this.setLoading(false))
      ).subscribe();
    });
  }

  createScreen(dto: CreateScreenDto): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return this.api.createScreen(dto).pipe(
      tap(screen => {
        this.store.add(screen);
      }),
      catchError(error => {
        this.setError(error.message || '创建页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateScreen(id: string, dto: UpdateScreenDto): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return this.api.updateScreen(id, dto).pipe(
      tap(screen => {
        this.store.update(id, screen);
      }),
      catchError(error => {
        this.setError(error.message || '更新页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteScreen(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return this.api.deleteScreen(id).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  copyScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return this.api.copyScreen(id).pipe(
      tap(screen => {
        this.store.add(screen);
      }),
      catchError(error => {
        this.setError(error.message || '复制页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  publishScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return this.api.publishScreen(id).pipe(
      tap(screen => {
        this.store.update(id, screen);
      }),
      catchError(error => {
        this.setError(error.message || '发布页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  draftScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return this.api.draftScreen(id).pipe(
      tap(screen => {
        this.store.update(id, screen);
      }),
      catchError(error => {
        this.setError(error.message || '设为草稿失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  setDefaultScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return this.api.setDefaultScreen(id).pipe(
      tap(screen => {
        const screens = this.query.getAll();
        screens.forEach(s => {
          if (s.id === id) {
            this.store.update(s.id, { ...s, isDefault: true });
          } else if (s.isDefault) {
            this.store.update(s.id, { ...s, isDefault: false });
          }
        });
      }),
      catchError(error => {
        this.setError(error.message || '设置默认页面失败');
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
