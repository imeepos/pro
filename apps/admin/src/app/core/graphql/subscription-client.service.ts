import { Injectable, OnDestroy } from '@angular/core';
import { createClient, Client, ClientOptions } from 'graphql-ws';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';
import { logger } from '../utils/logger';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionClient implements OnDestroy {
  private client: Client | null = null;
  private readonly log = logger.withScope('SubscriptionClient');

  constructor(private readonly tokenStorage: TokenStorageService) {}

  getClient(): Client {
    if (!this.client) {
      this.client = this.createClient();
    }
    return this.client;
  }

  private createClient(): Client {
    const wsUrl = this.resolveWebSocketUrl();

    const options: ClientOptions = {
      url: wsUrl,
      connectionParams: () => {
        const token = this.tokenStorage.getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      on: {
        connected: () => this.log.info('WebSocket 已连接', { url: wsUrl }),
        closed: () => this.log.info('WebSocket 已关闭'),
        error: (error) => this.log.error('WebSocket 错误', { error })
      },
      retryAttempts: 5,
      shouldRetry: () => true
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
    this.disconnect();
    this.client = this.createClient();
    this.log.info('WebSocket 重连成功');
  }

  disconnect(): void {
    if (this.client) {
      this.client.dispose();
      this.client = null;
      this.log.info('WebSocket 已断开');
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
