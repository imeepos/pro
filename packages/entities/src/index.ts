import "reflect-metadata"

export * from './user.entity';
export * from './weibo-account.entity';
export * from './jd-account.entity';
export * from './screen-page.entity';
export * from './industry-type.entity';
export * from './event-type.entity';
export * from './event.entity';
export * from './event-attachment.entity';
export * from './tag.entity';
export * from './event-tag.entity';
export * from './weibo-search-task.entity';
export * from './media-type.entity';
export * from './api-key.entity';

import { DataSourceOptions } from 'typeorm';
import { UserEntity } from './user.entity';
import { ApiKeyEntity } from './api-key.entity';
import { WeiboAccountEntity } from './weibo-account.entity';
import { WeiboSearchTaskEntity } from './weibo-search-task.entity';
import { JdAccountEntity } from './jd-account.entity';
import { ScreenPageEntity } from './screen-page.entity';
import { IndustryTypeEntity } from './industry-type.entity';
import { EventTypeEntity } from './event-type.entity';
import { EventEntity } from './event.entity';
import { TagEntity } from './tag.entity';
import { EventTagEntity } from './event-tag.entity';
import { EventAttachmentEntity } from './event-attachment.entity';
import { MediaTypeEntity } from './media-type.entity';


interface ConfigService {
  get<T = any>(key: string, defaultValue?: T): T;
}

const entities = [
  UserEntity,
  ApiKeyEntity,
  WeiboAccountEntity,
  WeiboSearchTaskEntity,
  JdAccountEntity,
  ScreenPageEntity,
  IndustryTypeEntity,
  EventTypeEntity,
  EventEntity,
  TagEntity,
  EventTagEntity,
  EventAttachmentEntity,
  MediaTypeEntity,
];

export const createDatabaseConfig = (configService: ConfigService): DataSourceOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const nodeEnv = configService.get<string>('NODE_ENV');

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: true,
      logging: nodeEnv === 'development',
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
    synchronize: true,
    logging: nodeEnv === 'development',
  };
};

export const getDatabaseConfig = (): DataSourceOptions => {
  const legacyConfigService = {
    get: <T = any>(key: string, defaultValue?: T): T => {
      const value = process.env[key];
      if (value === undefined) return defaultValue as T;

      if (typeof defaultValue === 'number') {
        return parseInt(value, 10) as T;
      }

      return value as T;
    }
  };

  return createDatabaseConfig(legacyConfigService);
};
