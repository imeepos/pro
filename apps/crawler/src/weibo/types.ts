import { WeiboCrawlMode, WeiboSearchType } from '@pro/types';
import type { WeiboNoteDetail } from './detail-crawler.service';
import type { WeiboCreatorDetail } from './creator-crawler.service';
import type { WeiboComment } from './comment-crawler.service';
import type { MediaDownloadTask } from './media-downloader.service';

export interface TraceContext {
  traceId: string;
  taskId: number;
  keyword: string;
  startTime: Date;
}

export interface SubTaskMetadata {
  startTime?: string | Date;
  endTime?: string | Date;
  keyword?: string;
  [key: string]: unknown;
}

export interface SubTaskMessage {
  taskId: number;
  type?: string;
  metadata?: SubTaskMetadata;
  keyword?: string;
  start?: Date;
  end?: Date;
  isInitialCrawl?: boolean;
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
}

export type NormalizedSubTask = SubTaskMessage & {
  keyword: string;
  start: Date;
  end: Date;
  isInitialCrawl: boolean;
  enableAccountRotation: boolean;
  metadata: Required<SubTaskMetadata>;
};

export interface EnhancedSubTaskMessage extends SubTaskMessage {
  searchType?: WeiboSearchType;
  crawlModes?: WeiboCrawlMode[];
  targetNoteId?: string;
  targetCreatorId?: string;
  maxCommentDepth?: number;
  enableMediaDownload?: boolean;
  enableDetailCrawl?: boolean;
  enableCreatorCrawl?: boolean;
  enableCommentCrawl?: boolean;
}

export interface CrawlResult {
  success: boolean;
  pageCount: number;
  firstPostTime?: Date;
  lastPostTime?: Date;
  gapSubTaskScheduled?: boolean;
  error?: string;
}

export interface EnhancedCrawlMetrics {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  skippedPages: number;
  totalRequests: number;
  averagePageLoadTime: number;
  totalDataSize: number;
  notesCrawled: number;
  detailsCrawled: number;
  creatorsCrawled: number;
  commentsCrawled: number;
  mediaFilesDownloaded: number;
  commentDepthReached: number;
  totalDuration: number;
  throughputMBps: number;
  requestsPerSecond: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

export interface MultiModeCrawlResult {
  searchResult?: CrawlResult;
  noteDetails?: WeiboNoteDetail[];
  creatorDetails?: WeiboCreatorDetail[];
  comments?: WeiboComment[];
  mediaDownloads?: MediaDownloadTask[];
  crawlMetrics: EnhancedCrawlMetrics;
}

export interface MultiModeExecutionContext {
  message: EnhancedSubTaskMessage;
  normalizedMessage: NormalizedSubTask;
  traceContext: TraceContext;
  startTimestamp: number;
  baseCrawl: () => Promise<CrawlResult>;
  formatDuration: (milliseconds: number) => string;
}
