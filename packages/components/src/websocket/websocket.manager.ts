import { Injectable } from '@angular/core';
import { Observable, merge, map, distinctUntilChanged, of } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { ConnectionState, WebSocketConfig, WebSocketInstance } from './websocket.types';

interface ManagedConnection {
  readonly instance: WebSocketInstance;
  readonly config: WebSocketConfig;
  readonly namespace: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketManager {
  private readonly connections = new Map<string, ManagedConnection>();

  constructor(private readonly wsFactory: () => WebSocketService) {}

  static withConfig(baseUrl: string, defaultNamespace: string = '') {
    return {
      forScreens: (): WebSocketConfig => ({
        url: baseUrl,
        namespace: defaultNamespace || 'screens'
      }),
      forNotifications: (): WebSocketConfig => ({
        url: baseUrl,
        namespace: 'notifications'
      }),
      custom: (namespace: string): WebSocketConfig => ({
        url: baseUrl,
        namespace
      })
    };
  }

  getConnection(namespace: string): WebSocketInstance | null {
    return this.connections.get(namespace)?.instance || null;
  }

  createConnection(config: WebSocketConfig): WebSocketInstance {
    const { namespace } = config;

    if (this.connections.has(namespace)) {
      throw new Error(`Connection for namespace '${namespace}' already exists`);
    }

    const instance = this.wsFactory();
    const connection: ManagedConnection = { instance, config, namespace };

    this.connections.set(namespace, connection);
    return instance;
  }

  connectToNamespace(config: WebSocketConfig): WebSocketInstance {
    const existing = this.getConnection(config.namespace);
    if (existing) {
      return existing;
    }

    const instance = this.createConnection(config);
    instance.connect(config);
    return instance;
  }

  disconnectFromNamespace(namespace: string): void {
    const connection = this.connections.get(namespace);
    if (connection) {
      connection.instance.disconnect();
      this.connections.delete(namespace);
    }
  }

  disconnectAll(): void {
    this.connections.forEach((connection, namespace) => {
      connection.instance.disconnect();
    });
    this.connections.clear();
  }

  get globalConnectionState$(): Observable<ConnectionState> {
    if (this.connections.size === 0) {
      return of(ConnectionState.Disconnected);
    }

    const stateStreams = Array.from(this.connections.values())
      .map(connection => connection.instance.state$);

    return merge(...stateStreams).pipe(
      map(() => this.calculateGlobalState()),
      distinctUntilChanged()
    );
  }

  get globalConnectionStatus$(): Observable<boolean> {
    return this.globalConnectionState$.pipe(
      map(state => state === ConnectionState.Connected),
      distinctUntilChanged()
    );
  }

  private calculateGlobalState(): ConnectionState {
    const states = Array.from(this.connections.values())
      .map(connection => this.getCurrentState(connection.instance));

    if (states.every(state => state === ConnectionState.Connected)) {
      return ConnectionState.Connected;
    }

    if (states.some(state => state === ConnectionState.Connecting)) {
      return ConnectionState.Connecting;
    }

    if (states.some(state => state === ConnectionState.Reconnecting)) {
      return ConnectionState.Reconnecting;
    }

    if (states.some(state => state === ConnectionState.Failed)) {
      return ConnectionState.Failed;
    }

    return ConnectionState.Disconnected;
  }

  private getCurrentState(instance: WebSocketInstance): ConnectionState {
    let currentState = ConnectionState.Disconnected;
    instance.state$.subscribe(state => currentState = state).unsubscribe();
    return currentState;
  }
}

