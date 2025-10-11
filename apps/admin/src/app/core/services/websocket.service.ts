import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private readonly wsUrl: string;

  constructor(private tokenStorage: TokenStorageService) {
    this.wsUrl = environment.apiUrl.replace('/api', '');
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = this.tokenStorage.getToken();
    if (!token) {
      return;
    }

    this.socket = io(`${this.wsUrl}/screens`, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
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
