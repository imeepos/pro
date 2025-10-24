import "reflect-metadata"

export * from './user.entity.js';
export * from './weibo-account.entity.js';
export * from './weibo-post.entity.js';
export * from './weibo-comment.entity.js';
export * from './weibo-user.entity.js';
export * from './weibo-media.entity.js';
export * from './weibo-hashtag.entity.js';
export * from './weibo-post-hashtag.entity.js';
export * from './weibo-post-mention.entity.js';
export * from './weibo-interaction.entity.js';
export * from './weibo-user-stats.entity.js';
export * from './enums/weibo.enums.js';
export * from './jd-account.entity.js';
export * from './screen-page.entity.js';
export * from './industry-type.entity.js';
export * from './event-type.entity.js';
export * from './event.entity.js';
export * from './event-attachment.entity.js';
export * from './tag.entity.js';
export * from './event-tag.entity.js';
export * from './weibo-search-task.entity.js';
export * from './weibo-sub-task.entity.js';
export * from './media-type.entity.js';
export * from './api-key.entity.js';
export * from './bug.entity.js';
export * from './bug-attachment.entity.js';
export * from './bug-comment.entity.js';
export * from './bug-tag.entity.js';
export * from './bug-watch.entity.js';
export * from './bug-activity.entity.js';
export * from './bug-time-tracking.entity.js';
export * from './bug-notification.entity.js';
export * from './analysis-result.entity.js';
export * from './types/analysis-types.js';
export * from './hourly-stats.entity.js';
export * from './daily-stats.entity.js';
export * from './workflow.entity.js';
export * from './workflow-execution.entity.js';

export { EventStatus } from '@pro/types';

import { DataSourceOptions } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { ApiKeyEntity } from './api-key.entity.js';
import { WeiboAccountEntity } from './weibo-account.entity.js';
import { WeiboPostEntity } from './weibo-post.entity.js';
import { WeiboCommentEntity } from './weibo-comment.entity.js';
import { WeiboUserEntity } from './weibo-user.entity.js';
import { WeiboMediaEntity } from './weibo-media.entity.js';
import { WeiboHashtagEntity } from './weibo-hashtag.entity.js';
import { WeiboPostHashtagEntity } from './weibo-post-hashtag.entity.js';
import { WeiboPostMentionEntity } from './weibo-post-mention.entity.js';
import { WeiboInteractionEntity } from './weibo-interaction.entity.js';
import { WeiboUserStatsEntity } from './weibo-user-stats.entity.js';
import { WeiboSearchTaskEntity } from './weibo-search-task.entity.js';
import { WeiboSubTaskEntity } from './weibo-sub-task.entity.js';
import { JdAccountEntity } from './jd-account.entity.js';
import { ScreenPageEntity } from './screen-page.entity.js';
import { IndustryTypeEntity } from './industry-type.entity.js';
import { EventTypeEntity } from './event-type.entity.js';
import { EventEntity } from './event.entity.js';
import { TagEntity } from './tag.entity.js';
import { EventTagEntity } from './event-tag.entity.js';
import { EventAttachmentEntity } from './event-attachment.entity.js';
import { MediaTypeEntity } from './media-type.entity.js';
import { BugEntity } from './bug.entity.js';
import { BugAttachmentEntity } from './bug-attachment.entity.js';
import { BugCommentEntity } from './bug-comment.entity.js';
import { BugTagEntity } from './bug-tag.entity.js';
import { BugWatchEntity } from './bug-watch.entity.js';
import { BugActivityEntity } from './bug-activity.entity.js';
import { BugTimeTrackingEntity } from './bug-time-tracking.entity.js';
import { BugNotificationEntity } from './bug-notification.entity.js';
import { AnalysisResultEntity } from './analysis-result.entity.js';
import { HourlyStatsEntity } from './hourly-stats.entity.js';
import { DailyStatsEntity } from './daily-stats.entity.js';
import { WorkflowEntity } from './workflow.entity.js';
import { WorkflowExecutionEntity } from './workflow-execution.entity.js';

interface ConfigService {
  get<T = any>(key: string, defaultValue?: T): T;
}

const entities = [
  UserEntity,
  ApiKeyEntity,
  WeiboAccountEntity,
  WeiboPostEntity,
  WeiboCommentEntity,
  WeiboUserEntity,
  WeiboMediaEntity,
  WeiboHashtagEntity,
  WeiboPostHashtagEntity,
  WeiboPostMentionEntity,
  WeiboInteractionEntity,
  WeiboUserStatsEntity,
  WeiboSearchTaskEntity,
  WeiboSubTaskEntity,
  JdAccountEntity,
  ScreenPageEntity,
  IndustryTypeEntity,
  EventTypeEntity,
  EventEntity,
  TagEntity,
  EventTagEntity,
  EventAttachmentEntity,
  MediaTypeEntity,
  BugEntity,
  BugAttachmentEntity,
  BugCommentEntity,
  BugTagEntity,
  BugWatchEntity,
  BugActivityEntity,
  BugTimeTrackingEntity,
  BugNotificationEntity,
  AnalysisResultEntity,
  HourlyStatsEntity,
  DailyStatsEntity,
  WorkflowEntity,
  WorkflowExecutionEntity,
];

export const createDatabaseConfig = (configService: ConfigService): DataSourceOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const nodeEnv = configService.get<string>('NODE_ENV');

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: false,
      logging: nodeEnv === 'development',
      extra: {
        timezone: 'UTC',
      },
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST', 'localhost'),
    port: configService.get<number>('POSTGRES_PORT', 5432),
    username: configService.get<string>('POSTGRES_USER', 'postgres'),
    password: configService.get<string>('POSTGRES_PASSWORD', 'postgres123'),
    database: configService.get<string>('POSTGRES_DB', 'pro'),
    entities,
    synchronize: false,
    logging: nodeEnv === 'development',
    extra: {
      timezone: 'UTC',
    },
  };
};
