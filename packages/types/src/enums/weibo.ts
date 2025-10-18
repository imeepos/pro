/**
 * 微博相关枚举定义 - 单一数据源
 * 所有微博相关的状态枚举统一定义在此文件
 * 其他包必须从此处导入，禁止重复定义
 */

/**
 * 微博账号状态枚举
 * 统一管理微博账号的各种状态
 */
export enum WeiboAccountStatus {
  ACTIVE = 'active',       // 正常可用
  INACTIVE = 'inactive',   // 用户手动禁用
  SUSPENDED = 'suspended', // 平台暂停
  BANNED = 'banned',       // 账号被封禁
  RESTRICTED = 'restricted', // 风控受限
  EXPIRED = 'expired'      // Cookie 已过期
}

/**
 * 微博搜索任务状态枚举
 * 统一管理微博搜索任务的执行状态
 */
export enum WeiboSearchTaskStatus {
  PENDING = 'pending',     // 等待执行
  RUNNING = 'running',     // 正在执行
  PAUSED = 'paused',       // 已暂停
  FAILED = 'failed',       // 执行失败
  TIMEOUT = 'timeout'      // 执行超时
}

/**
 * 任务执行结果的枚举值验证
 * 确保数据库存储值与枚举定义一致
 */
export const WEIBO_ACCOUNT_STATUS_VALUES = Object.values(WeiboAccountStatus) as readonly string[];
export const WEIBO_SEARCH_TASK_STATUS_VALUES = Object.values(WeiboSearchTaskStatus) as readonly string[];

/**
 * 枚举值验证工具函数
 */
export class WeiboEnumValidator {
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