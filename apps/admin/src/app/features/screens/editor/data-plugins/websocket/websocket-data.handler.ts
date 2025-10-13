import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subscription, map, filter, distinctUntilChanged } from 'rxjs';
import {
  WebSocketManager,
  WebSocketInstance,
  ConnectionState,
  WebSocketConfig,
  createCustomWebSocketConfig,
  JwtAuthService,
  isValidWebSocketUrl
} from '@pro/components';
import { DataAcceptor, DataInstance, DataResponse, WebSocketDataConfig } from '../../models/data-source.model';
import { DataStatus } from '../../models/data-source.enum';

@Injectable({ providedIn: 'root' })
export class WebSocketDataHandler implements DataInstance, OnDestroy {
  private acceptor?: DataAcceptor;
  private config?: WebSocketDataConfig;
  private subscriptions = new Set<Subscription>();
  private currentNamespace?: string;
  private webSocketInstance?: WebSocketInstance;

  constructor(
    private readonly wsManager: WebSocketManager,
    private readonly authService: JwtAuthService
  ) {}

  async connect(acceptor: DataAcceptor, options?: WebSocketDataConfig): Promise<void> {
    if (!this.validateConnectionOptions(options, acceptor)) {
      return;
    }

    this.acceptor = acceptor;
    this.config = options;
    this.establishWebSocketConnection();
  }

  private validateConnectionOptions(options?: WebSocketDataConfig, acceptor?: DataAcceptor): boolean {
    if (!options?.url) {
      acceptor?.({ status: DataStatus.ERROR, error: 'WebSocket URL不能为空' });
      return false;
    }

    if (!isValidWebSocketUrl(options.url)) {
      acceptor?.({ status: DataStatus.ERROR, error: 'WebSocket URL格式无效' });
      return false;
    }

    return true;
  }

  private establishWebSocketConnection(): void {
    const config = this.createWebSocketConfig();
    this.currentNamespace = this.extractNamespace();

    const existingConnection = this.wsManager.getConnection(this.currentNamespace);

    if (existingConnection) {
      this.webSocketInstance = existingConnection;
    } else {
      this.webSocketInstance = this.wsManager.connectToNamespace(config);
    }

    this.subscribeToConnectionState();
    this.subscribeToDataMessages();
  }

  private createWebSocketConfig(): WebSocketConfig {
    const { url, maxReconnectAttempts, reconnectInterval } = this.config!;
    const namespace = this.extractNamespace();
    const baseUrl = this.extractBaseUrl(url);

    return createCustomWebSocketConfig(baseUrl, namespace, {
      auth: this.authService.currentToken ? {
        token: this.authService.currentToken,
        autoRefresh: true,
        onTokenExpired: () => this.authService.refreshToken()
      } : undefined,
      reconnection: {
        maxAttempts: maxReconnectAttempts ?? 5,
        delay: (attempt: number) => Math.min((reconnectInterval ?? 3000) * Math.pow(2, attempt), 30000)
      }
    });
  }

  private extractNamespace(): string {
    const { url } = this.config!;
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\/+|\/+$/g, '') || 'default';
  }

  private extractBaseUrl(url: string): string {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  }

  private subscribeToConnectionState(): void {
    if (!this.webSocketInstance) return;

    const subscription = this.webSocketInstance.state$
      .pipe(distinctUntilChanged())
      .subscribe(state => this.handleConnectionStateChange(state));

    this.subscriptions.add(subscription);
  }

  private subscribeToDataMessages(): void {
    if (!this.webSocketInstance) return;

    const subscription = this.webSocketInstance.on('data')
      .pipe(filter(data => data !== null))
      .subscribe(data => this.handleDataReceived(data));

    this.subscriptions.add(subscription);
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    if (!this.acceptor) return;

    const response = this.mapConnectionStateToDataResponse(state);
    this.acceptor(response);
  }

  private mapConnectionStateToDataResponse(state: ConnectionState): DataResponse {
    const timestamp = Date.now();

    switch (state) {
      case ConnectionState.Connected:
        return { status: DataStatus.SUCCESS, data: { connected: true }, timestamp };

      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        return { status: DataStatus.LOADING, data: { connecting: true }, timestamp };

      case ConnectionState.Failed:
        return { status: DataStatus.ERROR, error: 'WebSocket连接失败', timestamp };

      case ConnectionState.Disconnected:
        return { status: DataStatus.ERROR, error: 'WebSocket连接已断开', timestamp };

      default:
        return { status: DataStatus.ERROR, error: '未知连接状态', timestamp };
    }
  }

  private handleDataReceived(data: unknown): void {
    if (!this.acceptor) return;

    this.acceptor({
      status: DataStatus.SUCCESS,
      data,
      timestamp: Date.now()
    });
  }

  async getRespData(): Promise<DataResponse> {
    if (!this.webSocketInstance) {
      return {
        status: DataStatus.ERROR,
        error: 'WebSocket实例未初始化',
        timestamp: Date.now()
      };
    }

    const connectionState = await this.webSocketInstance.state$.pipe(
      filter(state => state !== null),
      map(state => ({ state, isConnected: state === ConnectionState.Connected }))
    ).toPromise();

    if (!connectionState?.isConnected) {
      return {
        status: DataStatus.ERROR,
        error: 'WebSocket未连接',
        timestamp: Date.now()
      };
    }

    return {
      status: DataStatus.SUCCESS,
      data: {
        connectionState: connectionState.state,
        namespace: this.currentNamespace,
        isConnected: connectionState.isConnected
      },
      timestamp: Date.now()
    };
  }

  async debug(acceptor: DataAcceptor): Promise<void> {
    const response = await this.getRespData();
    acceptor(response);
  }

  disconnect(): void {
    this.cleanupSubscriptions();
    this.resetHandlerState();
  }

  async send(data: unknown): Promise<void> {
    const connected = await this.isConnected();
    if (!connected) {
      throw new Error('WebSocket未连接');
    }

    if (!this.webSocketInstance) {
      throw new Error('WebSocket实例未初始化');
    }

    this.webSocketInstance.emit('data', data);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private async isConnected(): Promise<boolean> {
    try {
      if (!this.webSocketInstance) {
        return false;
      }

      const connected = await this.webSocketInstance.isConnected$.pipe(
        filter(state => state !== null),
        map(connected => Boolean(connected))
      ).toPromise();
      return connected ?? false;
    } catch {
      return false;
    }
  }

  private cleanupSubscriptions(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();
  }

  private resetHandlerState(): void {
    this.acceptor = undefined;
    this.config = undefined;
    this.currentNamespace = undefined;
    this.webSocketInstance = undefined;
  }
}
