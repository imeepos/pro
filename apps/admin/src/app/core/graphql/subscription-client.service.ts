import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createClient, Client, ClientOptions } from 'graphql-ws';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';
import { logger } from '../utils/logger';

export type SubscriptionConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionClient implements OnDestroy {
  private client: Client | null = null;
  private readonly log = logger.withScope('SubscriptionClient');
  private readonly connectionState = new BehaviorSubject<SubscriptionConnectionState>('disconnected');
  private manualDisconnect = false;

  constructor(private readonly tokenStorage: TokenStorageService) {}

  connectionStateChanges(): Observable<SubscriptionConnectionState> {
    return this.connectionState.asObservable();
  }

  getClient(): Client {
    if (!this.client) {
      this.client = this.createClient('initial');
    }
    return this.client;
  }

  private createClient(reason: 'initial' | 'reconnect'): Client {
    const wsUrl = this.resolveWebSocketUrl();
    this.manualDisconnect = false;
    this.connectionState.next(reason === 'reconnect' ? 'reconnecting' : 'connecting');

    const options: ClientOptions = {
      url: wsUrl,
      connectionParams: () => {
        const token = this.tokenStorage.getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      on: {
        connected: (socket, payload) => {
          const connection = socket as WebSocket | undefined;
          const protocol = connection && typeof connection.protocol === 'string' ? connection.protocol : undefined;
          this.connectionState.next('connected');
          this.log.info('WebSocket 已连接', {
            url: wsUrl,
            protocol,
            payload,
          });
        },
        closed: (event) => {
          const closeEvent = event as CloseEvent | undefined;
          this.connectionState.next('disconnected');
          this.log.info('WebSocket 已关闭', {
            code: closeEvent?.code,
            reason: closeEvent?.reason,
            wasClean: closeEvent?.wasClean,
          });
        },
        error: (error) => {
          const details = (error ?? {}) as { message?: string };
          this.connectionState.next('error');
          this.log.error('WebSocket 错误', { message: details.message ?? 'unknown', error });
        }
      },
      retryAttempts: 10,
      shouldRetry: (event) => {
        const closeEvent = event as CloseEvent | undefined;
        if (this.manualDisconnect) {
          this.log.debug('手动断开连接，跳过自动重连', {
            code: closeEvent?.code,
            reason: closeEvent?.reason,
          });
          return false;
        }

        if (closeEvent?.code === 4401 || closeEvent?.code === 4403) {
          this.connectionState.next('error');
          this.log.error('WebSocket 认证失败，停止重连', {
            code: closeEvent?.code,
            reason: closeEvent?.reason,
          });
          return false;
        }

        this.connectionState.next('reconnecting');
        this.log.warn('WebSocket 连接断开，准备重试', {
          code: closeEvent?.code,
          reason: closeEvent?.reason,
        });
        return true;
      }
    };

    return createClient(options);
  }

  private resolveWebSocketUrl(): string {
    const graphqlUrl = environment.graphqlUrl || environment.apiUrl;
    const httpUrl = graphqlUrl.replace(/\/+$/, '');

    return httpUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');
  }

  reconnect(): void {
    this.log.info('WebSocket 重连请求已触发');
    if (this.client) {
      this.disconnect();
    }
    this.client = this.createClient('reconnect');
  }

  disconnect(): void {
    if (this.client) {
      this.manualDisconnect = true;
      this.client.dispose();
      this.client = null;
      this.connectionState.next('disconnected');
      this.log.info('WebSocket 已断开');
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
