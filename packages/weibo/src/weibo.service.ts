import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import type { AxiosError } from 'axios'
import { firstValueFrom } from 'rxjs'

import type { WeiboStatusDetailResponse } from './types/status-detail.js'
import type { WeiboStatusLikeShowResponse } from './types/like-show.js'
import type { WeiboBuildCommentsResponse } from './types/comment-build.js'
import { resolveWeiboRequestOptions, type WeiboRequestOptions } from './weibo.options.js'
import { WeiboRequestError } from './weibo.error.js'

@Injectable()
export class WeiboStatusService {
  constructor(private readonly httpService: HttpService) {}

  async fetchStatusDetail(
    statusId: string,
    options: WeiboRequestOptions = {}
  ): Promise<WeiboStatusDetailResponse> {
    if (!statusId) {
      throw new WeiboRequestError('Weibo status id is required before contacting the API')
    }

    const context = resolveWeiboRequestOptions(options)
    const params = new URLSearchParams([
      ['id', statusId],
      ['locale', context.locale],
      ['isGetLongText', context.getLongText ? 'true' : 'false']
    ])

    try {
      const response = await firstValueFrom(
        this.httpService.get<WeiboStatusDetailResponse>('ajax/statuses/show', {
          headers: context.headers,
          params,
          baseURL: context.baseUrl,
          timeout: context.timeout
        })
      )

      const payload = response.data

      if (!payload) {
        throw new WeiboRequestError('Weibo response payload is empty', response.status)
      }

      if (typeof payload.ok === 'number' && payload.ok !== 1) {
        throw new WeiboRequestError(`Weibo responded with status indicator ${payload.ok}`, response.status)
      }

      return payload
    } catch (error) {
      throw this.enrichError(error, statusId, 'detail')
    }
  }

  async fetchStatusLikes(
    statusId: string,
    options: WeiboStatusLikesOptions = {}
  ): Promise<WeiboStatusLikeShowResponse> {
    if (!statusId) {
      throw new WeiboRequestError('Weibo status id is required before contacting the API')
    }

    const {
      page = 1,
      count = 20,
      attitudeType = 0,
      attitudeEnable = 1
    } = options

    const context = resolveWeiboRequestOptions(options)
    const params = new URLSearchParams([
      ['id', statusId],
      ['attitude_type', String(attitudeType)],
      ['attitude_enable', String(attitudeEnable)],
      ['page', String(page)],
      ['count', String(count)]
    ])

    try {
      const response = await firstValueFrom(
        this.httpService.get<WeiboStatusLikeShowResponse>('ajax/statuses/likeShow', {
          headers: context.headers,
          params,
          baseURL: context.baseUrl,
          timeout: context.timeout
        })
      )

      const payload = response.data

      if (!payload) {
        throw new WeiboRequestError('Weibo response payload is empty', response.status)
      }

      if (typeof payload.ok === 'number' && payload.ok !== 1) {
        throw new WeiboRequestError(`Weibo responded with status indicator ${payload.ok}`, response.status)
      }

      return payload
    } catch (error) {
      throw this.enrichError(error, statusId, 'likes')
    }
  }

  async fetchStatusComments(
    statusId: string,
    options: WeiboStatusCommentsOptions
  ): Promise<WeiboBuildCommentsResponse> {
    if (!statusId) {
      throw new WeiboRequestError('Weibo status id is required before contacting the API')
    }

    if (!options?.uid) {
      throw new WeiboRequestError('Weibo user id is required to retrieve the status comments')
    }

    const {
      uid,
      count = 20,
      fetchLevel = 0,
      flow = 1,
      isReload = 1,
      isMix = 0,
      isShowBulletin = 2,
      maxId,
      maxIdType
    } = options

    const context = resolveWeiboRequestOptions(options)
    const params = new URLSearchParams([
      ['id', statusId],
      ['uid', uid],
      ['count', String(count)],
      ['fetch_level', String(fetchLevel)],
      ['flow', String(flow)],
      ['is_reload', String(isReload)],
      ['is_mix', String(isMix)],
      ['is_show_bulletin', String(isShowBulletin)],
      ['locale', context.locale]
    ])

    if (typeof maxId !== 'undefined') {
      params.append('max_id', String(maxId))
    }

    if (typeof maxIdType !== 'undefined') {
      params.append('max_id_type', String(maxIdType))
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<WeiboBuildCommentsResponse>('ajax/statuses/buildComments', {
          headers: context.headers,
          params,
          baseURL: context.baseUrl,
          timeout: context.timeout
        })
      )

      const payload = response.data

      if (!payload) {
        throw new WeiboRequestError('Weibo response payload is empty', response.status)
      }

      if (typeof payload.ok === 'number' && payload.ok !== 1) {
        throw new WeiboRequestError(`Weibo responded with status indicator ${payload.ok}`, response.status)
      }

      return payload
    } catch (error) {
      throw this.enrichError(error, statusId, 'comments')
    }
  }

  private enrichError(
    error: unknown,
    statusId: string,
    target: 'detail' | 'likes' | 'comments'
  ): WeiboRequestError {
    const subject =
      target === 'detail' ? 'detail' : target === 'likes' ? 'likes roster' : 'comment thread'

    if (isAxiosError(error)) {
      const status = error.response?.status
      const reason = error.response?.data as Record<string, unknown> | undefined
      const message =
        (typeof reason?.msg === 'string'
          ? reason.msg
          : typeof reason?.message === 'string'
            ? reason.message
            : undefined) ||
        error.message ||
        `Unexpected Axios error while retrieving Weibo status ${statusId} ${subject}`

      return new WeiboRequestError(message, status, error)
    }

    if (error instanceof WeiboRequestError) {
      return error
    }

    return new WeiboRequestError(
      `Unexpected error while retrieving Weibo status ${statusId} ${subject}`,
      undefined,
      error
    )
  }
}

export interface WeiboStatusLikesOptions extends WeiboRequestOptions {
  readonly page?: number
  readonly count?: number
  readonly attitudeType?: number
  readonly attitudeEnable?: number
}

export interface WeiboStatusCommentsOptions extends WeiboRequestOptions {
  readonly uid: string
  readonly count?: number
  readonly fetchLevel?: number
  readonly flow?: number
  readonly isReload?: number
  readonly isMix?: number
  readonly isShowBulletin?: number
  readonly maxId?: number | string
  readonly maxIdType?: number
}

const isAxiosError = (input: unknown): input is AxiosError => {
  return typeof input === 'object' && input !== null && 'isAxiosError' in input
}
