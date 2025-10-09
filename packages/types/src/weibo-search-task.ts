export enum WeiboSearchTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWeiboSearchTaskDto {
  keyword: string;
  startDate: string;
  crawlInterval?: string;
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
}

export interface UpdateWeiboSearchTaskDto {
  keyword?: string;
  startDate?: string;
  crawlInterval?: string;
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
  enabled?: boolean;
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