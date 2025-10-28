import * as amqp from 'amqplib';
import type {
  RabbitMQConfig,
  ConnectionPoolConfig,
  ConnectionEvent,
} from './types.js';
import { ConnectionState } from './types.js';

/**
 * 连接池管理器
 *
 * 优雅的连接生命周期管理:
 * - 连接复用,减少开销
 * - 自动重连,提升可靠性
 * - 健康检查,及时发现问题
 * - 事件通知,便于监控
 */
export class ConnectionPool {
  private connection: any = null;
  private channel: any = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ((event: ConnectionEvent) => void)[]> =
    new Map();
  private reconnectAttempts: number = 0;
  private reconnectStartedAt: number = 0;

  constructor(
    private readonly config: RabbitMQConfig,
    private readonly poolConfig?: ConnectionPoolConfig,
  ) {}

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.heartbeat ?? 30,
      });

      this.setupConnectionHandlers();

      this.channel = await this.connection.createConfirmChannel();
      this.setupChannelHandlers();

      this.setState(ConnectionState.CONNECTED);
      this.startHealthCheck();

      const wasReconnecting = this.reconnectAttempts > 0;
      const reconnectDuration = wasReconnecting
        ? Date.now() - this.reconnectStartedAt
        : 0;

      this.emitEvent({
        type: 'connected',
        state: this.state,
        timestamp: Date.now(),
        metadata: wasReconnecting
          ? {
              reconnectAttempts: this.reconnectAttempts,
              reconnectDurationMs: reconnectDuration,
            }
          : undefined,
      });

      this.reconnectAttempts = 0;
      this.reconnectStartedAt = 0;
    } catch (error) {
      // 清理部分建立的连接
      await this.cleanup();

      this.setState(ConnectionState.ERROR);
      this.emitEvent({
        type: 'error',
        state: this.state,
        timestamp: Date.now(),
        error: error as Error,
      });

      this.scheduleReconnect();
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close().catch(() => {});
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close().catch(() => {});
        this.connection = null;
      }
    } catch {
      // 忽略清理错误
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on('error', (error: Error) => {
      this.emitEvent({
        type: 'error',
        state: this.state,
        timestamp: Date.now(),
        error,
      });
      this.scheduleReconnect();
    });

    this.connection.on('close', () => {
      this.setState(ConnectionState.DISCONNECTED);
      this.emitEvent({
        type: 'disconnected',
        state: this.state,
        timestamp: Date.now(),
      });
      this.scheduleReconnect();
    });

    this.connection.on('blocked', (reason: string) => {
      this.emitEvent({
        type: 'blocked',
        state: this.state,
        timestamp: Date.now(),
        metadata: { reason },
      });
    });

    this.connection.on('unblocked', () => {
      this.emitEvent({
        type: 'unblocked',
        state: this.state,
        timestamp: Date.now(),
      });
    });
  }

  private setupChannelHandlers(): void {
    if (!this.channel) return;

    this.channel.on('error', (error: Error) => {
      this.emitEvent({
        type: 'error',
        state: this.state,
        timestamp: Date.now(),
        error,
      });
    });

    this.channel.on('close', () => {
      this.channel = null;
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.setState(ConnectionState.RECONNECTING);

    if (this.reconnectAttempts === 0) {
      this.reconnectStartedAt = Date.now();
    }
    this.reconnectAttempts++;

    const reconnectDelay = 5000;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        // 错误已在 connect() 中处理
      }
    }, reconnectDelay);
  }

  private startHealthCheck(): void {
    if (!this.poolConfig?.healthCheckInterval) {
      return;
    }

    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.poolConfig.healthCheckInterval);
  }

  private checkHealth(): void {
    if (!this.connection || !this.channel) {
      this.scheduleReconnect();
    }
  }

  private setState(state: ConnectionState): void {
    this.state = state;
  }

  private emitEvent(event: ConnectionEvent): void {
    const listeners = this.eventListeners.get(event.type) ?? [];
    listeners.forEach((listener) => listener(event));
  }

  on(
    eventType: ConnectionEvent['type'],
    listener: (event: ConnectionEvent) => void,
  ): void {
    const listeners = this.eventListeners.get(eventType) ?? [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  off(
    eventType: ConnectionEvent['type'],
    listener: (event: ConnectionEvent) => void,
  ): void {
    const listeners = this.eventListeners.get(eventType) ?? [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  getChannel(): any {
    if (!this.channel) {
      throw new Error('Channel not available. Connection not established.');
    }
    return this.channel;
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && !!this.channel;
  }

  async close(): Promise<void> {
    this.setState(ConnectionState.CLOSING);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.reconnectAttempts = 0;
    this.reconnectStartedAt = 0;

    this.eventListeners.clear();

    try {
      if (this.connection) {
        this.connection.removeAllListeners();
      }

      if (this.channel) {
        this.channel.removeAllListeners();
      }

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.setState(ConnectionState.CLOSED);
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      throw error;
    }
  }
}
