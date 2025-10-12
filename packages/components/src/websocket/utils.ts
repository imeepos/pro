import { WebSocketConfig, AuthConfig } from './websocket.types';

export function createScreensWebSocketConfig(
  baseUrl: string,
  token?: string,
  authConfig?: Partial<AuthConfig>
): WebSocketConfig {
  return {
    url: baseUrl,
    namespace: 'screens',
    auth: token ? {
      token,
      autoRefresh: true,
      ...authConfig
    } : undefined
  };
}

export function createNotificationWebSocketConfig(
  baseUrl: string,
  token?: string
): WebSocketConfig {
  return {
    url: baseUrl,
    namespace: 'notifications',
    auth: token ? { token } : undefined
  };
}

export function createCustomWebSocketConfig(
  baseUrl: string,
  namespace: string,
  options?: Partial<WebSocketConfig>
): WebSocketConfig {
  return {
    url: baseUrl,
    namespace,
    ...options
  };
}

export function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}