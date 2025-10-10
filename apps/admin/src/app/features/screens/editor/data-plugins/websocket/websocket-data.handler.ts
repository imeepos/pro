import { Injectable } from '@angular/core';
import { DataAcceptor, DataInstance, DataResponse, WebSocketDataConfig } from '../../models/data-source.model';
import { DataStatus } from '../../models/data-source.enum';

@Injectable({ providedIn: 'root' })
export class WebSocketDataHandler implements DataInstance {
  private ws?: WebSocket;
  private reconnectTimer?: number;
  private reconnectAttempts = 0;
  private acceptor?: DataAcceptor;
  private config?: WebSocketDataConfig;

  async connect(acceptor: DataAcceptor, options?: WebSocketDataConfig): Promise<void> {
    if (!options?.url) {
      acceptor({ status: DataStatus.ERROR, error: 'WebSocket URL不能为空' });
      return;
    }

    this.acceptor = acceptor;
    this.config = options;
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (!this.config?.url) return;

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.acceptor) {
          this.acceptor({
            status: DataStatus.SUCCESS,
            data: { connected: true },
            timestamp: Date.now()
          });
        }
      };

      this.ws.onmessage = (event) => {
        if (!this.acceptor) return;

        try {
          const data = JSON.parse(event.data);
          this.acceptor({
            status: DataStatus.SUCCESS,
            data,
            timestamp: Date.now()
          });
        } catch {
          this.acceptor({
            status: DataStatus.SUCCESS,
            data: event.data,
            timestamp: Date.now()
          });
        }
      };

      this.ws.onerror = () => {
        if (this.acceptor) {
          this.acceptor({
            status: DataStatus.ERROR,
            error: 'WebSocket连接错误',
            timestamp: Date.now()
          });
        }
      };

      this.ws.onclose = () => {
        this.handleReconnect();
      };
    } catch (error) {
      if (this.acceptor) {
        this.acceptor({
          status: DataStatus.ERROR,
          error: error instanceof Error ? error.message : 'WebSocket连接失败',
          timestamp: Date.now()
        });
      }
    }
  }

  private handleReconnect(): void {
    if (!this.config) return;

    const maxAttempts = this.config.maxReconnectAttempts ?? 5;
    if (this.reconnectAttempts >= maxAttempts) {
      if (this.acceptor) {
        this.acceptor({
          status: DataStatus.ERROR,
          error: `重连失败，已尝试${maxAttempts}次`,
          timestamp: Date.now()
        });
      }
      return;
    }

    const interval = this.config.reconnectInterval ?? 3000;
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      if (this.acceptor) {
        this.acceptor({
          status: DataStatus.LOADING,
          data: { reconnecting: true, attempt: this.reconnectAttempts },
          timestamp: Date.now()
        });
      }
      this.connectWebSocket();
    }, interval);
  }

  async getRespData(): Promise<DataResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return {
        status: DataStatus.ERROR,
        error: 'WebSocket未连接',
        timestamp: Date.now()
      };
    }

    return {
      status: DataStatus.SUCCESS,
      data: {
        readyState: this.ws.readyState,
        url: this.ws.url,
        protocol: this.ws.protocol
      },
      timestamp: Date.now()
    };
  }

  async debug(acceptor: DataAcceptor): Promise<void> {
    const response = await this.getRespData();
    acceptor(response);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.acceptor = undefined;
    this.config = undefined;
    this.reconnectAttempts = 0;
  }

  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接');
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(message);
  }
}
