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
 * 微博搜索任务状态枚举
 * 统一管理微博搜索任务的执行状态
 */
export enum WeiboSearchTaskStatus {
  PENDING = 'PENDING',     // 等待执行
  RUNNING = 'RUNNING',     // 正在执行
  PAUSED = 'PAUSED',       // 已暂停
  FAILED = 'FAILED'        // 执行失败
}

/**
 * 任务执行结果的枚举值验证
 * 确保数据库存储值与枚举定义一致
 */
export const WEIBO_SEARCH_TYPE_VALUES = Object.values(WeiboSearchType) as readonly string[];
export const WEIBO_CRAWL_MODE_VALUES = Object.values(WeiboCrawlMode) as readonly string[];
export const WEIBO_ACCOUNT_STATUS_VALUES = Object.values(WeiboAccountStatus) as readonly string[];
export const WEIBO_SEARCH_TASK_STATUS_VALUES = Object.values(WeiboSearchTaskStatus) as readonly string[];

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

  static isValidSearchTaskStatus(status: string): status is WeiboSearchTaskStatus {
    return WEIBO_SEARCH_TASK_STATUS_VALUES.includes(status);
  }

  /**
   * 验证所有枚举值的一致性
   * 在应用启动时调用，确保没有定义冲突
   */
  static validateEnumConsistency(): void {
    const searchTaskStatusSet = new Set(WEIBO_SEARCH_TASK_STATUS_VALUES);

    // 检查是否有重复值（避免状态混淆）
    const duplicateValues = WEIBO_ACCOUNT_STATUS_VALUES.filter(value =>
      searchTaskStatusSet.has(value)
    );

    if (duplicateValues.length > 0) {
      throw new Error(`检测到枚举值冲突: ${duplicateValues.join(', ')}`);
    }

    console.log('✅ 微博枚举值一致性验证通过');
  }
}