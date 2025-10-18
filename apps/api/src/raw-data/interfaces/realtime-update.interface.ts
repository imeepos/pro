/**
 * 实时数据更新接口定义
 * 定义WebSocket通信的数据结构和事件类型
 */

import { ProcessingStatus, SourceType } from '@pro/types';

/**
 * WebSocket事件类型枚举
 * 每个事件都有其特定的用途和数据结构
 */
export enum RealtimeEventType {
  // 数据统计更新
  STATISTICS_UPDATED = 'statistics:updated',

  // 新数据推送
  DATA_CREATED = 'data:created',

  // 数据状态变化
  DATA_STATUS_CHANGED = 'data:status:changed',

  // 数据批量更新
  DATA_BATCH_UPDATED = 'data:batch:updated',

  // 连接状态变化
  CONNECTION_STATUS = 'connection:status',

  // 错误通知
  ERROR_OCCURRED = 'error:occurred',

  // 系统状态变化
  SYSTEM_STATUS_CHANGED = 'system:status:changed'
}

/**
 * 实时数据基础接口
 * 所有实时事件数据的基础结构
 */
export interface BaseRealtimeEvent {
  /** 事件唯一标识符 */
  eventId: string;

  /** 事件类型 */
  type: RealtimeEventType;

  /** 事件发生时间戳 */
  timestamp: Date;

  /** 事件数据载荷 */
  payload: any;

  /** 可选的元数据信息 */
  metadata?: Record<string, any>;
}

/**
 * 数据统计更新事件载荷
 * 当统计数据发生变化时推送
 */
export interface StatisticsUpdatedPayload {
  /** 待处理数据量 */
  pending: number;

  /** 处理中数据量 */
  processing: number;

  /** 已完成数据量 */
  completed: number;

  /** 失败数据量 */
  failed: number;

  /** 总数据量 */
  total: number;

  /** 成功率 */
  successRate: number;

  /** 变化量统计 */
  changes?: {
    pending?: number;
    processing?: number;
    completed?: number;
    failed?: number;
    total?: number;
  };
}

/**
 * 新数据创建事件载荷
 * 当有新的原始数据被添加时推送
 */
export interface DataCreatedPayload {
  /** 数据ID */
  id: string;

  /** 数据源类型 */
  sourceType: SourceType;

  /** 源链接 */
  sourceUrl: string;

  /** 内容预览 */
  contentPreview: string;

  /** 当前状态 */
  status: ProcessingStatus;

  /** 创建时间 */
  createdAt: Date;

  /** 可选的处理时间 */
  processedAt?: Date;
}

/**
 * 数据状态变化事件载荷
 * 当数据处理状态发生变化时推送
 */
export interface DataStatusChangedPayload {
  /** 数据ID */
  id: string;

  /** 之前的状态 */
  previousStatus: ProcessingStatus;

  /** 当前状态 */
  currentStatus: ProcessingStatus;

  /** 状态变化时间 */
  changedAt: Date;

  /** 可选的错误信息 */
  errorMessage?: string;

  /** 处理耗时（毫秒） */
  processingDuration?: number;
}

/**
 * 批量数据更新事件载荷
 * 当多个数据同时更新时推送，避免频繁的单个更新
 */
export interface DataBatchUpdatedPayload {
  /** 更新的数据ID列表 */
  dataIds: string[];

  /** 更新类型 */
  updateType: 'status_change' | 'bulk_creation' | 'bulk_deletion';

  /** 统计信息 */
  statistics: {
    /** 总数 */
    total: number;

    /** 按状态分组的统计 */
    byStatus: Record<ProcessingStatus, number>;

    /** 按数据源类型分组的统计 */
    bySourceType: Record<SourceType, number>;
  };

  /** 更新时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * 连接状态载荷
 * 用于通知客户端连接状态变化
 */
export interface ConnectionStatusPayload {
  /** 连接状态 */
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';

  /** 状态描述 */
  message: string;

  /** 连接ID */
  clientId: string;

  /** 连接建立时间 */
  connectedAt?: Date;

  /** 错误信息（如果状态为error） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 系统状态变化载荷
 * 当系统整体状态发生变化时推送
 */
export interface SystemStatusChangedPayload {
  /** 系统状态 */
  systemStatus: 'healthy' | 'warning' | 'critical';

  /** 状态描述 */
  description: string;

  /** 触发状态变化的因素 */
  triggers: string[];

  /** 建议的操作 */
  recommendations?: string[];

  /** 状态持续时间（预估） */
  estimatedDuration?: number;
}

/**
 * 错误事件载荷
 * 当系统发生需要通知客户端的错误时推送
 */
export interface ErrorOccurredPayload {
  /** 错误代码 */
  code: string;

  /** 错误消息 */
  message: string;

  /** 错误严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** 错误发生时间 */
  occurredAt: Date;

  /** 相关的数据ID（可选） */
  relatedDataId?: string;

  /** 错误详情（可选） */
  details?: Record<string, any>;

  /** 建议的解决方案 */
  solution?: string;
}

/**
 * WebSocket消息结构
 * 客户端和服务器之间通信的统一消息格式
 */
export interface WebSocketMessage<T = any> {
  /** 消息类型 */
  type: RealtimeEventType;

  /** 消息数据 */
  data: T;

  /** 消息时间戳 */
  timestamp: Date;

  /** 消息ID，用于去重和追踪 */
  messageId: string;

  /** 可选的元数据 */
  metadata?: Record<string, any>;
}

/**
 * 客户端订阅选项
 * 定义客户端可以订阅的事件类型和过滤条件
 */
export interface SubscriptionOptions {
  /** 订阅的事件类型列表 */
  eventTypes: RealtimeEventType[];

  /** 数据源类型过滤 */
  sourceTypes?: SourceType[];

  /** 状态过滤 */
  statuses?: ProcessingStatus[];

  /** 更新频率限制（毫秒） */
  throttleMs?: number;

  /** 批量更新大小 */
  batchSize?: number;
}

/**
 * 连接认证信息
 * WebSocket连接时的认证数据
 */
export interface ConnectionAuth {
  /** JWT令牌 */
  token: string;

  /** 客户端标识 */
  clientId?: string;

  /** 连接用途 */
  purpose?: 'monitoring' | 'realtime_updates' | 'debug';

  /** 订阅选项 */
  subscription?: SubscriptionOptions;
}

/**
 * 实时更新事件工厂
 * 用于创建各种类型的实时事件
 */
export class RealtimeEventFactory {
  /**
   * 创建统计更新事件
   */
  static createStatisticsUpdatedEvent(
    payload: StatisticsUpdatedPayload,
    metadata?: Record<string, any>
  ): BaseRealtimeEvent {
    return {
      eventId: this.generateEventId(),
      type: RealtimeEventType.STATISTICS_UPDATED,
      timestamp: new Date(),
      payload,
      metadata
    };
  }

  /**
   * 创建数据创建事件
   */
  static createDataCreatedEvent(
    payload: DataCreatedPayload,
    metadata?: Record<string, any>
  ): BaseRealtimeEvent {
    return {
      eventId: this.generateEventId(),
      type: RealtimeEventType.DATA_CREATED,
      timestamp: new Date(),
      payload,
      metadata
    };
  }

  /**
   * 创建数据状态变化事件
   */
  static createDataStatusChangedEvent(
    payload: DataStatusChangedPayload,
    metadata?: Record<string, any>
  ): BaseRealtimeEvent {
    return {
      eventId: this.generateEventId(),
      type: RealtimeEventType.DATA_STATUS_CHANGED,
      timestamp: new Date(),
      payload,
      metadata
    };
  }

  /**
   * 创建批量数据更新事件
   */
  static createDataBatchUpdatedEvent(
    payload: DataBatchUpdatedPayload,
    metadata?: Record<string, any>
  ): BaseRealtimeEvent {
    return {
      eventId: this.generateEventId(),
      type: RealtimeEventType.DATA_BATCH_UPDATED,
      timestamp: new Date(),
      payload,
      metadata
    };
  }

  /**
   * 创建错误事件
   */
  static createErrorEvent(
    payload: ErrorOccurredPayload,
    metadata?: Record<string, any>
  ): BaseRealtimeEvent {
    return {
      eventId: this.generateEventId(),
      type: RealtimeEventType.ERROR_OCCURRED,
      timestamp: new Date(),
      payload,
      metadata
    };
  }

  /**
   * 生成唯一事件ID
   */
  private static generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}