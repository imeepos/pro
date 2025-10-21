export class WeiboRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly originalError?: unknown
  ) {
    super(message, { cause: originalError })
    this.name = 'WeiboRequestError'
  }
}
