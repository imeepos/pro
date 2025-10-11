import "reflect-metadata"

export * from './user.entity.js';
export * from './weibo-account.entity.js';
export * from './jd-account.entity.js';
export * from './screen-page.entity.js';
export * from './industry-type.entity.js';
export * from './event-type.entity.js';
export * from './event.entity.js';
export * from './event-attachment.entity.js';
export * from './tag.entity.js';
export * from './event-tag.entity.js';
export * from './weibo-search-task.entity.js';
export * from './media-type.entity.js';
export * from './api-key.entity.js';

import { DataSourceOptions } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { ApiKeyEntity } from './api-key.entity.js';
import { WeiboAccountEntity } from './weibo-account.entity.js';
import { WeiboSearchTaskEntity } from './weibo-search-task.entity.js';
import { JdAccountEntity } from './jd-account.entity.js';
import { ScreenPageEntity } from './screen-page.entity.js';
import { IndustryTypeEntity } from './industry-type.entity.js';
import { EventTypeEntity } from './event-type.entity.js';
import { EventEntity } from './event.entity.js';
import { TagEntity } from './tag.entity.js';
import { EventTagEntity } from './event-tag.entity.js';
import { EventAttachmentEntity } from './event-attachment.entity.js';
import { MediaTypeEntity } from './media-type.entity.js';


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
