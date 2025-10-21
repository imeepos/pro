import { TaskPriority } from './clean-events.js';

/**
 * 微博详情爬取事件
 *
 * 使命: 将搜索阶段发现的微博帖子交由详情爬虫深入采集
 * 设计准则:
 * - 消息轻量: 仅携带唯一标识与必要上下文
 * - 可追溯: 保留发现途径与链路标识
 * - 可调度: 通过优先级与重试信息指导消费端策略
 */
export interface WeiboDetailCrawlEvent {
  /** 微博帖子唯一标识 */
  statusId: string;

  /** 调度优先级, 影响消费顺序 */
  priority: TaskPriority;

  /** 发现来源上下文, 帮助还原任务链路 */
  sourceContext?: {
    /** 触发此次发现的任务ID */
    taskId?: number;

    /** 搜索关键词或主题 */
    keyword?: string;

    /** 搜索结果所在页码 */
    page?: number;

    /** 页面或接口来源 URL */
    discoveredAtUrl?: string;

    /** 分布式追踪标识 */
    traceId?: string;
  };

  /** 首次发现时间 - ISO 8601 */
  discoveredAt: string;

  /** 当前重试次数, 首次为0 */
  retryCount?: number;

  /** 消息发布时间 - ISO 8601 */
  createdAt: string;
}
