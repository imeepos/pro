export { WeiboModule } from './weibo.module.js'
export { WeiboStatusService } from './weibo.service.js'
export type { WeiboStatusLikesOptions } from './weibo.service.js'
export {
  DEFAULT_WEIBO_BASE_URL,
  DEFAULT_WEIBO_HEADERS,
  DEFAULT_WEIBO_LOCALE,
  DEFAULT_WEIBO_TIMEOUT,
  DEFAULT_WEIBO_USER_AGENT,
  DEFAULT_WEIBO_REFERER,
  resolveWeiboRequestOptions,
  type ResolvedWeiboRequestOptions,
  type WeiboRequestOptions
} from './weibo.options.js'
export { WeiboRequestError } from './weibo.error.js'
export type {
  WeiboActionLog,
  WeiboAnnotation,
  WeiboCommentManageInfo,
  WeiboMediaInfo,
  WeiboNumberDisplayStrategy,
  WeiboPageInfo,
  WeiboStatusDetail,
  WeiboStatusDetailResponse,
  WeiboTagStruct,
  WeiboTitle,
  WeiboUrlStruct,
  WeiboUserIcon,
  WeiboUserProfile,
  WeiboUserTotals,
  WeiboVisibility
} from './types/status-detail.js'
export type {
  WeiboLikeUserStatusTotals,
  WeiboLikeUserVideoTotals,
  WeiboLikeUserIcon,
  WeiboLikeUserInsecurity,
  WeiboLikeUser,
  WeiboStatusAttitude,
  WeiboStatusLikeShowResponse
} from './types/like-show.js'
