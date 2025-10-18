import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { WebSocketConfig, WebSocketInstance, ConnectionState } from './websocket.types';
import { WebSocketService } from './websocket.service';

/**
 * 连接池配置接口
 */
export interface ConnectionPoolConfig {
  readonly maxConnections: number;
  readonly connectionTimeout: number;
  readonly idleTimeout: number;
  readonly healthCheckInterval: number;
}

/**
 * 连接实例信息
 */
interface PooledConnection {
  readonly id: string;
  readonly config: WebSocketConfig;
  readonly instance: WebSocketInstance;
  readonly createdAt: Date;
  readonly lastUsedAt: BehaviorSubject<Date>;
  readonly isActive: BehaviorSubject<boolean>;
  healthCheckTimer?: number;
}

/**
 * 连接池事件类型
 */
export type PoolEventType = 'connection:created' | 'connection:destroyed' | 'connection:acquired' | 'connection:released' | 'pool:full' | 'health:check';

/**
 * 连接池事件接口
 */
export interface PoolEvent {
  type: PoolEventType;
  data: any;
  timestamp: Date;
}

/**
 * WebSocket连接池管理器
 * 提供连接复用、资源管理和健康检查功能
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketConnectionPool implements OnDestroy {
  private readonly connections = new Map<string, PooledConnection>();
  private readonly poolEvents$ = new Subject<PoolEvent>();
  private readonly poolStats$ = new BehaviorSubject<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  }>({
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0
  });

  private healthCheckTimer?: number;
  private readonly defaultConfig: ConnectionPoolConfig = {
    maxConnections: 5,
    connectionTimeout: 30000, // 30秒连接超时
    idleTimeout: 300000, // 5分钟空闲超时
    healthCheckInterval: 60000 // 1分钟健康检查间隔
  };

  private config: ConnectionPoolConfig;

  constructor() {
    this.config = { ...this.defaultConfig };
    this.startHealthCheck();
  }

  /**
   * 配置连接池参数
   */
  configure(config: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...config };

    // 重启健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.startHealthCheck();

    console.log('[WebSocketConnectionPool] Configuration updated:', this.config);
  }

  /**
   * 获取连接池事件流
   */
  get events$(): Observable<PoolEvent> {
    return this.poolEvents$.asObservable();
  }

  /**
   * 获取连接池统计信息流
   */
  get stats$(): Observable<{ totalConnections: number; activeConnections: number; idleConnections: number }> {
    return this.poolStats$.asObservable();
  }

  /**
   * 获取或创建连接
   */
  async acquireConnection(config: WebSocketConfig): Promise<WebSocketInstance> {
    const connectionId = this.generateConnectionId(config);
    let connection = this.connections.get(connectionId);

    if (!connection) {
      // 检查连接池是否已满
      if (this.connections.size >= this.config.maxConnections) {
        console.warn('[WebSocketConnectionPool] Connection pool is full, attempting to cleanup idle connections');
        await this.cleanupIdleConnections();

        if (this.connections.size >= this.config.maxConnections) {
          this.poolEvents$.next({
            type: 'pool:full',
            data: { maxConnections: this.config.maxConnections },
            timestamp: new Date()
          });
          throw new Error('WebSocket connection pool is full');
        }
      }

      // 创建新连接
      connection = await this.createConnection(connectionId, config);
    }

    // 标记连接为活跃状态
    connection.isActive.next(true);
    connection.lastUsedAt.next(new Date());

    this.poolEvents$.next({
      type: 'connection:acquired',
      data: { connectionId, config },
      timestamp: new Date()
    });

    this.updatePoolStats();

    console.log(`[WebSocketConnectionPool] Connection acquired: ${connectionId}`);
    return connection.instance;
  }

  /**
   * 释放连接
   */
  releaseConnection(instance: WebSocketInstance): void {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.instance === instance) {
        connection.isActive.next(false);
        connection.lastUsedAt.next(new Date());

        this.poolEvents$.next({
          type: 'connection:released',
          data: { connectionId },
          timestamp: new Date()
        });

        this.updatePoolStats();
        console.log(`[WebSocketConnectionPool] Connection released: ${connectionId}`);
        break;
      }
    }
  }

  /**
   * 销毁连接
   */
  async destroyConnection(instance: WebSocketInstance): Promise<void> {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.instance === instance) {
        await this.destroyConnectionInternal(connectionId, connection);
        break;
      }
    }
  }

  /**
   * 获取连接池诊断信息
   */
  getPoolDiagnostics(): {
    config: ConnectionPoolConfig;
    connections: Array<{
      id: string;
      config: WebSocketConfig;
      createdAt: Date;
      lastUsedAt: Date;
      isActive: boolean;
      connectionState: ConnectionState;
    }>;
    stats: { totalConnections: number; activeConnections: number; idleConnections: number };
  } {
    const connections = Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      config: conn.config,
      createdAt: conn.createdAt,
      lastUsedAt: conn.lastUsedAt.value,
      isActive: conn.isActive.value,
      connectionState: (conn.instance as any).connectionState?.value || ConnectionState.Disconnected
    }));

    return {
      config: { ...this.config },
      connections,
      stats: this.poolStats$.value
    };
  }

  /**
   * 手动清理空闲连接
   */
  async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const connectionsToDestroy: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      if (!connection.isActive.value) {
        const idleTime = now.getTime() - connection.lastUsedAt.value.getTime();
        if (idleTime > this.config.idleTimeout) {
          connectionsToDestroy.push(connectionId);
        }
      }
    });

    console.log(`[WebSocketConnectionPool] Cleaning up ${connectionsToDestroy.length} idle connections`);

    for (const connectionId of connectionsToDestroy) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        await this.destroyConnectionInternal(connectionId, connection);
      }
    }
  }

  /**
   * 销毁所有连接
   */
  async destroyAllConnections(): Promise<void> {
    console.log(`[WebSocketConnectionPool] Destroying all ${this.connections.size} connections`);

    const destroyPromises = Array.from(this.connections.entries()).map(
      ([connectionId, connection]) => this.destroyConnectionInternal(connectionId, connection)
    );

    await Promise.all(destroyPromises);
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    await this.destroyAllConnections();
    this.poolEvents$.complete();
    this.poolStats$.complete();

    console.log('[WebSocketConnectionPool] Connection pool destroyed');
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(config: WebSocketConfig): string {
    return `${config.namespace}_${config.url}_${btoa(JSON.stringify(config.auth || {}))}`;
  }

  /**
   * 创建新连接
   */
  private async createConnection(connectionId: string, config: WebSocketConfig): Promise<PooledConnection> {
    console.log(`[WebSocketConnectionPool] Creating new connection: ${connectionId}`);

    const instance = new WebSocketService(/* 注入所需的依赖 */);
    const connection: PooledConnection = {
      id: connectionId,
      config,
      instance,
      createdAt: new Date(),
      lastUsedAt: new BehaviorSubject(new Date()),
      isActive: new BehaviorSubject(true)
    };

    // 设置连接超时
    const timeoutTimer = setTimeout(() => {
      const connectionState = (instance as any).connectionState?.value;
      if (connectionState !== ConnectionState.Connected) {
        console.warn(`[WebSocketConnectionPool] Connection timeout: ${connectionId}`);
        this.destroyConnectionInternal(connectionId, connection);
      }
    }, this.config.connectionTimeout);

    // 监听连接状态变化
    instance.state$.subscribe(state => {
      if (state === ConnectionState.Connected) {
        clearTimeout(timeoutTimer);
      } else if (state === ConnectionState.Failed) {
        console.error(`[WebSocketConnectionPool] Connection failed: ${connectionId}`);
        this.destroyConnectionInternal(connectionId, connection);
      }
    });

    this.connections.set(connectionId, connection);

    // 建立连接
    instance.connect(config);

    this.poolEvents$.next({
      type: 'connection:created',
      data: { connectionId, config },
      timestamp: new Date()
    });

    this.updatePoolStats();

    return connection;
  }

  /**
   * 销毁连接内部实现
   */
  private async destroyConnectionInternal(connectionId: string, connection: PooledConnection): Promise<void> {
    console.log(`[WebSocketConnectionPool] Destroying connection: ${connectionId}`);

    // 清理健康检查定时器
    if (connection.healthCheckTimer) {
      clearInterval(connection.healthCheckTimer);
    }

    // 断开WebSocket连接
    connection.instance.disconnect();

    // 清理状态
    connection.isActive.complete();
    connection.lastUsedAt.complete();

    // 从连接池中移除
    this.connections.delete(connectionId);

    this.poolEvents$.next({
      type: 'connection:destroyed',
      data: { connectionId },
      timestamp: new Date()
    });

    this.updatePoolStats();
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log(`[WebSocketConnectionPool] Health check started with interval: ${this.config.healthCheckInterval}ms`);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    this.poolEvents$.next({
      type: 'health:check',
      data: { connectionCount: this.connections.size },
      timestamp: new Date()
    });

    // 清理超时的连接
    await this.cleanupIdleConnections();

    // 检查每个连接的健康状态
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        const diagnostics = (connection.instance as any).getConnectionDiagnostics?.();
        if (diagnostics) {
          // 如果连接状态异常，尝试重新连接
          if (diagnostics.state === ConnectionState.Failed && !connection.isActive.value) {
            console.warn(`[WebSocketConnectionPool] Unhealthy connection detected: ${connectionId}`);
            await this.destroyConnectionInternal(connectionId, connection);
          }
        }
      } catch (error) {
        console.error(`[WebSocketConnectionPool] Health check failed for connection: ${connectionId}`, error);
      }
    }
  }

  /**
   * 更新连接池统计信息
   */
  private updatePoolStats(): void {
    let activeConnections = 0;
    let idleConnections = 0;

    this.connections.forEach(connection => {
      if (connection.isActive.value) {
        activeConnections++;
      } else {
        idleConnections++;
      }
    });

    this.poolStats$.next({
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections
    });
  }
}