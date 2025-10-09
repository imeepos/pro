import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize } from 'rxjs';
import { EventTypesStore } from './event-types.store';
import { EventTypesQuery } from './event-types.query';
import {
  EventTypeApi,
  EventType,
  CreateEventTypeDto,
  UpdateEventTypeDto
} from '@pro/sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EventTypesService {
  private api: EventTypeApi;

  constructor(
    private store: EventTypesStore,
    private query: EventTypesQuery
  ) {
    this.api = new EventTypeApi(environment.apiUrl || 'http://localhost:3000');
  }

  loadEventTypes(): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return new Observable(observer => {
      from(this.api.getEventTypes()).pipe(
        tap(eventTypes => {
          this.store.set(eventTypes);
          observer.next();
          observer.complete();
        }),
        catchError(error => {
          this.setError(error.message || '加载事件类型列表失败');
          observer.error(error);
          return throwError(() => error);
        }),
        finalize(() => this.setLoading(false))
      ).subscribe();
    });
  }

  loadEventTypeById(id: number): Observable<EventType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.getEventTypeById(id)).pipe(
      catchError(error => {
        this.setError(error.message || '加载事件类型详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  loadEventTypesByIndustry(industryId: number): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return new Observable(observer => {
      from(this.api.getEventTypesByIndustry(industryId)).pipe(
        tap(eventTypes => {
          this.store.set(eventTypes);
          observer.next();
          observer.complete();
        }),
        catchError(error => {
          this.setError(error.message || '加载行业事件类型失败');
          observer.error(error);
          return throwError(() => error);
        }),
        finalize(() => this.setLoading(false))
      ).subscribe();
    });
  }

  createEventType(dto: CreateEventTypeDto): Observable<EventType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.createEventType(dto)).pipe(
      tap(eventType => {
        this.store.add(eventType);
      }),
      catchError(error => {
        this.setError(error.message || '创建事件类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateEventType(id: number, dto: UpdateEventTypeDto): Observable<EventType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.updateEventType(id, dto)).pipe(
      tap(eventType => {
        this.store.update(eventType.id, eventType);
      }),
      catchError(error => {
        this.setError(error.message || '更新事件类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteEventType(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.deleteEventType(Number(id))).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除事件类型失败');
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
