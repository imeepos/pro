/**
 * 微博账号接口定义
 * 枚举值统一从 enums/weibo.ts 导入
 */
import { WeiboAccountStatus } from './enums/weibo.js';

// 重新导出枚举，保持向后兼容
export { WeiboAccountStatus } from './enums/weibo.js';

export interface WeiboAccount {
  id: number;
  userId: number;
  username: string;
  nickname?: string;
  uid?: string;
  status: WeiboAccountStatus;
  cookies?: string;
  lastLoginAt?: Date;
  lastCheckAt?: Date;
  expiresAt?: Date;
  isHealthy: boolean;
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeiboAccountFilters {
  search?: string;
  status?: WeiboAccountStatus;
  userId?: number;
  isHealthy?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'username';
  sortOrder?: 'asc' | 'desc';
}

export interface WeiboAccountListResponse {
  data: WeiboAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WeiboAccountStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  banned: number;
  restricted: number;
  expired: number;
  healthy: number;
  unhealthy: number;
}

export interface LoggedInUsersStats {
  total: number;
  todayNew: number;
  online: number;
}

export interface WeiboLoginSession {
  id: number;
  accountId: number;
  sessionToken: string;
  qrCodeUrl?: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}