/**
 * 不可重试的错误
 * 当执行过程中遇到此类错误时，应立即终止并向外抛出，不应进行重试
 */
export class NoRetryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message, { cause });
    this.name = 'NoRetryError';
  }
}
