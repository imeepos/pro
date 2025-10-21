import { WeiboCrawlMode, WeiboSearchType } from '@pro/types';
import { WeiboNoteDetail } from './detail-crawler.service';
import { WeiboCreatorDetail } from './creator-crawler.service';
import { WeiboComment } from './comment-crawler.service';
import { MediaDownloadTask } from './media-downloader.service';

export interface SubTaskMessage {
  taskId: number;
  type?: string;
  metadata?: {
    startTime?: string | Date;
    endTime?: string | Date;
    keyword?: string;
    [key: string]: unknown;
  };
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
  metadata: NonNullable<SubTaskMessage['metadata']>;
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

export interface TraceContext {
  traceId: string;
  taskId: number;
  keyword: string;
  startTime: Date;
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
