import { TaskPriority } from './clean-events.js';

/**
 * 微博用户信息爬取事件
 *
 * 使命: 触发用户画像采集，深入了解用户行为和特征
 * 设计准则:
 * - 消息轻量: 仅携带用户唯一标识
 * - 可追溯: 保留发现途径与链路标识
 * - 可调度: 通过优先级指导消费端策略
 */
export interface UserProfileCrawlEvent {
  /** 微博用户唯一标识 */
  userId: string;

  /** 调度优先级, 影响消费顺序 */
  priority?: TaskPriority;

  /** 发现来源上下文, 帮助还原任务链路 */
  sourceContext?: {
    /** 触发此次发现的任务ID */
    taskId?: number;

    /** 搜索关键词或主题 */
    keyword?: string;

    /** 发现来源（帖子作者、评论者、点赞者） */
    source?: 'post-author' | 'commenter' | 'liker';

    /** 关联的帖子ID（如果从帖子中发现） */
    relatedPostId?: string;

    /** 分布式追踪标识 */
    traceId?: string;
  };

  /** 首次发现时间 - ISO 8601 */
  discoveredAt?: string;

  /** 当前重试次数, 首次为0 */
  retryCount?: number;

  /** 消息发布时间 - ISO 8601 */
  createdAt?: string;
}
