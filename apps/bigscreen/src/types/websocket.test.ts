import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  isNewPostUpdate,
  validateUpdateData,
  validateAlertData,
  validateHeartbeatData,
  WebSocketMessageDispatcher,
  createUpdateMessage,
  createAlertMessage,
  createHeartbeatMessage,
  createConnectionMessage
} from './websocket';

describe('WebSocket Type Guards', () => {
  describe('isValidWebSocketMessage', () => {
    it('should validate correct WebSocket message format', () => {
      const validMessage = {
        type: 'update',
        data: { type: 'realtime', payload: {} },
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      expect(isValidWebSocketMessage(validMessage)).toBe(true);
    });

    it('should reject invalid message formats', () => {
      expect(isValidWebSocketMessage(null)).toBe(false);
      expect(isValidWebSocketMessage(undefined)).toBe(false);
      expect(isValidWebSocketMessage('string')).toBe(false);
      expect(isValidWebSocketMessage({})).toBe(false);
      expect(isValidWebSocketMessage({ type: 'invalid' })).toBe(false);
    });

    it('should validate all supported message types', () => {
      const messageTypes = ['update', 'alert', 'heartbeat', 'connection'];
      
      messageTypes.forEach(type => {
        const message = {
          type,
          data: {},
          timestamp: '2024-01-01T00:00:00.000Z'
        };
        expect(isValidWebSocketMessage(message)).toBe(true);
      });
    });
  });

  describe('Message type guards', () => {
    const createMessage = (type: string, data: any = {}) => ({
      type,
      data,
      timestamp: '2024-01-01T00:00:00.000Z'
    });

    it('should identify update messages', () => {
      const updateMessage = createMessage('update', { type: 'realtime', payload: {} });
      expect(isUpdateMessage(updateMessage as any)).toBe(true);
      expect(isAlertMessage(updateMessage as any)).toBe(false);
    });

    it('should identify alert messages', () => {
      const alertMessage = createMessage('alert', { level: 'info', title: 'Test', message: 'Test' });
      expect(isAlertMessage(alertMessage as any)).toBe(true);
      expect(isUpdateMessage(alertMessage as any)).toBe(false);
    });

    it('should identify heartbeat messages', () => {
      const heartbeatMessage = createMessage('heartbeat', { serverTime: '2024-01-01T00:00:00.000Z', connectionId: 'test' });
      expect(isHeartbeatMessage(heartbeatMessage as any)).toBe(true);
      expect(isUpdateMessage(heartbeatMessage as any)).toBe(false);
    });

    it('should identify connection messages', () => {
      const connectionMessage = createMessage('connection', { status: 'connected' });
      expect(isConnectionMessage(connectionMessage as any)).toBe(true);
      expect(isUpdateMessage(connectionMessage as any)).toBe(false);
    });
  });

  describe('Update data type guards', () => {
    const createUpdateData = (type: string, payload: any = {}) => ({ type, payload });

    it('should identify realtime updates', () => {
      const realtimeUpdate = createUpdateData('realtime', {});
      expect(isRealtimeUpdate(realtimeUpdate as any)).toBe(true);
      expect(isStatisticsUpdate(realtimeUpdate as any)).toBe(false);
    });

    it('should identify statistics updates', () => {
      const statisticsUpdate = createUpdateData('statistics', {});
      expect(isStatisticsUpdate(statisticsUpdate as any)).toBe(true);
      expect(isRealtimeUpdate(statisticsUpdate as any)).toBe(false);
    });

    it('should identify hot topics updates', () => {
      const hotTopicsUpdate = createUpdateData('hotTopics', []);
      expect(isHotTopicsUpdate(hotTopicsUpdate as any)).toBe(true);
      expect(isRealtimeUpdate(hotTopicsUpdate as any)).toBe(false);
    });

    it('should identify keywords updates', () => {
      const keywordsUpdate = createUpdateData('keywords', []);
      expect(isKeywordsUpdate(keywordsUpdate as any)).toBe(true);
      expect(isRealtimeUpdate(keywordsUpdate as any)).toBe(false);
    });

    it('should identify time series updates', () => {
      const timeSeriesUpdate = createUpdateData('timeSeries', []);
      expect(isTimeSeriesUpdate(timeSeriesUpdate as any)).toBe(true);
      expect(isRealtimeUpdate(timeSeriesUpdate as any)).toBe(false);
    });

    it('should identify locations updates', () => {
      const locationsUpdate = createUpdateData('locations', []);
      expect(isLocationsUpdate(locationsUpdate as any)).toBe(true);
      expect(isRealtimeUpdate(locationsUpdate as any)).toBe(false);
    });

    it('should identify new post updates', () => {
      const newPostUpdate = createUpdateData('newPost', {});
      expect(isNewPostUpdate(newPostUpdate as any)).toBe(true);
      expect(isRealtimeUpdate(newPostUpdate as any)).toBe(false);
    });
  });
});

describe('Data Validators', () => {
  describe('validateUpdateData', () => {
    it('should validate correct update data', () => {
      const validData = { type: 'realtime', payload: {} };
      expect(validateUpdateData(validData)).toBe(true);
    });

    it('should validate all update types', () => {
      const updateTypes = ['realtime', 'statistics', 'hotTopics', 'keywords', 'timeSeries', 'locations', 'newPost'];
      
      updateTypes.forEach(type => {
        const data = { type, payload: {} };
        expect(validateUpdateData(data)).toBe(true);
      });
    });

    it('should reject invalid update data', () => {
      expect(validateUpdateData(null)).toBe(false);
      expect(validateUpdateData({})).toBe(false);
      expect(validateUpdateData({ type: 'invalid' })).toBe(false);
      expect(validateUpdateData({ payload: {} })).toBe(false);
    });
  });

  describe('validateAlertData', () => {
    it('should validate correct alert data', () => {
      const validData = { level: 'info', title: 'Test', message: 'Test message' };
      expect(validateAlertData(validData)).toBe(true);
    });

    it('should validate all alert levels', () => {
      const alertLevels = ['info', 'warning', 'error', 'critical'];
      
      alertLevels.forEach(level => {
        const data = { level, title: 'Test', message: 'Test message' };
        expect(validateAlertData(data)).toBe(true);
      });
    });

    it('should reject invalid alert data', () => {
      expect(validateAlertData(null)).toBe(false);
      expect(validateAlertData({})).toBe(false);
      expect(validateAlertData({ level: 'invalid' })).toBe(false);
      expect(validateAlertData({ level: 'info' })).toBe(false);
    });
  });

  describe('validateHeartbeatData', () => {
    it('should validate correct heartbeat data', () => {
      const validData = { serverTime: '2024-01-01T00:00:00.000Z', connectionId: 'test-123' };
      expect(validateHeartbeatData(validData)).toBe(true);
    });

    it('should reject invalid heartbeat data', () => {
      expect(validateHeartbeatData(null)).toBe(false);
      expect(validateHeartbeatData({})).toBe(false);
      expect(validateHeartbeatData({ serverTime: '2024-01-01T00:00:00.000Z' })).toBe(false);
      expect(validateHeartbeatData({ connectionId: 'test-123' })).toBe(false);
    });
  });
});

describe('WebSocketMessageDispatcher', () => {
  let dispatcher: WebSocketMessageDispatcher;
  let mockHandler: any;

  beforeEach(() => {
    dispatcher = new WebSocketMessageDispatcher();
    mockHandler = {
      onUpdate: vi.fn(),
      onAlert: vi.fn(),
      onHeartbeat: vi.fn(),
      onConnection: vi.fn(),
      onError: vi.fn(),
    };
  });

  it('should add and remove handlers', () => {
    dispatcher.addHandler(mockHandler);
    expect(dispatcher['handlers']).toContain(mockHandler);

    dispatcher.removeHandler(mockHandler);
    expect(dispatcher['handlers']).not.toContain(mockHandler);
  });

  it('should handle update messages', () => {
    dispatcher.addHandler(mockHandler);
    
    const updateMessage = {
      type: 'update',
      data: { type: 'realtime', payload: {} },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    dispatcher.handleMessage(updateMessage);
    expect(mockHandler.onUpdate).toHaveBeenCalledWith(updateMessage.data);
  });

  it('should handle alert messages', () => {
    dispatcher.addHandler(mockHandler);
    
    const alertMessage = {
      type: 'alert',
      data: { level: 'info', title: 'Test', message: 'Test message' },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    dispatcher.handleMessage(alertMessage);
    expect(mockHandler.onAlert).toHaveBeenCalledWith(alertMessage.data);
  });

  it('should handle heartbeat messages', () => {
    dispatcher.addHandler(mockHandler);
    
    const heartbeatMessage = {
      type: 'heartbeat',
      data: { serverTime: '2024-01-01T00:00:00.000Z', connectionId: 'test' },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    dispatcher.handleMessage(heartbeatMessage);
    expect(mockHandler.onHeartbeat).toHaveBeenCalledWith(heartbeatMessage.data);
  });

  it('should handle connection messages', () => {
    dispatcher.addHandler(mockHandler);
    
    const connectionMessage = {
      type: 'connection',
      data: { status: 'connected' },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    dispatcher.handleMessage(connectionMessage);
    expect(mockHandler.onConnection).toHaveBeenCalledWith(connectionMessage.data);
  });

  it('should handle invalid messages', () => {
    dispatcher.addHandler(mockHandler);
    
    dispatcher.handleMessage({ invalid: 'message' });
    expect(mockHandler.onError).toHaveBeenCalled();
  });

  it('should handle handler errors', () => {
    const errorHandler = {
      onUpdate: vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      }),
      onError: vi.fn(),
    };

    dispatcher.addHandler(errorHandler);
    
    const updateMessage = {
      type: 'update',
      data: { type: 'realtime', payload: {} },
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    dispatcher.handleMessage(updateMessage);
    expect(errorHandler.onError).toHaveBeenCalled();
  });

  it('should clear all handlers', () => {
    dispatcher.addHandler(mockHandler);
    dispatcher.clearHandlers();
    expect(dispatcher['handlers']).toHaveLength(0);
  });
});

describe('Message Builders', () => {
  it('should create update messages', () => {
    const data = { type: 'realtime', payload: {} } as any;
    const message = createUpdateMessage(data);
    
    expect(message.type).toBe('update');
    expect(message.data).toEqual(data);
    expect(message.timestamp).toBeDefined();
  });

  it('should create alert messages', () => {
    const data = { level: 'info', title: 'Test', message: 'Test message' } as any;
    const message = createAlertMessage(data);
    
    expect(message.type).toBe('alert');
    expect(message.data).toEqual(data);
    expect(message.timestamp).toBeDefined();
  });

  it('should create heartbeat messages', () => {
    const data = { serverTime: '2024-01-01T00:00:00.000Z', connectionId: 'test' };
    const message = createHeartbeatMessage(data);
    
    expect(message.type).toBe('heartbeat');
    expect(message.data).toEqual(data);
    expect(message.timestamp).toBeDefined();
  });

  it('should create connection messages', () => {
    const data = { status: 'connected' } as any;
    const message = createConnectionMessage(data);
    
    expect(message.type).toBe('connection');
    expect(message.data).toEqual(data);
    expect(message.timestamp).toBeDefined();
  });
});