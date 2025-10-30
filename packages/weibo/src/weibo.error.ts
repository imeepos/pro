export class WeiboRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly originalError?: unknown
  ) {
    super(message, { cause: originalError })
    this.name = 'WeiboRequestError'
  }

  get isRetryable(): boolean {
    if (!this.status) return false

    return (
      this.status === 429 ||
      this.status === 503 ||
      this.status === 504 ||
      this.status === 408
    )
  }
}
