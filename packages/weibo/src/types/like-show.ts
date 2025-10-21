export interface WeiboLikeUserStatusTotals {
  readonly total_cnt: number
  readonly repost_cnt: number
  readonly comment_cnt: number
  readonly like_cnt: number
  readonly comment_like_cnt: number
}

export interface WeiboLikeUserVideoTotals {
  readonly play_cnt: number
}

export interface WeiboLikeUserIcon {
  readonly name: string
  readonly url: string
  readonly scheme?: string
  readonly length?: number
}

export interface WeiboLikeUserInsecurity {
  readonly sexual_content: boolean
}

export interface WeiboLikeUser extends Record<string, unknown> {
  readonly id: number
  readonly idstr: string
  readonly class: number
  readonly screen_name: string
  readonly name: string
  readonly province: string
  readonly city: string
  readonly location: string
  readonly description: string
  readonly url: string
  readonly profile_image_url: string
  readonly light_ring: boolean
  readonly cover_image_phone?: string
  readonly profile_url: string
  readonly domain: string
  readonly weihao: string
  readonly gender: string
  readonly followers_count: number
  readonly followers_count_str?: string
  readonly friends_count: number
  readonly pagefriends_count?: number
  readonly statuses_count: number
  readonly video_status_count?: number
  readonly video_play_count?: number
  readonly super_topic_not_syn_count?: number
  readonly favourites_count?: number
  readonly created_at: string
  readonly following: boolean
  readonly allow_all_act_msg: boolean
  readonly geo_enabled: boolean
  readonly verified: boolean
  readonly verified_type: number
  readonly remark: string
  readonly insecurity?: WeiboLikeUserInsecurity
  readonly ptype: number
  readonly allow_all_comment: boolean
  readonly avatar_large: string
  readonly avatar_hd: string
  readonly verified_reason: string
  readonly verified_trade: string
  readonly verified_reason_url: string
  readonly verified_source: string
  readonly verified_source_url: string
  readonly follow_me: boolean
  readonly like: boolean
  readonly like_me: boolean
  readonly online_status: number
  readonly bi_followers_count: number
  readonly lang: string
  readonly star: number
  readonly mbtype: number
  readonly mbrank: number
  readonly svip: number
  readonly vvip: number
  readonly mb_expire_time: number
  readonly block_word: number
  readonly block_app: number
  readonly chaohua_ability: number
  readonly brand_ability: number
  readonly nft_ability: number
  readonly vplus_ability: number
  readonly wenda_ability: number
  readonly live_ability: number
  readonly gongyi_ability: number
  readonly paycolumn_ability: number
  readonly newbrand_ability: number
  readonly ecommerce_ability: number
  readonly hardfan_ability: number
  readonly wbcolumn_ability: number
  readonly interaction_user: number
  readonly audio_ability: number
  readonly place_ability: number
  readonly credit_score: number
  readonly user_ability: number
  readonly urank: number
  readonly story_read_state: number
  readonly vclub_member: number
  readonly is_teenager: number
  readonly is_guardian: number
  readonly is_teenager_list: number
  readonly pc_new: number
  readonly special_follow: boolean
  readonly planet_video: number
  readonly video_mark: number
  readonly live_status: number
  readonly user_ability_extend: number
  readonly status_total_counter?: WeiboLikeUserStatusTotals
  readonly video_total_counter?: WeiboLikeUserVideoTotals
  readonly brand_account: number
  readonly hongbaofei: number
  readonly reward_status: number
  readonly green_mode: number
  readonly green_mode_source: number
  readonly urisk: number
  readonly unfollowing_recom_switch: number
  readonly avatar_type: number
  readonly is_big: number
  readonly auth_status: number
  readonly auth_realname: string | null
  readonly auth_career: string | null
  readonly auth_career_name: string | null
  readonly show_auth: number
  readonly is_auth: number
  readonly is_punish: number
  readonly like_display: number
  readonly comment_display: number
  readonly icons: readonly WeiboLikeUserIcon[]
}

export interface WeiboStatusAttitude {
  readonly user: WeiboLikeUser
  readonly attitude: number
}

export interface WeiboStatusLikeShowResponse {
  readonly ok: number
  readonly data: readonly WeiboStatusAttitude[]
  readonly max_id?: number
  readonly since_id?: number
  readonly total_number?: number
}
