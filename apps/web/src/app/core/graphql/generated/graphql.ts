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
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: { input: Record<string, unknown>; output: Record<string, unknown>; }
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

export type CreateApiKeyDto = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  type: ApiKeyType;
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
  enableAccountRotation?: InputMaybe<Scalars['Boolean']['input']>;
  keyword: Scalars['String']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  locationAddress?: InputMaybe<Scalars['String']['input']>;
  locationName?: InputMaybe<Scalars['String']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  maxRetries?: InputMaybe<Scalars['Int']['input']>;
  noDataThreshold?: InputMaybe<Scalars['Int']['input']>;
  startDate: Scalars['String']['input'];
  weiboAccountId?: InputMaybe<Scalars['Int']['input']>;
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

export type Mutation = {
  __typename?: 'Mutation';
  addTagsToEvent: Event;
  archiveEvent: Event;
  checkAllJdAccounts: JdAccountCheckSummary;
  checkAllWeiboAccounts: Scalars['Boolean']['output'];
  checkJdAccount: JdAccountCheckResult;
  checkWeiboAccount: Scalars['Boolean']['output'];
  clearConfigCache: Scalars['Boolean']['output'];
  confirmEventAttachmentUpload: EventAttachment;
  copyScreen: Screen;
  createApiKey: ApiKeyResponseDto;
  createEvent: Event;
  createEventType: EventType;
  createIndustryType: IndustryType;
  createMediaType: MediaType;
  createScreen: Screen;
  createTag: Tag;
  createWeiboSearchTask: WeiboSearchTask;
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
  refreshToken: AuthPayload;
  regenerateApiKey: RegenerateApiKeyDto;
  register: AuthPayload;
  removeApiKey: Scalars['Boolean']['output'];
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
  resumeAllWeiboSearchTasks: Scalars['Int']['output'];
  resumeWeiboSearchTask: WeiboSearchTask;
  runWeiboSearchTaskNow: WeiboSearchTask;
  setDefaultScreen: Screen;
  startJdLogin: JdLoginSession;
  startWeiboLogin: WeiboLoginSession;
  updateApiKey: ApiKeyResponseDto;
  updateEvent: Event;
  updateEventType: EventType;
  updateIndustryType: IndustryType;
  updateMediaType: MediaType;
  updateScreen: Screen;
  updateTag: Tag;
  updateUser: User;
  updateWeiboSearchTask: WeiboSearchTask;
};


export type MutationAddTagsToEventArgs = {
  eventId: Scalars['ID']['input'];
  tagIds: Array<Scalars['ID']['input']>;
};


export type MutationArchiveEventArgs = {
  id: Scalars['ID']['input'];
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


export type MutationRunWeiboSearchTaskNowArgs = {
  id: Scalars['Int']['input'];
  input?: InputMaybe<RunWeiboTaskNowInput>;
};


export type MutationSetDefaultScreenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateApiKeyArgs = {
  id: Scalars['Int']['input'];
  input: UpdateApiKeyDto;
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

export type PauseWeiboTaskInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  apiKey: ApiKeyResponseDto;
  apiKeyStats: ApiKeyStatsDto;
  apiKeySummary: ApiKeySummaryStatsDto;
  apiKeys: ApiKeyConnection;
  configCacheStats: ConfigCacheStats;
  configValue: ConfigValue;
  dashboardRecentActivities: Array<DashboardActivity>;
  dashboardStats: DashboardStats;
  defaultScreen: Screen;
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
  screen: Screen;
  screens: ScreenConnection;
  tag: Tag;
  tags: TagConnection;
  user: User;
  users: Array<User>;
  weiboAccount: WeiboAccount;
  weiboAccountStats: WeiboAccountStats;
  weiboAccounts: WeiboAccountConnection;
  weiboAccountsWithCookies: Array<WeiboAccountWithCookies>;
  weiboLoginSession: WeiboLoginSession;
  weiboSearchTask: WeiboSearchTask;
  weiboSearchTaskStats: WeiboSearchTaskStats;
  weiboSearchTasks: WeiboSearchTaskConnection;
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


export type QueryConfigValueArgs = {
  type: ConfigType;
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


export type QueryScreenArgs = {
  id: Scalars['ID']['input'];
};


export type QueryScreensArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryWeiboLoginSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryWeiboSearchTaskArgs = {
  id: Scalars['Int']['input'];
};


export type QueryWeiboSearchTasksArgs = {
  filter?: InputMaybe<WeiboSearchTaskFilterInput>;
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

export type Subscription = {
  __typename?: 'Subscription';
  jdLoginEvents: JdLoginEvent;
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

export type UpdateApiKeyDto = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<ApiKeyType>;
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
  enableAccountRotation?: InputMaybe<Scalars['Boolean']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  keyword?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  locationAddress?: InputMaybe<Scalars['String']['input']>;
  locationName?: InputMaybe<Scalars['String']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  maxRetries?: InputMaybe<Scalars['Int']['input']>;
  noDataThreshold?: InputMaybe<Scalars['Int']['input']>;
  resetNoDataCount?: InputMaybe<Scalars['Boolean']['input']>;
  resetRetryCount?: InputMaybe<Scalars['Boolean']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<WeiboSearchTaskStatus>;
  totalSegments?: InputMaybe<Scalars['Int']['input']>;
  weiboAccountId?: InputMaybe<Scalars['Int']['input']>;
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

/** 用户状态枚举 */
export enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED'
}

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
  createdAt: Scalars['DateTime']['output'];
  currentCrawlTime?: Maybe<Scalars['DateTime']['output']>;
  enableAccountRotation: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  keyword: Scalars['String']['output'];
  latestCrawlTime?: Maybe<Scalars['DateTime']['output']>;
  maxRetries: Scalars['Int']['output'];
  nextRunAt?: Maybe<Scalars['DateTime']['output']>;
  progress: Scalars['Int']['output'];
  retryCount: Scalars['Int']['output'];
  startDate: Scalars['DateTime']['output'];
  status: WeiboSearchTaskStatus;
  totalSegments: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  weiboAccountId?: Maybe<Scalars['Int']['output']>;
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
  status?: InputMaybe<WeiboSearchTaskStatus>;
};

export type WeiboSearchTaskStats = {
  __typename?: 'WeiboSearchTaskStats';
  completed: Scalars['Int']['output'];
  enabled: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  paused: Scalars['Int']['output'];
  running: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** 微博搜索任务状态 */
export enum WeiboSearchTaskStatus {
  Failed = 'FAILED',
  Paused = 'PAUSED',
  Pending = 'PENDING',
  Running = 'RUNNING',
  Timeout = 'TIMEOUT'
}

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