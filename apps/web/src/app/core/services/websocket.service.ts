import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private readonly wsUrl = 'http://localhost:3000';

  constructor(private tokenStorage: TokenStorageService) {}

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.tokenStorage.getToken();
    if (!token) {
      console.error('无法连接 WebSocket：未找到认证令牌');
      return;
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
    }
  }

  on(event: string): Observable<any> {
    return new Observable((observer) => {
      if (!this.socket) {
        this.connect();
      }

      const handler = (data: any) => {
        observer.next(data);
      };

      this.socket?.on(event, handler);

      return () => {
        this.socket?.off(event, handler);
      };
    });
  }
}
