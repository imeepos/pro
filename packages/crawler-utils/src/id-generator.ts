import { randomBytes } from 'crypto';

const TRACE_PREFIX = 'trace';
const SESSION_PREFIX = 'session';
const PARSE_PREFIX = 'parse';

export class IdGenerator {
  static generateTraceId(): string {
    return this.compose(TRACE_PREFIX);
  }

  static generateSessionId(): string {
    return this.compose(SESSION_PREFIX);
  }

  static generateParseId(): string {
    return this.compose(PARSE_PREFIX);
  }

  private static compose(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const randomPart = randomBytes(6).toString('hex');
    return `${prefix}_${timestamp}_${randomPart}`;
  }
}
