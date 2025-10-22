import { Injectable } from '@nestjs/common';
import { BaseTask, NormalizedTask, SubTaskMessage } from './base-task';
import { WeiboKeywordSearchTask } from './weibo/weibo-keyword-search.task';
import { WeiboDetailTask } from './weibo/weibo-detail.task';
import { WeiboCommentsTask } from './weibo/weibo-comments.task';
import { WeiboUserInfoTask } from './weibo/weibo-user-info.task';
import { WeiboSearchType } from '@pro/types';

const passthroughKeys = ['searchType', 'statusId', 'userId', 'uid', 'page', 'maxId'] as const;
const searchKinds = new Set(Object.values(WeiboSearchType));

type OptionalKey = (typeof passthroughKeys)[number];

type MetadataBag = Record<OptionalKey | string, unknown>;

@Injectable()
export class TaskFactory {
  createTask(message: SubTaskMessage): BaseTask {
    const task = this.normalize(message);
    const kind = task.type.toUpperCase();

    if (searchKinds.has(kind as WeiboSearchType)) {
      task.metadata.searchType = kind;
      return new WeiboKeywordSearchTask(task, {
        searchType: kind as WeiboSearchType,
        page: this.toNumber(task.metadata.page),
      });
    }

    switch (kind) {
      case 'KEYWORD_SEARCH':
        return new WeiboKeywordSearchTask(task, {
          searchType: this.toSearchType(task.metadata.searchType),
          page: this.toNumber(task.metadata.page),
        });
      case 'DETAIL':
      case 'CONTENT_CRAWL':
      case 'NOTE_DETAIL':
        return new WeiboDetailTask(task, {
          statusId: this.requireString(task.metadata.statusId, 'statusId'),
        });
      case 'COMMENTS':
      case 'COMMENT':
      case 'COMMENT_ANALYSIS':
        return new WeiboCommentsTask(task, {
          statusId: this.requireString(task.metadata.statusId, 'statusId'),
          page: this.toNumber(task.metadata.page),
          maxId: this.toString(task.metadata.maxId),
        });
      case 'USER_INFO':
      case 'USER_PROFILE':
      case 'USER_PROFILE_SEARCH':
      case 'CREATOR':
        return new WeiboUserInfoTask(task, {
          userId: this.requireString(task.metadata.userId ?? task.metadata.uid, 'userId'),
        });
      default:
        throw new Error(`暂不支持的任务类型: ${task.type}`);
    }
  }

  private normalize(message: SubTaskMessage): NormalizedTask {
    if (typeof message.taskId !== 'number') {
      throw new Error('任务缺少 taskId');
    }

    const metadata: MetadataBag = { ...(message.metadata ?? {}) };
    const keyword = this.pickString([message.keyword, metadata.keyword], '任务缺少关键词');
    const start = this.pickDate(message.start ?? metadata.startTime, '开始时间');
    const end = this.pickDate(message.end ?? metadata.endTime, '结束时间');

    if (start >= end) {
      throw new Error('开始时间必须早于结束时间');
    }

    passthroughKeys.forEach((key) => {
      if (metadata[key] === undefined && (message as Record<string, unknown>)[key] !== undefined) {
        metadata[key] = (message as Record<string, unknown>)[key];
      }
    });

    const type = String(message.type ?? metadata.type ?? 'KEYWORD_SEARCH').toUpperCase();
    return { taskId: message.taskId, type, keyword, start, end, metadata };
  }

  private pickString(values: Array<unknown>, error: string): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    throw new Error(error);
  }

  private pickDate(value: unknown, field: string): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    throw new Error(`任务缺少有效的${field}`);
  }

  private toSearchType(value: unknown): WeiboSearchType | undefined {
    if (typeof value !== 'string') return undefined;
    const upper = value.toUpperCase();
    return searchKinds.has(upper as WeiboSearchType) ? (upper as WeiboSearchType) : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private toString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private requireString(value: unknown, field: string): string {
    const resolved = this.toString(value);
    if (!resolved) throw new Error(`任务缺少必要字段: ${field}`);
    return resolved;
  }
}
