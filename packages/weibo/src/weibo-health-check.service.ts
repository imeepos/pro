import { Injectable } from '@pro/core'
import axios, { AxiosError, type AxiosInstance } from 'axios'

import { WeiboAccountStatus } from '@pro/types'

const WEIBO_FRIENDS_ENDPOINT = 'https://weibo.com/ajax/friendships/friends'

export interface WeiboAccountHealthResult {
  readonly accountId: number
  readonly status: WeiboAccountStatus
  readonly isValid: boolean
  readonly errorType?: string
  readonly errorMessage?: string
  readonly checkedAt: Date
}

export interface WeiboAccountHealthEntry {
  readonly id: number
  readonly cookies: string
  readonly weiboUid?: string
}

@Injectable()
export class WeiboHealthCheckService {
  private readonly axios: AxiosInstance

  constructor() {
    this.axios = axios.create()
  }

  async checkAccountHealth(
    accountId: number,
    cookies: string,
    options: { weiboUid?: string } = {}
  ): Promise<WeiboAccountHealthResult> {
    const checkedAt = new Date()
    const { weiboUid } = options

    const cookieHeader = this.combineCookies(cookies)
    if (!cookieHeader) {
      return {
        accountId,
        status: WeiboAccountStatus.EXPIRED,
        isValid: false,
        errorType: 'INVALID_COOKIES',
        errorMessage: 'Cookie 内容为空或格式不正确',
        checkedAt
      }
    }

    const url = new URL(WEIBO_FRIENDS_ENDPOINT)
    url.searchParams.set('page', '1')
    if (weiboUid) {
      url.searchParams.set('uid', weiboUid)
    }

    try {
      const response = await this.axios.get(url.toString(), {
        headers: this.createRequestHeaders(cookieHeader, weiboUid),
        timeout: 30000,
        validateStatus: () => true
      })

      const assessed = this.assessResponse(response)
      const isValid = assessed.status === WeiboAccountStatus.ACTIVE

      return {
        accountId,
        status: assessed.status,
        isValid,
        errorType: assessed.errorType,
        errorMessage: assessed.errorMessage,
        checkedAt
      }
    } catch (error) {
      const fault = this.resolveNetworkFault(error)

      return {
        accountId,
        status: WeiboAccountStatus.RESTRICTED,
        isValid: false,
        errorType: fault.errorType,
        errorMessage: fault.errorMessage,
        checkedAt
      }
    }
  }

  async checkAccountHealthBatch(
    accounts: readonly WeiboAccountHealthEntry[]
  ): Promise<WeiboAccountHealthResult[]> {
    const tasks = accounts.map((account) =>
      this.checkAccountHealth(account.id, account.cookies, { weiboUid: account.weiboUid })
    )

    return Promise.all(tasks)
  }

  private combineCookies(raw: string): string | null {
    if (!raw) {
      return null
    }

    const trimmed = raw.trim()
    if (!trimmed) {
      return null
    }

    try {
      const parsed = JSON.parse(trimmed) as Array<{ name?: string; value?: string }>

      if (Array.isArray(parsed) && parsed.length > 0) {
        const resolved = parsed
          .filter((item) => typeof item?.name === 'string' && typeof item?.value === 'string')
          .map((item) => `${item.name}=${item.value}`)
          .join('; ')

        return resolved.length > 0 ? resolved : null
      }
    } catch {
      // 当解析失败时，允许直接使用原始字符串
    }

    if (trimmed.includes('=')) {
      return trimmed
    }

    return null
  }

  private createRequestHeaders(cookie: string, weiboUid?: string) {
    return {
      accept: 'application/json, text/plain, */*',
      'client-version': 'v2.47.121',
      'x-requested-with': 'XMLHttpRequest',
      referer: weiboUid ? `https://weibo.com/u/page/follow/${weiboUid}` : 'https://weibo.com',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      cookie
    }
  }

  private assessResponse(
    response: { status: number; data?: any }
  ): Pick<WeiboAccountHealthResult, 'status' | 'errorType' | 'errorMessage'> {
    const { status, data } = response

    if (status === 401 || status === 403) {
      return {
        status: WeiboAccountStatus.EXPIRED,
        errorType: 'AUTHORIZATION_FAILED',
        errorMessage: 'Cookie 已过期或无权访问'
      }
    }

    if (status === 429) {
      return {
        status: WeiboAccountStatus.RESTRICTED,
        errorType: 'RATE_LIMITED',
        errorMessage: '账号触发频率限制'
      }
    }

    if (status !== 200) {
      return {
        status: WeiboAccountStatus.BANNED,
        errorType: 'UNEXPECTED_STATUS',
        errorMessage: `微博返回异常状态码 ${status}`
      }
    }

    if (!data) {
      return {
        status: WeiboAccountStatus.BANNED,
        errorType: 'EMPTY_RESPONSE',
        errorMessage: '微博未返回任何数据'
      }
    }

    if (data.ok === 1) {
      return {
        status: WeiboAccountStatus.ACTIVE
      }
    }

    if (data.ok === 0) {
      const errno = data.errno ?? data.code ?? data.error
      const message = data.msg ?? data.message ?? '微博返回错误'

      if (errno === '100005' || errno === '100006') {
        return {
          status: WeiboAccountStatus.EXPIRED,
          errorType: 'COOKIE_INVALID',
          errorMessage: message
        }
      }

      if (errno === '100003') {
        return {
          status: WeiboAccountStatus.RESTRICTED,
          errorType: 'SECURITY_VERIFICATION',
          errorMessage: message
        }
      }

      return {
        status: WeiboAccountStatus.BANNED,
        errorType: 'ACCOUNT_ABNORMAL',
        errorMessage: message
      }
    }

    return {
      status: WeiboAccountStatus.BANNED,
      errorType: 'UNEXPECTED_SHAPE',
      errorMessage: '微博响应格式无法识别'
    }
  }

  private resolveNetworkFault(error: unknown): {
    errorType: string
    errorMessage: string
  } {
    if (error instanceof AxiosError) {
      if (error.response) {
        return {
          errorType: 'HTTP_ERROR',
          errorMessage: `微博接口请求失败，状态码 ${error.response.status}`
        }
      }

      if (error.code === 'ECONNABORTED') {
        return {
          errorType: 'TIMEOUT',
          errorMessage: '微博接口请求超时'
        }
      }

      return {
        errorType: 'NETWORK_ERROR',
        errorMessage: error.message
      }
    }

    const message = error instanceof Error ? error.message : String(error)
    return {
      errorType: 'UNKNOWN_ERROR',
      errorMessage: message
    }
  }
}
