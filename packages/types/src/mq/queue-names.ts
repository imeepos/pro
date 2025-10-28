/**
 * 消息队列名称定义
 *
 * 存在即合理: 每个队列名称对应数据流转的一个明确阶段
 * 命名哲学: 动词-名词结构,清晰表达队列的职责
 */

export const QUEUE_NAMES = {
  /** Broker/API → Crawler: 触发爬虫任务 */
  CRAWL_TASK: 'weibo_crawl_queue',

  // 微博详情列表采集
  WEIBO_LIST_CRAWL: `weibo_list_crawl_queue`,

  /** SearchCrawler → DetailCrawler: 触发微博详情采集 */
  WEIBO_DETAIL_CRAWL: 'weibo_detail_crawl_queue',

  /** Crawler → Cleaner: 原始数据已存储,触发清洗 */
  RAW_DATA_READY: 'raw_data_ready_queue',

  /** System → Cleaner: 手动触发或定时清洗任务 */
  CLEAN_TASK: 'clean_task_queue',

  /** Cleaner → Analyzer: 清洗完成,结构化数据已入库 */
  CLEANED_DATA: 'cleaned_data_queue',

  /** System → Analyzer: 触发分析任务 */
  ANALYZE_TASK: 'analyze_task_queue',

  /** Analyzer → Aggregator: 分析结果已生成 */
  ANALYSIS_RESULT: 'analysis_result_queue',

  /** System → Aggregator: 触发聚合任务 */
  AGGREGATE_TASK: 'aggregate_task_queue',

  /** Workflow → Downstream: 帖子详情工作流完成 */
  POST_DETAIL_COMPLETED: 'post_detail_completed_queue',

  /** Workflow → Downstream: 用户画像工作流完成 */
  USER_PROFILE_COMPLETED: 'user_profile_completed_queue',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
