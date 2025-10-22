/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** 宽容且可靠的日期时间标量 */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type AggregateTaskInput = {
  /** 窗口结束时间 (ISO 8601 格式) */
  endTime: Scalars['String']['input'];
  /** 可选：是否强制重新计算 (默认 false) */
  forceRecalculate?: InputMaybe<Scalars['Boolean']['input']>;
  /** 可选：过滤关键词 */
  keyword?: InputMaybe<Scalars['String']['input']>;
  /** 需要计算的聚合指标列表 */
  metrics: Array<Scalars['String']['input']>;
  /** 窗口开始时间 (ISO 8601 格式) */
  startTime: Scalars['String']['input'];
  /** 可选：Top N 数量 (默认 10) */
  topN?: InputMaybe<Scalars['Int']['input']>;
  /** 时间窗口类型 (hour/day/week/month) */
  windowType: Scalars['String']['input'];
};

export type AnalyzeTaskInput = {
  /** 需要执行的分析类型列表 */
  analysisTypes: Array<Scalars['String']['input']>;
  /** 待分析数据的 ID */
  dataId: Scalars['String']['input'];
  /** 数据类型 (post/comment/user) */
  dataType: Scalars['String']['input'];
  /** 可选：关键词（微博搜索场景） */
  keyword?: InputMaybe<Scalars['String']['input']>;
  /** 可选：关联任务ID */
  taskId?: InputMaybe<Scalars['String']['input']>;
};

export type ApiKeyConnection = {
  __typename?: 'ApiKeyConnection';
  edges: Array<ApiKeyEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiKeyEdge = {
  __typename?: 'ApiKeyEdge';
  cursor: Scalars['String']['output'];
  node: ApiKeyResponseDto;
};

export type ApiKeyQueryDto = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  includeExpired?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<ApiKeySortBy>;
  sortOrder?: InputMaybe<ApiKeySortOrder>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<ApiKeyStatus>;
};

export type ApiKeyResponseDto = {
  __typename?: 'ApiKeyResponseDto';
  createdAt: Scalars['DateTime']['output'];
  createdIp?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['Int']['output'];
  isActive: Scalars['Boolean']['output'];
  isExpired: Scalars['Boolean']['output'];
  isValid: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Scalars['String']['output']>>;
  type: ApiKeyType;
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['Int']['output'];
};

/** API Key 排序字段 */
export enum ApiKeySortBy {
  CreatedAt = 'CREATED_AT',
  LastUsedAt = 'LAST_USED_AT',
  Name = 'NAME',
  UpdatedAt = 'UPDATED_AT',
  UsageCount = 'USAGE_COUNT'
}

/** 排序方向 */
export enum ApiKeySortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type ApiKeyStatsDto = {
  __typename?: 'ApiKeyStatsDto';
  averageDailyUsage: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  daysSinceCreation: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  usageCount: Scalars['Int']['output'];
};

/** API Key 状态过滤枚举 */
export enum ApiKeyStatus {
  Active = 'ACTIVE',
  All = 'ALL',
  Expired = 'EXPIRED',
  Inactive = 'INACTIVE'
}

export type ApiKeySummaryStatsDto = {
  __typename?: 'ApiKeySummaryStatsDto';
  active: Scalars['Int']['output'];
  averageDailyUsage: Scalars['Float']['output'];
  expired: Scalars['Int']['output'];
  expiringSoon: Scalars['Int']['output'];
  inactive: Scalars['Int']['output'];
  mostUsed?: Maybe<ApiKeyStatsDto>;
  neverUsed: Scalars['Int']['output'];
  recentlyUsed?: Maybe<ApiKeyStatsDto>;
  total: Scalars['Int']['output'];
  totalUsage: Scalars['Int']['output'];
};

/** API Key 类型 */
export enum ApiKeyType {
  Admin = 'ADMIN',
  ReadOnly = 'READ_ONLY',
  ReadWrite = 'READ_WRITE'
}

export type AssignBugInput = {
  assigneeId: Scalars['String']['input'];
};

export type AttachmentUploadCredential = {
  __typename?: 'AttachmentUploadCredential';
  bucketName: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  objectKey: Scalars['String']['output'];
  requiresUpload: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
  uploadUrl?: Maybe<Scalars['String']['output']>;
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
  user: User;
};

export type BatchHourlyStatsRecordDto = {
  records: Array<HourlyStatsRecordDto>;
};

export type BugAttachmentModel = {
  __typename?: 'BugAttachmentModel';
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  mimeType: Scalars['String']['output'];
  originalName: Scalars['String']['output'];
  size: Scalars['Float']['output'];
  uploadedAt: Scalars['DateTime']['output'];
  uploadedBy: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type BugCategoryStatistics = {
  __typename?: 'BugCategoryStatistics';
  configuration: Scalars['Int']['output'];
  data: Scalars['Int']['output'];
  documentation: Scalars['Int']['output'];
  functional: Scalars['Int']['output'];
  integration: Scalars['Int']['output'];
  performance: Scalars['Int']['output'];
  security: Scalars['Int']['output'];
  ui_ux: Scalars['Int']['output'];
};

export type BugCommentModel = {
  __typename?: 'BugCommentModel';
  authorId?: Maybe<Scalars['String']['output']>;
  authorName: Scalars['String']['output'];
  bugId: Scalars['String']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BugFiltersInput = {
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  priority?: InputMaybe<Array<BugPriority>>;
  reporterId?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Array<BugStatus>>;
};

export type BugModel = {
  __typename?: 'BugModel';
  actualBehavior?: Maybe<Scalars['String']['output']>;
  actualHours?: Maybe<Scalars['Float']['output']>;
  assigneeId?: Maybe<Scalars['String']['output']>;
  attachments?: Maybe<Array<BugAttachmentModel>>;
  category?: Maybe<Scalars['String']['output']>;
  closedAt?: Maybe<Scalars['DateTime']['output']>;
  closedBy?: Maybe<Scalars['String']['output']>;
  comments?: Maybe<Array<BugCommentModel>>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  environment?: Maybe<Scalars['JSON']['output']>;
  estimatedHours?: Maybe<Scalars['Float']['output']>;
  expectedBehavior?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  priority: BugPriority;
  reporterId: Scalars['String']['output'];
  reproductionRate?: Maybe<Scalars['String']['output']>;
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  resolvedBy?: Maybe<Scalars['String']['output']>;
  status: BugStatus;
  stepsToReproduce?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export enum BugPriority {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type BugPriorityStatistics = {
  __typename?: 'BugPriorityStatistics';
  critical: Scalars['Int']['output'];
  high: Scalars['Int']['output'];
  low: Scalars['Int']['output'];
  medium: Scalars['Int']['output'];
};

export type BugStatisticsModel = {
  __typename?: 'BugStatisticsModel';
  byCategory: BugCategoryStatistics;
  byPriority: BugPriorityStatistics;
  byStatus: BugStatusStatistics;
  total: Scalars['Int']['output'];
};

export enum BugStatus {
  Closed = 'CLOSED',
  InProgress = 'IN_PROGRESS',
  Open = 'OPEN',
  Rejected = 'REJECTED',
  Reopened = 'REOPENED',
  Resolved = 'RESOLVED'
}

export type BugStatusStatistics = {
  __typename?: 'BugStatusStatistics';
  closed: Scalars['Int']['output'];
  in_progress: Scalars['Int']['output'];
  open: Scalars['Int']['output'];
  rejected: Scalars['Int']['output'];
  reopened: Scalars['Int']['output'];
  resolved: Scalars['Int']['output'];
};

export type BugsPaginationModel = {
  __typename?: 'BugsPaginationModel';
  bugs: Array<BugModel>;
  total: Scalars['Int']['output'];
};

export type CleanTaskInput = {
  /** 任务优先级 */
  priority?: Scalars['String']['input'];
  /** MongoDB 原始数据文档 ID */
  rawDataId: Scalars['String']['input'];
  /** 数据源类型 */
  sourceType: Scalars['String']['input'];
};

export type ConfigCacheStats = {
  __typename?: 'ConfigCacheStats';
  keys: Array<Scalars['String']['output']>;
  size: Scalars['Int']['output'];
};

/** 配置项类型标识 */
export enum ConfigType {
  AmapApiKey = 'AMAP_API_KEY'
}

export type ConfigValue = {
  __typename?: 'ConfigValue';
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  value: Scalars['String']['output'];
};

export type ConfirmAttachmentUploadInput = {
  token: Scalars['String']['input'];
};

export type ConsumerStats = {
  __typename?: 'ConsumerStats';
  /** 平均处理时间（毫秒） */
  avgProcessingTime: Scalars['Float']['output'];
  /** 失败处理数 */
  failureCount: Scalars['Int']['output'];
  /** 最后处理时间 */
  lastProcessedAt?: Maybe<Scalars['DateTime']['output']>;
  /** 重试处理数 */
  retryCount: Scalars['Int']['output'];
  /** 成功处理数 */
  successCount: Scalars['Int']['output'];
  /** 总处理消息数 */
  totalMessages: Scalars['Int']['output'];
};

export type CreateApiKeyDto = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  type: ApiKeyType;
};

export type CreateBugCommentInput = {
  authorId?: InputMaybe<Scalars['String']['input']>;
  content: Scalars['String']['input'];
};

export type CreateBugInput = {
  actualBehavior?: InputMaybe<Scalars['String']['input']>;
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  estimatedHours?: InputMaybe<Scalars['Float']['input']>;
  expectedBehavior?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<BugPriority>;
  reporterId: Scalars['String']['input'];
  reproductionRate?: InputMaybe<Scalars['String']['input']>;
  stepsToReproduce?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateEventInput = {
  city: Scalars['String']['input'];
  district?: InputMaybe<Scalars['String']['input']>;
  eventName: Scalars['String']['input'];
  eventTypeId: Scalars['ID']['input'];
  industryTypeId: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  locationText?: InputMaybe<Scalars['String']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  occurTime: Scalars['String']['input'];
  province: Scalars['String']['input'];
  status?: InputMaybe<EventStatus>;
  street?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateEventTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  eventCode: Scalars['String']['input'];
  eventName: Scalars['String']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateIndustryTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  industryCode: Scalars['String']['input'];
  industryName: Scalars['String']['input'];
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateMediaTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<MediaTypeStatus>;
  typeCode: Scalars['String']['input'];
  typeName: Scalars['String']['input'];
};

export type CreateScreenInput = {
  components?: InputMaybe<Array<ScreenComponentInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  layout: ScreenLayoutInput;
  name: Scalars['String']['input'];
};

export type CreateTagInput = {
  tagColor?: InputMaybe<Scalars['String']['input']>;
  tagName: Scalars['String']['input'];
};

export type CreateWeiboSearchTaskInput = {
  crawlInterval?: InputMaybe<Scalars['String']['input']>;
  keyword: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};

export type DashboardActivity = {
  __typename?: 'DashboardActivity';
  entityId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  time: Scalars['String']['output'];
  type: DashboardActivityType;
};

/** 仪表盘最近动态类别 */
export enum DashboardActivityType {
  Event = 'Event',
  Screen = 'Screen',
  Task = 'Task',
  Weibo = 'Weibo'
}

export type DashboardStats = {
  __typename?: 'DashboardStats';
  totalEvents: Scalars['Int']['output'];
  totalScreens: Scalars['Int']['output'];
  totalSearchTasks: Scalars['Int']['output'];
  totalWeiboAccounts: Scalars['Int']['output'];
};

export type DeleteMessagesInput = {
  /** 需删除的消息 ID 列表 */
  messageIds: Array<Scalars['String']['input']>;
  /** 目标死信队列名称 */
  queueName: Scalars['String']['input'];
};

export type DlqMessage = {
  __typename?: 'DlqMessage';
  content?: Maybe<Scalars['JSON']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  failedAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  queueName: Scalars['String']['output'];
  retryCount: Scalars['Int']['output'];
};

export type DlqMessageConnection = {
  __typename?: 'DlqMessageConnection';
  edges: Array<DlqMessageEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DlqMessageEdge = {
  __typename?: 'DlqMessageEdge';
  cursor: Scalars['String']['output'];
  node: DlqMessage;
};

export type DlqQueryInput = {
  /** 页码，起始为 1 */
  page?: Scalars['Int']['input'];
  /** 每页条数，最大 100 条 */
  pageSize?: Scalars['Int']['input'];
  /** 死信队列名称 */
  queueName: Scalars['String']['input'];
};

export type DlqQueueInfo = {
  __typename?: 'DlqQueueInfo';
  messageCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  originalQueue: Scalars['String']['output'];
};

export type Event = {
  __typename?: 'Event';
  attachments: Array<EventAttachment>;
  city: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  district?: Maybe<Scalars['String']['output']>;
  eventName: Scalars['String']['output'];
  eventType?: Maybe<EventType>;
  eventTypeId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  industryType?: Maybe<IndustryType>;
  industryTypeId: Scalars['ID']['output'];
  latitude?: Maybe<Scalars['Float']['output']>;
  locationText?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  occurTime: Scalars['DateTime']['output'];
  province: Scalars['String']['output'];
  status: EventStatus;
  street?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  tags: Array<Tag>;
  updatedAt: Scalars['DateTime']['output'];
};

export type EventAttachment = {
  __typename?: 'EventAttachment';
  bucketName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  eventId: Scalars['ID']['output'];
  fileMd5?: Maybe<Scalars['String']['output']>;
  fileName: Scalars['String']['output'];
  fileSize?: Maybe<Scalars['Int']['output']>;
  fileType: EventAttachmentFileType;
  fileUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  mimeType?: Maybe<Scalars['String']['output']>;
  objectName: Scalars['String']['output'];
  sortOrder: Scalars['Int']['output'];
};

/** 事件附件文件类型 */
export enum EventAttachmentFileType {
  Document = 'DOCUMENT',
  Image = 'IMAGE',
  Video = 'VIDEO'
}

export type EventConnection = {
  __typename?: 'EventConnection';
  edges: Array<EventEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type EventEdge = {
  __typename?: 'EventEdge';
  cursor: Scalars['String']['output'];
  node: Event;
};

export type EventMapPoint = {
  __typename?: 'EventMapPoint';
  city: Scalars['String']['output'];
  district?: Maybe<Scalars['String']['output']>;
  eventName: Scalars['String']['output'];
  eventTypeId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  industryTypeId: Scalars['ID']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  occurTime: Scalars['DateTime']['output'];
  province: Scalars['String']['output'];
  status: EventStatus;
  street?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export type EventMapQueryInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  district?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  eventTypeId?: InputMaybe<Scalars['ID']['input']>;
  industryTypeId?: InputMaybe<Scalars['ID']['input']>;
  keyword?: InputMaybe<Scalars['String']['input']>;
  province?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EventStatus>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type EventQueryInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  district?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  eventTypeId?: InputMaybe<Scalars['ID']['input']>;
  industryTypeId?: InputMaybe<Scalars['ID']['input']>;
  keyword?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  province?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EventStatus>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** 事件状态枚举 */
export enum EventStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type EventType = {
  __typename?: 'EventType';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  eventCode: Scalars['String']['output'];
  eventName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  sortOrder: Scalars['Int']['output'];
  status: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type HealthStatus = {
  __typename?: 'HealthStatus';
  status: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type HourlyStatsPeak = {
  __typename?: 'HourlyStatsPeak';
  /** 峰值数量 */
  count: Scalars['Int']['output'];
  /** 峰值时间 */
  hour: Scalars['String']['output'];
};

export type HourlyStatsPoint = {
  __typename?: 'HourlyStatsPoint';
  /** 统计数量 */
  count: Scalars['Int']['output'];
  /** 时间点 (ISO 8601格式) */
  hour: Scalars['String']['output'];
  /** 占比 (可选) */
  percentage?: Maybe<Scalars['Float']['output']>;
  /** 趋势 (可选) */
  trend?: Maybe<Scalars['String']['output']>;
};

export type HourlyStatsQueryDto = {
  endDate: Scalars['DateTime']['input'];
  interval?: InputMaybe<Scalars['String']['input']>;
  startDate: Scalars['DateTime']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  type: HourlyStatsType;
};

export type HourlyStatsRecordDto = {
  count: Scalars['Int']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  timestamp: Scalars['DateTime']['input'];
  type: HourlyStatsType;
};

export type HourlyStatsResponse = {
  __typename?: 'HourlyStatsResponse';
  /** 统计数据点 */
  data: Array<HourlyStatsPoint>;
  /** 汇总信息 */
  summary: HourlyStatsSummary;
  /** 时间范围 */
  timeRange: HourlyStatsTimeRange;
};

export type HourlyStatsSummary = {
  __typename?: 'HourlyStatsSummary';
  /** 平均值 */
  average: Scalars['Float']['output'];
  /** 增长率 (可选) */
  growth?: Maybe<Scalars['Float']['output']>;
  /** 峰值 */
  peak: HourlyStatsPeak;
  /** 总数 */
  total: Scalars['Int']['output'];
};

export type HourlyStatsTimeRange = {
  __typename?: 'HourlyStatsTimeRange';
  /** 结束时间 */
  end: Scalars['String']['output'];
  /** 开始时间 */
  start: Scalars['String']['output'];
  /** 时区 */
  timezone: Scalars['String']['output'];
};

/** 小时统计类型 */
export enum HourlyStatsType {
  /** 消息处理统计 */
  MessageProcessing = 'MESSAGE_PROCESSING',
  /** 性能统计 */
  Performance = 'PERFORMANCE',
  /** 任务执行统计 */
  TaskExecution = 'TASK_EXECUTION',
  /** 用户活跃度 */
  UserActivity = 'USER_ACTIVITY'
}

export type IndustryType = {
  __typename?: 'IndustryType';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  industryCode: Scalars['String']['output'];
  industryName: Scalars['String']['output'];
  sortOrder: Scalars['Int']['output'];
  status: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type JdAccount = {
  __typename?: 'JdAccount';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  jdAvatar?: Maybe<Scalars['String']['output']>;
  jdNickname?: Maybe<Scalars['String']['output']>;
  jdUid: Scalars['String']['output'];
  lastCheckAt?: Maybe<Scalars['DateTime']['output']>;
  status: JdAccountStatus;
};

export type JdAccountCheckResult = {
  __typename?: 'JdAccountCheckResult';
  accountId: Scalars['Int']['output'];
  checkedAt: Scalars['DateTime']['output'];
  jdUid: Scalars['String']['output'];
  message: Scalars['String']['output'];
  newStatus: JdAccountStatus;
  oldStatus: JdAccountStatus;
  statusChanged: Scalars['Boolean']['output'];
};

export type JdAccountCheckSummary = {
  __typename?: 'JdAccountCheckSummary';
  checked: Scalars['Int']['output'];
  results: Array<JdAccountCheckResult>;
  total: Scalars['Int']['output'];
};

export type JdAccountConnection = {
  __typename?: 'JdAccountConnection';
  edges: Array<JdAccountEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type JdAccountEdge = {
  __typename?: 'JdAccountEdge';
  cursor: Scalars['String']['output'];
  node: JdAccount;
};

export type JdAccountFilterInput = {
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
};

export type JdAccountStats = {
  __typename?: 'JdAccountStats';
  online: Scalars['Int']['output'];
  todayNew: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** 京东账号当前状态 */
export enum JdAccountStatus {
  Active = 'ACTIVE',
  Banned = 'BANNED',
  Expired = 'EXPIRED',
  Restricted = 'RESTRICTED'
}

export type JdLoginEvent = {
  __typename?: 'JdLoginEvent';
  data?: Maybe<Scalars['JSONObject']['output']>;
  type: JdLoginEventType;
};

/** 京东扫码登录事件类型 */
export enum JdLoginEventType {
  Error = 'Error',
  Expired = 'Expired',
  Qrcode = 'Qrcode',
  Scanned = 'Scanned',
  Status = 'Status',
  Success = 'Success'
}

export type JdLoginSession = {
  __typename?: 'JdLoginSession';
  expired: Scalars['Boolean']['output'];
  expiresAt: Scalars['DateTime']['output'];
  lastEvent?: Maybe<JdLoginEvent>;
  sessionId: Scalars['String']['output'];
};

export type LoginDto = {
  password: Scalars['String']['input'];
  usernameOrEmail: Scalars['String']['input'];
};

export type MediaType = {
  __typename?: 'MediaType';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  sort: Scalars['Int']['output'];
  status: MediaTypeStatus;
  typeCode: Scalars['String']['output'];
  typeName: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type MediaTypeConnection = {
  __typename?: 'MediaTypeConnection';
  edges: Array<MediaTypeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type MediaTypeEdge = {
  __typename?: 'MediaTypeEdge';
  cursor: Scalars['String']['output'];
  node: MediaType;
};

export type MediaTypeFilterInput = {
  keyword?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<MediaTypeStatus>;
};

/** 媒体类型状态 */
export enum MediaTypeStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type MultiTypeHourlyStats = {
  __typename?: 'MultiTypeHourlyStats';
  /** 消息处理统计 */
  message_processing?: Maybe<HourlyStatsResponse>;
  /** 性能统计 */
  performance?: Maybe<HourlyStatsResponse>;
  /** 任务执行统计 */
  task_execution?: Maybe<HourlyStatsResponse>;
  /** 用户活跃度 */
  user_activity?: Maybe<HourlyStatsResponse>;
};

export type MultiTypeStatsQueryDto = {
  endDate: Scalars['DateTime']['input'];
  startDate: Scalars['DateTime']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  types: Array<HourlyStatsType>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addBugComment: BugCommentModel;
  addTagsToEvent: Event;
  archiveEvent: Event;
  assignBug: BugModel;
  checkAllJdAccounts: JdAccountCheckSummary;
  checkAllWeiboAccounts: Scalars['Boolean']['output'];
  checkJdAccount: JdAccountCheckResult;
  checkWeiboAccount: Scalars['Boolean']['output'];
  cleanupExpiredSessions: Scalars['String']['output'];
  cleanupExpiredStats: Scalars['Int']['output'];
  clearConfigCache: Scalars['Boolean']['output'];
  confirmEventAttachmentUpload: EventAttachment;
  copyScreen: Screen;
  createApiKey: ApiKeyResponseDto;
  createBug: BugModel;
  createEvent: Event;
  createEventType: EventType;
  createIndustryType: IndustryType;
  createMediaType: MediaType;
  createScreen: Screen;
  createTag: Tag;
  createWeiboSearchTask: WeiboSearchTask;
  /** 删除死信队列中的消息 */
  deleteDlqMessages: Scalars['Boolean']['output'];
  disableApiKey: Scalars['Boolean']['output'];
  dispatchNotification: Notification;
  draftScreen: Screen;
  enableApiKey: Scalars['Boolean']['output'];
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  markWeiboAccountBanned: Scalars['Boolean']['output'];
  pauseAllWeiboSearchTasks: Scalars['Int']['output'];
  pauseWeiboSearchTask: WeiboSearchTask;
  publishEvent: Event;
  publishScreen: Screen;
  recordBatchHourlyStats: Scalars['Boolean']['output'];
  refreshToken: AuthPayload;
  regenerateApiKey: RegenerateApiKeyDto;
  register: AuthPayload;
  removeApiKey: Scalars['Boolean']['output'];
  removeBug: Scalars['Boolean']['output'];
  removeEvent: Scalars['Boolean']['output'];
  removeEventType: Scalars['Boolean']['output'];
  removeIndustryType: Scalars['Boolean']['output'];
  removeJdAccount: Scalars['Boolean']['output'];
  removeMediaType: Scalars['Boolean']['output'];
  removeScreen: Scalars['Boolean']['output'];
  removeTag: Scalars['Boolean']['output'];
  removeTagFromEvent: Scalars['Boolean']['output'];
  removeUser: Scalars['Boolean']['output'];
  removeWeiboAccount: Scalars['Boolean']['output'];
  removeWeiboSearchTask: Scalars['Boolean']['output'];
  requestEventAttachmentUpload: AttachmentUploadCredential;
  resetWeiboTaskStatusConsumerStats: Scalars['Boolean']['output'];
  resumeAllWeiboSearchTasks: Scalars['Int']['output'];
  resumeWeiboSearchTask: WeiboSearchTask;
  /** 将死信消息重新投递到原队列 */
  retryDlqMessages: Scalars['Boolean']['output'];
  runWeiboSearchTaskNow: WeiboSearchTask;
  setDefaultScreen: Screen;
  startJdLogin: JdLoginSession;
  startWeiboLogin: WeiboLoginSession;
  /** 手动触发数据聚合任务 */
  triggerAggregateTask: TaskResult;
  /** 手动触发数据分析任务 */
  triggerAnalyzeTask: TaskResult;
  /** 手动触发数据清洗任务 */
  triggerCleanTask: TaskResult;
  updateApiKey: ApiKeyResponseDto;
  updateBug: BugModel;
  updateBugStatus: BugModel;
  updateEvent: Event;
  updateEventType: EventType;
  updateIndustryType: IndustryType;
  updateMediaType: MediaType;
  updateScreen: Screen;
  updateTag: Tag;
  updateUser: User;
  updateWeiboSearchTask: WeiboSearchTask;
};


export type MutationAddBugCommentArgs = {
  bugId: Scalars['ID']['input'];
  input: CreateBugCommentInput;
};


export type MutationAddTagsToEventArgs = {
  eventId: Scalars['ID']['input'];
  tagIds: Array<Scalars['ID']['input']>;
};


export type MutationArchiveEventArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAssignBugArgs = {
  id: Scalars['ID']['input'];
  input: AssignBugInput;
};


export type MutationCheckJdAccountArgs = {
  id: Scalars['Int']['input'];
};


export type MutationCheckWeiboAccountArgs = {
  id: Scalars['Int']['input'];
};


export type MutationClearConfigCacheArgs = {
  type?: InputMaybe<ConfigType>;
};


export type MutationConfirmEventAttachmentUploadArgs = {
  input: ConfirmAttachmentUploadInput;
};


export type MutationCopyScreenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateApiKeyArgs = {
  input: CreateApiKeyDto;
};


export type MutationCreateBugArgs = {
  input: CreateBugInput;
};


export type MutationCreateEventArgs = {
  input: CreateEventInput;
};


export type MutationCreateEventTypeArgs = {
  input: CreateEventTypeInput;
};


export type MutationCreateIndustryTypeArgs = {
  input: CreateIndustryTypeInput;
};


export type MutationCreateMediaTypeArgs = {
  input: CreateMediaTypeInput;
};


export type MutationCreateScreenArgs = {
  input: CreateScreenInput;
};


export type MutationCreateTagArgs = {
  input: CreateTagInput;
};


export type MutationCreateWeiboSearchTaskArgs = {
  input: CreateWeiboSearchTaskInput;
};


export type MutationDeleteDlqMessagesArgs = {
  input: DeleteMessagesInput;
};


export type MutationDisableApiKeyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDispatchNotificationArgs = {
  input: NotificationInput;
};


export type MutationDraftScreenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEnableApiKeyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationLoginArgs = {
  input: LoginDto;
};


export type MutationMarkWeiboAccountBannedArgs = {
  id: Scalars['Int']['input'];
  token: Scalars['String']['input'];
};


export type MutationPauseWeiboSearchTaskArgs = {
  id: Scalars['Int']['input'];
  input?: InputMaybe<PauseWeiboTaskInput>;
};


export type MutationPublishEventArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishScreenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRecordBatchHourlyStatsArgs = {
  input: BatchHourlyStatsRecordDto;
};


export type MutationRefreshTokenArgs = {
  input: RefreshTokenDto;
};


export type MutationRegenerateApiKeyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterDto;
};


export type MutationRemoveApiKeyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveBugArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEventArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEventTypeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveIndustryTypeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveJdAccountArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveMediaTypeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveScreenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTagArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTagFromEventArgs = {
  eventId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};


export type MutationRemoveUserArgs = {
  id: Scalars['String']['input'];
};


export type MutationRemoveWeiboAccountArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveWeiboSearchTaskArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRequestEventAttachmentUploadArgs = {
  input: RequestAttachmentUploadInput;
};


export type MutationResumeWeiboSearchTaskArgs = {
  id: Scalars['Int']['input'];
  input?: InputMaybe<ResumeWeiboTaskInput>;
};


export type MutationRetryDlqMessagesArgs = {
  input: RetryMessagesInput;
};


export type MutationRunWeiboSearchTaskNowArgs = {
  id: Scalars['Int']['input'];
  input?: InputMaybe<RunWeiboTaskNowInput>;
};


export type MutationSetDefaultScreenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationTriggerAggregateTaskArgs = {
  input: AggregateTaskInput;
};


export type MutationTriggerAnalyzeTaskArgs = {
  input: AnalyzeTaskInput;
};


export type MutationTriggerCleanTaskArgs = {
  input: CleanTaskInput;
};


export type MutationUpdateApiKeyArgs = {
  id: Scalars['Int']['input'];
  input: UpdateApiKeyDto;
};


export type MutationUpdateBugArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBugInput;
};


export type MutationUpdateBugStatusArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBugStatusInput;
};


export type MutationUpdateEventArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEventInput;
};


export type MutationUpdateEventTypeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEventTypeInput;
};


export type MutationUpdateIndustryTypeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateIndustryTypeInput;
};


export type MutationUpdateMediaTypeArgs = {
  id: Scalars['Int']['input'];
  input: UpdateMediaTypeInput;
};


export type MutationUpdateScreenArgs = {
  id: Scalars['ID']['input'];
  input: UpdateScreenInput;
};


export type MutationUpdateTagArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTagInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['String']['input'];
  input: UpdateUserDto;
};


export type MutationUpdateWeiboSearchTaskArgs = {
  id: Scalars['Int']['input'];
  input: UpdateWeiboSearchTaskInput;
};

export type Notification = {
  __typename?: 'Notification';
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
  title: Scalars['String']['output'];
  userId?: Maybe<Scalars['ID']['output']>;
};

export type NotificationInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
  message: Scalars['String']['input'];
  timestamp?: InputMaybe<Scalars['DateTime']['input']>;
  title: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginatedRawData = {
  __typename?: 'PaginatedRawData';
  /** 是否有下一页 */
  hasNext: Scalars['Boolean']['output'];
  /** 是否有上一页 */
  hasPrevious: Scalars['Boolean']['output'];
  /** 数据列表 */
  items: Array<RawDataItem>;
  /** 当前页码 */
  page: Scalars['Int']['output'];
  /** 每页数量 */
  pageSize: Scalars['Int']['output'];
  /** 总数量 */
  total: Scalars['Int']['output'];
  /** 总页数 */
  totalPages: Scalars['Int']['output'];
};

export type PauseWeiboTaskInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

/** 原始数据处理状态 */
export enum ProcessingStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING'
}

export type Query = {
  __typename?: 'Query';
  apiKey: ApiKeyResponseDto;
  apiKeyStats: ApiKeyStatsDto;
  apiKeySummary: ApiKeySummaryStatsDto;
  apiKeys: ApiKeyConnection;
  bug: BugModel;
  bugComments: Array<BugCommentModel>;
  bugStatistics: BugStatisticsModel;
  bugs: BugsPaginationModel;
  configCacheStats: ConfigCacheStats;
  configValue: ConfigValue;
  dashboardRecentActivities: Array<DashboardActivity>;
  dashboardStats: DashboardStats;
  defaultScreen: Screen;
  /** 分页查询死信队列中的消息 */
  dlqMessages: DlqMessageConnection;
  /** 获取所有死信队列信息 */
  dlqQueues: Array<DlqQueueInfo>;
  event: Event;
  eventType: EventType;
  eventTypes: Array<EventType>;
  events: EventConnection;
  eventsByTag: Array<Event>;
  eventsForMap: Array<EventMapPoint>;
  eventsNearby: Array<Event>;
  health: HealthStatus;
  industryType: IndustryType;
  industryTypes: Array<IndustryType>;
  jdAccountStats: JdAccountStats;
  jdAccounts: JdAccountConnection;
  jdLoginSession: JdLoginSession;
  me: User;
  mediaType: MediaType;
  mediaTypes: MediaTypeConnection;
  popularTags: Array<Tag>;
  publishedScreens: ScreenConnection;
  /** 根据ID获取单个原始数据 */
  rawDataById?: Maybe<RawDataItem>;
  /** 根据数据源类型查询原始数据 */
  rawDataBySourceType: PaginatedRawData;
  /** 获取原始数据列表，支持分页和过滤 */
  rawDataList: PaginatedRawData;
  /** 获取原始数据的统计信息 */
  rawDataStatistics: RawDataStatistics;
  /** 获取原始数据的趋势分析数据 */
  rawDataTrend: Array<TrendDataPoint>;
  /** 获取最近的原始数据 */
  recentRawData: Array<RawDataItem>;
  screen: Screen;
  screens: ScreenConnection;
  /** 搜索原始数据 */
  searchRawData: PaginatedRawData;
  tag: Tag;
  tags: TagConnection;
  user: User;
  users: Array<User>;
  webSocketHealth: Scalars['String']['output'];
  webSocketStats: WebSocketStats;
  weiboAccount: WeiboAccount;
  weiboAccountStats: WeiboAccountStats;
  weiboAccounts: WeiboAccountConnection;
  weiboAccountsWithCookies: Array<WeiboAccountWithCookies>;
  weiboAggregatedStats: HourlyStatsResponse;
  weiboHourlyStats: HourlyStatsResponse;
  weiboLoginSession: WeiboLoginSession;
  weiboMultiTypeHourlyStats: MultiTypeHourlyStats;
  weiboSearchTask: WeiboSearchTask;
  weiboSearchTaskStats: WeiboSearchTaskStats;
  weiboSearchTasks: WeiboSearchTaskConnection;
  weiboSessionStats: WeiboSessionStats;
  weiboTaskStatusConsumerStats: ConsumerStats;
};


export type QueryApiKeyArgs = {
  id: Scalars['Int']['input'];
};


export type QueryApiKeyStatsArgs = {
  id: Scalars['Int']['input'];
};


export type QueryApiKeysArgs = {
  filter?: InputMaybe<ApiKeyQueryDto>;
};


export type QueryBugArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBugCommentsArgs = {
  bugId: Scalars['ID']['input'];
};


export type QueryBugsArgs = {
  filters?: InputMaybe<BugFiltersInput>;
};


export type QueryConfigValueArgs = {
  type: ConfigType;
};


export type QueryDlqMessagesArgs = {
  filter?: InputMaybe<DlqQueryInput>;
};


export type QueryEventArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEventTypeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEventsArgs = {
  filter?: InputMaybe<EventQueryInput>;
};


export type QueryEventsByTagArgs = {
  tagId: Scalars['ID']['input'];
};


export type QueryEventsForMapArgs = {
  filter?: InputMaybe<EventMapQueryInput>;
};


export type QueryEventsNearbyArgs = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  radius: Scalars['Float']['input'];
};


export type QueryIndustryTypeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryJdAccountsArgs = {
  filter?: InputMaybe<JdAccountFilterInput>;
};


export type QueryJdLoginSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryMediaTypeArgs = {
  id: Scalars['Int']['input'];
};


export type QueryMediaTypesArgs = {
  filter?: InputMaybe<MediaTypeFilterInput>;
};


export type QueryPopularTagsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPublishedScreensArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRawDataByIdArgs = {
  id: Scalars['String']['input'];
};


export type QueryRawDataBySourceTypeArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  sourceType: SourceType;
};


export type QueryRawDataListArgs = {
  filter?: InputMaybe<RawDataFilterInput>;
};


export type QueryRawDataTrendArgs = {
  input?: InputMaybe<TrendDataInput>;
};


export type QueryRecentRawDataArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  sourceType?: InputMaybe<SourceType>;
};


export type QueryScreenArgs = {
  id: Scalars['ID']['input'];
};


export type QueryScreensArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySearchRawDataArgs = {
  keyword: Scalars['String']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTagArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTagsArgs = {
  keyword?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserArgs = {
  id: Scalars['String']['input'];
};


export type QueryWeiboAccountArgs = {
  id: Scalars['Int']['input'];
};


export type QueryWeiboAccountsArgs = {
  filter?: InputMaybe<WeiboAccountFilterInput>;
};


export type QueryWeiboAccountsWithCookiesArgs = {
  token: Scalars['String']['input'];
};


export type QueryWeiboAggregatedStatsArgs = {
  query: StatsAggregationQueryDto;
};


export type QueryWeiboHourlyStatsArgs = {
  query: HourlyStatsQueryDto;
};


export type QueryWeiboLoginSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryWeiboMultiTypeHourlyStatsArgs = {
  query: MultiTypeStatsQueryDto;
};


export type QueryWeiboSearchTaskArgs = {
  id: Scalars['Int']['input'];
};


export type QueryWeiboSearchTasksArgs = {
  filter?: InputMaybe<WeiboSearchTaskFilterInput>;
};

export type RawDataFilterInput = {
  /** 关键词搜索 */
  keyword?: InputMaybe<Scalars['String']['input']>;
  /** 页码 */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** 每页数量 */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** 数据源平台 */
  sourcePlatform?: InputMaybe<SourcePlatform>;
  /** 数据源类型 */
  sourceType?: InputMaybe<SourceType>;
  /** 处理状态 */
  status?: InputMaybe<ProcessingStatus>;
  /** 时间范围 */
  timeRange?: InputMaybe<TimeRangeInput>;
};

export type RawDataItem = {
  __typename?: 'RawDataItem';
  /** 数据ID */
  _id: Scalars['ID']['output'];
  /** 内容哈希 */
  contentHash: Scalars['String']['output'];
  /** 内容摘要 */
  contentPreview: Scalars['String']['output'];
  /** 创建时间 */
  createdAt: Scalars['String']['output'];
  /** 错误信息 */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** 元数据 */
  metadata: Scalars['String']['output'];
  /** 处理时间 */
  processedAt?: Maybe<Scalars['String']['output']>;
  /** 数据源类型 */
  sourceType: SourceType;
  /** 源链接 */
  sourceUrl: Scalars['String']['output'];
  /** 处理状态 */
  status: ProcessingStatus;
};

export type RawDataStatistics = {
  __typename?: 'RawDataStatistics';
  /** 已完成数据量 */
  completed: Scalars['Int']['output'];
  /** 失败数据量 */
  failed: Scalars['Int']['output'];
  /** 待处理数据量 */
  pending: Scalars['Int']['output'];
  /** 处理中数据量 */
  processing: Scalars['Int']['output'];
  /** 成功率 */
  successRate: Scalars['Float']['output'];
  /** 总数据量 */
  total: Scalars['Int']['output'];
};

export type RefreshTokenDto = {
  refreshToken: Scalars['String']['input'];
};

export type RegenerateApiKeyDto = {
  __typename?: 'RegenerateApiKeyDto';
  key: Scalars['String']['output'];
  warning: Scalars['String']['output'];
};

export type RegisterDto = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type RequestAttachmentUploadInput = {
  eventId: Scalars['ID']['input'];
  fileMd5: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
  fileSize: Scalars['Float']['input'];
  mimeType: Scalars['String']['input'];
};

export type ResumeWeiboTaskInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type RetryMessagesInput = {
  /** 需重试的消息 ID 列表 */
  messageIds: Array<Scalars['String']['input']>;
  /** 目标死信队列名称 */
  queueName: Scalars['String']['input'];
};

export type RunWeiboTaskNowInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type Screen = {
  __typename?: 'Screen';
  components: Array<ScreenComponent>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  layout: ScreenLayout;
  name: Scalars['String']['output'];
  status: ScreenStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ScreenComponent = {
  __typename?: 'ScreenComponent';
  config?: Maybe<Scalars['JSONObject']['output']>;
  dataSource?: Maybe<ScreenComponentDataSource>;
  id: Scalars['ID']['output'];
  position: ScreenComponentPosition;
  type: Scalars['String']['output'];
};

export type ScreenComponentDataSource = {
  __typename?: 'ScreenComponentDataSource';
  data?: Maybe<Scalars['JSONObject']['output']>;
  refreshInterval?: Maybe<Scalars['Int']['output']>;
  type: ScreenComponentDataSourceType;
  url?: Maybe<Scalars['String']['output']>;
};

export type ScreenComponentDataSourceInput = {
  data?: InputMaybe<Scalars['JSONObject']['input']>;
  /** 刷新频率，单位毫秒 */
  refreshInterval?: InputMaybe<Scalars['Int']['input']>;
  type: ScreenComponentDataSourceType;
  url?: InputMaybe<Scalars['String']['input']>;
};

/** 屏幕组件数据源类型 */
export enum ScreenComponentDataSourceType {
  Api = 'API',
  Static = 'STATIC'
}

export type ScreenComponentInput = {
  config?: InputMaybe<Scalars['JSONObject']['input']>;
  dataSource?: InputMaybe<ScreenComponentDataSourceInput>;
  id: Scalars['String']['input'];
  position: ScreenComponentPositionInput;
  type: Scalars['String']['input'];
};

export type ScreenComponentPosition = {
  __typename?: 'ScreenComponentPosition';
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
  x: Scalars['Int']['output'];
  y: Scalars['Int']['output'];
  zIndex: Scalars['Int']['output'];
};

export type ScreenComponentPositionInput = {
  height: Scalars['Int']['input'];
  width: Scalars['Int']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
  zIndex: Scalars['Int']['input'];
};

export type ScreenConnection = {
  __typename?: 'ScreenConnection';
  edges: Array<ScreenEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ScreenEdge = {
  __typename?: 'ScreenEdge';
  cursor: Scalars['String']['output'];
  node: Screen;
};

export type ScreenGrid = {
  __typename?: 'ScreenGrid';
  enabled: Scalars['Boolean']['output'];
  size?: Maybe<Scalars['Int']['output']>;
};

export type ScreenGridInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** 网格尺寸，单位为像素 */
  size?: InputMaybe<Scalars['Int']['input']>;
};

export type ScreenLayout = {
  __typename?: 'ScreenLayout';
  background: Scalars['String']['output'];
  /** 向后兼容的列数信息 */
  cols?: Maybe<Scalars['Int']['output']>;
  grid?: Maybe<ScreenGrid>;
  height: Scalars['Int']['output'];
  /** 向后兼容的行数信息 */
  rows?: Maybe<Scalars['Int']['output']>;
  width: Scalars['Int']['output'];
};

export type ScreenLayoutInput = {
  background?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated 请使用 width + grid.size 表达列数 */
  cols?: InputMaybe<Scalars['Int']['input']>;
  grid?: InputMaybe<ScreenGridInput>;
  /** 画布高度，单位像素 */
  height?: InputMaybe<Scalars['Int']['input']>;
  /** @deprecated 请使用 height + grid.size 表达行数 */
  rows?: InputMaybe<Scalars['Int']['input']>;
  /** 画布宽度，单位像素 */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** 大屏状态 */
export enum ScreenStatus {
  Draft = 'Draft',
  Published = 'Published'
}

/** 数据源平台 */
export enum SourcePlatform {
  Custom = 'CUSTOM',
  Jd = 'JD',
  Weibo = 'WEIBO'
}

/** 数据源类型 */
export enum SourceType {
  Custom = 'CUSTOM',
  Jd = 'JD',
  WeiboApiJson = 'WEIBO_API_JSON',
  WeiboComment = 'WEIBO_COMMENT',
  WeiboComments = 'WEIBO_COMMENTS',
  WeiboCreatorProfile = 'WEIBO_CREATOR_PROFILE',
  WeiboHtml = 'WEIBO_HTML',
  WeiboKeywordSearch = 'WEIBO_KEYWORD_SEARCH',
  WeiboNoteDetail = 'WEIBO_NOTE_DETAIL'
}

export type StatsAggregationQueryDto = {
  endDate: Scalars['DateTime']['input'];
  interval: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  type: HourlyStatsType;
};

export type Subscription = {
  __typename?: 'Subscription';
  jdLoginEvents: JdLoginEvent;
  notificationReceived: Notification;
  weiboLoggedInUsersUpdate: WeiboLoggedInUsersStats;
  weiboLoginEvents: WeiboLoginEvent;
};


export type SubscriptionJdLoginEventsArgs = {
  sessionId: Scalars['String']['input'];
};


export type SubscriptionWeiboLoginEventsArgs = {
  sessionId: Scalars['String']['input'];
};

export type Tag = {
  __typename?: 'Tag';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  tagColor: Scalars['String']['output'];
  tagName: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['Int']['output'];
};

export type TagConnection = {
  __typename?: 'TagConnection';
  edges: Array<TagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TagEdge = {
  __typename?: 'TagEdge';
  cursor: Scalars['String']['output'];
  node: Tag;
};

export type TaskResult = {
  __typename?: 'TaskResult';
  /** 结果消息 */
  message: Scalars['String']['output'];
  /** 任务是否成功发布到队列 */
  success: Scalars['Boolean']['output'];
  /** 任务ID或相关标识 */
  taskId?: Maybe<Scalars['String']['output']>;
};

export type TimeRangeInput = {
  /** 结束时间 */
  endDate?: InputMaybe<Scalars['String']['input']>;
  /** 开始时间 */
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type TrendDataInput = {
  /** 聚合粒度 */
  granularity?: InputMaybe<Scalars['String']['input']>;
  /** 状态过滤 */
  status?: InputMaybe<ProcessingStatus>;
  /** 时间范围 */
  timeRange?: InputMaybe<TimeRangeInput>;
};

export type TrendDataPoint = {
  __typename?: 'TrendDataPoint';
  /** 数据量 */
  count: Scalars['Int']['output'];
  /** 状态 */
  status: ProcessingStatus;
  /** 时间点 */
  timestamp: Scalars['String']['output'];
};

export type UpdateApiKeyDto = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<ApiKeyType>;
};

export type UpdateBugInput = {
  actualBehavior?: InputMaybe<Scalars['String']['input']>;
  actualHours?: InputMaybe<Scalars['Float']['input']>;
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  estimatedHours?: InputMaybe<Scalars['Float']['input']>;
  expectedBehavior?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<BugPriority>;
  reproductionRate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<BugStatus>;
  stepsToReproduce?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBugStatusInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  status: BugStatus;
};

export type UpdateEventInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  district?: InputMaybe<Scalars['String']['input']>;
  eventName?: InputMaybe<Scalars['String']['input']>;
  eventTypeId?: InputMaybe<Scalars['ID']['input']>;
  industryTypeId?: InputMaybe<Scalars['ID']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  locationText?: InputMaybe<Scalars['String']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  occurTime?: InputMaybe<Scalars['String']['input']>;
  province?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EventStatus>;
  street?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateEventTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  eventCode?: InputMaybe<Scalars['String']['input']>;
  eventName?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateIndustryTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  industryCode?: InputMaybe<Scalars['String']['input']>;
  industryName?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateMediaTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<MediaTypeStatus>;
  typeCode?: InputMaybe<Scalars['String']['input']>;
  typeName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateScreenInput = {
  components?: InputMaybe<Array<ScreenComponentInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  layout?: InputMaybe<ScreenLayoutInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTagInput = {
  tagColor?: InputMaybe<Scalars['String']['input']>;
  tagName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserDto = {
  email?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWeiboSearchTaskInput = {
  crawlInterval?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  keyword?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: UserStatus;
  updatedAt: Scalars['DateTime']['output'];
  username: Scalars['String']['output'];
};

export type UserConnectionStats = {
  __typename?: 'UserConnectionStats';
  count: Scalars['Int']['output'];
  userId: Scalars['String']['output'];
};

export type UserSessionStats = {
  __typename?: 'UserSessionStats';
  activeCount: Scalars['Int']['output'];
  totalDuration: Scalars['Float']['output'];
  userId: Scalars['String']['output'];
};

/** 用户状态枚举 */
export enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED'
}

export type WebSocketStats = {
  __typename?: 'WebSocketStats';
  averageConnectionDuration: Scalars['Float']['output'];
  connectionsByUser: Array<UserConnectionStats>;
  totalConnections: Scalars['Int']['output'];
};

export type WeiboAccount = {
  __typename?: 'WeiboAccount';
  avatar?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  hasCookies: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  lastCheckAt?: Maybe<Scalars['DateTime']['output']>;
  nickname: Scalars['String']['output'];
  status: Scalars['String']['output'];
  uid: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type WeiboAccountConnection = {
  __typename?: 'WeiboAccountConnection';
  edges: Array<WeiboAccountEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WeiboAccountEdge = {
  __typename?: 'WeiboAccountEdge';
  cursor: Scalars['String']['output'];
  node: WeiboAccount;
};

export type WeiboAccountFilterInput = {
  keyword?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  pageSize?: InputMaybe<Scalars['Float']['input']>;
};

export type WeiboAccountStats = {
  __typename?: 'WeiboAccountStats';
  online: Scalars['Int']['output'];
  todayNew: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type WeiboAccountWithCookies = {
  __typename?: 'WeiboAccountWithCookies';
  cookies: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  lastCheckAt?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  weiboNickname?: Maybe<Scalars['String']['output']>;
  weiboUid: Scalars['String']['output'];
};

export type WeiboLoggedInUsersStats = {
  __typename?: 'WeiboLoggedInUsersStats';
  online: Scalars['Int']['output'];
  todayNew: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type WeiboLoginEvent = {
  __typename?: 'WeiboLoginEvent';
  data?: Maybe<Scalars['JSONObject']['output']>;
  type: WeiboLoginEventType;
};

/** 微博扫码登录事件类型 */
export enum WeiboLoginEventType {
  Error = 'Error',
  Expired = 'Expired',
  Qrcode = 'Qrcode',
  Scanned = 'Scanned',
  Status = 'Status',
  Success = 'Success'
}

export type WeiboLoginSession = {
  __typename?: 'WeiboLoginSession';
  expired: Scalars['Boolean']['output'];
  expiresAt: Scalars['DateTime']['output'];
  lastEvent?: Maybe<WeiboLoginEvent>;
  sessionId: Scalars['String']['output'];
};

export type WeiboSearchTask = {
  __typename?: 'WeiboSearchTask';
  crawlInterval: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  keyword: Scalars['String']['output'];
  latestCrawlTime?: Maybe<Scalars['DateTime']['output']>;
  nextRunAt?: Maybe<Scalars['DateTime']['output']>;
  startDate: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type WeiboSearchTaskConnection = {
  __typename?: 'WeiboSearchTaskConnection';
  edges: Array<WeiboSearchTaskEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WeiboSearchTaskEdge = {
  __typename?: 'WeiboSearchTaskEdge';
  cursor: Scalars['String']['output'];
  node: WeiboSearchTask;
};

export type WeiboSearchTaskFilterInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  keyword?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
};

export type WeiboSearchTaskStats = {
  __typename?: 'WeiboSearchTaskStats';
  disabled: Scalars['Int']['output'];
  enabled: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type WeiboSessionStats = {
  __typename?: 'WeiboSessionStats';
  activeSessions: Scalars['Int']['output'];
  averageSessionDuration: Scalars['Float']['output'];
  completedSessions: Scalars['Int']['output'];
  expiredSessions: Scalars['Int']['output'];
  memorySessions: Scalars['Int']['output'];
  sessionsByUser: Array<UserSessionStats>;
  totalSessions: Scalars['Int']['output'];
  webSocketConnections: Scalars['Int']['output'];
};

export type LoginMutationVariables = Exact<{
  input: LoginDto;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, username: string, email: string, status: UserStatus, createdAt: string, updatedAt: string } } };

export type RegisterMutationVariables = Exact<{
  input: RegisterDto;
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, username: string, email: string, status: UserStatus, createdAt: string, updatedAt: string } } };

export type RefreshMutationVariables = Exact<{
  input: RefreshTokenDto;
}>;


export type RefreshMutation = { __typename?: 'Mutation', refreshToken: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, username: string, email: string, status: UserStatus, createdAt: string, updatedAt: string } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, username: string, email: string, status: UserStatus, createdAt: string, updatedAt: string } };

export type EventsForMapQueryVariables = Exact<{
  filter?: InputMaybe<EventMapQueryInput>;
}>;


export type EventsForMapQuery = { __typename?: 'Query', eventsForMap: Array<{ __typename?: 'EventMapPoint', id: string, eventName: string, summary?: string | null, occurTime: string, province: string, city: string, district?: string | null, street?: string | null, longitude: number, latitude: number, status: EventStatus, eventTypeId: string, industryTypeId: string }> };

export type EventsQueryVariables = Exact<{
  filter?: InputMaybe<EventQueryInput>;
}>;


export type EventsQuery = { __typename?: 'Query', events: { __typename?: 'EventConnection', edges: Array<{ __typename?: 'EventEdge', node: { __typename?: 'Event', id: string, eventName: string, summary?: string | null, occurTime: string, province: string, city: string, district?: string | null, street?: string | null, status: EventStatus, eventTypeId: string, industryTypeId: string } }> } };

export type AmapKeyQueryVariables = Exact<{ [key: string]: never; }>;


export type AmapKeyQuery = { __typename?: 'Query', configValue: { __typename?: 'ConfigValue', value: string } };

export type PublishedScreensQueryVariables = Exact<{
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type PublishedScreensQuery = { __typename?: 'Query', publishedScreens: { __typename?: 'ScreenConnection', totalCount: number, edges: Array<{ __typename?: 'ScreenEdge', node: { __typename?: 'Screen', id: string, name: string, description?: string | null, status: ScreenStatus, isDefault: boolean, createdBy: string, createdAt: string, updatedAt: string, layout: { __typename?: 'ScreenLayout', width: number, height: number, background: string, cols?: number | null, rows?: number | null, grid?: { __typename?: 'ScreenGrid', size?: number | null, enabled: boolean } | null }, components: Array<{ __typename?: 'ScreenComponent', id: string, type: string, config?: Record<string, unknown> | null, position: { __typename?: 'ScreenComponentPosition', x: number, y: number, width: number, height: number, zIndex: number }, dataSource?: { __typename?: 'ScreenComponentDataSource', type: ScreenComponentDataSourceType, url?: string | null, data?: Record<string, unknown> | null, refreshInterval?: number | null } | null }> } }> } };

export type DefaultScreenQueryVariables = Exact<{ [key: string]: never; }>;


export type DefaultScreenQuery = { __typename?: 'Query', defaultScreen: { __typename?: 'Screen', id: string, name: string, description?: string | null, status: ScreenStatus, isDefault: boolean, createdBy: string, createdAt: string, updatedAt: string, layout: { __typename?: 'ScreenLayout', width: number, height: number, background: string, cols?: number | null, rows?: number | null, grid?: { __typename?: 'ScreenGrid', size?: number | null, enabled: boolean } | null }, components: Array<{ __typename?: 'ScreenComponent', id: string, type: string, config?: Record<string, unknown> | null, position: { __typename?: 'ScreenComponentPosition', x: number, y: number, width: number, height: number, zIndex: number }, dataSource?: { __typename?: 'ScreenComponentDataSource', type: ScreenComponentDataSourceType, url?: string | null, data?: Record<string, unknown> | null, refreshInterval?: number | null } | null }> } };

export type ScreenQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ScreenQuery = { __typename?: 'Query', screen: { __typename?: 'Screen', id: string, name: string, description?: string | null, status: ScreenStatus, isDefault: boolean, createdBy: string, createdAt: string, updatedAt: string, layout: { __typename?: 'ScreenLayout', width: number, height: number, background: string, cols?: number | null, rows?: number | null, grid?: { __typename?: 'ScreenGrid', size?: number | null, enabled: boolean } | null }, components: Array<{ __typename?: 'ScreenComponent', id: string, type: string, config?: Record<string, unknown> | null, position: { __typename?: 'ScreenComponentPosition', x: number, y: number, width: number, height: number, zIndex: number }, dataSource?: { __typename?: 'ScreenComponentDataSource', type: ScreenComponentDataSourceType, url?: string | null, data?: Record<string, unknown> | null, refreshInterval?: number | null } | null }> } };

export type UserQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user: { __typename?: 'User', id: string, username: string, email: string, status: UserStatus, createdAt: string, updatedAt: string } };

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateUserDto;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser: { __typename?: 'User', id: string, username: string, email: string, status: UserStatus, createdAt: string, updatedAt: string } };

export type WeiboAccountStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type WeiboAccountStatsQuery = { __typename?: 'Query', weiboAccountStats: { __typename?: 'WeiboAccountStats', total: number, todayNew: number, online: number } };


export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const RefreshDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Refresh"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RefreshTokenDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RefreshMutation, RefreshMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const EventsForMapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EventsForMap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"EventMapQueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"eventsForMap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventName"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"occurTime"}},{"kind":"Field","name":{"kind":"Name","value":"province"}},{"kind":"Field","name":{"kind":"Name","value":"city"}},{"kind":"Field","name":{"kind":"Name","value":"district"}},{"kind":"Field","name":{"kind":"Name","value":"street"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"eventTypeId"}},{"kind":"Field","name":{"kind":"Name","value":"industryTypeId"}}]}}]}}]} as unknown as DocumentNode<EventsForMapQuery, EventsForMapQueryVariables>;
export const EventsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Events"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"EventQueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"eventName"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"occurTime"}},{"kind":"Field","name":{"kind":"Name","value":"province"}},{"kind":"Field","name":{"kind":"Name","value":"city"}},{"kind":"Field","name":{"kind":"Name","value":"district"}},{"kind":"Field","name":{"kind":"Name","value":"street"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"eventTypeId"}},{"kind":"Field","name":{"kind":"Name","value":"industryTypeId"}}]}}]}}]}}]}}]} as unknown as DocumentNode<EventsQuery, EventsQueryVariables>;
export const AmapKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AmapKey"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"configValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"EnumValue","value":"AMAP_API_KEY"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]} as unknown as DocumentNode<AmapKeyQuery, AmapKeyQueryVariables>;
export const PublishedScreensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublishedScreens"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishedScreens"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"layout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"background"}},{"kind":"Field","name":{"kind":"Name","value":"cols"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"grid"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"position"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"x"}},{"kind":"Field","name":{"kind":"Name","value":"y"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"zIndex"}}]}},{"kind":"Field","name":{"kind":"Name","value":"config"}},{"kind":"Field","name":{"kind":"Name","value":"dataSource"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"refreshInterval"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<PublishedScreensQuery, PublishedScreensQueryVariables>;
export const DefaultScreenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DefaultScreen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultScreen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"layout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"background"}},{"kind":"Field","name":{"kind":"Name","value":"cols"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"grid"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"position"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"x"}},{"kind":"Field","name":{"kind":"Name","value":"y"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"zIndex"}}]}},{"kind":"Field","name":{"kind":"Name","value":"config"}},{"kind":"Field","name":{"kind":"Name","value":"dataSource"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"refreshInterval"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<DefaultScreenQuery, DefaultScreenQueryVariables>;
export const ScreenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Screen"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"screen"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"layout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"background"}},{"kind":"Field","name":{"kind":"Name","value":"cols"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"grid"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"position"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"x"}},{"kind":"Field","name":{"kind":"Name","value":"y"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"zIndex"}}]}},{"kind":"Field","name":{"kind":"Name","value":"config"}},{"kind":"Field","name":{"kind":"Name","value":"dataSource"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"refreshInterval"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"isDefault"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<ScreenQuery, ScreenQueryVariables>;
export const UserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"User"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UserQuery, UserQueryVariables>;
export const UpdateUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserDto"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateUserMutation, UpdateUserMutationVariables>;
export const WeiboAccountStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WeiboAccountStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"weiboAccountStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"todayNew"}},{"kind":"Field","name":{"kind":"Name","value":"online"}}]}}]}}]} as unknown as DocumentNode<WeiboAccountStatsQuery, WeiboAccountStatsQueryVariables>;