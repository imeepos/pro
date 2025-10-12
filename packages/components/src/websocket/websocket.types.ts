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
  timeout: 5000,
  forceNew: true
};

export const defaultReconnectionConfig: ReconnectionConfig = {
  maxAttempts: 5,
  delay: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000)
};