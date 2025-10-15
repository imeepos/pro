import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { createLogger } from '@/utils/logger';
import { wsManager } from '@/utils/websocket';
import { RealTimeData } from '@/types';
import { 
  isValidWebSocketMessage,
  isUpdateMessage,
  isAlertMessage,
  isHeartbeatMessage,
  isConnectionMessage,
  isRealtimeUpdate,
  isStatisticsUpdate,
  isHotTopicsUpdate,
  isKeywordsUpdate,
  isTimeSeriesUpdate,
  isLocationsUpdate,
  isNewPostUpdate
} from '@/types/websocket';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnClose?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

const logger = createLogger('useWebSocket');

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    autoConnect = true,
    reconnectOnClose = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const {
    setConnectionStatus,
    setRealTimeData,
    updateStatistics,
    updateHotTopics,
    updateKeywords,
    updateTimeSeries,
    updateLocations,
    addRecentPost,
    setError,
    incrementRetries,
    resetRetries,
  } = useAppStore();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  // 连接 WebSocket
  const connect = useCallback(async () => {
    try {
      await wsManager.connect();
      setConnectionStatus(true);
      resetRetries();
      reconnectAttemptsRef.current = 0;
      setError(null);
    } catch (error) {
      logger.error('WebSocket connection failed:', error);
      setConnectionStatus(false);
      setError({
        code: 'WEBSOCKET_CONNECTION_FAILED',
        message: 'WebSocket 连接失败',
        details: error instanceof Error ? { message: error.message } : { error: String(error) },
      });
    }
  }, [setConnectionStatus, resetRetries, setError]);

  // 断开连接
  const disconnect = useCallback(() => {
    wsManager.disconnect();
    setConnectionStatus(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [setConnectionStatus]);

  // 重连逻辑
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      setError({
        code: 'WEBSOCKET_MAX_RECONNECT_ATTEMPTS',
        message: '达到最大重连次数',
      });
      return;
    }

    reconnectAttemptsRef.current++;
    incrementRetries();

    // Attempting reconnection

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, reconnectDelay * reconnectAttemptsRef.current);
  }, [maxReconnectAttempts, reconnectDelay, connect, incrementRetries, setError]);

  // 发送消息
  const sendMessage = useCallback((event: string, data: unknown) => {
    wsManager.send(event, data);
  }, []);

  // 设置事件监听器
  useEffect(() => {
    // 连接状态监听
    const handleConnected = (...args: unknown[]) => {
      const connected = args[0] as boolean;
      setConnectionStatus(connected);
      if (!connected && reconnectOnClose) {
        attemptReconnect();
      }
    };

    // 数据更新监听 - 使用类型安全的处理方式
    const handleDataUpdate = (...args: unknown[]) => {
      const message = args[0];
      try {
        // 验证消息格式
        if (!isValidWebSocketMessage(message)) {
          logger.warn('Invalid WebSocket message format:', message);
          return;
        }

        if (isUpdateMessage(message)) {
          // 处理更新消息
          const updateData = message.data;
          
          if (isRealtimeUpdate(updateData)) {
            setRealTimeData(updateData.payload as RealTimeData);
          } else if (isStatisticsUpdate(updateData)) {
            updateStatistics(updateData.payload);
          } else if (isHotTopicsUpdate(updateData)) {
            updateHotTopics(updateData.payload);
          } else if (isKeywordsUpdate(updateData)) {
            updateKeywords(updateData.payload);
          } else if (isTimeSeriesUpdate(updateData)) {
            updateTimeSeries(updateData.payload);
          } else if (isLocationsUpdate(updateData)) {
            updateLocations(updateData.payload);
          } else if (isNewPostUpdate(updateData)) {
            addRecentPost(updateData.payload);
          }
        } else if (isAlertMessage(message)) {
          // 处理警告消息
          logger.warn('WebSocket Alert:', message.data);
          // 可以在这里添加通知显示逻辑
        } else if (isHeartbeatMessage(message)) {
          // 处理心跳消息
          logger.debug('WebSocket Heartbeat:', message.data);
        } else if (isConnectionMessage(message)) {
          // 处理连接状态消息
          logger.info('WebSocket Connection Status:', message.data);
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
        setError({
          code: 'WEBSOCKET_MESSAGE_PROCESSING_ERROR',
          message: '处理 WebSocket 消息时出错',
          details: error instanceof Error ? { message: error.message } : { error: String(error) },
        });
      }
    };

    // 错误处理
    const handleError = (...args: unknown[]) => {
      const error = args[0] as Event | Error;
      logger.error('WebSocket error:', error);
      setError({
        code: 'WEBSOCKET_ERROR',
        message: 'WebSocket 连接错误',
        details: error instanceof Error ? { message: error.message } : { error: 'WebSocket error' },
      });
    };

    // 重连成功
    const handleReconnected = () => {
      // Reconnected successfully
      resetRetries();
      reconnectAttemptsRef.current = 0;
      setError(null);
    };

    // 注册事件监听器
    wsManager.on('connected', handleConnected);
    wsManager.on('dataUpdate', handleDataUpdate);
    wsManager.on('alert', handleDataUpdate);
    wsManager.on('heartbeat', handleDataUpdate);
    wsManager.on('error', handleError);
    wsManager.on('reconnected', handleReconnected);

    // 自动连接
    if (autoConnect) {
      connect();
    }

    // 清理函数
    return () => {
      wsManager.off('connected', handleConnected);
      wsManager.off('dataUpdate', handleDataUpdate);
      wsManager.off('alert', handleDataUpdate);
      wsManager.off('heartbeat', handleDataUpdate);
      wsManager.off('error', handleError);
      wsManager.off('reconnected', handleReconnected);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [
    autoConnect,
    reconnectOnClose,
    connect,
    attemptReconnect,
    setConnectionStatus,
    setRealTimeData,
    updateStatistics,
    updateHotTopics,
    updateKeywords,
    updateTimeSeries,
    updateLocations,
    addRecentPost,
    setError,
    resetRetries,
  ]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected: wsManager.isConnected,
    reconnectCount: wsManager.reconnectCount,
  };
};
