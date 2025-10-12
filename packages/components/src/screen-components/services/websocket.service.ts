/**
 * @deprecated This service is deprecated. Use the new WebSocket architecture:
 *
 * Migration Guide:
 * Old: WebSocketService from '@pro/components'
 * New: WebSocketManager, WebSocketService from '@pro/components/websocket'
 *
 * Example migration:
 * ```typescript
 * // Old approach
 * constructor(private ws: WebSocketService) {}
 * this.ws.connect(token);
 *
 * // New approach
 * constructor(private wsManager: WebSocketManager) {}
 * const config = createScreensWebSocketConfig('http://localhost:3000', token);
 * this.ws = this.wsManager.connectToNamespace(config);
 * ```
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, distinctUntilChanged, map } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
  token?: string;
  url?: string;
}

export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Failed = 'failed'
}

interface PendingSubscription {
  event: string;
  subject: BehaviorSubject<any>;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private readonly wsUrl = 'http://localhost:3000';
  private config: WebSocketConfig | null = null;

  private readonly connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.Disconnected);
  private readonly pendingSubscriptions = new Map<string, PendingSubscription>();
  private readonly maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectTimer?: number;

  get state$(): Observable<ConnectionState> {
    return this.connectionState$.asObservable().pipe(distinctUntilChanged());
  }

  get isConnected$(): Observable<boolean> {
    return this.state$.pipe(
      filter(state => state === ConnectionState.Connected || state === ConnectionState.Disconnected),
      map(state => state === ConnectionState.Connected),
      distinctUntilChanged()
    );
  }

  connect(token?: string): void {
    if (this.connectionState$.value === ConnectionState.Connected) return;

    this.config = { token, url: this.wsUrl };
    this.establishConnection();
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.connectionState$.next(ConnectionState.Disconnected);

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.config = null;
    this.reconnectAttempts = 0;
  }

  on(event: string): Observable<any> {
    return this.getOrCreateEventStream(event);
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private establishConnection(): void {
    const { token } = this.config || {};

    this.connectionState$.next(ConnectionState.Connecting);

    this.socket = io(`${this.wsUrl}/screens`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });

    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
    this.socket.on('connect_error', (error) => this.handleConnectionError(error));
  }

  private handleConnect(): void {
    this.connectionState$.next(ConnectionState.Connected);
    this.reconnectAttempts = 0;
    this.activatePendingSubscriptions();
  }

  private handleDisconnect(reason: string): void {
    if (reason === 'io client disconnect') {
      this.connectionState$.next(ConnectionState.Disconnected);
      return;
    }

    this.attemptReconnection();
  }

  private handleConnectionError(error: Error): void {
    if (this.shouldAttemptReconnection()) {
      this.attemptReconnection();
    } else {
      this.connectionState$.next(ConnectionState.Failed);
    }
  }

  private attemptReconnection(): void {
    if (!this.shouldAttemptReconnection()) return;

    this.connectionState$.next(ConnectionState.Reconnecting);
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.reconnectTimer = window.setTimeout(() => {
      if (this.config) {
        this.establishConnection();
      }
    }, delay);
  }

  private shouldAttemptReconnection(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts &&
           this.connectionState$.value !== ConnectionState.Disconnected;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private getOrCreateEventStream(event: string): Observable<any> {
    const existing = this.pendingSubscriptions.get(event);
    if (existing) return existing.subject.asObservable();

    const subject = new BehaviorSubject<any>(null);
    this.pendingSubscriptions.set(event, { event, subject });

    if (this.socket?.connected) {
      this.activateSubscription(event);
    }

    return subject.asObservable().pipe(filter(data => data !== null));
  }

  private activatePendingSubscriptions(): void {
    this.pendingSubscriptions.forEach((_, event) => {
      this.activateSubscription(event);
    });
  }

  private activateSubscription(event: string): void {
    const subscription = this.pendingSubscriptions.get(event);
    if (!subscription || !this.socket) return;

    const handler = (data: any) => subscription.subject.next(data);
    this.socket.on(event, handler);
  }
}