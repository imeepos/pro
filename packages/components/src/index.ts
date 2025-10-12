// Base Types and Interfaces
export type { Color, Size, ThemeConfig, defaultTheme } from './models/theme.model';
export * from './interfaces/component-base.interface';

// Screen Components (Legacy exports)
export type { IScreenComponent } from './screen-components/base/screen-component.interface';
export type { ComponentMetadata } from './screen-components/base/component-metadata.interface';
export { ComponentRegistryService } from './screen-components/base/component-registry.service';
export { ComponentInitializerService } from './screen-components/component-initializer.service';
export * from './screen-components/weibo/index';

// Component Validation
export { ComponentConsistencyService } from './validation/component-consistency.service';
export type {
  ComponentValidationResult,
  ConsistencyValidationReport
} from './validation/component-consistency.service';

// Legacy WebSocket Service (Backward Compatibility)
export {
  WebSocketService as LegacyWebSocketService,
  type WebSocketConfig as LegacyWebSocketConfig
} from './screen-components/services/websocket.service';

// WebSocket Services (New Architecture)
export {
  ConnectionState,
  type WebSocketConfig,
  type AuthConfig,
  type TransportConfig,
  type ReconnectionConfig,
  type WebSocketInstance,
  type EventSubscription,
  defaultTransportConfig,
  defaultReconnectionConfig,
  WebSocketService,
  WebSocketManager,
  JwtAuthService,
  createCustomWebSocketConfig,
  createNotificationWebSocketConfig,
  createScreensWebSocketConfig,
  isValidWebSocketUrl
} from './websocket/index';
