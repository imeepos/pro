export enum WeiboAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired'
}

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
  expired: number;
  healthy: number;
  unhealthy: number;
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
