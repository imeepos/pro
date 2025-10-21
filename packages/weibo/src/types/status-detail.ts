export type WeiboNumericValue = number | string

export interface WeiboVisibility {
  readonly type: number
  readonly list_id: number
}

export interface WeiboUserTotals {
  readonly total_cnt_format?: string
  readonly comment_cnt?: WeiboNumericValue
  readonly repost_cnt?: WeiboNumericValue
  readonly like_cnt?: WeiboNumericValue
  readonly total_cnt?: WeiboNumericValue
}

export interface WeiboUserIcon {
  readonly type: string
  readonly data?: Record<string, unknown>
}

export interface WeiboUserProfile {
  readonly id: number
  readonly idstr: string
  readonly pc_new?: WeiboNumericValue
  readonly screen_name: string
  readonly profile_image_url: string
  readonly profile_url: string
  readonly verified: boolean
  readonly verified_type: number
  readonly domain: string
  readonly weihao: string
  readonly verified_type_ext?: WeiboNumericValue
  readonly status_total_counter?: WeiboUserTotals
  readonly avatar_large?: string
  readonly avatar_hd?: string
  readonly follow_me: boolean
  readonly following: boolean
  readonly mbrank?: number
  readonly mbtype?: number
  readonly v_plus?: number
  readonly user_ability?: number
  readonly planet_video?: boolean
  readonly icon_list?: readonly WeiboUserIcon[]
  readonly description?: string
  readonly gender?: string
  readonly location?: string
}

export interface WeiboAnnotation extends Record<string, unknown> {
  readonly mapi_request?: boolean
}

export interface WeiboNumberDisplayStrategy {
  readonly apply_scenario_flag: number
  readonly display_text_min_number: number
  readonly display_text: string
}

export interface WeiboCommentManageInfo {
  readonly comment_permission_type: number
  readonly approval_comment_type: number
  readonly comment_sort_type: number
}

export interface WeiboActionLog extends Record<string, unknown> {
  readonly act_type?: WeiboNumericValue
  readonly act_code?: WeiboNumericValue
  readonly oid?: string
  readonly uuid?: WeiboNumericValue
  readonly cardid?: string
  readonly lcardid?: string
  readonly uicode?: string
  readonly luicode?: string
  readonly fid?: string
  readonly lfid?: string
  readonly ext?: string
  readonly source?: string
}

export interface WeiboUrlStruct extends Record<string, unknown> {
  readonly url_title: string
  readonly url_type_pic?: string
  readonly ori_url?: string
  readonly page_id?: string
  readonly short_url?: string
  readonly long_url?: string
  readonly url_type?: number
  readonly result?: boolean
  readonly actionlog?: WeiboActionLog
  readonly storage_type?: string
  readonly hide?: number
  readonly object_type?: string
  readonly ttl?: number
  readonly h5_target_url?: string
  readonly need_save_obj?: number
}

export interface WeiboTagStruct extends Record<string, unknown> {
  readonly tag_name: string
  readonly oid: string
  readonly tag_type?: number
  readonly tag_hidden?: number
  readonly tag_scheme?: string
  readonly url_type_pic?: string
  readonly desc?: string
  readonly w_h_ratio?: number
  readonly actionlog?: WeiboActionLog
}

export interface WeiboTitle extends Record<string, unknown> {
  readonly text: string
  readonly base_color?: number
  readonly icon_url?: string
}

export interface WeiboMediaInfo extends Record<string, unknown> {
  readonly name?: string
  readonly stream_url?: string
  readonly stream_url_hd?: string
  readonly format?: string
  readonly h5_url?: string
  readonly mp4_sd_url?: string
  readonly mp4_hd_url?: string
  readonly h265_mp4_hd?: string
  readonly duration?: number
  readonly protocol?: string
  readonly video_orientation?: string
  readonly play_completion_actions?: ReadonlyArray<Record<string, unknown>>
}

export interface WeiboVideoStatistics extends Record<string, unknown> {
  readonly online_users?: string
  readonly online_users_number?: number
  readonly ttl?: number
  readonly storage_type?: string
  readonly has_recommend_video?: number
}

export interface WeiboPageInfo extends Record<string, unknown> {
  readonly type: number
  readonly page_id: string
  readonly object_type?: string
  readonly oid?: string
  readonly page_title?: string
  readonly page_pic?: string
  readonly type_icon?: string
  readonly page_url?: string
  readonly object_id?: string
  readonly media_info?: WeiboMediaInfo
  readonly urls?: readonly WeiboUrlStruct[]
  readonly actionlog?: WeiboActionLog
  readonly video_watch_count?: WeiboVideoStatistics
}

export interface WeiboStatusDetail {
  readonly visible: WeiboVisibility
  readonly created_at: string
  readonly id: number
  readonly idstr: string
  readonly mid: string
  readonly mblogid: string
  readonly user: WeiboUserProfile
  readonly can_edit: boolean
  readonly textLength: number
  readonly annotations?: readonly WeiboAnnotation[]
  readonly source: string
  readonly favorited: boolean
  readonly rid: string
  readonly cardid?: string
  readonly pic_ids: readonly string[]
  readonly pic_num: number
  readonly is_paid: boolean
  readonly pic_bg_new?: string
  readonly mblog_vip_type: number
  readonly number_display_strategy?: WeiboNumberDisplayStrategy
  readonly reposts_count: number
  readonly comments_count: number
  readonly attitudes_count: number
  readonly attitudes_status?: number
  readonly isLongText: boolean
  readonly mlevel?: number
  readonly content_auth?: number
  readonly is_show_bulletin?: number
  readonly comment_manage_info?: WeiboCommentManageInfo
  readonly share_repost_type?: number
  readonly url_struct?: readonly WeiboUrlStruct[]
  readonly tag_struct?: readonly WeiboTagStruct[]
  readonly title?: WeiboTitle
  readonly mblogtype?: number
  readonly showFeedRepost?: boolean
  readonly showFeedComment?: boolean
  readonly pictureViewerSign?: boolean
  readonly showPictureViewer?: boolean
  readonly rcList?: readonly unknown[]
  readonly analysis_extra?: string
  readonly readtimetype?: string
  readonly mixed_count?: number
  readonly is_show_mixed?: boolean
  readonly mblog_feed_back_menus_format?: readonly Record<string, unknown>[]
  readonly isSinglePayAudio?: boolean
  readonly text: string
  readonly text_raw: string
  readonly region_name?: string
  readonly page_info?: WeiboPageInfo
  readonly ok?: number
}

export type WeiboStatusDetailResponse = WeiboStatusDetail
