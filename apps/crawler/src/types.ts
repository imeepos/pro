export interface SubTaskMessage {
  taskId: number;
  type?: string;
  keyword?: string;
  start?: Date | string;
  end?: Date | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NormalizedTask {
  taskId: number;
  type: string;
  keyword: string;
  start: Date;
  end: Date;
  metadata: Record<string, unknown>;
}
