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

export {
  createScreensWebSocketConfig,
  createNotificationWebSocketConfig,
  createCustomWebSocketConfig,
  isValidWebSocketUrl
} from './utils';