import "reflect-metadata"
import { root } from "@pro/core";
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
export * from './workflow-state.entity.js';
export * from './failed-task.entity.js';

export { EventStatus } from '@pro/types';

import { DataSourceOptions, EntityManager } from 'typeorm';
import { ENTITY } from "./decorator.js";
import { DataSource } from 'typeorm'

export const createDatabaseConfig = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;
  const entities = root.get(ENTITY, [])
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: true,
      logging: false,
      extra: {
        timezone: 'UTC',
      },
    };
  }
  throw new Error(`not found DATABASE_URL`)
};


export const createDataSource = () => {
  return new DataSource(createDatabaseConfig())
}

export const useDataSource = async () => {
  const ds = createDataSource()
  await ds.initialize();
  return ds;
}

export const useEntityManager = async <T>(h: (m: EntityManager) => Promise<T>): Promise<T> => {
  const ds = await useDataSource()
  const m = ds.createEntityManager()
  const res = await h(m)
  await ds.destroy()
  return res;
}

export const useTranslation = async <T>(h: (m: EntityManager) => Promise<T>) => {
  return await useEntityManager(async m => {
    return m.transaction(h)
  })
}
