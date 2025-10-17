/**
 * 认证方式枚举
 */
export enum AuthMode {
  JWT = 'jwt',
  API_KEY = 'api_key',
  AUTO = 'auto'
}

/**
 * 认证配置接口
 */
export interface AuthConfig {
  /** 认证模式 */
  mode: AuthMode;
  /** token 存储的 key */
  tokenKey: string;
  /** 是否启用自动回退 */
  enableFallback?: boolean;
  /** 认证失败时的重试次数 */
  retryCount?: number;
}

/**
 * 默认认证配置
 */
export const DEFAULT_AUTH_CONFIG: Partial<AuthConfig> = {
  mode: AuthMode.JWT,
  tokenKey: 'access_token',
  enableFallback: true,
  retryCount: 1,
};

/**
 * API Key 认证配置
 */
export const API_KEY_AUTH_CONFIG: AuthConfig = {
  mode: AuthMode.API_KEY,
  tokenKey: 'api_key',
  enableFallback: false,
  retryCount: 1,
};

/**
 * JWT 认证配置
 */
export const JWT_AUTH_CONFIG: AuthConfig = {
  mode: AuthMode.JWT,
  tokenKey: 'access_token',
  enableFallback: true,
  retryCount: 1,
};

/**
 * 自动模式认证配置
 */
export const AUTO_AUTH_CONFIG: AuthConfig = {
  mode: AuthMode.AUTO,
  tokenKey: 'access_token',
  enableFallback: true,
  retryCount: 1,
};