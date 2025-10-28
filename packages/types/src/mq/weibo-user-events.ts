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
}
