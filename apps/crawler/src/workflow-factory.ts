import { Injectable } from '@nestjs/common';
import { WorkflowBuilderService, createPlaywrightAst } from '@pro/workflow';
import { createWeiboSearchUrlBuilderAst, createAccountInjectorAst, createStorageAst } from '@pro/weibo';
import { SubTaskMessage, NormalizedTask } from './types';
import { WeiboSearchType, SourceType, SourcePlatform } from '@pro/types';

const passthroughKeys = ['searchType', 'statusId', 'userId', 'uid', 'page', 'maxId'] as const;
const searchKinds = new Set(Object.values(WeiboSearchType));

type OptionalKey = (typeof passthroughKeys)[number];
type MetadataBag = Record<OptionalKey | string, unknown>;

@Injectable()
export class WorkflowFactory {
  constructor(private readonly builder: WorkflowBuilderService) {}

  createWorkflow(message: SubTaskMessage) {
    const task = this.normalize(message);
    const kind = task.type.toUpperCase();

    if (searchKinds.has(kind as WeiboSearchType)) {
      task.metadata.searchType = kind;
      return this.buildKeywordSearchWorkflow(task, {
        searchType: kind as WeiboSearchType,
        page: this.toNumber(task.metadata.page),
      });
    }

    switch (kind) {
      case 'KEYWORD_SEARCH':
        return this.buildKeywordSearchWorkflow(task, {
          searchType: this.toSearchType(task.metadata.searchType),
          page: this.toNumber(task.metadata.page),
        });
      default:
        throw new Error(`暂不支持的任务类型: ${task.type}`);
    }
  }

  private buildKeywordSearchWorkflow(task: NormalizedTask, options: { searchType?: WeiboSearchType; page?: number }) {
    const searchType = options.searchType || WeiboSearchType.DEFAULT;
    const page = options.page || 1;

    const urlBuilder = createWeiboSearchUrlBuilderAst({
      keyword: task.keyword,
      start: task.start,
      end: task.end,
      page,
      searchType,
    });

    const accountInjector = createAccountInjectorAst({
      taskId: task.taskId,
      taskName: 'WeiboKeywordSearchWorkflow',
    });

    const playwright = createPlaywrightAst({
      url: '',
      ua: '',
      cookies: '',
    });

    const storage = createStorageAst({
      type: SourceType.WEIBO_KEYWORD_SEARCH,
      platform: SourcePlatform.WEIBO,
      metadata: {
        ...task.metadata,
        taskId: task.taskId,
        keyword: task.keyword,
        page,
        searchType,
        timeRange: {
          start: task.start.toISOString(),
          end: task.end.toISOString(),
        },
      },
    });

    return this.builder
      .createBuilder()
      .addAst(urlBuilder)
      .addAst(accountInjector)
      .addAst(playwright)
      .addAst(storage)
      .addEdge({ from: urlBuilder.id, to: playwright.id, fromProperty: 'url', toProperty: 'url' })
      .addEdge({ from: accountInjector.id, to: playwright.id, fromProperty: 'cookies', toProperty: 'cookies' })
      .addEdge({ from: accountInjector.id, to: playwright.id, fromProperty: 'userAgent', toProperty: 'ua' })
      .addEdge({ from: playwright.id, to: storage.id, fromProperty: 'html', toProperty: 'raw' })
      .addEdge({ from: playwright.id, to: storage.id, fromProperty: 'url', toProperty: 'url' })
      .build('WeiboKeywordSearchWorkflow');
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
}
