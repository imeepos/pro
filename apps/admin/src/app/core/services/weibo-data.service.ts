import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphqlGateway } from '../graphql/graphql-gateway.service';
import { useFragment } from '../graphql/generated';
import {
  WeiboPostsDocument,
  WeiboPostDocument,
  WeiboPostStatsDocument,
  WeiboCommentsDocument,
  WeiboCommentDocument,
  WeiboCommentStatsDocument,
  WeiboInteractionsDocument,
  WeiboInteractionDocument,
  WeiboInteractionStatsDocument,
  PostFilterInput,
  CommentFilterInput,
  InteractionFilterInput,
  PaginationInput,
  SortInput,
  WeiboUserFieldsFragment,
  WeiboPostFieldsFragment,
  WeiboCommentFieldsFragment,
  WeiboInteractionFieldsFragment,
  WeiboPostsQuery,
  WeiboCommentsQuery,
  WeiboInteractionsQuery,
  WeiboPostFieldsFragmentDoc,
  WeiboCommentFieldsFragmentDoc,
  WeiboInteractionFieldsFragmentDoc,
  WeiboUserFieldsFragmentDoc,
  SortOrder as GqlSortOrder
} from '../graphql/generated/graphql';
import {
  WeiboPostConnection,
  WeiboCommentConnection,
  WeiboInteractionConnection,
  WeiboPost,
  WeiboComment,
  WeiboInteraction,
  PostFilter,
  CommentFilter,
  InteractionFilter,
  Pagination,
  Sort,
  PostStats,
  CommentStats,
  InteractionStats,
  WeiboUser,
  PageInfo,
  SortOrder
} from './weibo-data.types';

@Injectable({
  providedIn: 'root'
})
export class WeiboDataService {
  constructor(private readonly graphql: GraphqlGateway) {}

  getPosts(
    filter?: PostFilter,
    pagination?: Pagination,
    sort?: Sort
  ): Observable<WeiboPostConnection> {
    return from(
      this.graphql.request(WeiboPostsDocument, {
        filter: this.toPostFilterInput(filter),
        pagination: this.toPaginationInput(pagination),
        sort: this.toSortInput(sort)
      })
    ).pipe(map(response => this.mapPostConnection(response.weiboPosts)));
  }

  getPost(id: string): Observable<WeiboPost> {
    return from(this.graphql.request(WeiboPostDocument, { id })).pipe(
      map(response => {
        const fragment = useFragment(WeiboPostFieldsFragmentDoc, response.weiboPost);
        return this.mapPost(fragment);
      })
    );
  }

  getPostStats(filter?: PostFilter): Observable<PostStats> {
    return from(
      this.graphql.request(WeiboPostStatsDocument, {
        filter: this.toPostFilterInput(filter)
      })
    ).pipe(map(response => response.weiboPostStats));
  }

  getComments(
    filter?: CommentFilter,
    pagination?: Pagination,
    sort?: Sort
  ): Observable<WeiboCommentConnection> {
    return from(
      this.graphql.request(WeiboCommentsDocument, {
        filter: this.toCommentFilterInput(filter),
        pagination: this.toPaginationInput(pagination),
        sort: this.toSortInput(sort)
      })
    ).pipe(map(response => this.mapCommentConnection(response.weiboComments)));
  }

  getComment(id: string): Observable<WeiboComment> {
    return from(this.graphql.request(WeiboCommentDocument, { id })).pipe(
      map(response => {
        const fragment = useFragment(WeiboCommentFieldsFragmentDoc, response.weiboComment);
        return this.mapComment(fragment);
      })
    );
  }

  getCommentStats(filter?: CommentFilter): Observable<CommentStats> {
    return from(
      this.graphql.request(WeiboCommentStatsDocument, {
        filter: this.toCommentFilterInput(filter)
      })
    ).pipe(map(response => response.weiboCommentStats));
  }

  getInteractions(
    filter?: InteractionFilter,
    pagination?: Pagination,
    sort?: Sort
  ): Observable<WeiboInteractionConnection> {
    return from(
      this.graphql.request(WeiboInteractionsDocument, {
        filter: this.toInteractionFilterInput(filter),
        pagination: this.toPaginationInput(pagination),
        sort: this.toSortInput(sort)
      })
    ).pipe(map(response => this.mapInteractionConnection(response.weiboInteractions)));
  }

  getInteraction(id: string): Observable<WeiboInteraction> {
    return from(this.graphql.request(WeiboInteractionDocument, { id })).pipe(
      map(response => {
        const fragment = useFragment(WeiboInteractionFieldsFragmentDoc, response.weiboInteraction);
        return this.mapInteraction(fragment);
      })
    );
  }

  getInteractionStats(filter?: InteractionFilter): Observable<InteractionStats> {
    return from(
      this.graphql.request(WeiboInteractionStatsDocument, {
        filter: this.toInteractionFilterInput(filter)
      })
    ).pipe(map(response => response.weiboInteractionStats));
  }

  private toPostFilterInput(filter?: PostFilter): PostFilterInput | undefined {
    if (!filter) return undefined;

    return {
      keyword: filter.keyword ?? undefined,
      authorNickname: filter.authorNickname ?? undefined,
      dateFrom: this.ensureIsoString(filter.dateFrom),
      dateTo: this.ensureIsoString(filter.dateTo, { endOfDay: true }),
      isLongText: filter.isLongText ?? undefined,
      isRepost: filter.isRepost ?? undefined,
      favorited: filter.favorited ?? undefined
    };
  }

  private toCommentFilterInput(filter?: CommentFilter): CommentFilterInput | undefined {
    if (!filter) return undefined;

    return {
      keyword: filter.keyword ?? undefined,
      postId: filter.postId ?? undefined,
      authorNickname: filter.authorNickname ?? undefined,
      dateFrom: this.ensureIsoString(filter.dateFrom),
      dateTo: this.ensureIsoString(filter.dateTo, { endOfDay: true }),
      hasLikes: filter.hasLikes ?? undefined
    };
  }

  private toInteractionFilterInput(filter?: InteractionFilter): InteractionFilterInput | undefined {
    if (!filter) return undefined;

    return {
      interactionType: filter.interactionType ?? undefined,
      targetType: filter.targetType ?? undefined,
      userWeiboId: filter.userWeiboId ?? undefined,
      targetWeiboId: filter.targetWeiboId ?? undefined,
      dateFrom: this.ensureIsoString(filter.dateFrom),
      dateTo: this.ensureIsoString(filter.dateTo, { endOfDay: true })
    };
  }

  private toPaginationInput(pagination?: Pagination): PaginationInput | undefined {
    if (!pagination) return undefined;
    const page = pagination.page && pagination.page > 0 ? pagination.page : undefined;
    const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : undefined;

    if (!page && !limit) return undefined;

    return {
      page,
      limit
    };
  }

  private toSortInput(sort?: Sort): SortInput | undefined {
    if (!sort) return undefined;
    const order = sort.order === SortOrder.ASC ? GqlSortOrder.Asc : GqlSortOrder.Desc;
    return {
      field: sort.field,
      order
    };
  }

  private mapPostConnection(connection: WeiboPostsQuery['weiboPosts']): WeiboPostConnection {
    return {
      edges: connection.edges.map(edge => ({
        cursor: edge.cursor,
        node: this.mapPost(useFragment(WeiboPostFieldsFragmentDoc, edge.node))
      })),
      pageInfo: this.mapPageInfo(connection.pageInfo),
      totalCount: connection.totalCount
    };
  }

  private mapCommentConnection(connection: WeiboCommentsQuery['weiboComments']): WeiboCommentConnection {
    return {
      edges: connection.edges.map(edge => ({
        cursor: edge.cursor,
        node: this.mapComment(useFragment(WeiboCommentFieldsFragmentDoc, edge.node))
      })),
      pageInfo: this.mapPageInfo(connection.pageInfo),
      totalCount: connection.totalCount
    };
  }

  private mapInteractionConnection(
    connection: WeiboInteractionsQuery['weiboInteractions']
  ): WeiboInteractionConnection {
    return {
      edges: connection.edges.map(edge => ({
        cursor: edge.cursor,
        node: this.mapInteraction(useFragment(WeiboInteractionFieldsFragmentDoc, edge.node))
      })),
      pageInfo: this.mapPageInfo(connection.pageInfo),
      totalCount: connection.totalCount
    };
  }

  private mapPost(fragment: WeiboPostFieldsFragment): WeiboPost {
    const authorFragment = useFragment(WeiboUserFieldsFragmentDoc, fragment.author);
    return {
      id: fragment.id,
      weiboId: fragment.weiboId,
      mid: fragment.mid,
      text: fragment.text,
      textLength: fragment.textLength,
      author: this.mapUser(authorFragment),
      createdAt: fragment.createdAt,
      repostsCount: fragment.repostsCount,
      commentsCount: fragment.commentsCount,
      attitudesCount: fragment.attitudesCount,
      source: fragment.source ?? undefined,
      regionName: fragment.regionName ?? undefined,
      isLongText: fragment.isLongText,
      isRepost: fragment.isRepost,
      favorited: fragment.favorited,
      visibleType: fragment.visibleType ?? undefined
    };
  }

  private mapComment(fragment: WeiboCommentFieldsFragment): WeiboComment {
    const authorFragment = useFragment(WeiboUserFieldsFragmentDoc, fragment.author);
    return {
      id: fragment.id,
      commentId: fragment.commentId,
      mid: fragment.mid,
      postId: fragment.postId,
      text: fragment.text,
      author: this.mapUser(authorFragment),
      createdAt: fragment.createdAt,
      likeCounts: fragment.likeCounts,
      liked: fragment.liked,
      source: fragment.source ?? undefined,
      replyCommentId: fragment.replyCommentId ?? undefined,
      isMblogAuthor: fragment.isMblogAuthor
    };
  }

  private mapInteraction(fragment: WeiboInteractionFieldsFragment): WeiboInteraction {
    return {
      id: fragment.id,
      interactionType: fragment.interactionType,
      targetType: fragment.targetType,
      targetWeiboId: fragment.targetWeiboId,
      userWeiboId: fragment.userWeiboId ?? undefined,
      createdAt: fragment.createdAt
    };
  }

  private mapUser(fragment: WeiboUserFieldsFragment): WeiboUser {
    return {
      id: fragment.id,
      weiboId: fragment.weiboId,
      screenName: fragment.screenName,
      profileImageUrl: fragment.profileImageUrl ?? undefined,
      verified: fragment.verified,
      verifiedReason: fragment.verifiedReason ?? undefined,
      followersCount: fragment.followersCount,
      friendsCount: fragment.friendsCount,
      statusesCount: fragment.statusesCount,
      gender: fragment.gender ?? undefined,
      location: fragment.location ?? undefined,
      description: fragment.description ?? undefined
    };
  }

  private mapPageInfo(info: WeiboPostsQuery['weiboPosts']['pageInfo']): PageInfo {
    return {
      hasNextPage: info.hasNextPage,
      hasPreviousPage: info.hasPreviousPage,
      startCursor: info.startCursor ?? undefined,
      endCursor: info.endCursor ?? undefined
    };
  }

  private ensureIsoString(
    value?: string,
    options: { endOfDay?: boolean } = {}
  ): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    if (options.endOfDay) {
      date.setHours(23, 59, 59, 999);
    }

    return date.toISOString();
  }
}
