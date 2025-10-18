/**
 * 微博搜索任务接口定义
 * 枚举值统一从 enums/weibo.ts 导入
 */
import { WeiboSearchTaskStatus } from './enums/weibo.js';

// 重新导出枚举，保持向后兼容
export { WeiboSearchTaskStatus } from './enums/weibo.js';

export interface WeiboSearchTask {
  id: number;
  keyword: string;
  startDate: Date;
  currentCrawlTime?: Date;
  latestCrawlTime?: Date;
  crawlInterval: string;
  nextRunAt?: Date;
  weiboAccountId?: number;
  enableAccountRotation: boolean;
  status: WeiboSearchTaskStatus;
  enabled: boolean;
  progress: number;
  totalSegments: number;
  noDataCount: number;
  noDataThreshold: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  longitude?: number;
  latitude?: number;
  locationAddress?: string;
  locationName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWeiboSearchTaskDto {
  keyword: string;
  startDate: string;
  crawlInterval?: string;
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
  longitude?: number;
  latitude?: number;
  locationAddress?: string;
  locationName?: string;
}

export interface UpdateWeiboSearchTaskDto {
  keyword?: string;
  startDate?: string;
  crawlInterval?: string;
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
  enabled?: boolean;
  longitude?: number;
  latitude?: number;
  locationAddress?: string;
  locationName?: string;
}

export interface WeiboSearchTaskFilters {
  keyword?: string;
  status?: WeiboSearchTaskStatus;
  enabled?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'nextRunAt' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

export interface WeiboSearchTaskListResponse {
  data: WeiboSearchTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RunWeiboTaskNowInput {
  weiboAccountId?: number;
  forceRestart?: boolean;
}