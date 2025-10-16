import { GraphQLClient } from '../client/graphql-client.js';
import {
  ConfigType,
  GetConfigParams,
  ConfigResponse,
  CacheStats,
} from '../types/config.types.js';

interface ConfigValueResponse {
  configValue: {
    value: string;
    expiresAt?: string;
  };
}

interface ConfigCacheStatsResponse {
  configCacheStats: CacheStats;
}

interface ClearConfigCacheResponse {
  clearConfigCache: boolean;
}

export class ConfigApi {
  private client: GraphQLClient;

  constructor(baseUrl: string, tokenKey?: string) {
    this.client = new GraphQLClient(baseUrl, tokenKey);
  }

  async getConfig(params: GetConfigParams): Promise<ConfigResponse> {
    const query = `
      query ConfigValue($type: ConfigType!) {
        configValue(type: $type) {
          value
          expiresAt
        }
      }
    `;

    const response = await this.client.query<ConfigValueResponse>(query, { type: params.type });
    return {
      value: response.configValue.value,
      expiresAt: response.configValue.expiresAt,
    };
  }

  async getAmapApiKey(): Promise<string> {
    const response = await this.getConfig({ type: ConfigType.AMAP_API_KEY });
    return response.value;
  }

  async clearCache(type?: ConfigType): Promise<void> {
    const mutation = `
      mutation ClearConfigCache($type: ConfigType) {
        clearConfigCache(type: $type)
      }
    `;

    await this.client.mutate<ClearConfigCacheResponse>(mutation, type ? { type } : undefined);
  }

  async getCacheStats(): Promise<CacheStats> {
    const query = `
      query ConfigCacheStats {
        configCacheStats {
          size
          keys
        }
      }
    `;

    const response = await this.client.query<ConfigCacheStatsResponse>(query);
    return response.configCacheStats;
  }
}