export enum WeiboInteractionType {
  Comment = 'Comment',
  Favorite = 'Favorite',
  Like = 'Like',
  Repost = 'Repost'
}

export enum WeiboTargetType {
  Comment = 'Comment',
  Post = 'Post'
}

export enum WeiboVisibleType {
  Custom = 'Custom',
  Fans = 'Fans',
  Group = 'Group',
  Private = 'Private',
  Public = 'Public'
}

export interface WeiboUser {
  id: string;
  weiboId: string;
  screenName: string;
  profileImageUrl?: string | null;
  verified: boolean;
  verifiedReason?: string | null;
  followersCount: number;
  friendsCount: number;
  statusesCount: number;
  gender?: string | null;
  location?: string | null;
  description?: string | null;
}

export interface WeiboPost {
  id: string;
  weiboId: string;
  mid: string;
  text: string;
  textLength: number;
  author: WeiboUser;
  createdAt: string;
  repostsCount: number;
  commentsCount: number;
  attitudesCount: number;
  source?: string | null;
  regionName?: string | null;
  isLongText: boolean;
  isRepost: boolean;
  favorited: boolean;
  visibleType?: WeiboVisibleType | null;
}

export interface WeiboComment {
  id: string;
  commentId: string;
  mid: string;
  postId: string;
  text: string;
  author: WeiboUser;
  createdAt: string;
  likeCounts: number;
  liked: boolean;
  source?: string | null;
  replyCommentId?: string | null;
  isMblogAuthor: boolean;
}

export interface WeiboInteraction {
  id: string;
  interactionType: WeiboInteractionType;
  targetType: WeiboTargetType;
  targetWeiboId: string;
  userWeiboId?: string | null;
  createdAt: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export interface Edge<T> {
  cursor: string;
  node: T;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

export type WeiboPostConnection = Connection<WeiboPost>;
export type WeiboCommentConnection = Connection<WeiboComment>;
export type WeiboInteractionConnection = Connection<WeiboInteraction>;

export interface PostFilter {
  keyword?: string;
  authorNickname?: string;
  dateFrom?: string;
  dateTo?: string;
  isLongText?: boolean;
  isRepost?: boolean;
  favorited?: boolean;
}

export interface CommentFilter {
  keyword?: string;
  postId?: string;
  authorNickname?: string;
  dateFrom?: string;
  dateTo?: string;
  hasLikes?: boolean;
}

export interface InteractionFilter {
  interactionType?: WeiboInteractionType;
  targetType?: WeiboTargetType;
  userWeiboId?: string;
  targetWeiboId?: string;
  dateFrom?: string;
  dateTo?: string;
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
  field: string;
  order: SortOrder;
}

export interface PostStats {
  totalPosts: number;
  totalReposts: number;
  totalComments: number;
  totalLikes: number;
}

export interface CommentStats {
  totalComments: number;
  totalLikes: number;
}

export interface InteractionStats {
  totalInteractions: number;
  totalLikes: number;
  totalReposts: number;
  totalComments: number;
  totalFavorites: number;
}
