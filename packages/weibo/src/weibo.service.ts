import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { isAxiosError } from 'axios'
import { firstValueFrom } from 'rxjs'

import { RawDataSourceService, type RawDataSourceDoc } from '@pro/mongodb'
import { SourceType, type CreateRawDataSourceDto } from '@pro/types'

import type { WeiboStatusDetailResponse } from './types/status-detail.js'
import type { WeiboStatusLikeShowResponse } from './types/like-show.js'
import type { WeiboBuildCommentsResponse } from './types/comment-build.js'
import { resolveWeiboRequestOptions, type WeiboRequestOptions } from './weibo.options.js'
import { WeiboRequestError } from './weibo.error.js'

@Injectable()
export class WeiboStatusService {
  private readonly logger = new Logger(WeiboStatusService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly rawDataSourceService: RawDataSourceService
  ) {}

  async fetchStatusDetails(
    statusIds: readonly string[],
    options: BatchFetchOptions = {}
  ): Promise<Map<string, WeiboStatusDetailResponse>> {
    const uniqueIds = Array.from(
      new Set(
        statusIds
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0)
      )
    )

    if (uniqueIds.length === 0) {
      return new Map()
    }

    const {
      requestOptions = {},
      concurrency = 3,
      onError
    } = options

    const effectiveConcurrency = Math.max(1, Math.min(concurrency, uniqueIds.length))
    const workQueue = [...uniqueIds]
    const results = new Map<string, WeiboStatusDetailResponse>()

    const workers = Array.from({ length: effectiveConcurrency }, async () => {
      while (workQueue.length > 0) {
        const statusId = workQueue.shift()
        if (!statusId) {
          continue
        }

        try {
          const detail = await this.fetchStatusDetail(statusId, requestOptions)
          results.set(statusId, detail)
        } catch (error) {
          const enriched = this.ensureWeiboError(error, statusId, 'detail')

          if (onError) {
            await onError(statusId, enriched)
          } else {
            this.logger.warn(`Failed to fetch Weibo status detail`, {
              statusId,
              reason: enriched.message
            })
          }
        }
      }
    })

    await Promise.all(workers)
    return results
  }

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
      throw this.ensureWeiboError(error, statusId, 'detail')
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
      throw this.ensureWeiboError(error, statusId, 'likes')
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
      throw this.ensureWeiboError(error, statusId, 'comments')
    }
  }

  async saveStatusDetailToMongoDB(
    statusId: string,
    detail: WeiboStatusDetailResponse,
    context: SaveStatusDetailContext = {}
  ): Promise<RawDataSourceDoc | null> {
    const sourceUrl = context.sourceUrl ?? `https://weibo.com/status/${statusId}`

    const existingDoc = await this.rawDataSourceService.findExistingSourceRecord({
      sourceType: SourceType.WEIBO_API_JSON,
      sourceUrl,
      statusId
    })

    if (existingDoc) {
      return null
    }

    const createDto: CreateRawDataSourceDto = {
      sourceType: SourceType.WEIBO_API_JSON,
      sourceUrl,
      rawContent: JSON.stringify(detail),
      metadata: {
        statusId,
        discoveredAt: context.discoveredAt ?? new Date().toISOString(),
        traceId: context.traceId,
        keyword: context.keyword,
        taskId: context.taskId,
        ...context
      }
    }

    return this.rawDataSourceService.create(createDto)
  }

  private ensureWeiboError(
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

export interface BatchFetchOptions {
  readonly requestOptions?: WeiboRequestOptions
  readonly concurrency?: number
  readonly onError?: (statusId: string, error: WeiboRequestError) => void | Promise<void>
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

export interface SaveStatusDetailContext {
  readonly discoveredAt?: string
  readonly traceId?: string
  readonly keyword?: string
  readonly taskId?: number
  readonly sourceUrl?: string
}
