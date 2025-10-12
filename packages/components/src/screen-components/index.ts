// Base Interfaces
export type { IScreenComponent } from './base/screen-component.interface.js';
export type { ComponentMetadata } from './base/component-metadata.interface.js';

// Services
export { ComponentRegistryService } from './base/component-registry.service.js';
export { WebSocketService, type WebSocketConfig } from './services/websocket.service.js';

// Weibo Components
export * from './weibo/index.js';