export const DEFAULT_WEIBO_BASE_URL = 'https://weibo.com'
export const DEFAULT_WEIBO_LOCALE = 'zh-CN'
export const DEFAULT_WEIBO_TIMEOUT = 10000
export const DEFAULT_WEIBO_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
export const DEFAULT_WEIBO_REFERER = 'https://weibo.com/'

export const DEFAULT_WEIBO_HEADERS: Record<string, string> = Object.freeze({
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9',
  'client-version': 'v2.47.126',
  priority: 'u=1, i',
  'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-requested-with': 'XMLHttpRequest'
})

export interface WeiboRequestOptions {
  readonly baseUrl?: string
  readonly locale?: string
  readonly getLongText?: boolean
  readonly timeout?: number
  readonly headers?: Record<string, string>
  readonly cookie?: string
  readonly xsrfToken?: string
  readonly userAgent?: string
  readonly referer?: string
  readonly clientVersion?: string
}

export interface ResolvedWeiboRequestOptions {
  readonly baseUrl: string
  readonly locale: string
  readonly getLongText: boolean
  readonly timeout: number
  readonly headers: Record<string, string>
}

export const resolveWeiboRequestOptions = (
  options: WeiboRequestOptions = {}
): ResolvedWeiboRequestOptions => {
  const headers: Record<string, string> = { ...DEFAULT_WEIBO_HEADERS }

  headers['user-agent'] = options.userAgent ?? DEFAULT_WEIBO_USER_AGENT
  headers.referer = options.referer ?? DEFAULT_WEIBO_REFERER
  headers['client-version'] = options.clientVersion ?? headers['client-version']

  if (options.cookie) {
    headers.cookie = options.cookie
  }

  if (options.xsrfToken) {
    headers['x-xsrf-token'] = options.xsrfToken
  }

  if (options.headers) {
    Object.assign(headers, options.headers)
  }

  return {
    baseUrl: options.baseUrl ?? DEFAULT_WEIBO_BASE_URL,
    locale: options.locale ?? DEFAULT_WEIBO_LOCALE,
    getLongText: options.getLongText ?? true,
    timeout: options.timeout ?? DEFAULT_WEIBO_TIMEOUT,
    headers
  }
}
