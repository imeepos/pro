import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, distinctUntilChanged, map } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  ConnectionState,
  WebSocketConfig,
  WebSocketInstance,
  defaultTransportConfig,
  defaultReconnectionConfig
} from './websocket.types';
import { JwtAuthService } from './auth/jwt-auth.service';

interface EventStream {
  readonly subject: BehaviorSubject<any>;
  readonly unsubscribe: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements WebSocketInstance {
  private socket: Socket | null = null;
  private config: WebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer?: number;
  private authFailure = false;
  private connectionStartTime: number = 0;
  private lastConnectionError: Error | null = null;
  private heartbeatTimer?: number;
  private heartbeatResponseTimer?: number;
  private isHeartbeatActive = false;

  private readonly connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.Disconnected);
  private readonly eventStreams = new Map<string, EventStream>();

  constructor(private readonly authService: JwtAuthService) {}

  get state$(): Observable<ConnectionState> {
    return this.connectionState$.asObservable().pipe(distinctUntilChanged());
  }

  get isConnected$(): Observable<boolean> {
    return this.state$.pipe(
      map(state => state === ConnectionState.Connected),
      distinctUntilChanged()
    );
  }

  connect(config: WebSocketConfig): void {
    if (this.connectionState$.value === ConnectionState.Connected) {
      return;
    }

    this.config = this.enrichConfig(config);
    this.authFailure = false;
    this.connectionStartTime = Date.now();
    this.lastConnectionError = null;
    this.establishConnection();
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.updateConnectionState(ConnectionState.Disconnected);
    this.cleanupConnection();
    this.resetState();
  }

  on<T = any>(event: string): Observable<T> {
    return this.getOrCreateEventStream(event);
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private enrichConfig(config: WebSocketConfig): WebSocketConfig {
    return {
      ...config,
      transport: { ...defaultTransportConfig, ...config.transport },
      reconnection: { ...defaultReconnectionConfig, ...config.reconnection }
    };
  }

  private establishConnection(): void {
    if (!this.config) return;

    this.updateConnectionState(ConnectionState.Connecting);

    const socketUrl = this.buildSocketUrl();
    const socketOptions = this.buildSocketOptions();

    this.socket = io(socketUrl, socketOptions);
    this.attachSocketEventHandlers();
  }

  private buildSocketUrl(): string {
    const { url, namespace } = this.config!;
    return namespace ? `${url}/${namespace}` : url;
  }

  private buildSocketOptions(): any {
    const { auth, transport } = this.config!;

    return {
      auth: this.buildAuthConfig(auth),
      ...transport
    };
  }

  private buildAuthConfig(auth?: any): any {
    if (!auth?.token && !this.authService.currentToken) {
      return {};
    }

    return {
      token: auth?.token || this.authService.currentToken
    };
  }

  private attachSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => this.handleConnection());
    this.socket.on('disconnect', (reason) => this.handleDisconnection(reason));
    this.socket.on('connect_error', (error) => this.handleConnectionError(error));
    this.socket.on('auth:error', (error) => this.handleAuthError(error));

    // 心跳相关事件
    this.socket.on('heartbeat', (data) => this.handleHeartbeatRequest(data));
    this.socket.on('heartbeat:ack', (data) => this.handleHeartbeatResponse(data));
    this.socket.on('heartbeat:request', (data) => this.handleHeartbeatRequest(data));
    this.socket.on('heartbeat:response', (data) => this.handleHeartbeatResponse(data));

    // 连接状态事件
    this.socket.on('connection:established', (data) => this.handleConnectionEstablished(data));
    this.socket.on('connection:rejected', (data) => this.handleConnectionRejected(data));

    // 标准ping/pong
    this.socket.on('ping', () => this.handlePing());
    this.socket.on('pong', () => this.handlePong());
  }

  private handleConnection(): void {
    const connectionDuration = Date.now() - this.connectionStartTime;
    console.log(`[WebSocketService] Connected successfully in ${connectionDuration}ms`);

    this.updateConnectionState(ConnectionState.Connected);
    this.reconnectAttempts = 0;
    this.lastConnectionError = null;

    // 启动心跳机制
    this.startHeartbeat();

    // 激活事件流
    this.activateEventStreams();

    // 订阅微博登录事件（如果需要）
    this.subscribeToWeiboLoginEvents();
  }

  private handleDisconnection(reason: string): void {
    console.log(`[WebSocketService] Disconnected: ${reason}`);

    // 停止心跳机制
    this.stopHeartbeat();

    if (reason === 'io client disconnect') {
      if (this.authFailure) {
        return;
      }

      this.updateConnectionState(ConnectionState.Disconnected);
      return;
    }

    // 对于服务端主动断开的情况，根据原因决定是否重连
    if (reason === 'transport close' || reason === 'ping timeout') {
      console.log(`[WebSocketService] Network issue detected, will attempt reconnection: ${reason}`);
      this.attemptReconnection();
    } else if (reason === 'auth error') {
      console.error(`[WebSocketService] Authentication failed, will not reconnect: ${reason}`);
      this.updateConnectionState(ConnectionState.Failed);
    } else {
      console.log(`[WebSocketService] Unexpected disconnection, attempting reconnection: ${reason}`);
      this.attemptReconnection();
    }
  }

  private async handleConnectionError(error: Error): Promise<void> {
    if (this.shouldRefreshToken(error)) {
      await this.attemptTokenRefresh();
      return;
    }

    if (error.message.includes('jwt expired')) {
      this.updateConnectionState(ConnectionState.Failed);
      this.emitTokenExpired();
      return;
    }

    if (this.shouldAttemptReconnection()) {
      this.attemptReconnection();
    } else {
      this.updateConnectionState(ConnectionState.Failed);
    }
  }

  private shouldRefreshToken(error: Error): boolean {
    return error.message.includes('token') &&
           this.config?.auth?.autoRefresh === true &&
           this.config.auth.onTokenExpired !== undefined;
  }

  private async attemptTokenRefresh(): Promise<void> {
    try {
      const onTokenExpired = this.config?.auth?.onTokenExpired;
      if (onTokenExpired) {
        await this.authService.refreshToken(onTokenExpired);
        this.establishConnection();
      }
    } catch (error) {
      this.updateConnectionState(ConnectionState.Failed);
    }
  }

  private attemptReconnection(): void {
    if (!this.config?.reconnection || !this.shouldAttemptReconnection()) return;

    this.clearReconnectTimer();
    this.updateConnectionState(ConnectionState.Reconnecting);
    this.reconnectAttempts++;

    const delay = this.config!.reconnection!.delay(this.reconnectAttempts - 1);

    this.reconnectTimer = window.setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  private shouldAttemptReconnection(): boolean {
    if (!this.config?.reconnection) {
      return false;
    }

    const currentState = this.connectionState$.value;
    if (currentState === ConnectionState.Disconnected || currentState === ConnectionState.Failed || this.authFailure) {
      return false;
    }

    return this.reconnectAttempts < this.config.reconnection.maxAttempts;
  }

  private getOrCreateEventStream<T = any>(event: string): Observable<T> {
    const existing = this.eventStreams.get(event);
    if (existing) {
      return existing.subject.asObservable().pipe(filter(data => data !== null));
    }

    const subject = new BehaviorSubject<any>(null);
    const unsubscribe = () => this.destroyEventStream(event);

    this.eventStreams.set(event, { subject, unsubscribe });

    if (this.socket?.connected) {
      this.activateEventStream(event);
    }

    return subject.asObservable().pipe(filter(data => data !== null));
  }

  private activateEventStreams(): void {
    this.eventStreams.forEach((_, event) => {
      this.activateEventStream(event);
    });
  }

  private activateEventStream(event: string): void {
    const stream = this.eventStreams.get(event);
    if (!stream || !this.socket) return;

    this.socket.on(event, (data: any) => stream.subject.next(data));
  }

  private destroyEventStream(event: string): void {
    const stream = this.eventStreams.get(event);
    if (stream) {
      stream.subject.complete();
      this.eventStreams.delete(event);

      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  private updateConnectionState(state: ConnectionState): void {
    this.connectionState$.next(state);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private cleanupConnection(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
  }

  private resetState(): void {
    this.config = null;
    this.reconnectAttempts = 0;
    this.authFailure = false;
    this.eventStreams.forEach(stream => stream.subject.complete());
    this.eventStreams.clear();
  }

  private handleAuthError(error: { message: string; code: string }): void {
    console.error('[WebSocketService] Authentication error:', error);

    this.authFailure = true;
    this.terminateConnectionOnAuthFailure();
    this.updateConnectionState(ConnectionState.Failed);

    if (error.code === 'TOKEN_EXPIRED') {
      this.emitTokenExpired();
      return;
    }

    this.emitAuthError(error);
  }

  private emitTokenExpired(): void {
    if (this.socket) {
      this.socket.emit('auth:token-expired');
    }
  }

  private emitAuthError(error: { message: string; code: string }): void {
    if (this.socket) {
      this.socket.emit('auth:authentication-failed', error);
    }
  }

  private terminateConnectionOnAuthFailure(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (!this.socket) {
      return;
    }

    if (this.socket.io?.opts) {
      this.socket.io.opts.reconnection = false;
    }

    if (this.socket.connected) {
      this.socket.disconnect();
    } else {
      this.socket.close();
    }
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 确保没有重复的心跳定时器

    this.isHeartbeatActive = true;

    // 每30秒发送一次心跳
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.connected && this.isHeartbeatActive) {
        this.socket.emit('heartbeat', {
          timestamp: new Date().toISOString(),
          clientId: this.socket.id
        });

        // 设置心跳响应超时定时器
        this.heartbeatResponseTimer = window.setTimeout(() => {
          console.warn('[WebSocketService] Heartbeat response timeout, connection may be unstable');
          // 不立即断开连接，让服务端处理超时检测
        }, 15000); // 15秒心跳响应超时
      }
    }, 30000); // 30秒心跳间隔
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat(): void {
    this.isHeartbeatActive = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.heartbeatResponseTimer) {
      clearTimeout(this.heartbeatResponseTimer);
      this.heartbeatResponseTimer = undefined;
    }
  }

  /**
   * 处理心跳请求
   */
  private handleHeartbeatRequest(data: any): void {
    if (this.socket?.connected) {
      this.socket.emit('heartbeat:response', {
        timestamp: new Date().toISOString(),
        originalTimestamp: data?.timestamp
      });
    }
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatResponse(data: any): void {
    // 清除心跳响应超时定时器
    if (this.heartbeatResponseTimer) {
      clearTimeout(this.heartbeatResponseTimer);
      this.heartbeatResponseTimer = undefined;
    }

    const responseTime = data?.timestamp ?
      Date.now() - new Date(data.timestamp).getTime() : 0;

    if (responseTime > 5000) {
      console.warn(`[WebSocketService] High heartbeat response time: ${responseTime}ms`);
    }
  }

  /**
   * 处理连接确认
   */
  private handleConnectionEstablished(data: any): void {
    console.log('[WebSocketService] Connection established with server:', data);
    this.lastConnectionError = null;
  }

  /**
   * 处理连接拒绝
   */
  private handleConnectionRejected(data: any): void {
    console.error('[WebSocketService] Connection rejected:', data);
    this.authFailure = true;
    this.updateConnectionState(ConnectionState.Failed);

    // 根据拒绝原因决定后续操作
    if (data?.reason === 'auth_failed') {
      this.emitTokenExpired();
    }
  }

  /**
   * 处理标准ping
   */
  private handlePing(): void {
    if (this.socket?.connected) {
      this.socket.emit('pong');
    }
  }

  /**
   * 处理标准pong
   */
  private handlePong(): void {
    // 标准pong响应，记录连接活跃状态
  }

  /**
   * 订阅微博登录事件
   */
  private subscribeToWeiboLoginEvents(): void {
    if (this.socket?.connected) {
      this.socket.emit('weibo:login:subscribe', {}, (response: any) => {
        if (response?.success) {
          console.log('[WebSocketService] Subscribed to weibo login events');
        } else {
          console.warn('[WebSocketService] Failed to subscribe to weibo login events:', response);
        }
      });
    }
  }

  /**
   * 获取连接诊断信息
   */
  getConnectionDiagnostics(): {
    state: ConnectionState;
    connected: boolean;
    reconnectAttempts: number;
    lastError: string | null;
    connectionDuration: number;
    isHeartbeatActive: boolean;
    socketId: string | null;
  } {
    return {
      state: this.connectionState$.value,
      connected: this.socket?.connected || false,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastConnectionError?.message || null,
      connectionDuration: this.connectionStartTime > 0 ? Date.now() - this.connectionStartTime : 0,
      isHeartbeatActive: this.isHeartbeatActive,
      socketId: this.socket?.id || null
    };
  }

  /**
   * 手动触发连接状态检查
   */
  checkConnectionHealth(): void {
    if (this.socket?.connected) {
      this.socket.emit('connection:status', (status: any) => {
        console.log('[WebSocketService] Connection status:', status);
      });
    } else {
      console.warn('[WebSocketService] Socket not connected, cannot check health');
    }
  }
}
