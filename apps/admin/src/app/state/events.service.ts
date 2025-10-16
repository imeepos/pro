import { Injectable, inject } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';
import { EventsStore } from './events.store';
import { EventsQuery } from './events.query';
import {
  Event,
  CreateEventDto,
  UpdateEventDto,
  EventQueryParams,
  EventDetail
} from '@pro/sdk';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  EventsDocument,
  EventsQuery as EventsGqlQuery,
  EventsQueryVariables,
  EventDocument,
  EventQuery as EventGqlQuery,
  EventQueryVariables,
  CreateEventDocument,
  CreateEventMutation,
  CreateEventMutationVariables,
  UpdateEventDocument,
  UpdateEventMutation,
  UpdateEventMutationVariables,
  RemoveEventDocument,
  RemoveEventMutation,
  RemoveEventMutationVariables,
  PublishEventDocument,
  PublishEventMutation,
  PublishEventMutationVariables,
  ArchiveEventDocument,
  ArchiveEventMutation,
  ArchiveEventMutationVariables,
  EventStatus as GqlEventStatus
} from '../core/graphql/generated/graphql';
import { toDomainEvent, toDomainEventStatus } from '../core/utils/event-mapper';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private gateway = inject(GraphqlGateway);
  private store = inject(EventsStore);
  private query = inject(EventsQuery);

  loadEvents(params: EventQueryParams): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<EventsGqlQuery, EventsQueryVariables>(EventsDocument, {
        filter: {
          page: params.page,
          pageSize: params.pageSize,
          status: this.toGqlEventStatus(params.status),
          keyword: params.keyword,
          startTime: params.startTime,
          endTime: params.endTime,
          industryTypeId: params.industryTypeId,
          eventTypeId: params.eventTypeId,
          province: params.province,
          city: params.city,
          district: params.district,
          tagIds: params.tagIds
        }
      })
    ).pipe(
      map(result => this.mapEventsResult(result)),
      tap(response => {
        this.store.set(response.data);
        this.store.update({
          total: response.total,
          page: response.page,
          limit: response.pageSize
        });
      }),
      catchError(error => {
        this.setError(error.message || '加载事件列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  loadEventDetail(id: string): Observable<EventDetail> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<EventGqlQuery, EventQueryVariables>(EventDocument, { id })
    ).pipe(
      map(result => this.toEventDetail(result.event)),
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

    return from(
      this.gateway.request<CreateEventMutation, CreateEventMutationVariables>(
        CreateEventDocument,
        {
          input: {
            ...dto,
            status: dto.status !== undefined ? this.toGqlEventStatus(dto.status) : undefined
          }
        }
      )
    ).pipe(
      map(result => this.toSimpleEvent(result.createEvent)),
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

    return from(
      this.gateway.request<UpdateEventMutation, UpdateEventMutationVariables>(
        UpdateEventDocument,
        {
          id,
          input: {
            ...dto,
            status: dto.status !== undefined ? this.toGqlEventStatus(dto.status) : undefined
          }
        }
      )
    ).pipe(
      map(result => this.toSimpleEvent(result.updateEvent)),
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

    return from(
      this.gateway.request<RemoveEventMutation, RemoveEventMutationVariables>(
        RemoveEventDocument,
        { id }
      )
    ).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除事件失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  publishEvent(id: string): Observable<Event> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<PublishEventMutation, PublishEventMutationVariables>(
        PublishEventDocument,
        { id }
      )
    ).pipe(
      map(result => this.toPartialEvent(result.publishEvent)),
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

    return from(
      this.gateway.request<ArchiveEventMutation, ArchiveEventMutationVariables>(
        ArchiveEventDocument,
        { id }
      )
    ).pipe(
      map(result => this.toPartialEvent(result.archiveEvent)),
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

  private mapEventsResult(result: EventsGqlQuery): {
    data: Event[];
    total: number;
    page: number;
    pageSize: number;
  } {
    return {
      data: result.events.edges.map(edge => toDomainEvent(edge.node as any)),
      total: result.events.totalCount,
      page: 1,
      pageSize: result.events.edges.length
    };
  }

  private toSimpleEvent(gqlEvent: { id: string; eventName: string; status: GqlEventStatus; occurTime: string; createdAt: string } | { id: string; eventName: string; status: GqlEventStatus; occurTime: string; updatedAt: string }): Event {
    return {
      id: gqlEvent.id,
      eventTypeId: '',
      industryTypeId: '',
      eventName: gqlEvent.eventName,
      status: toDomainEventStatus(gqlEvent.status),
      occurTime: gqlEvent.occurTime,
      province: '',
      city: '',
      createdAt: 'createdAt' in gqlEvent ? gqlEvent.createdAt : '',
      updatedAt: 'updatedAt' in gqlEvent ? gqlEvent.updatedAt : ''
    };
  }

  private toPartialEvent(gqlEvent: { id: string; status: GqlEventStatus }): Event {
    return {
      id: gqlEvent.id,
      eventTypeId: '',
      industryTypeId: '',
      eventName: '',
      status: toDomainEventStatus(gqlEvent.status),
      occurTime: '',
      province: '',
      city: '',
      createdAt: '',
      updatedAt: ''
    };
  }

  private toEventDetail(gqlEvent: EventGqlQuery['event']): EventDetail {
    return {
      ...toDomainEvent(gqlEvent as any),
      eventType: gqlEvent.eventType ? {
        id: gqlEvent.eventType.id,
        eventName: gqlEvent.eventType.eventName,
        eventCode: '',
        sortOrder: 0,
        status: 1,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      industryType: gqlEvent.industryType ? {
        id: gqlEvent.industryType.id,
        industryName: gqlEvent.industryType.industryName,
        industryCode: '',
        sortOrder: 0,
        status: 1,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      tags: gqlEvent.tags?.map(tag => ({
        id: tag.id,
        tagName: tag.tagName,
        tagColor: '',
        usageCount: 0,
        createdAt: '',
        updatedAt: ''
      })),
      attachments: gqlEvent.attachments?.map(attachment => ({
        id: attachment.id,
        eventId: gqlEvent.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        bucketName: '',
        objectName: '',
        fileType: attachment.fileType as any,
        fileSize: attachment.fileSize ?? 0,
        mimeType: attachment.mimeType ?? '',
        sortOrder: attachment.sortOrder,
        createdAt: attachment.createdAt
      }))
    };
  }

  private toGqlEventStatus(status?: number): GqlEventStatus | undefined {
    if (status === undefined) {
      return undefined;
    }

    switch (status) {
      case 0:
        return GqlEventStatus.Draft;
      case 1:
        return GqlEventStatus.Published;
      case 2:
        return GqlEventStatus.Archived;
      default:
        return undefined;
    }
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
