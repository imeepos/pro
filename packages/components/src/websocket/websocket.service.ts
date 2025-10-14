import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, distinctUntilChanged, map } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  ConnectionState,
  WebSocketConfig,
  WebSocketInstance,
  defaultTransportConfig,
  defaultReconnectionConfig
} from './websocket.types';
import { JwtAuthService } from './auth/jwt-auth.service';

interface EventStream {
  readonly subject: BehaviorSubject<any>;
  readonly unsubscribe: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements WebSocketInstance {
  private socket: Socket | null = null;
  private config: WebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer?: number;
  private authFailure = false;

  private readonly connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.Disconnected);
  private readonly eventStreams = new Map<string, EventStream>();

  constructor(private readonly authService: JwtAuthService) {}

  get state$(): Observable<ConnectionState> {
    return this.connectionState$.asObservable().pipe(distinctUntilChanged());
  }

  get isConnected$(): Observable<boolean> {
    return this.state$.pipe(
      map(state => state === ConnectionState.Connected),
      distinctUntilChanged()
    );
  }

  connect(config: WebSocketConfig): void {
    if (this.connectionState$.value === ConnectionState.Connected) {
      return;
    }

    this.config = this.enrichConfig(config);
    this.authFailure = false;
    this.establishConnection();
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.updateConnectionState(ConnectionState.Disconnected);
    this.cleanupConnection();
    this.resetState();
  }

  on<T = any>(event: string): Observable<T> {
    return this.getOrCreateEventStream(event);
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private enrichConfig(config: WebSocketConfig): WebSocketConfig {
    return {
      ...config,
      transport: { ...defaultTransportConfig, ...config.transport },
      reconnection: { ...defaultReconnectionConfig, ...config.reconnection }
    };
  }

  private establishConnection(): void {
    if (!this.config) return;

    this.updateConnectionState(ConnectionState.Connecting);

    const socketUrl = this.buildSocketUrl();
    const socketOptions = this.buildSocketOptions();

    this.socket = io(socketUrl, socketOptions);
    this.attachSocketEventHandlers();
  }

  private buildSocketUrl(): string {
    const { url, namespace } = this.config!;
    return namespace ? `${url}/${namespace}` : url;
  }

  private buildSocketOptions(): any {
    const { auth, transport } = this.config!;

    return {
      auth: this.buildAuthConfig(auth),
      ...transport
    };
  }

  private buildAuthConfig(auth?: any): any {
    if (!auth?.token && !this.authService.currentToken) {
      return {};
    }

    return {
      token: auth?.token || this.authService.currentToken
    };
  }

  private attachSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => this.handleConnection());
    this.socket.on('disconnect', (reason) => this.handleDisconnection(reason));
    this.socket.on('connect_error', (error) => this.handleConnectionError(error));
    this.socket.on('auth:error', (error) => this.handleAuthError(error));
  }

  private handleConnection(): void {
    this.updateConnectionState(ConnectionState.Connected);
    this.reconnectAttempts = 0;
    this.activateEventStreams();
  }

  private handleDisconnection(reason: string): void {
    if (reason === 'io client disconnect') {
      if (this.authFailure) {
        return;
      }

      this.updateConnectionState(ConnectionState.Disconnected);
      return;
    }

    this.attemptReconnection();
  }

  private async handleConnectionError(error: Error): Promise<void> {
    if (this.shouldRefreshToken(error)) {
      await this.attemptTokenRefresh();
      return;
    }

    if (error.message.includes('jwt expired')) {
      this.updateConnectionState(ConnectionState.Failed);
      this.emitTokenExpired();
      return;
    }

    if (this.shouldAttemptReconnection()) {
      this.attemptReconnection();
    } else {
      this.updateConnectionState(ConnectionState.Failed);
    }
  }

  private shouldRefreshToken(error: Error): boolean {
    return error.message.includes('token') &&
           this.config?.auth?.autoRefresh === true &&
           this.config.auth.onTokenExpired !== undefined;
  }

  private async attemptTokenRefresh(): Promise<void> {
    try {
      const onTokenExpired = this.config?.auth?.onTokenExpired;
      if (onTokenExpired) {
        await this.authService.refreshToken(onTokenExpired);
        this.establishConnection();
      }
    } catch (error) {
      this.updateConnectionState(ConnectionState.Failed);
    }
  }

  private attemptReconnection(): void {
    if (!this.config?.reconnection || !this.shouldAttemptReconnection()) return;

    this.clearReconnectTimer();
    this.updateConnectionState(ConnectionState.Reconnecting);
    this.reconnectAttempts++;

    const delay = this.config!.reconnection!.delay(this.reconnectAttempts - 1);

    this.reconnectTimer = window.setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  private shouldAttemptReconnection(): boolean {
    if (!this.config?.reconnection) {
      return false;
    }

    const currentState = this.connectionState$.value;
    if (currentState === ConnectionState.Disconnected || currentState === ConnectionState.Failed || this.authFailure) {
      return false;
    }

    return this.reconnectAttempts < this.config.reconnection.maxAttempts;
  }

  private getOrCreateEventStream<T = any>(event: string): Observable<T> {
    const existing = this.eventStreams.get(event);
    if (existing) {
      return existing.subject.asObservable().pipe(filter(data => data !== null));
    }

    const subject = new BehaviorSubject<any>(null);
    const unsubscribe = () => this.destroyEventStream(event);

    this.eventStreams.set(event, { subject, unsubscribe });

    if (this.socket?.connected) {
      this.activateEventStream(event);
    }

    return subject.asObservable().pipe(filter(data => data !== null));
  }

  private activateEventStreams(): void {
    this.eventStreams.forEach((_, event) => {
      this.activateEventStream(event);
    });
  }

  private activateEventStream(event: string): void {
    const stream = this.eventStreams.get(event);
    if (!stream || !this.socket) return;

    this.socket.on(event, (data: any) => stream.subject.next(data));
  }

  private destroyEventStream(event: string): void {
    const stream = this.eventStreams.get(event);
    if (stream) {
      stream.subject.complete();
      this.eventStreams.delete(event);

      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  private updateConnectionState(state: ConnectionState): void {
    this.connectionState$.next(state);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private cleanupConnection(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
  }

  private resetState(): void {
    this.config = null;
    this.reconnectAttempts = 0;
    this.authFailure = false;
    this.eventStreams.forEach(stream => stream.subject.complete());
    this.eventStreams.clear();
  }

  private handleAuthError(error: { message: string; code: string }): void {
    console.error('[WebSocketService] Authentication error:', error);

    this.authFailure = true;
    this.terminateConnectionOnAuthFailure();
    this.updateConnectionState(ConnectionState.Failed);

    if (error.code === 'TOKEN_EXPIRED') {
      this.emitTokenExpired();
      return;
    }

    this.emitAuthError(error);
  }

  private emitTokenExpired(): void {
    if (this.socket) {
      this.socket.emit('auth:token-expired');
    }
  }

  private emitAuthError(error: { message: string; code: string }): void {
    if (this.socket) {
      this.socket.emit('auth:authentication-failed', error);
    }
  }

  private terminateConnectionOnAuthFailure(): void {
    this.clearReconnectTimer();

    if (!this.socket) {
      return;
    }

    if (this.socket.io?.opts) {
      this.socket.io.opts.reconnection = false;
    }

    if (this.socket.connected) {
      this.socket.disconnect();
    } else {
      this.socket.close();
    }
  }
}
