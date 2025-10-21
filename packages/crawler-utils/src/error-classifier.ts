export enum ErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  CONNECTION = 'CONNECTION',
  AUTH = 'AUTH',
  RATE_LIMIT = 'RATE_LIMIT',
  ACCOUNT = 'ACCOUNT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PARSE = 'PARSE_ERROR',
  BROWSER = 'BROWSER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

const KEYWORDS: Record<ErrorType, string[]> = {
  [ErrorType.TIMEOUT]: ['timeout', 'timed out', '超时', 'time out'],
  [ErrorType.NETWORK]: ['network', '网络异常', 'dns', 'socket'],
  [ErrorType.CONNECTION]: ['connection', 'connect', '连接被拒绝', 'econrefused', 'ecconnreset'],
  [ErrorType.AUTH]: ['auth', 'unauthorized', 'token', '认证失败', '登录失败'],
  [ErrorType.RATE_LIMIT]: ['rate limit', '限流', 'too many requests', '429'],
  [ErrorType.ACCOUNT]: ['account', '账号', 'login', 'banned', '封禁'],
  [ErrorType.ACCESS_DENIED]: ['403', 'forbidden', 'robots', 'access denied'],
  [ErrorType.PARSE]: ['parse', 'selector', '解析失败', 'invalid dom'],
  [ErrorType.BROWSER]: ['browser', 'page crash', '崩溃', 'target closed'],
  [ErrorType.UNKNOWN]: []
};

const CLEAN_PATTERNS = [
  /\[object [^\]]+\]/g
];

export class ErrorClassifier {
  static classify(error: unknown): ErrorType {
    const message = this.normalize(error);
    if (!message) {
      return ErrorType.UNKNOWN;
    }

    for (const [type, keywords] of Object.entries(KEYWORDS)) {
      if (type === ErrorType.UNKNOWN) {
        continue;
      }

      if (this.matches(message, keywords)) {
        return type as ErrorType;
      }
    }

    return ErrorType.UNKNOWN;
  }

  private static normalize(error: unknown): string | null {
    if (!error) {
      return null;
    }

    if (typeof error === 'string') {
      return this.clean(error.toLowerCase());
    }

    if (error instanceof Error) {
      const candidates = [error.message, (error as any).stack];
      const normalized = candidates.find(Boolean);
      return normalized ? this.clean(String(normalized).toLowerCase()) : null;
    }

    if (typeof error === 'object') {
      try {
        return this.clean(JSON.stringify(error).toLowerCase());
      } catch {
        return this.clean(String(error).toLowerCase());
      }
    }

    return this.clean(String(error).toLowerCase());
  }

  private static matches(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword));
  }

  private static clean(input: string): string {
    return CLEAN_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), input).trim();
  }
}
