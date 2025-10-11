import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';

export const createDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const entities = [WeiboSearchTaskEntity];
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: false,
      logging: isDevelopment,
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST', 'localhost'),
    port: configService.get<number>('DATABASE_PORT', 5432),
    username: configService.get<string>('DATABASE_USER', 'postgres'),
    password: configService.get<string>('DATABASE_PASSWORD', 'postgres123'),
    database: configService.get<string>('DATABASE_NAME', 'pro'),
    entities,
    synchronize: false,
    logging: isDevelopment,
  };
};