import { CleanTaskResult } from '../base-task';
import { WeiboBaseCleanTask, WeiboTaskContext } from './weibo-base-clean-task';
import {
  NormalizedWeiboPost,
  NormalizedWeiboUser,
  normalizeStatus,
  normalizeTimeline,
  normalizeUser,
} from './weibo-normalizer';
import { narrate } from '../../utils/logging';
import { QUEUE_NAMES, WeiboDetailCrawlEvent } from '@pro/types';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { CleanTaskMessage } from '../clean-task-message';

export class WeiboKeywordSearchCleanTask extends WeiboBaseCleanTask {
  readonly name = 'WeiboKeywordSearchCleanTask';

  private extractWeiboDetailIds(sourceUrl: string): { uid: string; mid: string } | null {
    // 解析微博详情链接格式: /:uid/:mid
    const match = sourceUrl.match(/\/(\w+)\/(\w+)(?:\?|$)/);
    if (match) {
      return { uid: match[1], mid: match[2] };
    }
    return null;
  }

  private extractPageNumber(sourceUrl: string): number | undefined {
    // 从URL中提取页码，例如: page=2
    const match = sourceUrl.match(/[?&]page=(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private async sendDetailCrawlTask(
    rabbitMQService: RabbitMQService,
    statusId: string,
  ): Promise<void> {
    const event: WeiboDetailCrawlEvent = {
      statusId,
    };

    const success = await rabbitMQService.getClient().publish(
      QUEUE_NAMES.WEIBO_DETAIL_CRAWL,
      event,
    );

    if (success) {
      console.log(`[WeiboDetailCrawl] 已发送详情爬取任务: ${statusId}`);
    } else {
      console.warn(`[WeiboDetailCrawl] 发送详情爬取任务失败: ${statusId}`);
    }
  }

  protected async handle(context: WeiboTaskContext): Promise<CleanTaskResult> {
    const { rawData, logger, message, rabbitMQService } = context;
    const payload = this.extractPayload(rawData.rawContent);

    // Step1: 打印 payload 长度
    const payloadLength = rawData.rawContent?.length || 0;
    logger.log(
      narrate('微博搜索数据清洗任务开始', {
        rawDataId: rawData._id.toString(),
        payloadLength,
        sourceUrl: rawData.sourceUrl,
      }),
    );

    const statuses = normalizeTimeline(payload);

    if (statuses.length === 0) {
      logger.warn(
        narrate('未从微博搜索数据中解析出有效状态', {
          rawDataId: rawData._id.toString(),
        }),
      );
      return { postIds: [], commentIds: [], userIds: [], notes: { empty: true } };
    }

    const users: NormalizedWeiboUser[] = [];
    const posts: NormalizedWeiboPost[] = [];
    let minCreatedAt: Date | null = null;

    // Step2: 解析微博详情链接并发送详情爬取任务
    const detailIds = this.extractWeiboDetailIds(rawData.sourceUrl);
    if (detailIds) {
      const statusId = `${detailIds.uid}_${detailIds.mid}`;
      await this.sendDetailCrawlTask(rabbitMQService, statusId);
    }

    for (const status of statuses) {
      const author = normalizeUser(status.user);
      if (author) {
        users.push(author);
      }

      const normalizedStatus = normalizeStatus(status);
      if (normalizedStatus) {
        posts.push(normalizedStatus);

        // 跟踪最小创建时间
        if (!minCreatedAt || normalizedStatus.createdAt < minCreatedAt) {
          minCreatedAt = normalizedStatus.createdAt;
        }
      }

      const retweeted = (status as unknown as Record<string, unknown>).retweeted_status as Record<string, unknown> | undefined;
      if (retweeted) {
        const retweetedStatus = normalizeStatus(retweeted as never);
        const retweetedUser = normalizeUser((retweeted as Record<string, unknown>).user as never);
        if (retweetedUser) {
          users.push(retweetedUser);
        }
        if (retweetedStatus) {
          posts.push(retweetedStatus);

          // 跟踪最小创建时间（转发帖）
          if (!minCreatedAt || retweetedStatus.createdAt < minCreatedAt) {
            minCreatedAt = retweetedStatus.createdAt;
          }
        }
      }
    }

    const helpers = this.getHelpers(context);
    const userMap = await helpers.weibo.saveUsers(users);
    const postMap = await helpers.weibo.savePosts(posts, userMap);

    // Step3: 处理分页逻辑
    await this.handlePaginationLogic(context, minCreatedAt);

    return {
      postIds: [...postMap.values()].map((post) => String(post.id)),
      commentIds: [],
      userIds: [...userMap.values()].map((user) => String(user.id)),
    };
  }

  private async handlePaginationLogic(
    context: WeiboTaskContext,
    minCreatedAt: Date | null,
  ): Promise<void> {
    const { rawData, logger, message, rabbitMQService } = context;
    const currentPage = this.extractPageNumber(rawData.sourceUrl);

    if (currentPage === undefined) {
      logger.debug('无法从URL中提取页码，跳过分页逻辑');
      return;
    }

    logger.log(
      narrate('处理分页逻辑', {
        currentPage,
        minCreatedAt: minCreatedAt?.toISOString(),
        keyword: message.metadata?.keyword,
      }),
    );

    // 根据页码决定下一步操作
    if (currentPage < 50) {
      // 发送下一页抓取任务
      await this.sendNextPageTask(rabbitMQService, message, currentPage + 1);
    } else if (currentPage === 50 && minCreatedAt) {
      // 使用时间窗口调整重新触发关键字检索任务
      await this.sendTimeWindowSearchTask(rabbitMQService, message, minCreatedAt);
    }
  }

  private async sendNextPageTask(
    rabbitMQService: RabbitMQService,
    message: CleanTaskMessage,
    nextPage: number,
  ): Promise<void> {
    // 这里需要实现发送下一页抓取任务的逻辑
    // 由于缺少具体的抓取任务事件定义，暂时记录日志
    console.log(`[Pagination] 应该发送第 ${nextPage} 页抓取任务`);
  }

  private async sendTimeWindowSearchTask(
    rabbitMQService: RabbitMQService,
    message: CleanTaskMessage,
    minCreatedAt: Date,
  ): Promise<void> {
    // 这里需要实现发送时间窗口调整后的搜索任务
    // 使用 [任务开始时间]-[最小时间值] + 关键字 重新触发
    const taskStartTime = new Date(message.createdAt);
    const timeWindow = `${taskStartTime.toISOString()}-${minCreatedAt.toISOString()}`;
    const keyword = message.metadata?.keyword;

    console.log(`[TimeWindowSearch] 应该发送时间窗口搜索任务: ${timeWindow} + ${keyword}`);
  }

  private extractPayload(raw: string): unknown {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // fall through to script extraction
      }
    }

    const marker = 'window.__INITIAL_STATE__';
    const markerIndex = raw.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const startIndex = raw.indexOf('=', markerIndex);
    if (startIndex === -1) {
      return null;
    }

    const scriptEnd = raw.indexOf('</script>', startIndex);
    const slice = raw.slice(startIndex + 1, scriptEnd === -1 ? undefined : scriptEnd).trim();
    const payload = slice.endsWith(';') ? slice.slice(0, -1) : slice;

    try {
      return JSON.parse(payload);
    } catch {
      try {
        const sanitized = payload.replace(/;$/, '');
        return JSON.parse(sanitized);
      } catch {
        return null;
      }
    }
  }
}
