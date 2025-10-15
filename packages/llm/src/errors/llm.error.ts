export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'LLMError';
    Object.setPrototypeOf(this, LLMError.prototype);
  }

  static fromOpenAIError(error: any): LLMError {
    const message = error.message || 'Unknown OpenAI error';
    const code = error.code || 'UNKNOWN_ERROR';
    const statusCode = error.status || error.statusCode;

    return new LLMError(message, code, statusCode, error);
  }

  static invalidConfig(message: string): LLMError {
    return new LLMError(message, 'INVALID_CONFIG', 400);
  }

  static rateLimitExceeded(retryAfter?: number): LLMError {
    return new LLMError(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter },
    );
  }

  static timeout(timeoutMs: number): LLMError {
    return new LLMError(
      `Request timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      408,
      { timeoutMs },
    );
  }

  static streamError(message: string): LLMError {
    return new LLMError(message, 'STREAM_ERROR', 500);
  }
}
