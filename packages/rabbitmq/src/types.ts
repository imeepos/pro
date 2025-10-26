import type { QueueName } from '@pro/types';

/**
 * 队列参数配置
 */
export interface QueueOptions {
  /** 队列是否持久化 */
  durable?: boolean;

  /** 消息TTL(毫秒) */
  messageTTL?: number;

  /** 死信交换机 */
  deadLetterExchange?: string;

  /** 死信路由键 */
  deadLetterRoutingKey?: string;

  /** 最大队列长度 */
  maxLength?: number;

  /** 队列模式 (lazy/default) */
  queueMode?: string;
}

/**
 * RabbitMQ 配置
 *
 * 存在即合理: 每个配置项都有明确的业务意义
 */
export interface RabbitMQConfig {
  /** 连接 URL - 支持环境变量注入 */
  url: string;

  /** 默认队列名 - 可选，用于简化单队列场景 */
  queue?: string;

  /** 最大重试次数 - 默认 3 */
  maxRetries?: number;

  /** 是否启用死信队列 - 默认 true */
  enableDLQ?: boolean;

  /** 连接池大小 - 默认 5 */
  poolSize?: number;

  /** 心跳间隔(秒) - 默认 30 */
  heartbeat?: number;

  /** 默认消息TTL(毫秒) - 用于兼容旧配置 */
  messageTTL?: number;

  /** 队列特定配置 - 键为队列名 */
  queueOptions?: Record<string, QueueOptions>;
}

/**
 * 发布选项
 *
 * 精确控制消息发布行为
 */
export interface PublishOptions {
  /** 消息优先级 (0-10) - 默认 5 */
  priority?: number;

  /** 消息过期时间(毫秒) - 默认不过期 */
  expiration?: number;

  /** 是否持久化 - 默认 true */
  persistent?: boolean;

  /** 消息 ID - 用于去重和追踪 */
  messageId?: string;

  /** 相关ID - 用于请求-响应模式 */
  correlationId?: string;
}

/**
 * 重试策略
 *
 * 优雅的错误恢复机制
 */
export interface RetryStrategy {
  /** 最大重试次数 */
  maxRetries: number;

  /** 退避时间基数(毫秒) - 实际延迟 = backoffMs * 2^retryCount */
  backoffMs: number;

  /** 最大退避时间(毫秒) - 避免无限增长 */
  maxBackoffMs?: number;
}

/**
 * 消费者选项
 *
 * 细粒度控制消息消费行为
 */
export interface ConsumerOptions {
  /** 预取数量 - 控制并发，默认 1 */
  prefetchCount?: number;

  /** 是否自动 ACK - 默认 false，由消费者手动确认 */
  noAck?: boolean;

  /** 重试策略 - 默认使用全局配置 */
  retryStrategy?: RetryStrategy;

  /** 死信交换机名称 - 自定义死信路由 */
  deadLetterExchange?: string;

  /** 消费者标签 - 用于监控和管理 */
  consumerTag?: string;
}

/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
  /** 最小连接数 */
  minConnections: number;

  /** 最大连接数 */
  maxConnections: number;

  /** 连接空闲超时(毫秒) - 超时后释放连接 */
  idleTimeout: number;

  /** 健康检查间隔(毫秒) */
  healthCheckInterval: number;
}

/**
 * 消息元数据
 *
 * 消费者接收到的消息包装
 */
export interface MessageMetadata {
  /** 消息 ID */
  messageId?: string;

  /** 相关 ID */
  correlationId?: string;

  /** 时间戳 */
  timestamp?: number;

  /** 重试次数 */
  retryCount: number;

  /** 消息属性 */
  properties: Record<string, any>;
}

/**
 * 批量发布结果
 */
export interface BatchPublishResult {
  /** 成功数量 */
  successCount: number;

  /** 失败数量 */
  failureCount: number;

  /** 失败的消息索引 */
  failedIndices: number[];

  /** 总耗时(毫秒) */
  totalTimeMs: number;
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  /** 队列名称 */
  queueName: QueueName;

  /** 消息总数 */
  messageCount: number;

  /** 消费者数量 */
  consumerCount: number;

  /** 发布速率(消息/秒) */
  publishRate: number;

  /** 消费速率(消息/秒) */
  consumeRate: number;
}

/**
 * 连接状态
 */
export enum ConnectionState {
  /** 未连接 */
  DISCONNECTED = 'disconnected',

  /** 连接中 */
  CONNECTING = 'connecting',

  /** 已连接 */
  CONNECTED = 'connected',

  /** 重连中 */
  RECONNECTING = 'reconnecting',

  /** 关闭中 */
  CLOSING = 'closing',

  /** 已关闭 */
  CLOSED = 'closed',

  /** 错误 */
  ERROR = 'error',
}

/**
 * 连接事件
 */
export interface ConnectionEvent {
  /** 事件类型 */
  type: 'connected' | 'disconnected' | 'error' | 'blocked' | 'unblocked';

  /** 连接状态 */
  state: ConnectionState;

  /** 事件时间戳 */
  timestamp: number;

  /** 错误信息(如果有) */
  error?: Error;

  /** 附加元数据 */
  metadata?: Record<string, any>;
}

/**
 * 死信连接状态
 */
export interface DlqConnectionStatus {
  /** 连接目标描述（隐藏敏感信息） */
  target: string;

  /** 当前连接状态 */
  state: ConnectionState;

  /** 是否处于可用状态 */
  connected: boolean;

  /** 最近一次成功建立连接的时间戳 */
  lastConnectedAt?: number;

  /** 最近一次连接错误 */
  lastError?: {
    /** 错误信息 */
    message: string;

    /** 发生时间戳 */
    at: number;
  };
}
