export {
  ConnectionState,
  type WebSocketConfig,
  type AuthConfig,
  type TransportConfig,
  type ReconnectionConfig,
  type WebSocketInstance,
  type EventSubscription,
  defaultTransportConfig,
  defaultReconnectionConfig
} from './websocket.types';

export { WebSocketService } from './websocket.service';
export { WebSocketManager } from './websocket.manager';
export { JwtAuthService } from './auth/jwt-auth.service';

import { WebSocketConfig } from './websocket.types';

export function createWebSocketConfig(
  url: string,
  namespace: string,
  options?: Partial<Omit<WebSocketConfig, 'url' | 'namespace'>>
): WebSocketConfig {
  return {
    url,
    namespace,
    ...options
  };
}

export function createScreensWebSocketConfig(
  baseUrl: string = 'http://localhost:3000',
  token?: string
): WebSocketConfig {
  return createWebSocketConfig(baseUrl, 'screens', {
    auth: token ? { token } : undefined
  });
}