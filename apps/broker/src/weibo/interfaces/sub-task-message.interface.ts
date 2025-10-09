/**
 * 微博搜索子任务消息接口
 * 通过 RabbitMQ 传递给 crawler 执行
 */
export interface SubTaskMessage {
  /** 主任务ID */
  taskId: number;

  /** 搜索关键词 */
  keyword: string;

  /** 时间范围开始 - 小时精度 */
  start: Date;

  /** 时间范围结束 - 小时精度 */
  end: Date;

  /** 是否为首次抓取（历史数据回溯） */
  isInitialCrawl: boolean;

  /** 指定的微博账号ID（可选） */
  weiboAccountId?: number;

  /** 是否启用账号轮换 */
  enableAccountRotation: boolean;
}

/**
 * 微博搜索子任务消息类型
 * 用于 RabbitMQ 路由键和队列名定义
 */
export const WEIBO_CRAWL_QUEUE = 'weibo_crawl_queue';

/**
 * 微博搜索子任务路由键
 */
export const WEIBO_CRAWL_ROUTING_KEY = 'weibo.search.crawl';

/**
 * 微博任务结果消息接口
 * Crawler 完成后发送回 Broker 的结果
 */
export interface TaskResultMessage {
  /** 主任务ID */
  taskId: number;

  /** 子任务执行状态 */
  status: 'success' | 'failed';

  /** 错误信息（失败时） */
  errorMessage?: string;

  /** 第1页第1条微博时间（最新数据） */
  firstPostTime?: Date;

  /** 第50页最后一条微博时间（较旧数据） */
  lastPostTime?: Date;

  /** 实际抓取页数 */
  pageCount: number;

  /** 是否需要触发下一个子任务 */
  shouldTriggerNext: boolean;

  /** 下个子任务的结束时间（lastPostTime） */
  nextEndTime?: Date;

  /** 执行开始时间 */
  startedAt: Date;

  /** 执行结束时间 */
  completedAt: Date;
}