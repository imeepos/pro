import type { WeiboUserProfile, WeiboUserTotals } from './status-detail.js'

export interface WeiboCommentMoreInfo extends Record<string, unknown> {
  readonly display_text?: string
  readonly scheme?: string
}

export interface WeiboCommentFansIcon extends Record<string, unknown> {
  readonly fans_uid?: number
  readonly icon_url: string
  readonly lighting?: boolean
  readonly member_rank?: number
  readonly name?: string
  readonly scheme?: string
  readonly svip?: number
  readonly uid?: number
  readonly val?: number
  readonly vvip?: number
}

export interface WeiboCommentUser extends WeiboUserProfile {
  readonly followers_count?: number
  readonly followers_count_str?: string
  readonly friends_count?: number
  readonly statuses_count?: number
  readonly status_total_counter?: WeiboUserTotals
  readonly fansIcon?: WeiboCommentFansIcon
  readonly svip?: number
  readonly vvip?: number
  readonly verified_reason?: string
}

export interface WeiboCommentFilterGroup {
  readonly param: string
  readonly scheme: string
  readonly title: string
  readonly isDefault: number
}

export interface WeiboCommentBubble {
  readonly id: string
  readonly icon_url: string
  readonly name: string
  readonly obtain_type: number
  readonly scheme?: string
  readonly start_color?: string
  readonly end_color?: string
  readonly start_color_dark?: string
  readonly end_color_dark?: string
  readonly allow_vip_box_content?: boolean
  readonly allow_vip_box_icon?: boolean
  readonly tag_text?: string
}

export interface WeiboCommentBadge extends Record<string, unknown> {
  readonly title?: string
  readonly icon?: string
}

export interface WeiboCommentEntity extends Record<string, unknown> {
  readonly id: number
  readonly idstr: string
  readonly rootid?: number
  readonly rootidstr?: string
  readonly mid?: string
  readonly created_at: string
  readonly source?: string
  readonly text: string
  readonly text_raw?: string
  readonly like_counts?: number
  readonly liked?: boolean
  readonly total_number?: number
  readonly hot_icon?: string
  readonly floor_number?: number
  readonly disable_reply?: number
  readonly restrictOperate?: number
  readonly max_id?: number
  readonly mark_type?: number
  readonly readtimetype?: string
  readonly source_allowclick?: number
  readonly source_type?: number
  readonly analysis_extra?: string
  readonly cmt_ext?: string
  readonly safe_tags?: number
  readonly sync_id?: number
  readonly sync_uuid?: number
  readonly sync_generate_level?: number
  readonly rid?: string
  readonly allow_follow?: boolean
  readonly item_category?: string
  readonly degrade_type?: string
  readonly report_scheme?: string
  readonly match_ai_play_picture?: boolean
  readonly isLikedByMblogAuthor?: boolean
  readonly isExpand?: boolean
  readonly reply_comment?: WeiboCommentEntity
  readonly reply_original_text?: string
  readonly shouldShowColon?: boolean
  readonly is_mblog_author?: boolean
  readonly scheme?: string
  readonly comment_bubble?: WeiboCommentBubble
  readonly vip_button?: Record<string, unknown>
  readonly user: WeiboCommentUser
  readonly comment_badge?: readonly WeiboCommentBadge[]
  readonly more_info?: WeiboCommentMoreInfo
  readonly comments?: readonly WeiboCommentEntity[]
}

export interface WeiboBuildCommentsResponse extends Record<string, unknown> {
  readonly ok: number
  readonly filter_group?: readonly WeiboCommentFilterGroup[]
  readonly data: readonly WeiboCommentEntity[]
  readonly max_id: number
  readonly max_id_type?: number
  readonly max_idstr?: string
  readonly total_number?: number
  readonly trendsText?: string
  readonly rootComment?: WeiboCommentEntity
  readonly root_comment?: WeiboCommentEntity
  readonly hot_data?: readonly WeiboCommentEntity[]
}
