import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import type { AxiosError } from 'axios'
import { firstValueFrom } from 'rxjs'

import type { WeiboStatusDetailResponse } from './types/status-detail.js'
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
      throw this.enrichError(error, statusId)
    }
  }

  private enrichError(error: unknown, statusId: string): WeiboRequestError {
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
        `Unexpected Axios error while retrieving Weibo status ${statusId}`

      return new WeiboRequestError(message, status, error)
    }

    if (error instanceof WeiboRequestError) {
      return error
    }

    return new WeiboRequestError(
      `Unexpected error while retrieving Weibo status ${statusId}`,
      undefined,
      error
    )
  }
}

const isAxiosError = (input: unknown): input is AxiosError => {
  return typeof input === 'object' && input !== null && 'isAxiosError' in input
}
