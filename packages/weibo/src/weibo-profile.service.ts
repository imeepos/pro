import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { isAxiosError } from 'axios'
import { firstValueFrom } from 'rxjs'

import { resolveWeiboRequestOptions, type WeiboRequestOptions } from './weibo.options.js'
import { WeiboRequestError } from './weibo.error.js'
import type { WeiboTimelineResponse } from './types/timeline.js'
import type { WeiboProfileDetailResponse } from './types/profile-detail.js'
import type { WeiboProfileInfoResponse } from './types/profile-info.js'

@Injectable()
export class WeiboProfileService {
  constructor(private readonly httpService: HttpService) {}

  async fetchProfileInfo(
    uid: string,
    options: WeiboRequestOptions = {}
  ): Promise<WeiboProfileInfoResponse> {
    return this.requestProfileEndpoint<WeiboProfileInfoResponse>(uid, 'ajax/profile/info', options)
  }

  async fetchProfileDetail(
    uid: string,
    options: WeiboRequestOptions = {}
  ): Promise<WeiboProfileDetailResponse> {
    return this.requestProfileEndpoint<WeiboProfileDetailResponse>(uid, 'ajax/profile/detail', options)
  }

  async fetchProfileTimeline(
    uid: string,
    options: WeiboProfileTimelineOptions = {}
  ): Promise<WeiboTimelineResponse> {
    const { page = 1, feature = 0, sinceId } = options
    const extraParams: [string, string][] = [
      ['page', String(page)],
      ['feature', String(feature)]
    ]

    if (sinceId) {
      extraParams.push(['since_id', sinceId])
    }

    return this.requestProfileEndpoint<WeiboTimelineResponse>(
      uid,
      'ajax/statuses/mymblog',
      options,
      extraParams
    )
  }

  private async requestProfileEndpoint<T extends { readonly ok: number }>(
    uid: string,
    endpoint: string,
    options: WeiboRequestOptions,
    extraParams: ReadonlyArray<[string, string]> = []
  ): Promise<T> {
    if (!uid) {
      throw new WeiboRequestError('Weibo user id is required before contacting the API')
    }

    const context = resolveWeiboRequestOptions(options)
    const params = new URLSearchParams([
      ['uid', uid],
      ['locale', context.locale],
      ...extraParams
    ])

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(endpoint, {
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
      throw this.enrichWeiboError(error, uid)
    }
  }

  private enrichWeiboError(error: unknown, uid: string): WeiboRequestError {
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
        `Unexpected Axios error while retrieving Weibo profile ${uid}`

      return new WeiboRequestError(message, status, error)
    }

    if (error instanceof WeiboRequestError) {
      return error
    }

    return new WeiboRequestError(
      `Unexpected error while retrieving Weibo profile ${uid}`,
      undefined,
      error
    )
  }
}

export interface WeiboProfileTimelineOptions extends WeiboRequestOptions {
  readonly page?: number
  readonly feature?: number
  readonly sinceId?: string
}
