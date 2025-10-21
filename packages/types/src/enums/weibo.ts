/**
 * 微博相关枚举定义 - 单一数据源
 * 所有微博相关的状态枚举统一定义在此文件
 * 其他包必须从此处导入，禁止重复定义
 */

/**
 * 微博搜索类型枚举 - 灵感源自MediaCrawler的多模式爬取策略
 * 每种类型都有其独特的存在价值和使用场景
 */
export enum WeiboSearchType {
  DEFAULT = 'DEFAULT',         // 综合搜索 - 默认模式，平衡覆盖面与精确性
  REAL_TIME = 'REAL_TIME',     // 实时搜索 - 捕捉当下正在发生的微博
  POPULAR = 'POPULAR',         // 热门搜索 - 发现广受关注的热点内容
  VIDEO = 'VIDEO',             // 视频搜索 - 专注于视频内容的多媒体探索
  USER = 'USER',               // 用户搜索 - 寻找特定创作者或账号
  TOPIC = 'TOPIC'              // 话题搜索 - 跟踪超话和热门话题
}

/**
 * 微博爬取模式枚举 - 定义不同的爬取维度和策略
 */
export enum WeiboCrawlMode {
  SEARCH = 'SEARCH',           // 搜索模式 - 基于关键词的内容发现
  DETAIL = 'DETAIL',           // 详情模式 - 深度挖掘单条微博的完整信息
  CREATOR = 'CREATOR',         // 创作者模式 - 探索用户的全部作品和轨迹
  COMMENT = 'COMMENT',         // 评论模式 - 提取互动数据和社会反响
  MEDIA = 'MEDIA'              // 媒体模式 - 下载和管理图片视频资源
}

/**
 * 微博账号状态枚举
 * 统一管理微博账号的各种状态
 */
export enum WeiboAccountStatus {
  ACTIVE = 'ACTIVE',       // 正常可用
  INACTIVE = 'INACTIVE',   // 用户手动禁用
  SUSPENDED = 'SUSPENDED', // 平台暂停
  BANNED = 'BANNED',       // 账号被封禁
  RESTRICTED = 'RESTRICTED', // 风控受限
  EXPIRED = 'EXPIRED'      // Cookie 已过期
}

/**
 * 微博子任务类型枚举 - 精细化的任务分解艺术
 * 将复杂的搜索任务分解为具体可执行的原子操作
 */
export enum WeiboSubTaskType {
  KEYWORD_SEARCH = 'KEYWORD_SEARCH',       // 关键词检索 - 以词汇为线索的信息探索
  USER_PROFILE_SEARCH = 'USER_PROFILE_SEARCH', // 用户档案检索 - 探索创作者的数字身份
  TOPIC_DISCOVERY = 'TOPIC_DISCOVERY',     // 话题发现 - 追踪热点话题的传播路径
  MEDIA_HARVEST = 'MEDIA_HARVEST',         // 媒体收获 - 采集图片视频等多媒体资源
  COMMENT_ANALYSIS = 'COMMENT_ANALYSIS',   // 评论分析 - 挖掘用户互动的深层见解
  SOCIAL_NETWORK = 'SOCIAL_NETWORK',       // 社交网络 - 构建用户关系图谱
  TREND_MONITORING = 'TREND_MONITORING',   // 趋势监控 - 实时追踪热点变化
  CONTENT_CRAWL = 'CONTENT_CRAWL'          // 内容爬取 - 深度获取微博正文详情
}

/**
 * 微博子任务状态枚举 - 任务执行的生命周期哲学
 * 每个状态都代表着子任务在不同阶段的存在意义
 */
export enum WeiboSubTaskStatus {
  PENDING = 'PENDING',         // 等待唤醒 - 任务已准备就绪，等待调度器召唤
  QUEUED = 'QUEUED',           // 队列之中 - 任务进入执行队列，静候资源分配
  RUNNING = 'RUNNING',         // 活力执行 - 任务正在处理器中发挥其价值
  PROCESSING = 'PROCESSING',   // 数据加工 - 深度处理收集到的原始信息
  COMPLETED = 'COMPLETED',     // 圆满完成 - 任务使命达成，结果已就绪
  FAILED = 'FAILED',           // 遭遇挫折 - 任务执行遇阻，需要重新审视
  TIMEOUT = 'TIMEOUT',         // 时光流逝 - 超越时间限制，优雅地放弃
  CANCELLED = 'CANCELLED',     // 主动放弃 - 外部干预导致任务终止
  SKIPPED = 'SKIPPED',         // 跃过执行 - 因条件不满足而跳过
  RETRYING = 'RETRYING'        // 重试重生 - 从失败中汲取经验，再次尝试
}

/**
 * 任务执行结果的枚举值验证
 * 确保数据库存储值与枚举定义一致
 */
export const WEIBO_SEARCH_TYPE_VALUES = Object.values(WeiboSearchType) as readonly string[];
export const WEIBO_CRAWL_MODE_VALUES = Object.values(WeiboCrawlMode) as readonly string[];
export const WEIBO_ACCOUNT_STATUS_VALUES = Object.values(WeiboAccountStatus) as readonly string[];
export const WEIBO_SUB_TASK_TYPE_VALUES = Object.values(WeiboSubTaskType) as readonly string[];
export const WEIBO_SUB_TASK_STATUS_VALUES = Object.values(WeiboSubTaskStatus) as readonly string[];

/**
 * 枚举值验证工具函数 - 守护数字时代的类型安全
 */
export class WeiboEnumValidator {
  static isValidSearchType(type: string): type is WeiboSearchType {
    return WEIBO_SEARCH_TYPE_VALUES.includes(type);
  }

  static isValidCrawlMode(mode: string): mode is WeiboCrawlMode {
    return WEIBO_CRAWL_MODE_VALUES.includes(mode);
  }

  static isValidAccountStatus(status: string): status is WeiboAccountStatus {
    return WEIBO_ACCOUNT_STATUS_VALUES.includes(status);
  }

  static isValidSubTaskType(type: string): type is WeiboSubTaskType {
    return WEIBO_SUB_TASK_TYPE_VALUES.includes(type);
  }

  static isValidSubTaskStatus(status: string): status is WeiboSubTaskStatus {
    return WEIBO_SUB_TASK_STATUS_VALUES.includes(status);
  }

  /**
   * 验证所有枚举值的一致性
   * 在应用启动时调用，确保没有定义冲突
   */
  static validateEnumConsistency(): void {
    const allEnumValues = [
      ...WEIBO_SEARCH_TYPE_VALUES,
      ...WEIBO_CRAWL_MODE_VALUES,
      ...WEIBO_ACCOUNT_STATUS_VALUES,
      ...WEIBO_SUB_TASK_TYPE_VALUES,
      ...WEIBO_SUB_TASK_STATUS_VALUES
    ];

    const valueSet = new Set(allEnumValues);

    // 检查是否有重复值（避免状态混淆）
    const duplicateValues = allEnumValues.filter((value, index) =>
      allEnumValues.indexOf(value) !== index
    );

    if (duplicateValues.length > 0) {
      throw new Error(`检测到枚举值冲突: ${Array.from(new Set(duplicateValues)).join(', ')}`);
    }

    // 验证子任务状态的逻辑连贯性
    const requiredSubTaskStatuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];
    const missingStatuses = requiredSubTaskStatuses.filter(
      status => !WEIBO_SUB_TASK_STATUS_VALUES.includes(status)
    );

    if (missingStatuses.length > 0) {
      throw new Error(`子任务状态缺少必要的状态值: ${missingStatuses.join(', ')}`);
    }

    console.log('✅ 微博枚举值一致性验证通过');
    console.log(`📊 枚举统计: ${allEnumValues.length} 个唯一值，${valueSet.size} 个枚举类型`);
  }
}
