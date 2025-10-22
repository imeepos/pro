import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PostsResponse,
  PostResponse,
  PostStatsResponse,
  CommentsResponse,
  CommentResponse,
  CommentStatsResponse,
  InteractionsResponse,
  InteractionResponse,
  InteractionStatsResponse,
  PostFilter,
  CommentFilter,
  InteractionFilter,
  Pagination,
  Sort
} from './weibo-data.types';

@Injectable({
  providedIn: 'root'
})
export class WeiboDataService {
  getPosts(
    filter?: PostFilter,
    pagination?: Pagination,
    sort?: Sort
  ): Observable<PostsResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getPost(id: string): Observable<PostResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getPostStats(filter?: PostFilter): Observable<PostStatsResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getComments(
    filter?: CommentFilter,
    pagination?: Pagination,
    sort?: Sort
  ): Observable<CommentsResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getComment(id: string): Observable<CommentResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getCommentStats(filter?: CommentFilter): Observable<CommentStatsResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getInteractions(
    filter?: InteractionFilter,
    pagination?: Pagination,
    sort?: Sort
  ): Observable<InteractionsResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getInteraction(id: string): Observable<InteractionResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }

  getInteractionStats(filter?: InteractionFilter): Observable<InteractionStatsResponse> {
    throw new Error('等待后端 GraphQL API 实现');
  }
}
