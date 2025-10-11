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


export const getDatabaseConfig = (): DataSourceOptions => {
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
