
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
  statusId: string;
}
