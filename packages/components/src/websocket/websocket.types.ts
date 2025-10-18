import { Observable } from 'rxjs';

export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Failed = 'failed'
}

export interface WebSocketConfig {
  readonly url: string;
  readonly namespace: string;
  readonly auth?: AuthConfig;
  readonly transport?: TransportConfig;
  readonly reconnection?: ReconnectionConfig;
}

export interface AuthConfig {
  readonly token?: string;
  readonly autoRefresh?: boolean;
  readonly onTokenExpired?: () => Promise<string>;
}

export interface TransportConfig {
  readonly transports: ('websocket' | 'polling')[];
  readonly timeout: number;
  readonly forceNew: boolean;
}

export interface ReconnectionConfig {
  readonly maxAttempts: number;
  readonly delay: (attempt: number) => number;
}

export interface WebSocketInstance {
  readonly state$: Observable<ConnectionState>;
  readonly isConnected$: Observable<boolean>;

  connect(config: WebSocketConfig): void;
  disconnect(): void;
  on<T = any>(event: string): Observable<T>;
  emit(event: string, data?: any): void;
}

export interface EventSubscription {
  readonly event: string;
  readonly namespace: string;
  unsubscribe(): void;
}

export const defaultTransportConfig: TransportConfig = {
  transports: ['websocket', 'polling'],
  timeout: 20000, // 增加到20秒，给网络波动更多容错空间
  forceNew: true
};

export const defaultReconnectionConfig: ReconnectionConfig = {
  maxAttempts: 10,
  delay: (attempt: number) => {
    // 指数退避算法，但针对微博扫码登录等场景优化
    const baseDelay = 1000;
    const maxDelay = 60000; // 1分钟最大延迟
    const exponentialDelay = baseDelay * Math.pow(2, attempt);

    // 前3次重连使用较短延迟，之后使用指数退避
    if (attempt <= 2) {
      return Math.min(2000 * attempt, 5000); // 2s, 4s, 最大5s
    }

    return Math.min(exponentialDelay, maxDelay);
  }
};