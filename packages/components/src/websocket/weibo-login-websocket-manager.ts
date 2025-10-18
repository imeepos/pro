import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, throwError, timer } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, takeUntil, timeout } from 'rxjs/operators';
import { WebSocketConfig, WebSocketInstance, ConnectionState } from './websocket.types';
import { WebSocketService } from './websocket.service';
import { WebSocketConnectionPool } from './websocket-connection-pool';

/**
 * 微博登录事件类型
 */
export type WeiboLoginEventType = 'qrcode' | 'status' | 'scanned' | 'success' | 'expired' | 'error' | 'connection:status';

/**
 * 微博登录事件接口
 */
export interface WeiboLoginEvent {
  type: WeiboLoginEventType;
  data: any;
  timestamp: Date;
  sessionId?: string;
}

/**
 * 登录会话状态
 */
export enum LoginSessionState {
  INITIALIZING = 'initializing',
  WAITING_QRCODE = 'waiting_qrcode',
  QRCode_GENERATED = 'qrcode_generated',
  WAITING_SCAN = 'waiting_scan',
  SCANNED = 'scanned',
  WAITING_CONFIRM = 'waiting_confirm',
  SUCCESS = 'success',
  EXPIRED = 'expired',
  ERROR = 'error',
  CONNECTION_LOST = 'connection_lost'
}

/**
 * 登录会话信息
 */
export interface LoginSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly state: BehaviorSubject<LoginSessionState>;
  readonly events: Observable<WeiboLoginEvent>;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly lastEvent: BehaviorSubject<WeiboLoginEvent | null>;
  readonly connectionState: Observable<ConnectionState>;
}

/**
 * 微博登录配置
 */
export interface WeiboLoginConfig {
  readonly userId: string;
  readonly websocketUrl: string;
  readonly namespace?: string;
  readonly sessionTimeout?: number;
  readonly retryAttempts?: number;
  readonly enableConnectionPool?: boolean;
}

/**
 * 微博扫码登录WebSocket管理器
 * 专门处理微博扫码登录的WebSocket连接管理
 */
@Injectable({
  providedIn: 'root'
})
export class WeiboLoginWebSocketManager implements OnDestroy {
  private readonly sessions = new Map<string, LoginSession>();
  private readonly activeConnections = new Map<string, WebSocketInstance>();
  private readonly managerEvents$ = new Subject<{
    type: 'session:created' | 'session:destroyed' | 'connection:established' | 'connection:lost';
    data: any;
  }>();

  private readonly connectionPool: WebSocketConnectionPool;
  private readonly defaultConfig = {
    namespace: '/screens',
    sessionTimeout: 5 * 60 * 1000, // 5分钟
    retryAttempts: 3,
    enableConnectionPool: true
  };

  constructor() {
    this.connectionPool = new WebSocketConnectionPool();
    this.configureConnectionPool();

    console.log('[WeiboLoginWebSocketManager] Initialized with connection pooling');
  }

  /**
   * 获取管理器事件流
   */
  get events$(): Observable<{ type: string; data: any }> {
    return this.managerEvents$.asObservable();
  }

  /**
   * 创建微博登录会话
   */
  async createLoginSession(config: WeiboLoginConfig): Promise<LoginSession> {
    const sessionId = `${config.userId}_${Date.now()}`;
    const finalConfig = { ...this.defaultConfig, ...config };

    console.log(`[WeiboLoginWebSocketManager] Creating login session: ${sessionId}`);

    // 创建会话状态管理
    const state$ = new BehaviorSubject<LoginSessionState>(LoginSessionState.INITIALIZING);
    const events$ = new Subject<WeiboLoginEvent>();
    const lastEvent$ = new BehaviorSubject<WeiboLoginEvent | null>(null);

    const session: LoginSession = {
      sessionId,
      userId: config.userId,
      state: state$,
      events: events$.asObservable(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (finalConfig.sessionTimeout || 300000)),
      lastEvent: lastEvent$,
      connectionState: new BehaviorSubject<ConnectionState>(ConnectionState.Disconnected).asObservable()
    };

    // 建立WebSocket连接
    try {
      const websocketInstance = await this.establishConnection(finalConfig, sessionId);
      session.connectionState = websocketInstance.state$;

      // 设置事件监听
      this.setupEventListeners(websocketInstance, session, finalConfig);

      // 设置会话超时
      this.setupSessionTimeout(session);

      this.sessions.set(sessionId, session);
      this.managerEvents$.next({
        type: 'session:created',
        data: { sessionId, userId: config.userId }
      });

      console.log(`[WeiboLoginWebSocketManager] Login session created successfully: ${sessionId}`);
      return session;

    } catch (error) {
      console.error(`[WeiboLoginWebSocketManager] Failed to create login session: ${sessionId}`, error);

      // 清理资源
      state$.complete();
      events$.complete();
      lastEvent$.complete();

      throw error;
    }
  }

  /**
   * 获取登录会话
   */
  getSession(sessionId: string): LoginSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 销毁登录会话
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`[WeiboLoginWebSocketManager] Session not found: ${sessionId}`);
      return;
    }

    console.log(`[WeiboLoginWebSocketManager] Destroying login session: ${sessionId}`);

    try {
      // 清理WebSocket连接
      const connection = this.activeConnections.get(sessionId);
      if (connection) {
        if (this.defaultConfig.enableConnectionPool) {
          this.connectionPool.releaseConnection(connection);
        } else {
          connection.disconnect();
        }
        this.activeConnections.delete(sessionId);
      }

      // 清理会话状态
      session.state.complete();
      session.lastEvent.complete();
      (session.events as Subject).complete();

      // 从会话列表中移除
      this.sessions.delete(sessionId);

      this.managerEvents$.next({
        type: 'session:destroyed',
        data: { sessionId }
      });

      console.log(`[WeiboLoginWebSocketManager] Login session destroyed: ${sessionId}`);

    } catch (error) {
      console.error(`[WeiboLoginWebSocketManager] Error destroying session: ${sessionId}`, error);
    }
  }

  /**
   * 获取活跃会话统计
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    sessionsByState: Record<LoginSessionState, number>;
    connectionPoolStats: any;
  } {
    const sessionsByState: Record<LoginSessionState, number> = {
      [LoginSessionState.INITIALIZING]: 0,
      [LoginSessionState.WAITING_QRCODE]: 0,
      [LoginSessionState.QRCode_GENERATED]: 0,
      [LoginSessionState.WAITING_SCAN]: 0,
      [LoginSessionState.SCANNED]: 0,
      [LoginSessionState.WAITING_CONFIRM]: 0,
      [LoginSessionState.SUCCESS]: 0,
      [LoginSessionState.EXPIRED]: 0,
      [LoginSessionState.ERROR]: 0,
      [LoginSessionState.CONNECTION_LOST]: 0
    };

    let activeSessions = 0;

    this.sessions.forEach(session => {
      const state = session.state.value;
      sessionsByState[state]++;

      if (state !== LoginSessionState.EXPIRED &&
          state !== LoginSessionState.ERROR &&
          state !== LoginSessionState.SUCCESS) {
        activeSessions++;
      }
    });

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      sessionsByState,
      connectionPoolStats: this.connectionPool.getPoolDiagnostics()
    };
  }

  /**
   * 手动触发连接健康检查
   */
  async checkConnectionHealth(): Promise<void> {
    console.log('[WeiboLoginWebSocketManager] Performing connection health check');

    for (const [sessionId, session] of this.sessions.entries()) {
      const connection = this.activeConnections.get(sessionId);
      if (connection) {
        try {
          (connection as any).checkConnectionHealth?.();
        } catch (error) {
          console.error(`[WeiboLoginWebSocketManager] Health check failed for session: ${sessionId}`, error);
          session.state.next(LoginSessionState.CONNECTION_LOST);
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    console.log('[WeiboLoginWebSocketManager] Destroying manager and cleaning up all sessions');

    // 销毁所有会话
    const destroyPromises = Array.from(this.sessions.keys()).map(
      sessionId => this.destroySession(sessionId)
    );
    await Promise.all(destroyPromises);

    // 销毁连接池
    await this.connectionPool.destroy();

    // 完成事件流
    this.managerEvents$.complete();

    console.log('[WeiboLoginWebSocketManager] Manager destroyed successfully');
  }

  /**
   * 配置连接池
   */
  private configureConnectionPool(): void {
    this.connectionPool.configure({
      maxConnections: 3,
      connectionTimeout: 15000,
      idleTimeout: 120000, // 2分钟空闲超时
      healthCheckInterval: 30000 // 30秒健康检查间隔
    });

    // 监听连接池事件
    this.connectionPool.events$.subscribe(event => {
      console.log('[WeiboLoginWebSocketManager] Connection pool event:', event);
    });
  }

  /**
   * 建立WebSocket连接
   */
  private async establishConnection(config: WeiboLoginConfig, sessionId: string): Promise<WebSocketInstance> {
    const websocketConfig: WebSocketConfig = {
      url: config.websocketUrl,
      namespace: config.namespace || '/screens',
      auth: {
        token: await this.getAuthToken(config.userId)
      },
      transport: {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false
      },
      reconnection: {
        maxAttempts: config.retryAttempts || 3,
        delay: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000)
      }
    };

    let websocketInstance: WebSocketInstance;

    if (config.enableConnectionPool !== false) {
      // 使用连接池
      websocketInstance = await this.connectionPool.acquireConnection(websocketConfig);
    } else {
      // 直接创建连接
      websocketInstance = new WebSocketService(/* 注入依赖 */);
      websocketInstance.connect(websocketConfig);
    }

    // 等待连接建立
    await new Promise<void>((resolve, reject) => {
      const subscription = websocketInstance.state$
        .pipe(
          filter(state => state === ConnectionState.Connected || state === ConnectionState.Failed),
          takeUntil(timer(15000)) // 15秒超时
        )
        .subscribe({
          next: (state) => {
            if (state === ConnectionState.Connected) {
              subscription.unsubscribe();
              resolve();
            } else {
              subscription.unsubscribe();
              reject(new Error('Failed to establish WebSocket connection'));
            }
          },
          error: (error) => {
            subscription.unsubscribe();
            reject(error);
          }
        });
    });

    this.activeConnections.set(sessionId, websocketInstance);
    this.managerEvents$.next({
      type: 'connection:established',
      data: { sessionId }
    });

    return websocketInstance;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(
    websocketInstance: WebSocketInstance,
    session: LoginSession,
    config: WeiboLoginConfig
  ): void {
    // 监听连接状态变化
    websocketInstance.state$.pipe(
      distinctUntilChanged()
    ).subscribe(state => {
      if (state === ConnectionState.Disconnected) {
        session.state.next(LoginSessionState.CONNECTION_LOST);
        this.managerEvents$.next({
          type: 'connection:lost',
          data: { sessionId: session.sessionId }
        });
      } else if (state === ConnectionState.Connected) {
        // 订阅微博登录事件
        websocketInstance.emit('weibo:login:subscribe', { sessionId: session.sessionId });
        session.state.next(LoginSessionState.WAITING_QRCODE);
      }
    });

    // 监听微博登录事件
    const eventSubscription = websocketInstance.on('weibo:login:event').subscribe({
      next: (eventData: any) => {
        const event: WeiboLoginEvent = {
          type: eventData.type || 'status',
          data: eventData.data,
          timestamp: new Date(),
          sessionId: session.sessionId
        };

        this.handleLoginEvent(event, session);
      },
      error: (error) => {
        console.error(`[WeiboLoginWebSocketManager] Event stream error for session: ${session.sessionId}`, error);
        session.state.next(LoginSessionState.ERROR);
      }
    });

    // 监听特定事件类型
    this.setupSpecificEventListeners(websocketInstance, session);

    // 在会话销毁时清理订阅
    session.events.subscribe({
      complete: () => {
        eventSubscription.unsubscribe();
      }
    });
  }

  /**
   * 设置特定事件监听器
   */
  private setupSpecificEventListeners(websocketInstance: WebSocketInstance, session: LoginSession): void {
    // 二维码事件
    websocketInstance.on('qrcode').subscribe((data: any) => {
      const event: WeiboLoginEvent = {
        type: 'qrcode',
        data,
        timestamp: new Date(),
        sessionId: session.sessionId
      };
      session.state.next(LoginSessionState.QRCode_GENERATED);
      this.emitEvent(event, session);
    });

    // 扫描事件
    websocketInstance.on('scanned').subscribe((data: any) => {
      const event: WeiboLoginEvent = {
        type: 'scanned',
        data,
        timestamp: new Date(),
        sessionId: session.sessionId
      };
      session.state.next(LoginSessionState.SCANNED);
      this.emitEvent(event, session);
    });

    // 成功事件
    websocketInstance.on('success').subscribe((data: any) => {
      const event: WeiboLoginEvent = {
        type: 'success',
        data,
        timestamp: new Date(),
        sessionId: session.sessionId
      };
      session.state.next(LoginSessionState.SUCCESS);
      this.emitEvent(event, session);

      // 登录成功后自动清理会话
      setTimeout(() => this.destroySession(session.sessionId), 5000);
    });

    // 过期事件
    websocketInstance.on('expired').subscribe((data: any) => {
      const event: WeiboLoginEvent = {
        type: 'expired',
        data,
        timestamp: new Date(),
        sessionId: session.sessionId
      };
      session.state.next(LoginSessionState.EXPIRED);
      this.emitEvent(event, session);
    });

    // 错误事件
    websocketInstance.on('error').subscribe((data: any) => {
      const event: WeiboLoginEvent = {
        type: 'error',
        data,
        timestamp: new Date(),
        sessionId: session.sessionId
      };
      session.state.next(LoginSessionState.ERROR);
      this.emitEvent(event, session);
    });
  }

  /**
   * 处理登录事件
   */
  private handleLoginEvent(event: WeiboLoginEvent, session: LoginSession): void {
    switch (event.type) {
      case 'qrcode':
        session.state.next(LoginSessionState.QRCode_GENERATED);
        break;
      case 'status':
        if (event.data?.retcode === 50114002) {
          session.state.next(LoginSessionState.SCANNED);
        }
        break;
      case 'scanned':
        session.state.next(LoginSessionState.WAITING_CONFIRM);
        break;
      case 'success':
        session.state.next(LoginSessionState.SUCCESS);
        break;
      case 'expired':
        session.state.next(LoginSessionState.EXPIRED);
        break;
      case 'error':
        session.state.next(LoginSessionState.ERROR);
        break;
    }

    this.emitEvent(event, session);
  }

  /**
   * 发送事件
   */
  private emitEvent(event: WeiboLoginEvent, session: LoginSession): void {
    session.lastEvent.next(event);
    (session.events as Subject<WeiboLoginEvent>).next(event);

    console.log(`[WeiboLoginWebSocketManager] Event emitted for session ${session.sessionId}:`, event);
  }

  /**
   * 设置会话超时
   */
  private setupSessionTimeout(session: LoginSession): void {
    const timeout = session.expiresAt.getTime() - Date.now();

    if (timeout > 0) {
      setTimeout(() => {
        const currentState = session.state.value;
        if (currentState !== LoginSessionState.SUCCESS &&
            currentState !== LoginSessionState.ERROR &&
            currentState !== LoginSessionState.EXPIRED) {

          console.log(`[WeiboLoginWebSocketManager] Session timeout: ${session.sessionId}`);
          session.state.next(LoginSessionState.EXPIRED);

          const timeoutEvent: WeiboLoginEvent = {
            type: 'expired',
            data: { message: 'Session timeout' },
            timestamp: new Date(),
            sessionId: session.sessionId
          };
          this.emitEvent(timeoutEvent, session);

          // 自动清理超时会话
          setTimeout(() => this.destroySession(session.sessionId), 1000);
        }
      }, timeout);
    }
  }

  /**
   * 获取认证令牌
   */
  private async getAuthToken(userId: string): Promise<string> {
    // 这里应该从认证服务获取token
    // 暂时返回模拟token
    return `mock_token_${userId}_${Date.now()}`;
  }
}