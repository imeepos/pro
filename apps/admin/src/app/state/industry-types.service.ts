import { Injectable, inject } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map } from 'rxjs';
import { IndustryTypesStore } from './industry-types.store';
import { IndustryTypesQuery as IndustryTypesAkitaQuery } from './industry-types.query';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import {
  IndustryTypesDocument,
  IndustryTypeDocument,
  CreateIndustryTypeDocument,
  UpdateIndustryTypeDocument,
  RemoveIndustryTypeDocument,
  IndustryTypesQuery,
  IndustryTypesQueryVariables,
  IndustryTypeQuery,
  IndustryTypeQueryVariables,
  CreateIndustryTypeMutation,
  CreateIndustryTypeMutationVariables,
  UpdateIndustryTypeMutation,
  UpdateIndustryTypeMutationVariables,
  RemoveIndustryTypeMutation,
  RemoveIndustryTypeMutationVariables,
  IndustryType as GqlIndustryType,
  CreateIndustryTypeInput,
  UpdateIndustryTypeInput
} from '../core/graphql/generated/graphql';
import { IndustryType } from '@pro/sdk';

function toDomainIndustryType(gqlType: GqlIndustryType): IndustryType {
  const { __typename, ...data } = gqlType as GqlIndustryType & { __typename?: string };
  return {
    id: data.id,
    industryCode: data.industryCode,
    industryName: data.industryName,
    description: data.description ?? undefined,
    sortOrder: data.sortOrder,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

@Injectable({ providedIn: 'root' })
export class IndustryTypesService {
  private gateway = inject(GraphqlGateway);
  private store = inject(IndustryTypesStore);
  private query = inject(IndustryTypesAkitaQuery);

  constructor() {}

  loadIndustryTypes(): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<IndustryTypesQuery, IndustryTypesQueryVariables>(
        IndustryTypesDocument
      )
    ).pipe(
      map(result => (result.industryTypes ?? []).map(toDomainIndustryType)),
      tap(industryTypes => {
        this.store.set(industryTypes);
      }),
      map(() => undefined),
      catchError(error => {
        this.setError(error.message || '加载行业类型列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  loadIndustryTypeById(id: string): Observable<IndustryType> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<IndustryTypeQuery, IndustryTypeQueryVariables>(
        IndustryTypeDocument,
        { id }
      )
    ).pipe(
      map(result => {
        if (!result.industryType) {
          throw new Error('行业类型不存在');
        }
        return toDomainIndustryType(result.industryType);
      }),
      catchError(error => {
        this.setError(error.message || '加载行业类型详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  createIndustryType(input: CreateIndustryTypeInput): Observable<IndustryType> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<CreateIndustryTypeMutation, CreateIndustryTypeMutationVariables>(
        CreateIndustryTypeDocument,
        { input }
      )
    ).pipe(
      map(result => {
        if (!result.createIndustryType) {
          throw new Error('创建失败');
        }
        return toDomainIndustryType(result.createIndustryType);
      }),
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

  updateIndustryType(id: string, input: UpdateIndustryTypeInput): Observable<IndustryType> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<UpdateIndustryTypeMutation, UpdateIndustryTypeMutationVariables>(
        UpdateIndustryTypeDocument,
        { id, input }
      )
    ).pipe(
      map(result => {
        if (!result.updateIndustryType) {
          throw new Error('更新失败');
        }
        return toDomainIndustryType(result.updateIndustryType);
      }),
      tap(industryType => {
        this.store.update(id, industryType);
      }),
      catchError(error => {
        this.setError(error.message || '更新行业类型失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteIndustryType(id: string): Observable<boolean> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.gateway.request<RemoveIndustryTypeMutation, RemoveIndustryTypeMutationVariables>(
        RemoveIndustryTypeDocument,
        { id }
      )
    ).pipe(
      map(result => result.removeIndustryType),
      tap(success => {
        if (success) {
          this.store.remove(id);
        }
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
