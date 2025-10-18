export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

export enum ApiKeyStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  ALL = 'ALL'
}

export enum ApiKeyType {
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin'
}

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  description?: string;
  type: ApiKeyType;
  status: ApiKeyStatus;
  isActive: boolean;
  lastUsedAt?: Date;
  usageCount: number;
  expiresAt?: Date;
  createdIp?: string;
  createdAt: Date;
  updatedAt: Date;
  isExpired: boolean;
  isValid: boolean;
  userId: number;
  permissions?: string[];
}

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  type: ApiKeyType;
  expiresAt?: string | null;
  permissions?: string[];
}

export interface UpdateApiKeyDto {
  name?: string;
  description?: string;
  type?: ApiKeyType;
  status?: ApiKeyStatus;
  expiresAt?: string | null;
  permissions?: string[];
}

export interface ApiKeyFilters {
  search?: string;
  type?: ApiKeyType;
  status?: ApiKeyStatus;
  userId?: number;
  isActive?: boolean;
  isExpired?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastUsedAt' | 'usageCount' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiKeyListResponse {
  data: ApiKey[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ApiKeyUsageStats {
  id: number;
  totalRequests: number;
  requestsThisMonth: number;
  requestsToday: number;
  lastUsedAt?: Date;
  averageRequestsPerDay: number;
  peakUsageDay?: string;
  endpointsUsed: string[];
}

export interface ApiKeyRegenerationResponse {
  oldKeyId: number;
  newApiKey: ApiKey;
  message: string;
}

export interface ApiKeyValidationRequest {
  apiKey: string;
}

export interface ApiKeyValidationResponse {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

export interface ApiKeyBulkAction {
  action: 'activate' | 'deactivate' | 'revoke' | 'extend';
  keyIds: number[];
  expiresAt?: string;
}

export interface ApiKeyActivityLog {
  id: number;
  apiKeyId: number;
  action: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  statusCode?: number;
  responseTime?: number;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ApiKeyActivityFilters {
  apiKeyId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  ip?: string;
  statusCode?: number;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'responseTime';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiKeyActivityListResponse {
  data: ApiKeyActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiKeyStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  revoked: number;
  readOnly: number;
  readWrite: number;
  admin: number;
  expiringSoon: number;
  neverUsed: number;
  mostUsed: ApiKey;
  recentlyUsed: ApiKey;
}
