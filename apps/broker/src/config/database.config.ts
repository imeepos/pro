import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const entities = [
    WeiboSearchTaskEntity,
  ];

  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities,
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
    };
  }

  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres123',
    database: process.env.DATABASE_NAME || 'pro',
    entities,
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
  };
};