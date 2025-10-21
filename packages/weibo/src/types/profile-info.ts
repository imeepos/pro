import type { WeiboUserIcon, WeiboUserProfile } from './status-detail.js'

export interface WeiboProfileIconBadge extends WeiboUserIcon {
  readonly data?: {
    readonly mbrank?: number
    readonly mbtype?: number
    readonly svip?: number
    readonly vvip?: number
  }
}

export interface WeiboProfileUser extends WeiboUserProfile {
  readonly followers_count: number
  readonly followers_count_str?: string
  readonly friends_count: number
  readonly statuses_count: number
  readonly verified_reason?: string
  readonly url?: string
  readonly svip?: number
  readonly vvip?: number
  readonly cover_image_phone?: string
  readonly top_user?: number
  readonly user_type?: number
  readonly is_star?: string
  readonly is_muteuser?: boolean
  readonly special_follow?: boolean
  readonly icon_list?: readonly WeiboProfileIconBadge[]
}

export interface WeiboProfileTab extends Record<string, unknown> {
  readonly name: string
  readonly tabName: string
}

export interface WeiboProfileInfoData extends Record<string, unknown> {
  readonly user: WeiboProfileUser
  readonly tabList?: readonly WeiboProfileTab[]
  readonly blockText?: string
}

export interface WeiboProfileInfoResponse extends Record<string, unknown> {
  readonly ok: number
  readonly data: WeiboProfileInfoData
}
