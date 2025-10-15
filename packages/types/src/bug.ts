export enum BugStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  REOPENED = 'reopened'
}

export enum BugPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
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