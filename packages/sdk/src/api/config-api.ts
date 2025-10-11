import { HttpClient } from '../client/http-client';
import {
  ConfigType,
  GetConfigParams,
  ConfigResponse,
  CacheStats,
} from '../types/config.types';

/**
 * 配置 API 接口封装
 */
export class ConfigApi {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  /**
   * 获取配置值
   */
  async getConfig(params: GetConfigParams): Promise<ConfigResponse> {
    return this.http.get<ConfigResponse>('/api/config', params as unknown as Record<string, unknown>);
  }

  /**
   * 获取高德地图API Key
   */
  async getAmapApiKey(): Promise<string> {
    const response = await this.getConfig({ type: ConfigType.AMAP_API_KEY });
    return response.value;
  }

  /**
   * 清除配置缓存
   */
  async clearCache(type?: ConfigType): Promise<void> {
    const params = type ? { type } : undefined;
    await this.http.delete('/api/config/cache', params as unknown as Record<string, unknown>);
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<CacheStats> {
    return this.http.get<CacheStats>('/api/config/cache/stats');
  }
}