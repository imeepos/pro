/**
 * 死信队列领域模型
 *
 * 存在即合理：
 * - DlqMessage 记录消息的完整轨迹
 * - DlqQueueInfo 让每个队列的身份清晰可见
 * - DlqStatistics 提供全局视角
 *
 * 优雅即简约：
 * - 所有字段直指业务本质，无冗余修饰
 */
export interface DlqMessage {
  /** RabbitMQ 消息 ID */
  id: string;
  /** 当前所在的死信队列名称 */
  queueName: string;
  /** 原始消息内容，保持原貌 */
  content: unknown;
  /** 第一次失败时间 */
  failedAt: Date | string;
  /** 已尝试重试的次数 */
  retryCount: number;
  /** 最后一次失败时的错误信息 */
  errorMessage?: string;
}

export interface DlqQueueInfo {
  /** 死信队列名称 */
  name: string;
  /** 当前队列中的消息总数 */
  messageCount: number;
  /** 对应的原始业务队列名称 */
  originalQueue: string;
}

export interface DlqStatistics {
  /** 所有死信队列累计的消息总数 */
  totalMessages: number;
  /** 按队列分组的统计数据 */
  queues: DlqQueueInfo[];
}
