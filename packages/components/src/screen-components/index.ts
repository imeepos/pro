// Base Interfaces
export type { IScreenComponent } from './base/screen-component.interface';
export type { ComponentMetadata } from './base/component-metadata.interface';

// Services
export { ComponentRegistryService } from './base/component-registry.service';
export { WebSocketService, type WebSocketConfig } from './services/websocket.service';

// Weibo Components
export * from './weibo/index';