import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer, of } from 'rxjs';
import { filter, map, switchMap, tap, catchError, share } from 'rxjs/operators';
import { JwtAuthService } from '@pro/components';
import { environment } from '../../../../../environments/environment';
import { RealTimeUpdate } from '../types/data.types';

export interface WebSocketMessage<T = any> {
  id: string;
  type: string;
  event: string;
  data: T;
  timestamp: string;
  metadata?: Record<string, any>;
}


export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private authService = inject(JwtAuthService);

  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0
  });

  private messages$ = new Subject<WebSocketMessage>();
  private realTimeUpdates$ = new Subject<RealTimeUpdate>();
  private reconnectTimer: any;
  private heartbeatTimer: any;
  private heartbeatTimeout: any;

  private websocket: WebSocket | null = null;
  private defaultConfig: WebSocketConfig = {
    url: 'ws://localhost:3000',
    protocols: [],
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000
  };

  // 连接WebSocket
  connect(config?: Partial<WebSocketConfig>): Observable<boolean> {
    const finalConfig = { ...this.defaultConfig, ...config };

    return new Observable<boolean>(observer => {
      try {
        this.disconnect(); // 断开现有连接

        const token = localStorage.getItem('token') || '';
        const wsUrl = `${finalConfig.url}?token=${token}`;

        this.websocket = new WebSocket(wsUrl, finalConfig.protocols);

        this.websocket.onopen = () => {
          console.log('[WebSocket] Connected');
          this.updateConnectionStatus({
            connected: true,
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: undefined
          });

          // 开始心跳
          this.startHeartbeat();

          observer.next(true);
          observer.complete();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.websocket.onclose = (event) => {
          console.log('[WebSocket] Disconnected', event);
          this.updateConnectionStatus({
            connected: false,
            lastDisconnected: new Date(),
            error: event.reason
          });

          this.stopHeartbeat();

          // 尝试重连
          if (!event.wasClean) {
            this.attemptReconnect(finalConfig);
          }

          observer.next(false);
          observer.complete();
        };

        this.websocket.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.updateConnectionStatus({
            connected: false,
            error: 'Connection error'
          });

          observer.error(error);
        };

      } catch (error) {
        observer.error(error);
      }
    }).pipe(
      share()
    );
  }

  // 断开连接
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.clearReconnectTimer();
    this.stopHeartbeat();
  }

  // 发送消息
  send<T = any>(message: Partial<WebSocketMessage<T>>): boolean {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }

    try {
      const fullMessage: WebSocketMessage<T> = {
        id: this.generateMessageId(),
        type: message.type || 'message',
        event: message.event || 'data',
        data: message.data as T,
        timestamp: new Date().toISOString(),
        metadata: message.metadata
      };

      this.websocket?.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }

  // 订阅特定事件
  subscribe<T = any>(event: string): Observable<WebSocketMessage<T>> {
    return this.messages$.pipe(
      filter(message => message.event === event),
      map(message => message as WebSocketMessage<T>)
    );
  }

  // 订阅实时更新
  subscribeToRealTimeUpdates(entity?: string): Observable<RealTimeUpdate> {
    return this.realTimeUpdates$.pipe(
      filter(update => !entity || update.entity === entity)
    );
  }

  // 订阅连接状态变化
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable();
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  // 发送心跳
  private sendHeartbeat(): void {
    this.send({
      type: 'heartbeat',
      event: 'ping',
      data: { timestamp: new Date().toISOString() }
    });

    // 设置心跳超时
    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[WebSocket] Heartbeat timeout');
      this.updateConnectionStatus({
        connected: false,
        error: 'Heartbeat timeout'
      });
      this.disconnect();
    }, this.defaultConfig.heartbeatTimeout);
  }

  // 开始心跳
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.defaultConfig.heartbeatInterval);
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // 处理接收到的消息
  private handleMessage(message: WebSocketMessage): void {
    // 处理心跳响应
    if (message.event === 'pong') {
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      return;
    }

    // 发布消息
    this.messages$.next(message);

    // 处理实时更新
    if (message.type === 'realtime-update') {
      const update: RealTimeUpdate = {
        id: message.id,
        type: message.data.type,
        entity: message.data.entity,
        data: message.data.payload,
        timestamp: message.timestamp
      };
      this.realTimeUpdates$.next(update);
    }
  }

  // 更新连接状态
  private updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    const currentStatus = this.connectionStatus$.value;
    this.connectionStatus$.next({
      ...currentStatus,
      ...status
    });
  }

  // 尝试重连
  private attemptReconnect(config: WebSocketConfig): void {
    const currentStatus = this.connectionStatus$.value;

    if (currentStatus.reconnectAttempts >= (config.maxReconnectAttempts || 10)) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.clearReconnectTimer();

    this.reconnectTimer = timer(config.reconnectInterval || 5000).subscribe(() => {
      console.log(`[WebSocket] Reconnecting... (attempt ${currentStatus.reconnectAttempts + 1})`);

      this.updateConnectionStatus({
        reconnectAttempts: currentStatus.reconnectAttempts + 1
      });

      this.connect(config).subscribe({
        error: (error) => {
          console.error('[WebSocket] Reconnect failed:', error);
        }
      });
    });
  }

  // 清除重连定时器
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }
  }

  // 生成消息ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 清理资源
  ngOnDestroy(): void {
    this.disconnect();
    this.connectionStatus$.complete();
    this.messages$.complete();
    this.realTimeUpdates$.complete();
  }
}

// 扩展的实时数据服务
@Injectable({
  providedIn: 'root'
})
export class RealTimeDataService {
  private wsService = inject(WebSocketService);
  private dataStreams = new Map<string, BehaviorSubject<any[]>>();

  // 订阅数据流
  subscribeToData<T = any>(entity: string, initialData: T[] = []): Observable<T[]> {
    if (!this.dataStreams.has(entity)) {
      this.dataStreams.set(entity, new BehaviorSubject<T[]>(initialData));

      // 订阅WebSocket实时更新
      this.wsService.subscribeToRealTimeUpdates(entity).subscribe(update => {
        this.handleRealTimeUpdate(entity, update);
      });
    }

    return this.dataStreams.get(entity)!.asObservable();
  }

  // 手动更新数据流
  updateData<T = any>(entity: string, items: T[]): void {
    const stream = this.dataStreams.get(entity);
    if (stream) {
      stream.next(items);
    }
  }

  // 添加数据项
  addDataItem<T = any>(entity: string, item: T): void {
    const stream = this.dataStreams.get(entity);
    if (stream) {
      const current = stream.value;
      stream.next([...current, item]);
    }
  }

  // 更新数据项
  updateDataItem<T = any>(entity: string, id: string, updates: Partial<T>): void {
    const stream = this.dataStreams.get(entity);
    if (stream) {
      const current = stream.value;
      const updated = current.map(item =>
        (item as any).id === id ? { ...(item as any), ...updates } : item
      );
      stream.next(updated);
    }
  }

  // 删除数据项
  removeDataItem(entity: string, id: string): void {
    const stream = this.dataStreams.get(entity);
    if (stream) {
      const current = stream.value;
      const filtered = current.filter(item => (item as any).id !== id);
      stream.next(filtered);
    }
  }

  // 处理实时更新
  private handleRealTimeUpdate(entity: string, update: RealTimeUpdate): void {
    const stream = this.dataStreams.get(entity);
    if (!stream) return;

    const current = stream.value;

    switch (update.type) {
      case 'create':
        stream.next([...current, update.data]);
        break;
      case 'update':
        const updated = current.map(item =>
          (item as any).id === update.data.id ? { ...item, ...update.data } : item
        );
        stream.next(updated);
        break;
      case 'delete':
        const filtered = current.filter(item => (item as any).id !== update.data.id);
        stream.next(filtered);
        break;
    }
  }

  // 清理数据流
  cleanup(entity: string): void {
    const stream = this.dataStreams.get(entity);
    if (stream) {
      stream.complete();
      this.dataStreams.delete(entity);
    }
  }

  // 清理所有数据流
  cleanupAll(): void {
    this.dataStreams.forEach((stream, entity) => {
      stream.complete();
    });
    this.dataStreams.clear();
  }
}