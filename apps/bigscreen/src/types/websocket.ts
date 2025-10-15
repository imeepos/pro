/**
 * WebSocket 消息类型定义
 * 提供类型安全的 WebSocket 通信
 */

import { RealTimeData, StatisticsData, HotTopic, KeywordData, TimeSeriesData, LocationData, SentimentData } from './index';
import { createLogger } from '@/utils/logger';

// ================== 消息数据类型 ==================

/**
 * 更新消息数据类型
 */
export interface UpdateMessageData {
  type: 'realtime' | 'statistics' | 'hotTopics' | 'keywords' | 'timeSeries' | 'locations' | 'newPost';
  payload: unknown;
}

/**
 * 具体的更新数据类型
 */
export type UpdateDataPayload = 
  | { type: 'realtime'; payload: RealTimeData }
  | { type: 'statistics'; payload: StatisticsData }
  | { type: 'hotTopics'; payload: HotTopic[] }
  | { type: 'keywords'; payload: KeywordData[] }
  | { type: 'timeSeries'; payload: TimeSeriesData[] }
  | { type: 'locations'; payload: LocationData[] }
  | { type: 'newPost'; payload: SentimentData };

/**
 * 警告消息数据
 */
export interface AlertMessageData {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source?: string;
  data?: Record<string, unknown>;
}

/**
 * 心跳消息数据
 */
export interface HeartbeatMessageData {
  serverTime: string;
  connectionId: string;
}

/**
 * 连接状态消息数据
 */
export interface ConnectionStatusData {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  reason?: string;
  retryCount?: number;
  nextRetryIn?: number;
}

// ================== WebSocket 消息类型 ==================

/**
 * 严格类型的 WebSocket 消息定义
 */
export type WebSocketMessage = 
  | { type: 'update'; data: UpdateDataPayload; timestamp: string; }
  | { type: 'alert'; data: AlertMessageData; timestamp: string; }
  | { type: 'heartbeat'; data: HeartbeatMessageData; timestamp: string; }
  | { type: 'connection'; data: ConnectionStatusData; timestamp: string; };

/**
 * WebSocket 消息类型枚举
 */
export const WebSocketMessageType = {
  UPDATE: 'update',
  ALERT: 'alert',
  HEARTBEAT: 'heartbeat',
  CONNECTION: 'connection'
} as const;

export type WebSocketMessageType = typeof WebSocketMessageType[keyof typeof WebSocketMessageType];

// ================== 类型守卫函数 ==================

/**
 * 检查是否为有效的 WebSocket 消息
 */
export function isValidWebSocketMessage(obj: unknown): obj is WebSocketMessage {
  if (!obj || typeof obj !== 'object') return false;
  
  const msg = obj as Record<string, unknown>;
  
  return (
    typeof msg.type === 'string' &&
    ['update', 'alert', 'heartbeat', 'connection'].includes(msg.type) &&
    typeof msg.timestamp === 'string' &&
    typeof msg.data === 'object'
  );
}

/**
 * 检查是否为更新消息
 */
export function isUpdateMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'update' }> {
  return msg.type === 'update';
}

/**
 * 检查是否为警告消息
 */
export function isAlertMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'alert' }> {
  return msg.type === 'alert';
}

/**
 * 检查是否为心跳消息
 */
export function isHeartbeatMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'heartbeat' }> {
  return msg.type === 'heartbeat';
}

/**
 * 检查是否为连接状态消息
 */
export function isConnectionMessage(msg: WebSocketMessage): msg is Extract<WebSocketMessage, { type: 'connection' }> {
  return msg.type === 'connection';
}

/**
 * 检查更新消息的具体类型
 */
export function isRealtimeUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'realtime' }> {
  return data.type === 'realtime';
}

export function isStatisticsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'statistics' }> {
  return data.type === 'statistics';
}

export function isHotTopicsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'hotTopics' }> {
  return data.type === 'hotTopics';
}

export function isKeywordsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'keywords' }> {
  return data.type === 'keywords';
}

export function isTimeSeriesUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'timeSeries' }> {
  return data.type === 'timeSeries';
}

export function isLocationsUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'locations' }> {
  return data.type === 'locations';
}

export function isNewPostUpdate(data: UpdateDataPayload): data is Extract<UpdateDataPayload, { type: 'newPost' }> {
  return data.type === 'newPost';
}

// ================== 消息处理工具 ==================

/**
 * WebSocket 消息处理器接口
 */
export interface WebSocketMessageHandler {
  onUpdate?: (data: UpdateDataPayload) => void;
  onAlert?: (data: AlertMessageData) => void;
  onHeartbeat?: (data: HeartbeatMessageData) => void;
  onConnection?: (data: ConnectionStatusData) => void;
  onError?: (error: Error) => void;
}

const logger = createLogger('WebSocketMessageDispatcher');

/**
 * 消息分发器
 */
export class WebSocketMessageDispatcher {
  private handlers: WebSocketMessageHandler[] = [];

  /**
   * 添加消息处理器
   */
  addHandler(handler: WebSocketMessageHandler): void {
    this.handlers.push(handler);
  }

  /**
   * 移除消息处理器
   */
  removeHandler(handler: WebSocketMessageHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(message: unknown): void {
    try {
      if (!isValidWebSocketMessage(message)) {
        throw new Error('Invalid WebSocket message format');
      }

      this.handlers.forEach(handler => {
        try {
          if (isUpdateMessage(message) && handler.onUpdate) {
            handler.onUpdate(message.data);
          } else if (isAlertMessage(message) && handler.onAlert) {
            handler.onAlert(message.data);
          } else if (isHeartbeatMessage(message) && handler.onHeartbeat) {
            handler.onHeartbeat(message.data);
          } else if (isConnectionMessage(message) && handler.onConnection) {
            handler.onConnection(message.data);
          }
        } catch (error) {
          logger.error('Error in message handler:', error);
          if (handler.onError) {
            handler.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
      this.handlers.forEach(handler => {
        if (handler.onError) {
          handler.onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }
  }

  /**
   * 清除所有处理器
   */
  clearHandlers(): void {
    this.handlers = [];
  }
}

// ================== 消息构建工具 ==================

/**
 * 创建更新消息
 */
export function createUpdateMessage(data: UpdateDataPayload): Extract<WebSocketMessage, { type: 'update' }> {
  return {
    type: 'update',
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建警告消息
 */
export function createAlertMessage(data: AlertMessageData): Extract<WebSocketMessage, { type: 'alert' }> {
  return {
    type: 'alert',
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建心跳消息
 */
export function createHeartbeatMessage(data: HeartbeatMessageData): Extract<WebSocketMessage, { type: 'heartbeat' }> {
  return {
    type: 'heartbeat',
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建连接状态消息
 */
export function createConnectionMessage(data: ConnectionStatusData): Extract<WebSocketMessage, { type: 'connection' }> {
  return {
    type: 'connection',
    data,
    timestamp: new Date().toISOString()
  };
}

// ================== 消息验证器 ==================

/**
 * 验证更新消息数据
 */
export function validateUpdateData(data: unknown): data is UpdateDataPayload {
  if (!data || typeof data !== 'object') return false;
  
  const updateData = data as Record<string, unknown>;
  
  return (
    typeof updateData.type === 'string' &&
    ['realtime', 'statistics', 'hotTopics', 'keywords', 'timeSeries', 'locations', 'newPost'].includes(updateData.type) &&
    'payload' in updateData
  );
}

/**
 * 验证警告消息数据
 */
export function validateAlertData(data: unknown): data is AlertMessageData {
  if (!data || typeof data !== 'object') return false;
  
  const alertData = data as Record<string, unknown>;
  
  return (
    typeof alertData.level === 'string' &&
    ['info', 'warning', 'error', 'critical'].includes(alertData.level) &&
    typeof alertData.title === 'string' &&
    typeof alertData.message === 'string'
  );
}

/**
 * 验证心跳消息数据
 */
export function validateHeartbeatData(data: unknown): data is HeartbeatMessageData {
  if (!data || typeof data !== 'object') return false;
  
  const heartbeatData = data as Record<string, unknown>;
  
  return (
    typeof heartbeatData.serverTime === 'string' &&
    typeof heartbeatData.connectionId === 'string'
  );
}