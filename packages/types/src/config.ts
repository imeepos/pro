import { ConfigType } from './enums/config.js';

export * from './enums/config.js';

/**
 * 获取配置请求参数
 */
export interface GetConfigParams {
  type: ConfigType;
}

/**
 * 配置响应数据
 */
export interface ConfigResponse {
  value: string;
  expiresAt?: string;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  size: number;
  keys: string[];
}
