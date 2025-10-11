import { RedisOptions } from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const redisConfigFactory = (configService: ConfigService): RedisOptions | string => {
  const redisUrl = configService.get<string>('REDIS_URL');

  if (redisUrl) {
    return redisUrl;
  }

  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD'),
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  };
};

export const createRedisConfig = () => ({
  inject: [ConfigService],
  useFactory: redisConfigFactory,
});
