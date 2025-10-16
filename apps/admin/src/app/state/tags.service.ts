import { Injectable, inject } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';
import { TagsStore } from './tags.store';
import { TagsQuery } from './tags.query';
import { Tag, CreateTagDto, UpdateTagDto } from '@pro/sdk';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  TagsDocument,
  TagsQuery as TagsGqlQuery,
  TagsQueryVariables,
  PopularTagsDocument,
  PopularTagsQuery as PopularTagsGqlQuery,
  PopularTagsQueryVariables,
  CreateTagDocument,
  CreateTagMutation,
  CreateTagMutationVariables,
  UpdateTagDocument,
  UpdateTagMutation,
  UpdateTagMutationVariables,
  RemoveTagDocument,
  RemoveTagMutation,
  RemoveTagMutationVariables
} from '../core/graphql/generated/graphql';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private gateway = inject(GraphqlGateway);
  private store = inject(TagsStore);
  private query = inject(TagsQuery);

  loadTags(params?: { page?: number; pageSize?: number; keyword?: string }): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<TagsGqlQuery, TagsQueryVariables>(TagsDocument, {
        page: params?.page,
        pageSize: params?.pageSize,
        keyword: params?.keyword
      })
    ).pipe(
      map(result => this.mapTagsResult(result)),
      tap(tags => {
        this.store.set(tags.items);
        this.store.update({ total: tags.total });
      }),
      catchError(error => {
        this.setError(error.message || '加载标签列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  loadPopularTags(limit = 20): Observable<Tag[]> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<PopularTagsGqlQuery, PopularTagsQueryVariables>(
        PopularTagsDocument,
        { limit }
      )
    ).pipe(
      map(result => result.popularTags.map(this.toTag)),
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

    return from(
      this.gateway.request<CreateTagMutation, CreateTagMutationVariables>(
        CreateTagDocument,
        { input: dto }
      )
    ).pipe(
      map(result => this.toTag(result.createTag)),
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

  updateTag(id: string, dto: UpdateTagDto): Observable<Tag> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<UpdateTagMutation, UpdateTagMutationVariables>(
        UpdateTagDocument,
        { id, input: dto }
      )
    ).pipe(
      map(result => this.toTag(result.updateTag)),
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

  deleteTag(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<RemoveTagMutation, RemoveTagMutationVariables>(
        RemoveTagDocument,
        { id }
      )
    ).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除标签失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  private toTag(gqlTag: {
    id: string;
    tagName: string;
    tagColor: string;
    usageCount: number;
    createdAt?: string;
    updatedAt?: string;
  }): Tag {
    return {
      id: gqlTag.id,
      tagName: gqlTag.tagName,
      tagColor: gqlTag.tagColor,
      usageCount: gqlTag.usageCount,
      createdAt: gqlTag.createdAt || new Date().toISOString(),
      updatedAt: gqlTag.updatedAt || new Date().toISOString()
    };
  }

  private mapTagsResult(result: TagsGqlQuery): { items: Tag[]; total: number } {
    return {
      items: result.tags.edges.map(edge => this.toTag(edge.node)),
      total: result.tags.totalCount
    };
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
