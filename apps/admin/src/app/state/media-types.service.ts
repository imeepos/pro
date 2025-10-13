import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize } from 'rxjs';
import { MediaTypesStore } from './media-types.store';
import { MediaTypesQuery } from './media-types.query';
import {
  MediaTypeSdkImpl,
  MediaType,
  CreateMediaTypeDto,
  UpdateMediaTypeDto
} from '@pro/sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaTypesService {
  private sdk: MediaTypeSdkImpl;

  constructor(
    private store: MediaTypesStore,
    private query: MediaTypesQuery
  ) {
    this.sdk = new MediaTypeSdkImpl(environment.apiUrl);
  }

  loadMediaTypes(): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.sdk.getMediaTypeList()).pipe(
      tap(result => {
        this.store.set(result.list);
      }),
      catchError(error => {
        this.setError(error.message || '加载媒体类型列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      tap(() => {}),
    ) as unknown as Observable<void>;
  }

  loadMediaTypeById(id: number): Observable<MediaType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.sdk.getMediaTypeById(id)).pipe(
      catchError(error => {
        this.setError(error.message || '加载媒体类型详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  createMediaType(dto: CreateMediaTypeDto): Observable<MediaType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.sdk.createMediaType(dto)).pipe(
      tap(mediaType => {
        this.store.add(mediaType);
      }),
      catchError(error => {
        this.setError(error.message || '创建媒体类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateMediaType(id: number, dto: UpdateMediaTypeDto): Observable<MediaType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.sdk.updateMediaType(id, dto)).pipe(
      tap(mediaType => {
        this.store.update(mediaType.id, mediaType);
      }),
      catchError(error => {
        this.setError(error.message || '更新媒体类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteMediaType(id: number): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.sdk.deleteMediaType(id)).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除媒体类型失败');
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
