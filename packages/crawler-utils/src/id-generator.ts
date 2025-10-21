import { randomBytes } from 'crypto';

const TRACE_PREFIX = 'trace';
const SESSION_PREFIX = 'session';
const PARSE_PREFIX = 'parse';

export class IdGenerator {
  static generate(prefix: string): string {
    return this.compose(prefix);
  }

  static generateTraceId(): string {
    return this.generate(TRACE_PREFIX);
  }

  static generateSessionId(): string {
    return this.generate(SESSION_PREFIX);
  }

  static generateParseId(): string {
    return this.generate(PARSE_PREFIX);
  }

  private static compose(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const randomPart = randomBytes(6).toString('hex');
    return `${prefix}_${timestamp}_${randomPart}`;
  }
}
