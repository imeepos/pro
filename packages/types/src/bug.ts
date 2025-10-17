export enum BugStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  REOPENED = 'reopened'
}

export enum BugPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum BugCategory {
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI_UX = 'ui_ux',
  INTEGRATION = 'integration',
  DATA = 'data',
  CONFIGURATION = 'configuration',
  DOCUMENTATION = 'documentation'
}

export interface BugAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface BugComment {
  id: string;
  bugId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  attachments?: BugAttachment[];
}

export interface BugTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
}

export interface BugEnvironment {
  os?: string;
  browser?: string;
  browserVersion?: string;
  device?: string;
  screenResolution?: string;
  userAgent?: string;
  appVersion?: string;
  apiVersion?: string;
  additionalInfo?: Record<string, any>;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugPriority;
  category: BugCategory;
  reporterId: string;
  assigneeId?: string;
  environment?: BugEnvironment;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  reproductionRate?: 'always' | 'sometimes' | 'rarely';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  closedAt?: Date;
  closedBy?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  attachments: BugAttachment[];
  comments: BugComment[];
  tags: BugTag[];
}

export interface CreateBugDto {
  title: string;
  description: string;
  priority: BugPriority;
  category: BugCategory;
  reporterId: string;
  environment?: BugEnvironment;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  reproductionRate?: 'always' | 'sometimes' | 'rarely';
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  tagIds?: string[];
}

export interface UpdateBugDto {
  title?: string;
  description?: string;
  status?: BugStatus;
  priority?: BugPriority;
  category?: BugCategory;
  assigneeId?: string;
  environment?: BugEnvironment;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  reproductionRate?: 'always' | 'sometimes' | 'rarely';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tagIds?: string[];
}

export interface CreateBugCommentDto {
  content: string;
  attachments?: File[];
}

export interface UpdateBugCommentDto {
  content: string;
}

export interface BugFilters {
  search?: string;
  status?: BugStatus[];
  priority?: BugPriority[];
  category?: BugCategory[];
  reporterId?: string;
  assigneeId?: string;
  tagIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  resolvedAfter?: string;
  resolvedBefore?: string;
  dueAfter?: string;
  dueBefore?: string;
  hasAttachments?: boolean;
  reproductionRate?: 'always' | 'sometimes' | 'rarely';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'dueDate' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface BugListResponse {
  data: Bug[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface BugStats {
  total: number;
  byStatus: Record<BugStatus, number>;
  byPriority: Record<BugPriority, number>;
  byCategory: Record<BugCategory, number>;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  overdue: number;
  avgResolutionTime: number;
  resolutionRate: number;
}

export interface BugActivity {
  id: string;
  bugId: string;
  action: 'created' | 'updated' | 'assigned' | 'status_changed' | 'comment_added' | 'attachment_added' | 'resolved' | 'closed';
  userId: string;
  userName: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BugActivityFilters {
  bugId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BugActivityListResponse {
  data: BugActivity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BugNotification {
  id: string;
  userId: string;
  bugId: string;
  type: 'assigned' | 'status_changed' | 'comment_added' | 'mention' | 'due_date_reminder';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface BugNotificationFilters {
  userId: string;
  isRead?: boolean;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BugNotificationListResponse {
  data: BugNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BugTimeTracking {
  id: string;
  bugId: string;
  userId: string;
  userName: string;
  hours: number;
  description?: string;
  date: Date;
  createdAt: Date;
}

export interface CreateBugTimeTrackingDto {
  hours: number;
  description?: string;
  date?: string;
}

export interface BugTimeTrackingFilters {
  bugId: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BugTimeTrackingListResponse {
  data: BugTimeTracking[];
  total: number;
  totalHours: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BugExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters: BugFilters;
  includeComments?: boolean;
  includeAttachments?: boolean;
  includeActivityLog?: boolean;
}

export interface BugBulkAction {
  action: 'assign' | 'change_status' | 'change_priority' | 'add_tags' | 'remove_tags' | 'delete';
  bugIds: string[];
  data?: {
    assigneeId?: string;
    status?: BugStatus;
    priority?: BugPriority;
    tagIds?: string[];
  };
}

export enum BugErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class BugError extends Error {
  readonly type: BugErrorType;
  readonly code?: string;
  readonly details?: Record<string, any>;
  readonly timestamp: Date;

  constructor(type: BugErrorType, message: string, code?: string, details?: Record<string, any>) {
    super(message);
    this.name = 'BugError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }

  static create(message: string, type: string = 'UNKNOWN_ERROR'): BugError {
    const bugType = type as BugErrorType;
    return new BugError(bugType, message, type);
  }

  static fromGraphQLError(error: any): BugError {
    if (!error) {
      return new BugError(BugErrorType.UNKNOWN_ERROR, '未知错误');
    }

    console.log('🔍 [BugError] 分析GraphQL错误:', {
      errorType: error?.constructor?.name,
      message: error?.message,
      hasNetworkError: !!error?.networkError,
      hasGraphQLErrors: !!(error?.graphQLErrors && error.graphQLErrors.length > 0)
    });

    if (error.networkError) {
      console.log('🌐 [BugError] 检测到网络错误:', {
        status: error.networkError.status,
        statusText: error.networkError.statusText,
        message: error.networkError.message
      });

      // 更详细的网络错误分类
      if (error.networkError.status === 0) {
        return new BugError(
          BugErrorType.NETWORK_ERROR,
          '无法连接到服务器，请检查网络连接',
          'CONNECTION_FAILED',
          { originalError: error.networkError.message }
        );
      }

      return new BugError(
        BugErrorType.NETWORK_ERROR,
        '网络连接失败，请检查网络连接后重试',
        'NETWORK_FAILURE',
        { originalError: error.networkError.message }
      );
    }

    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
      const graphQLError = error.graphQLErrors[0];
      const extensions = graphQLError.extensions || {};
      const code = extensions.code || graphQLError.extensions?.['exception']?.['code'];

      if (code === 'UNAUTHENTICATED' || extensions.status === 401) {
        return new BugError(
          BugErrorType.AUTHENTICATION_ERROR,
          graphQLError.message || '登录已过期，请重新登录',
          'AUTH_EXPIRED',
          { extensions }
        );
      }

      if (code === 'FORBIDDEN' || extensions.status === 403) {
        return new BugError(
          BugErrorType.AUTHORIZATION_ERROR,
          graphQLError.message || '权限不足，无法执行此操作',
          'PERMISSION_DENIED',
          { extensions }
        );
      }

      if (code === 'NOT_FOUND' || extensions.status === 404) {
        return new BugError(
          BugErrorType.NOT_FOUND,
          graphQLError.message || '请求的资源不存在',
          'RESOURCE_NOT_FOUND',
          { extensions }
        );
      }

      if (code === 'BAD_USER_INPUT' || extensions.status === 422) {
        return new BugError(
          BugErrorType.VALIDATION_ERROR,
          graphQLError.message || '输入数据验证失败，请检查输入信息',
          'VALIDATION_FAILED',
          { validationErrors: extensions.validationErrors || {}, extensions }
        );
      }

      if (code === 'INTERNAL_SERVER_ERROR' || (extensions.status && extensions.status >= 500)) {
        return new BugError(
          BugErrorType.SERVER_ERROR,
          graphQLError.message || '服务器内部错误，请稍后重试',
          'SERVER_ERROR',
          { extensions }
        );
      }

      return new BugError(
        BugErrorType.UNKNOWN_ERROR,
        graphQLError.message || '未知错误',
        code as string,
        { extensions }
      );
    }

    return new BugError(
      BugErrorType.UNKNOWN_ERROR,
      error.message || '未知错误',
      'UNKNOWN',
      { originalError: error }
    );
  }

  static fromHttpError(error: any): BugError {
    if (!error) {
      return new BugError(BugErrorType.UNKNOWN_ERROR, '未知错误');
    }

    if (error.status === 0) {
      return new BugError(
        BugErrorType.NETWORK_ERROR,
        '网络连接失败，请检查网络连接后重试',
        'NETWORK_FAILURE',
        { originalError: error.message }
      );
    }

    if (error.status === 401) {
      return new BugError(
        BugErrorType.AUTHENTICATION_ERROR,
        '登录已过期，请重新登录',
        'AUTH_EXPIRED',
        { status: error.status }
      );
    }

    if (error.status === 403) {
      return new BugError(
        BugErrorType.AUTHORIZATION_ERROR,
        '权限不足，无法执行此操作',
        'PERMISSION_DENIED',
        { status: error.status }
      );
    }

    if (error.status === 404) {
      return new BugError(
        BugErrorType.NOT_FOUND,
        '请求的资源不存在',
        'RESOURCE_NOT_FOUND',
        { status: error.status }
      );
    }

    if (error.status === 409) {
      return new BugError(
        BugErrorType.CONFLICT,
        '数据冲突，请刷新页面后重试',
        'DATA_CONFLICT',
        { status: error.status }
      );
    }

    if (error.status === 422) {
      const validationErrors = error.error?.details || {};
      return new BugError(
        BugErrorType.VALIDATION_ERROR,
        '输入数据验证失败，请检查输入信息',
        'VALIDATION_FAILED',
        { validationErrors, status: error.status }
      );
    }

    if (error.status >= 500) {
      return new BugError(
        BugErrorType.SERVER_ERROR,
        '服务器内部错误，请稍后重试',
        'SERVER_ERROR',
        { status: error.status, statusText: error.statusText }
      );
    }

    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return new BugError(
        BugErrorType.TIMEOUT_ERROR,
        '请求超时，请稍后重试',
        'REQUEST_TIMEOUT',
        { timeout: error.timeout }
      );
    }

    return new BugError(
      BugErrorType.UNKNOWN_ERROR,
      error.error?.message || error.message || '未知错误',
      'UNKNOWN',
      { status: error.status, originalError: error.message }
    );
  }

  getUserFriendlyMessage(): string {
    switch (this.type) {
      case BugErrorType.NETWORK_ERROR:
        return '网络连接异常，请检查网络设置';
      case BugErrorType.VALIDATION_ERROR:
        return this.extractValidationMessage();
      case BugErrorType.AUTHENTICATION_ERROR:
        return '登录状态已过期，请重新登录';
      case BugErrorType.AUTHORIZATION_ERROR:
        return '您没有权限执行此操作';
      case BugErrorType.NOT_FOUND:
        return '请求的内容不存在';
      case BugErrorType.CONFLICT:
        return '数据已更新，请刷新页面后重试';
      case BugErrorType.SERVER_ERROR:
        return '服务暂时不可用，请稍后重试';
      case BugErrorType.TIMEOUT_ERROR:
        return '请求超时，请检查网络后重试';
      default:
        return this.message;
    }
  }

  private extractValidationMessage(): string {
    if (this.details?.['validationErrors']) {
      const errors = this.details['validationErrors'];
      const firstError = Object.values(errors)[0] as string[];
      if (firstError && firstError.length > 0) {
        return firstError[0];
      }
    }
    return '输入信息有误，请检查后重试';
  }
}

export interface BugOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: BugError;
}
