import type { WeiboUserProfile, WeiboUserTotals } from './status-detail.js'

export interface WeiboCommentFansIcon extends Record<string, unknown> {
  readonly icon_url: string
}

export interface WeiboCommentUser extends WeiboUserProfile {
  readonly followers_count?: number
  readonly friends_count?: number
  readonly fansIcon?: WeiboCommentFansIcon
  readonly svip?: number
  readonly status_total_counter?: WeiboUserTotals
}

export interface WeiboCommentMoreInfo extends Record<string, unknown> {
  readonly display_text?: string
  readonly scheme?: string
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
  readonly floor_number?: number
  readonly disable_reply?: number
  readonly user: WeiboCommentUser
  readonly comment_badge?: readonly WeiboCommentBadge[]
  readonly more_info?: WeiboCommentMoreInfo
  readonly comments?: readonly WeiboCommentEntity[]
}

export interface WeiboBuildCommentsResponse extends Record<string, unknown> {
  readonly ok: number
  readonly data: readonly WeiboCommentEntity[]
  readonly max_id: number
  readonly max_id_type?: number
  readonly max_idstr?: string
  readonly total_number?: number
  readonly root_comment?: WeiboCommentEntity
  readonly hot_data?: readonly WeiboCommentEntity[]
}
