import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';
import { JdAccountEntity } from '../entities/jd-account.entity';
import { ScreenPageEntity } from '../entities/screen-page.entity';
import { IndustryTypeEntity } from '../entities/industry-type.entity';
import { EventTypeEntity } from '../entities/event-type.entity';
import { EventEntity } from '../entities/event.entity';
import { TagEntity } from '../entities/tag.entity';
import { EventTagEntity } from '../entities/event-tag.entity';
import { EventAttachmentEntity } from '../entities/event-attachment.entity';
import { MediaTypeEntity } from '../entities/media-type.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const entities = [
    UserEntity,
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
      synchronize: false,
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
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  };
};
