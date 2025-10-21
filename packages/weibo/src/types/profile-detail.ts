export interface WeiboProfileDetailResponse {
  readonly ok: number
  readonly data?: WeiboProfileDetail
}

export type WeiboProfileDetail = Record<string, unknown> & {
  readonly sunshine_credit?: WeiboProfileSunshineCredit
  readonly followers?: WeiboProfileFollowers
  readonly birthday?: string
  readonly created_at?: string
  readonly description?: string
  readonly desc_text?: string
  readonly friend_info?: string
  readonly gender?: string
  readonly ip_location?: string
  readonly label_desc?: readonly WeiboProfileLabelDescriptor[]
  readonly real_auth?: boolean
  readonly real_name?: WeiboProfileRealName
  readonly verified_url?: string
}

export interface WeiboProfileSunshineCredit {
  readonly level?: string
  readonly [key: string]: unknown
}

export interface WeiboProfileFollowers {
  readonly total_number?: number
  readonly users?: readonly WeiboProfileFollower[]
  readonly [key: string]: unknown
}

export interface WeiboProfileFollower {
  readonly id?: number | string
  readonly screen_name?: string
  readonly avatar_large?: string
  readonly [key: string]: unknown
}

export interface WeiboProfileRealName {
  readonly name?: string
  readonly career?: string
  readonly [key: string]: unknown
}

export interface WeiboProfileLabelDescriptor {
  readonly name?: string
  readonly normal_mode?: WeiboProfileLabelPalette
  readonly dark_mode?: WeiboProfileLabelPalette
  readonly scheme_url?: string
  readonly [key: string]: unknown
}

export interface WeiboProfileLabelPalette {
  readonly word_color?: string
  readonly background_color?: string
  readonly [key: string]: unknown
}
