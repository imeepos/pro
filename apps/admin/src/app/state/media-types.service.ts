import { Injectable, inject } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';
import { MediaTypesStore } from './media-types.store';
import { MediaTypesQuery as MediaTypesAkitaQuery } from './media-types.query';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  MediaTypesDocument,
  MediaTypeDocument,
  CreateMediaTypeDocument,
  UpdateMediaTypeDocument,
  RemoveMediaTypeDocument,
  MediaTypesQuery,
  MediaTypesQueryVariables,
  MediaTypeQuery,
  MediaTypeQueryVariables,
  CreateMediaTypeMutation,
  CreateMediaTypeMutationVariables,
  UpdateMediaTypeMutation,
  UpdateMediaTypeMutationVariables,
  RemoveMediaTypeMutation,
  RemoveMediaTypeMutationVariables,
  MediaType as GraphQLMediaType,
  CreateMediaTypeInput,
  UpdateMediaTypeInput,
  MediaTypeFilterInput,
  MediaTypeStatus as GraphQLMediaTypeStatus
} from '../core/graphql/generated/graphql';
import { MediaType, CreateMediaTypeDto, UpdateMediaTypeDto } from '@pro/sdk';

@Injectable({ providedIn: 'root' })
export class MediaTypesService {
  private gateway = inject(GraphqlGateway);
  private store = inject(MediaTypesStore);
  private query = inject(MediaTypesAkitaQuery);

  loadMediaTypes(filter?: MediaTypeFilterInput): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<MediaTypesQuery, MediaTypesQueryVariables>(
        MediaTypesDocument,
        { filter }
      )
    ).pipe(
      map(result => result.mediaTypes.edges.map(edge => this.toDomainMediaType(edge.node))),
      tap(mediaTypes => {
        this.store.set(mediaTypes);
      }),
      map(() => undefined),
      catchError(error => {
        this.setError(error.message || '加载媒体类型列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  loadMediaTypeById(id: number): Observable<MediaType> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<MediaTypeQuery, MediaTypeQueryVariables>(
        MediaTypeDocument,
        { id }
      )
    ).pipe(
      map(result => this.toDomainMediaType(result.mediaType)),
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

    const input: CreateMediaTypeInput = {
      typeCode: dto.typeCode,
      typeName: dto.typeName,
      description: dto.description,
      sort: dto.sort,
      status: dto.status ? this.toGraphQLStatus(dto.status) : undefined
    };

    return from(
      this.gateway.request<CreateMediaTypeMutation, CreateMediaTypeMutationVariables>(
        CreateMediaTypeDocument,
        { input }
      )
    ).pipe(
      map(result => this.toDomainMediaType(result.createMediaType)),
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

    const input: UpdateMediaTypeInput = {
      typeCode: dto.typeCode,
      typeName: dto.typeName,
      description: dto.description,
      sort: dto.sort,
      status: dto.status ? this.toGraphQLStatus(dto.status) : undefined
    };

    return from(
      this.gateway.request<UpdateMediaTypeMutation, UpdateMediaTypeMutationVariables>(
        UpdateMediaTypeDocument,
        { id, input }
      )
    ).pipe(
      map(result => this.toDomainMediaType(result.updateMediaType)),
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

    return from(
      this.gateway.request<RemoveMediaTypeMutation, RemoveMediaTypeMutationVariables>(
        RemoveMediaTypeDocument,
        { id }
      )
    ).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      map(() => undefined),
      catchError(error => {
        this.setError(error.message || '删除媒体类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  private toDomainMediaType(gqlType: GraphQLMediaType): MediaType {
    return {
      id: Number(gqlType.id),
      typeCode: gqlType.typeCode,
      typeName: gqlType.typeName,
      description: gqlType.description ?? undefined,
      sort: gqlType.sort,
      status: this.toDomainStatus(gqlType.status),
      createdAt: new Date(gqlType.createdAt),
      updatedAt: new Date(gqlType.updatedAt)
    };
  }

  private toGraphQLStatus(status: 'ACTIVE' | 'INACTIVE'): GraphQLMediaTypeStatus {
    return status === 'ACTIVE' ? GraphQLMediaTypeStatus.Active : GraphQLMediaTypeStatus.Inactive;
  }

  private toDomainStatus(status: GraphQLMediaTypeStatus): 'ACTIVE' | 'INACTIVE' {
    return status === GraphQLMediaTypeStatus.Active ? 'ACTIVE' : 'INACTIVE';
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
