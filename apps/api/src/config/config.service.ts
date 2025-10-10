import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType, ConfigResponseDto, GetConfigDto } from './dto/config.dto';

@Injectable()
export class ConfigService {
  private readonly cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  async getConfig(getConfigDto: GetConfigDto): Promise<ConfigResponseDto> {
    const { type } = getConfigDto;
    const cacheKey = `config:${type}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        value: cached.value,
        expiresAt: new Date(cached.expiresAt).toISOString(),
      };
    }

    // 从环境变量获取配置
    let value: string;
    switch (type) {
      case ConfigType.AMAP_API_KEY:
        value = process.env.AMAP_API_KEY;
        break;
      default:
        throw new NotFoundException(`不支持的配置类型: ${type}`);
    }

    if (!value) {
      throw new NotFoundException(`配置 ${type} 未设置`);
    }

    // 更新缓存
    const expiresAt = Date.now() + this.CACHE_TTL;
    this.cache.set(cacheKey, { value, expiresAt });

    return {
      value,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  clearCache(type?: ConfigType): void {
    if (type) {
      this.cache.delete(`config:${type}`);
    } else {
      this.cache.clear();
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}