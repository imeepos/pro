import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from './websocket';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

const mockIo = vi.fn().mockReturnValue(mockSocket);

vi.mock('socket.io-client', () => ({
  io: mockIo,
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock environment
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_ENABLE_MOCK: 'false',
    VITE_WS_URL: 'ws://localhost:8080',
  },
  writable: true,
});

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    wsManager = new WebSocketManager();
    mockSocket.connected = false;
  });

  afterEach(() => {
    wsManager.disconnect();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(wsManager).toBeDefined();
    });

    it('should handle mock mode configuration', () => {
      Object.defineProperty(import.meta, 'env', {
        value: { VITE_ENABLE_MOCK: 'true' },
        writable: true,
      });

      const mockWsManager = new WebSocketManager();
      expect(mockWsManager).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect successfully in normal mode', async () => {
      const connectPromise = wsManager.connect();

      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }

      await expect(connectPromise).resolves.toBeUndefined();
      expect(mockIo).toHaveBeenCalledWith('ws://localhost:8080', expect.any(Object));
    });

    it('should handle connection errors', async () => {
      const connectPromise = wsManager.connect();

      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
      if (errorHandler) {
        const mockError = new Error('Connection failed');
        errorHandler(mockError);
      }

      await expect(connectPromise).rejects.toThrow('Connection failed');
    });

    it('should skip connection in mock mode', async () => {
      Object.defineProperty(import.meta, 'env', {
        value: { VITE_ENABLE_MOCK: 'true' },
        writable: true,
      });

      const mockWsManager = new WebSocketManager();
      await expect(mockWsManager.connect()).resolves.toBeUndefined();
      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should handle disconnect events', async () => {
      const connectPromise = wsManager.connect();

      // Simulate successful connection first
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }

      await connectPromise;

      // Simulate disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      if (disconnectHandler) {
        disconnectHandler('io server disconnect');
      }

      // Should trigger reconnection logic
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should handle reconnect events', async () => {
      const connectPromise = wsManager.connect();

      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }

      await connectPromise;

      // Simulate reconnect
      const reconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'reconnect')?.[1];
      if (reconnectHandler) {
        reconnectHandler(1);
      }

      expect(mockSocket.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', () => {
      wsManager['socket'] = mockSocket as any;
      wsManager.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(wsManager['socket']).toBeNull();
    });

    it('should handle disconnect when no socket exists', () => {
      wsManager['socket'] = null;
      expect(() => wsManager.disconnect()).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send message when connected', () => {
      wsManager['socket'] = mockSocket as any;
      mockSocket.connected = true;

      wsManager.send('test-event', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should not send when disconnected', () => {
      wsManager['socket'] = mockSocket as any;
      mockSocket.connected = false;

      wsManager.send('test-event', { data: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle mock mode', () => {
      wsManager['isMockMode'] = true;

      wsManager.send('test-event', { data: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should add event listeners', () => {
      const callback = vi.fn();
      wsManager.on('test-event', callback);

      expect(wsManager['listeners'].has('test-event')).toBe(true);
      expect(wsManager['listeners'].get('test-event')).toContain(callback);
    });

    it('should remove specific event listener', () => {
      const callback = vi.fn();
      wsManager.on('test-event', callback);
      wsManager.off('test-event', callback);

      const listeners = wsManager['listeners'].get('test-event');
      expect(listeners).not.toContain(callback);
    });

    it('should remove all listeners for event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      wsManager.on('test-event', callback1);
      wsManager.on('test-event', callback2);

      wsManager.off('test-event');

      expect(wsManager['listeners'].has('test-event')).toBe(false);
    });

    it('should emit events to listeners', () => {
      const callback = vi.fn();
      wsManager.on('test-event', callback);

      wsManager['emit']('test-event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle listener errors', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      wsManager.on('test-event', errorCallback);

      // Should not throw
      expect(() => wsManager['emit']('test-event', {})).not.toThrow();
    });
  });

  describe('connection status', () => {
    it('should return correct connection status', () => {
      wsManager['socket'] = mockSocket as any;
      mockSocket.connected = true;

      expect(wsManager.isConnected).toBe(true);

      mockSocket.connected = false;
      expect(wsManager.isConnected).toBe(false);
    });

    it('should return true in mock mode', () => {
      wsManager['isMockMode'] = true;
      expect(wsManager.isConnected).toBe(true);
    });

    it('should return false when no socket', () => {
      wsManager['socket'] = null;
      expect(wsManager.isConnected).toBe(false);
    });
  });

  describe('reconnection configuration', () => {
    it('should get reconnect count', () => {
      wsManager['reconnectAttempts'] = 5;
      expect(wsManager.reconnectCount).toBe(5);
    });

    it('should set max reconnect attempts', () => {
      wsManager.setMaxReconnectAttempts(10);
      expect(wsManager['maxReconnectAttempts']).toBe(10);
    });

    it('should set reconnect delay', () => {
      wsManager.setReconnectDelay(2000);
      expect(wsManager['reconnectDelay']).toBe(2000);
    });
  });

  describe('data event handling', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect();

      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) {
        connectHandler();
      }

      await connectPromise;
    });

    it('should handle data:update events', () => {
      const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'data:update')?.[1];
      const mockData = { type: 'update', data: {} };

      if (updateHandler) {
        updateHandler(mockData);
      }

      expect(mockSocket.on).toHaveBeenCalledWith('data:update', expect.any(Function));
    });

    it('should handle data:alert events', () => {
      const alertHandler = mockSocket.on.mock.calls.find(call => call[0] === 'data:alert')?.[1];
      const mockData = { type: 'alert', data: {} };

      if (alertHandler) {
        alertHandler(mockData);
      }

      expect(mockSocket.on).toHaveBeenCalledWith('data:alert', expect.any(Function));
    });

    it('should handle data:heartbeat events', () => {
      const heartbeatHandler = mockSocket.on.mock.calls.find(call => call[0] === 'data:heartbeat')?.[1];
      const mockData = { type: 'heartbeat', data: {} };

      if (heartbeatHandler) {
        heartbeatHandler(mockData);
      }

      expect(mockSocket.on).toHaveBeenCalledWith('data:heartbeat', expect.any(Function));
    });
  });
});