import { ConfigService } from '@nestjs/config';

export const createRedisConfig = (configService: ConfigService) => {
  const host = configService.get('REDIS_HOST', 'localhost');
  const port = configService.get('REDIS_PORT', 6379);
  const db = configService.get('REDIS_DB', 0);
  const password = configService.get('REDIS_PASSWORD', '');

  return {
    host,
    port,
    db,
    ...(password ? { password } : {}),
  };
};
