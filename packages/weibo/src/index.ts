export { WeiboModule } from './weibo.module.js'
export {
  WeiboStatusService,
  type BatchFetchOptions,
  type SaveStatusDetailContext
} from './weibo.service.js'
export { WeiboProfileService } from './weibo-profile.service.js'
export type { WeiboProfileTimelineOptions } from './weibo-profile.service.js'
export {
  WeiboHealthCheckService,
  type WeiboAccountHealthResult,
  type WeiboAccountHealthEntry
} from './weibo-health-check.service.js'
export type { WeiboStatusLikesOptions, WeiboStatusCommentsOptions } from './weibo.service.js'
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
  WeiboProfileDetail,
  WeiboProfileDetailResponse,
  WeiboProfileFollowers,
  WeiboProfileFollower,
  WeiboProfileLabelDescriptor,
  WeiboProfileLabelPalette,
  WeiboProfileRealName,
  WeiboProfileSunshineCredit
} from './types/profile-detail.js'
export type {
  WeiboLikeUserStatusTotals,
  WeiboLikeUserVideoTotals,
  WeiboLikeUserIcon,
  WeiboLikeUserInsecurity,
  WeiboLikeUser,
  WeiboStatusAttitude,
  WeiboStatusLikeShowResponse
} from './types/like-show.js'
export type {
  WeiboBuildCommentsResponse,
  WeiboCommentBadge,
  WeiboCommentEntity,
  WeiboCommentFansIcon,
  WeiboCommentFilterGroup,
  WeiboCommentMoreInfo,
  WeiboCommentUser
} from './types/comment-build.js'
export type {
  WeiboProfileIconBadge,
  WeiboProfileInfoData,
  WeiboProfileInfoResponse,
  WeiboProfileTab,
  WeiboProfileUser
} from './types/profile-info.js'
export type {
  WeiboMixedMediaInfo,
  WeiboMixedMediaInfoItem,
  WeiboTimelineData,
  WeiboTimelinePictureFocus,
  WeiboTimelinePictureInfo,
  WeiboTimelinePictureMap,
  WeiboTimelinePictureVariant,
  WeiboTimelineResponse,
  WeiboTimelineStatus,
  WeiboTimelineTopic
} from './types/timeline.js'

// Workflow 扩展
export * from './workflow/index.js'
