/**
 * 微博搜索任务接口定义 - 支持多模式爬取的数字艺术品
 * 枚举值统一从 enums/weibo.ts 导入，确保类型安全的统一性
 */
import { WeiboSearchType, WeiboCrawlMode } from './enums/weibo.js';

export { WeiboSearchType, WeiboCrawlMode } from './enums/weibo.js';

export interface WeiboSearchTask {
  id: number;
  keyword: string;
  startDate: Date;
  latestCrawlTime?: Date;
  crawlInterval: string;
  nextRunAt?: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWeiboSearchTaskDto {
  keyword: string;
  startDate: string;
  crawlInterval?: string;
}

export interface UpdateWeiboSearchTaskDto {
  keyword?: string;
  startDate?: string;
  crawlInterval?: string;
  enabled?: boolean;
}

export interface WeiboSearchTaskFilters {
  keyword?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'nextRunAt' | 'startDate';
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
  searchType?: WeiboSearchType;
  crawlModes?: WeiboCrawlMode[];
}

export interface WeiboSubTask {
  id: number;
  taskId: number;
  metadata: {
    startTime?: string | Date;
    endTime?: string | Date;
    keyword?: string;
    [key: string]: unknown;
  };
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// 多模式爬取的子任务消息扩展 - 继承原有结构，赋予新的生命
export interface EnhancedSubTaskMessage extends SubTaskMessage {
  searchType?: WeiboSearchType;
  crawlModes?: WeiboCrawlMode[];
  targetNoteId?: string;          // 指定帖子ID，用于详情爬取
  targetCreatorId?: string;       // 指定创作者ID，用于创作者爬取
  maxCommentDepth?: number;       // 评论爬取深度
  enableMediaDownload?: boolean;  // 是否下载媒体文件
}

// 微博帖子详情 - 数字化的社会记忆碎片
export interface WeiboNoteDetail {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  publishTime: Date;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  images: string[];
  videos: VideoInfo[];
  topics: string[];
  mentions: string[];
  location?: LocationInfo;
  isOriginal: boolean;
  sourceNoteId?: string;  // 转发时的原始帖子ID
  rawHtml: string;
  crawledAt: Date;
}

// 视频信息 - 多媒体内容的结构化表达
export interface VideoInfo {
  url: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  format: string;
}

// 位置信息 - 数字化的地理印记
export interface LocationInfo {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
}

// 创作者信息 - 数字身份的完整画像
export interface WeiboCreatorDetail {
  id: string;
  nickname: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  verificationType?: string;
  location?: string;
  gender?: string;
  birthday?: string;
  registrationDate?: Date;
  lastActiveTime?: Date;
  notes: WeiboNoteSummary[];
  rawProfileHtml: string;
  crawledAt: Date;
}

// 微博摘要 - 创作者作品的时间序列索引
export interface WeiboNoteSummary {
  id: string;
  content: string;
  publishTime: Date;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  hasImages: boolean;
  hasVideo: boolean;
  isOriginal: boolean;
}

// 评论信息 - 社会互动的数据化呈现
export interface WeiboComment {
  id: string;
  noteId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  publishTime: Date;
  likeCount: number;
  replyCount: number;
  parentCommentId?: string;    // 父评论ID，用于构建评论树
  subComments?: WeiboComment[]; // 子评论数组
  rawHtml: string;
  crawledAt: Date;
}

// 媒体下载任务 - 数字资产的持久化管理
export interface MediaDownloadTask {
  id: string;
  url: string;
  type: 'image' | 'video';
  sourceType: 'note' | 'avatar' | 'background';
  sourceId: string;
  filename: string;
  localPath?: string;
  size?: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// 多模式爬取结果 - 统一的数据抽象
export interface MultiModeCrawlResult {
  searchResult?: CrawlResult;
  noteDetails?: WeiboNoteDetail[];
  creatorDetails?: WeiboCreatorDetail[];
  comments?: WeiboComment[];
  mediaDownloads?: MediaDownloadTask[];
  crawlMetrics: EnhancedCrawlMetrics;
}

// 增强的爬取指标 - 量化数字艺术品的性能
export interface EnhancedCrawlMetrics {
  // 基础指标
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  skippedPages: number;
  totalRequests: number;
  averagePageLoadTime: number;
  totalDataSize: number;

  // 多模式指标
  notesCrawled: number;
  detailsCrawled: number;
  creatorsCrawled: number;
  commentsCrawled: number;
  mediaFilesDownloaded: number;
  commentDepthReached: number;

  // 性能指标
  totalDuration: number;
  throughputMBps: number;
  requestsPerSecond: number;
  errorRate: number;

  // 资源使用
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

// 保持向后兼容的原始接口
export interface SubTaskMessage {
  taskId: number;
  keyword: string;
  start: Date;
  end: Date;
  isInitialCrawl: boolean;
  weiboAccountId?: number;
  enableAccountRotation: boolean;
}

export interface CrawlResult {
  success: boolean;
  pageCount: number;
  firstPostTime?: Date;
  lastPostTime?: Date;
  error?: string;
}

export interface TraceContext {
  traceId: string;
  taskId: number;
  keyword: string;
  startTime: Date;
}
