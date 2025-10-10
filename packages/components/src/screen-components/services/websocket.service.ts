import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
  token?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private readonly wsUrl: string;
  private config: WebSocketConfig | null = null;

  constructor() {
    // 使用默认URL，项目可以在需要时重写
    this.wsUrl = 'http://localhost:3000';
  }

  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.config = { token, url: this.wsUrl };

    if (!token) {
      console.warn('WebSocket 连接缺少认证令牌');
    }

    this.socket = io(`${this.wsUrl}/screens`, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket 已断开');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket 错误:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.config = null;
    }
  }

  on(event: string): Observable<any> {
    return new Observable((observer) => {
      if (!this.socket) {
        observer.error('WebSocket 未连接');
        return;
      }

      const handler = (data: any) => {
        observer.next(data);
      };

      this.socket.on(event, handler);

      return () => {
        this.socket?.off(event, handler);
      };
    });
  }

  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.error('WebSocket 未连接，无法发送消息');
      return;
    }

    this.socket.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionConfig(): WebSocketConfig | null {
    return this.config;
  }
}