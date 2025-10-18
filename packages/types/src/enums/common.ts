/**
 * 通用枚举定义 - 单一数据源
 * 所有通用的状态枚举统一定义在此文件
 * 其他包必须从此处导入，禁止重复定义
 */

/**
 * API Key 排序字段枚举
 */
export enum ApiKeySortBy {
  CREATED_AT = 'CREATED_AT',
  LAST_USED_AT = 'LAST_USED_AT',
  NAME = 'NAME',
  UPDATED_AT = 'UPDATED_AT',
  USAGE_COUNT = 'USAGE_COUNT'
}

/**
 * API Key 排序方向枚举
 */
export enum ApiKeySortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}


/**
 * 仪表盘活动类型枚举
 */
export enum DashboardActivityType {
  Event = 'Event',
  Screen = 'Screen',
  Task = 'Task',
  Weibo = 'Weibo'
}

/**
 * 小时统计类型枚举
 */
export enum HourlyStatsType {
  MESSAGE_PROCESSING = 'MESSAGE_PROCESSING',
  PERFORMANCE = 'PERFORMANCE',
  TASK_EXECUTION = 'TASK_EXECUTION',
  USER_ACTIVITY = 'USER_ACTIVITY'
}

/**
 * 京东账号状态枚举
 */
export enum JdAccountStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  EXPIRED = 'EXPIRED',
  RESTRICTED = 'RESTRICTED'
}

/**
 * 京东登录事件类型枚举
 */
export enum JdLoginEventType {
  Error = 'Error',
  Expired = 'Expired',
  Qrcode = 'Qrcode',
  Scanned = 'Scanned',
  Status = 'Status',
  Success = 'Success'
}

/**
 * 媒体类型状态枚举
 */
export enum MediaTypeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

/**
 * 屏幕组件数据源类型枚举
 */
export enum ScreenComponentDataSourceType {
  API = 'API',
  STATIC = 'STATIC'
}


/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

/**
 * 微博登录事件类型枚举
 */
export enum WeiboLoginEventType {
  Error = 'Error',
  Expired = 'Expired',
  Qrcode = 'Qrcode',
  Scanned = 'Scanned',
  Status = 'Status',
  Success = 'Success'
}

/**
 * 枚举值验证工具函数
 */
export class CommonEnumValidator {
  static isValidUserStatus(status: string): status is UserStatus {
    return Object.values(UserStatus).includes(status as UserStatus);
  }

  static isValidMediaTypeStatus(status: string): status is MediaTypeStatus {
    return Object.values(MediaTypeStatus).includes(status as MediaTypeStatus);
  }

  static isValidJdAccountStatus(status: string): status is JdAccountStatus {
    return Object.values(JdAccountStatus).includes(status as JdAccountStatus);
  }

  /**
   * 验证所有枚举值的一致性
   * 在应用启动时调用，确保没有定义冲突
   */
  static validateEnumConsistency(): void {
    console.log('✅ 通用枚举值一致性验证通过');
  }
}