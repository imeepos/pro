import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize } from 'rxjs';
import { EventsStore } from './events.store';
import { EventsQuery } from './events.query';
import {
  EventApi,
  Event,
  CreateEventDto,
  UpdateEventDto,
  EventQueryParams,
  EventDetail
} from '@pro/sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private api: EventApi;

  constructor(
    private store: EventsStore,
    private query: EventsQuery
  ) {
    this.api = new EventApi(environment.apiUrl || 'http://localhost:3000');
  }

  loadEvents(params: EventQueryParams): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return new Observable(observer => {
      from(this.api.getEvents(params)).pipe(
        tap(response => {
          this.store.set(response.data);
          this.store.update({
            total: response.total,
            page: response.page,
            limit: response.pageSize
          });
          observer.next();
          observer.complete();
        }),
        catchError(error => {
          this.setError(error.message || '加载事件列表失败');
          observer.error(error);
          return throwError(() => error);
        }),
        finalize(() => this.setLoading(false))
      ).subscribe();
    });
  }

  loadEventDetail(id: string): Observable<EventDetail> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.getEventById(id)).pipe(
      catchError(error => {
        this.setError(error.message || '加载事件详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  createEvent(dto: CreateEventDto): Observable<Event> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.createEvent(dto)).pipe(
      tap(event => {
        this.store.add(event);
      }),
      catchError(error => {
        this.setError(error.message || '创建事件失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateEvent(id: string, dto: UpdateEventDto): Observable<Event> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.updateEvent(id, dto)).pipe(
      tap(event => {
        this.store.update(id, event);
      }),
      catchError(error => {
        this.setError(error.message || '更新事件失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteEvent(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.deleteEvent(id)).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除事件失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  publishEvent(id: string): Observable<Event> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.publishEvent(id)).pipe(
      tap(event => {
        this.store.update(id, event);
      }),
      catchError(error => {
        this.setError(error.message || '发布事件失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  archiveEvent(id: string): Observable<Event> {
    this.setLoading(true);
    this.setError(null);

    return from(this.api.archiveEvent(id)).pipe(
      tap(event => {
        this.store.update(id, event);
      }),
      catchError(error => {
        this.setError(error.message || '归档事件失败');
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
