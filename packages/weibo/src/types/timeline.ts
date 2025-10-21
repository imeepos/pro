import type { WeiboActionLog, WeiboStatusDetail } from './status-detail.js'

export interface WeiboPictureFocusPoint {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface WeiboTimelinePictureFocus {
  readonly pic_id: string
  readonly focus_point: WeiboPictureFocusPoint
}

export interface WeiboTimelinePictureVariant {
  readonly url: string
  readonly width?: number | string
  readonly height?: number | string
  readonly cut_type?: number
  readonly type?: string
}

export interface WeiboTimelinePictureInfo extends Record<string, unknown> {
  readonly pic_id: string
  readonly object_id?: string
  readonly photo_tag?: number
  readonly pic_status?: number
  readonly type?: string
  readonly focus_point?: WeiboPictureFocusPoint
  readonly thumbnail?: WeiboTimelinePictureVariant
  readonly bmiddle?: WeiboTimelinePictureVariant
  readonly large?: WeiboTimelinePictureVariant
  readonly largecover?: WeiboTimelinePictureVariant
  readonly largest?: WeiboTimelinePictureVariant
  readonly mw2000?: WeiboTimelinePictureVariant
  readonly original?: WeiboTimelinePictureVariant
}

export type WeiboTimelinePictureMap = Readonly<Record<string, WeiboTimelinePictureInfo>>

export interface WeiboMixedMediaInfoItem extends Record<string, unknown> {
  readonly id?: string
  readonly type: string
  readonly scheme?: string
  readonly data?: Record<string, unknown>
  readonly actionlog?: WeiboActionLog | readonly WeiboActionLog[]
}

export interface WeiboMixedMediaInfo extends Record<string, unknown> {
  readonly items: readonly WeiboMixedMediaInfoItem[]
}

export interface WeiboTimelineStatus extends WeiboStatusDetail {
  readonly isAd: boolean
  readonly isTop?: number
  readonly mix_media_info?: WeiboMixedMediaInfo
  readonly pic_focus_point?: readonly WeiboTimelinePictureFocus[]
  readonly pic_infos?: WeiboTimelinePictureMap
}

export interface WeiboTimelineTopic extends Record<string, unknown> {}

export interface WeiboTimelineData {
  readonly list: readonly WeiboTimelineStatus[]
  readonly since_id: string
  readonly total: number
  readonly status_visible: number
  readonly bottom_tips_visible: boolean
  readonly bottom_tips_text: string
  readonly topicList: readonly WeiboTimelineTopic[]
}

export interface WeiboTimelineResponse {
  readonly ok: number
  readonly data: WeiboTimelineData
}
