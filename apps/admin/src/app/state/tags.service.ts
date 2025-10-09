import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize } from 'rxjs';
import { TagsStore } from './tags.store';
import { TagsQuery } from './tags.query';
import { TagApi, Tag, CreateTagDto, UpdateTagDto } from '@pro/sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private api: TagApi;

  constructor(
    private store: TagsStore,
    private query: TagsQuery
  ) {
    this.api = new TagApi(environment.apiUrl || 'http://localhost:3000');
  }

  loadTags(params?: { page?: number; pageSize?: number; keyword?: string }): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return new Observable(observer => {
      from(this.api.getTags(params)).pipe(
        tap(response => {
          this.store.set(response.data);
          this.store.update({ total: response.total });
          observer.next();
          observer.complete();
        }),
        catchError(error => {
          this.setError(error.message || '加载标签列表失败');
          observer.error(error);
          return throwError(() => error);
        }),
        finalize(() => this.setLoading(false))
      ).subscribe();
    });
  }

  loadPopularTags(limit = 20): Observable<Tag[]> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.getPopularTags(limit)).pipe(
      tap(tags => {
        this.store.set(tags);
      }),
      catchError(error => {
        this.setError(error.message || '加载热门标签失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  createTag(dto: CreateTagDto): Observable<Tag> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.createTag(dto)).pipe(
      tap(tag => {
        this.store.add(tag);
      }),
      catchError(error => {
        this.setError(error.message || '创建标签失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateTag(id: number, dto: UpdateTagDto): Observable<Tag> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.updateTag(id, dto)).pipe(
      tap(tag => {
        this.store.update(id, tag);
      }),
      catchError(error => {
        this.setError(error.message || '更新标签失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteTag(id: number): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.deleteTag(id)).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除标签失败');
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
