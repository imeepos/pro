import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from './config.service';
import { ConfigType } from './dto/config.dto';
import { ConfigCacheStatsModel, ConfigValueModel } from './models/config.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ConfigResolver {
  constructor(private readonly configService: ConfigService) {}

  @Query(() => ConfigValueModel, { name: 'configValue' })
  async getConfig(
    @Args('type', { type: () => ConfigType })
    type: ConfigType,
  ): Promise<ConfigValueModel> {
    const response = await this.configService.getConfig({ type });
    return {
      value: response.value,
      expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined,
    };
  }

  @Mutation(() => Boolean, { name: 'clearConfigCache' })
  async clearCache(
    @Args('type', { type: () => ConfigType, nullable: true })
    type?: ConfigType,
  ): Promise<boolean> {
    this.configService.clearCache(type);
    return true;
  }

  @Query(() => ConfigCacheStatsModel, { name: 'configCacheStats' })
  async cacheStats(): Promise<ConfigCacheStatsModel> {
    return this.configService.getCacheStats();
  }
}
