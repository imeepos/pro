import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PageInfo')
export class PageInfoModel {
  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;

  @Field(() => String, { nullable: true })
  startCursor?: string;

  @Field(() => String, { nullable: true })
  endCursor?: string;
}

export interface OffsetEdge<T> {
  cursor: string;
  node: T;
}

export interface OffsetConnection<T> {
  edges: OffsetEdge<T>[];
  pageInfo: PageInfoModel;
  totalCount: number;
}

export interface OffsetPaginationPayload<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type OffsetConnectionConstructor<TClass> = new () => TClass;

export const OFFSET_CURSOR_PREFIX = 'offset:';

export function createOffsetConnectionType<TItem>(
  classRef: Type<TItem>,
  name: string,
): OffsetConnectionConstructor<OffsetConnection<TItem>> {
  @ObjectType(`${name}Edge`)
  class EdgeType implements OffsetEdge<TItem> {
    @Field(() => String)
    cursor: string;

    @Field(() => classRef)
    node: TItem;
  }

  @ObjectType(`${name}Connection`)
  class ConnectionType implements OffsetConnection<TItem> {
    @Field(() => [EdgeType])
    edges: EdgeType[];

    @Field(() => PageInfoModel)
    pageInfo: PageInfoModel;

    @Field(() => Int)
    totalCount: number;
  }

  return ConnectionType;
}
