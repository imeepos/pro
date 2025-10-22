export enum WeiboInteractionType {
  Like = 'like',
  Repost = 'repost',
  Comment = 'comment',
  Favorite = 'favorite'
}

export enum WeiboTargetType {
  Post = 'post',
  Comment = 'comment'
}

export interface WeiboUser {
  id: string;
  weiboId: string;
  screenName: string;
  profileImageUrl?: string;
  verified: boolean;
  followersCount: number;
  friendsCount: number;
  statusesCount: number;
}

export interface WeiboPost {
  id: string;
  weiboId: string;
  mid: string;
  text: string;
  author: WeiboUser;
  createdAt: string;
  repostsCount: number;
  commentsCount: number;
  attitudesCount: number;
  picNum?: number;
  regionName?: string;
  source?: string;
  isLongText: boolean;
  isRepost: boolean;
  favorited: boolean;
}

export interface WeiboComment {
  id: string;
  commentId: string;
  text: string;
  author: WeiboUser;
  post: {
    id: string;
    weiboId: string;
    text: string;
  };
  createdAt: string;
  likeCounts: number;
  path: string;
}

export interface WeiboInteraction {
  id: string;
  interactionType: WeiboInteractionType;
  targetType: WeiboTargetType;
  userInfoSnapshot: Record<string, unknown>;
  createdAt: string;
  targetWeiboId: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PostEdge {
  node: WeiboPost;
  cursor: string;
}

export interface CommentEdge {
  node: WeiboComment;
  cursor: string;
}

export interface InteractionEdge {
  node: WeiboInteraction;
  cursor: string;
}

export interface PostsConnection {
  edges: PostEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CommentsConnection {
  edges: CommentEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface InteractionsConnection {
  edges: InteractionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface PostFilter {
  keyword?: string;
  authorNickname?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isLongText?: boolean;
  isRepost?: boolean;
  favorited?: boolean;
}

export interface CommentFilter {
  keyword?: string;
  postId?: string;
  authorNickname?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface InteractionFilter {
  interactionType?: WeiboInteractionType;
  targetType?: WeiboTargetType;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export interface Sort {
  field?: string;
  order?: SortOrder;
}

export interface PostStats {
  totalPosts: number;
  totalReposts: number;
  totalComments: number;
  totalLikes: number;
  averageEngagement: number;
}

export interface CommentStats {
  totalComments: number;
  totalLikes: number;
  averageDepth: number;
}

export interface InteractionStats {
  totalInteractions: number;
  byType: Record<WeiboInteractionType, number>;
  byTarget: Record<WeiboTargetType, number>;
}

export interface PostsResponse {
  posts: PostsConnection;
}

export interface PostResponse {
  post: WeiboPost;
}

export interface PostStatsResponse {
  postStats: PostStats;
}

export interface CommentsResponse {
  comments: CommentsConnection;
}

export interface CommentResponse {
  comment: WeiboComment;
}

export interface CommentStatsResponse {
  commentStats: CommentStats;
}

export interface InteractionsResponse {
  interactions: InteractionsConnection;
}

export interface InteractionResponse {
  interaction: WeiboInteraction;
}

export interface InteractionStatsResponse {
  interactionStats: InteractionStats;
}
