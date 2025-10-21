import { IdGenerator } from '@pro/crawler-utils';
import { TraceContext } from './types';

export class TraceGenerator {
  static generateTraceId(): string {
    return IdGenerator.generateTraceId();
  }

  static createTraceContext(taskId: number, keyword: string): TraceContext {
    return {
      traceId: this.generateTraceId(),
      taskId,
      keyword,
      startTime: new Date(),
    };
  }
}
