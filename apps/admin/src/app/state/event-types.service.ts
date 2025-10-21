import { Injectable, inject } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';
import { EventTypesStore } from './event-types.store';
import { EventTypesQuery } from './event-types.query';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  EventTypesDocument,
  EventTypeDocument,
  CreateEventTypeDocument,
  UpdateEventTypeDocument,
  RemoveEventTypeDocument
} from '../core/graphql/generated/graphql';
import { EventType as DomainEventType } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class EventTypesService {
  private gateway = inject(GraphqlGateway);
  private store = inject(EventTypesStore);
  private query = inject(EventTypesQuery);

  loadEventTypes(): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(this.gateway.request(EventTypesDocument)).pipe(
      map(result => result.eventTypes.map(this.toDomainEventType)),
      tap(eventTypes => {
        this.store.set(eventTypes);
      }),
      map(() => undefined),
      catchError(error => {
        this.setError(error.message || '加载事件类型列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  loadEventTypeById(id: string): Observable<DomainEventType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.gateway.request(EventTypeDocument, { id })).pipe(
      map(result => this.toDomainEventType(result.eventType)),
      catchError(error => {
        this.setError(error.message || '加载事件类型详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  createEventType(dto: { eventName: string; eventCode: string; description?: string; sortOrder?: number; status?: number }): Observable<DomainEventType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.gateway.request(CreateEventTypeDocument, { input: dto })).pipe(
      map(result => this.toDomainEventType(result.createEventType)),
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

  updateEventType(id: string, dto: { eventName?: string; eventCode?: string; description?: string; sortOrder?: number; status?: number }): Observable<DomainEventType> {
    this.setLoading(true);
    this.setError(null);

    return from(this.gateway.request(UpdateEventTypeDocument, { id, input: dto })).pipe(
      map(result => this.toDomainEventType(result.updateEventType)),
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

    return from(this.gateway.request(RemoveEventTypeDocument, { id })).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      map(() => undefined),
      catchError(error => {
        this.setError(error.message || '删除事件类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  private toDomainEventType(gqlType: { id: string; eventName: string; eventCode: string; description?: string | null; sortOrder: number; status: number; createdAt: string; updatedAt: string }): DomainEventType {
    return {
      id: gqlType.id,
      eventCode: gqlType.eventCode,
      eventName: gqlType.eventName,
      description: gqlType.description ?? undefined,
      sortOrder: gqlType.sortOrder,
      status: gqlType.status,
      createdAt: gqlType.createdAt,
      updatedAt: gqlType.updatedAt
    };
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
