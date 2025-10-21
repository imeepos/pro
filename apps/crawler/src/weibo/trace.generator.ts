export interface TraceContext {
  traceId: string;
  taskId: number;
  keyword: string;
  startTime: Date;
}

export class TraceGenerator {
  static generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `trace_${timestamp}_${randomStr}`;
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
