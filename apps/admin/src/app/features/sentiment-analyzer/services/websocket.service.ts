import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface WebsocketPayload<T> {
  event: string;
  payload: T;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private readonly zone = inject(NgZone);
  private connection?: WebSocket;
  private endpoint?: string;
  private readonly channels = new Map<string, Subject<unknown>>();

  connect(url: string): void {
    if (this.endpoint === url && this.connection && this.connection.readyState === WebSocket.OPEN) {
      return;
    }

    this.teardown();
    this.endpoint = url;

    this.zone.runOutsideAngular(() => {
      this.connection = new WebSocket(url);
      this.connection.onmessage = (event) => this.handleIncoming(event);
      this.connection.onclose = () => this.handleClosure();
      this.connection.onerror = () => this.handleClosure();
    });
  }

  listen<T>(event: string): Observable<T> {
    if (!this.channels.has(event)) {
      this.channels.set(event, new Subject<unknown>());
    }

    const channel = this.channels.get(event)!;
    return channel.asObservable() as Observable<T>;
  }

  disconnect(): void {
    this.teardown();
  }

  private handleIncoming(event: MessageEvent<string>): void {
    try {
      const message = JSON.parse(event.data) as WebsocketPayload<unknown>;
      const channel = this.channels.get(message.event);
      if (!channel) {
        return;
      }

      this.zone.run(() => channel.next(message.payload));
    } catch (error) {
      console.error('解析 WebSocket 消息失败', error);
    }
  }

  private handleClosure(): void {
    this.zone.run(() => {
      this.channels.forEach((channel) => channel.complete());
      this.channels.clear();
    });
    this.teardownConnection();
  }

  private teardown(): void {
    this.channels.forEach((channel) => channel.complete());
    this.channels.clear();
    this.teardownConnection();
  }

  private teardownConnection(): void {
    if (!this.connection) {
      return;
    }

    this.connection.onclose = null;
    this.connection.onerror = null;
    this.connection.onmessage = null;
    this.connection.close();
    this.connection = undefined;
    this.endpoint = undefined;
  }
}
