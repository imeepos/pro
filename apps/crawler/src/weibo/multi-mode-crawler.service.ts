import { Injectable, Logger } from '@nestjs/common';
import { WeiboAccountService, WeiboAccount } from './account.service';
import { WeiboDetailCrawlerService, WeiboNoteDetail } from './detail-crawler.service';
import { WeiboCreatorCrawlerService, WeiboCreatorDetail } from './creator-crawler.service';
import { WeiboCommentCrawlerService, WeiboComment } from './comment-crawler.service';
import { WeiboMediaDownloaderService, MediaDownloadTask } from './media-downloader.service';
import { WeiboCrawlMode } from '@pro/types';
import { DurationFormatter } from '@pro/crawler-utils';
import {
  CrawlResult,
  EnhancedCrawlMetrics,
  EnhancedSubTaskMessage,
  MultiModeCrawlResult,
  NormalizedSubTask,
  MultiModeExecutionContext,
  TraceContext,
} from './types';

@Injectable()
export class WeiboMultiModeCrawlerService {
  private readonly logger = new Logger(WeiboMultiModeCrawlerService.name);

  constructor(
    private readonly accountService: WeiboAccountService,
    private readonly detailCrawlerService: WeiboDetailCrawlerService,
    private readonly creatorCrawlerService: WeiboCreatorCrawlerService,
    private readonly commentCrawlerService: WeiboCommentCrawlerService,
    private readonly mediaDownloaderService: WeiboMediaDownloaderService,
  ) {}

  async execute({
    message,
    normalizedMessage,
    traceContext,
    startTimestamp,
    baseCrawl,
  }: MultiModeExecutionContext): Promise<MultiModeCrawlResult> {
    this.logger.log('🎭 开始多模式爬取任务', {
      traceId: traceContext.traceId,
      taskId: normalizedMessage.taskId,
      keyword: normalizedMessage.keyword,
      searchType: message.searchType ?? 'DEFAULT',
      crawlModes: message.crawlModes || [WeiboCrawlMode.SEARCH],
      enableDetailCrawl: message.enableDetailCrawl,
      enableCreatorCrawl: message.enableCreatorCrawl,
      enableCommentCrawl: message.enableCommentCrawl,
      enableMediaDownload: message.enableMediaDownload,
      startTime: new Date().toISOString(),
    });

    const result: MultiModeCrawlResult = {
      crawlMetrics: this.initializeEnhancedMetrics(startTimestamp),
    };

    try {
      if (this.shouldExecuteMode(WeiboCrawlMode.SEARCH, message.crawlModes)) {
        this.logger.debug('🔍 执行搜索模式爬取', { traceId: traceContext.traceId });
        const searchResult = await baseCrawl();
        result.searchResult = searchResult;

        result.crawlMetrics.totalPages = searchResult.pageCount;
        result.crawlMetrics.successfulPages = searchResult.success ? searchResult.pageCount : 0;
        result.crawlMetrics.failedPages = searchResult.success ? 0 : 1;
      }

      if (this.shouldExecuteMode(WeiboCrawlMode.DETAIL, message.crawlModes) || message.enableDetailCrawl) {
        const noteIds = await this.extractNoteIdsFromSearchResult(normalizedMessage.taskId);

        if (noteIds.length > 0) {
          this.logger.debug('📄 执行详情模式爬取', {
            traceId: traceContext.traceId,
            noteIdsCount: noteIds.length,
          });

          const detailResults = await this.executeDetailCrawl(noteIds, traceContext, normalizedMessage.weiboAccountId);
          result.noteDetails = detailResults;
          result.crawlMetrics.detailsCrawled = detailResults.filter(Boolean).length;
        }
      }

      if (this.shouldExecuteMode(WeiboCrawlMode.CREATOR, message.crawlModes) || message.enableCreatorCrawl) {
        const creatorIds = await this.extractCreatorIdsFromResults(result);

        if (creatorIds.length > 0) {
          this.logger.debug('🎨 执行创作者模式爬取', {
            traceId: traceContext.traceId,
            creatorIdsCount: creatorIds.length,
          });

          const creatorResults = await this.executeCreatorCrawl(creatorIds, traceContext, normalizedMessage.weiboAccountId);
          result.creatorDetails = creatorResults;
          result.crawlMetrics.creatorsCrawled = creatorResults.filter(Boolean).length;
        }
      }

      if (this.shouldExecuteMode(WeiboCrawlMode.COMMENT, message.crawlModes) || message.enableCommentCrawl) {
        const noteIdsForComments = await this.getNoteIdsForCommentCrawl(result);

        if (noteIdsForComments.length > 0) {
          this.logger.debug('💬 执行评论模式爬取', {
            traceId: traceContext.traceId,
            noteIdsCount: noteIdsForComments.length,
            maxDepth: message.maxCommentDepth || 3,
          });

          const commentResults = await this.executeCommentCrawl(
            noteIdsForComments,
            message.maxCommentDepth || 3,
            traceContext,
            normalizedMessage.weiboAccountId,
          );
          result.comments = commentResults;
          result.crawlMetrics.commentsCrawled = commentResults.length;
          result.crawlMetrics.commentDepthReached = this.calculateMaxCommentDepth(commentResults);
        }
      }

      if (this.shouldExecuteMode(WeiboCrawlMode.MEDIA, message.crawlModes) || message.enableMediaDownload) {
        const mediaUrls = await this.extractMediaUrlsFromResults(result);

        if (mediaUrls.length > 0) {
          this.logger.debug('🎨 执行媒体下载', {
            traceId: traceContext.traceId,
            mediaUrlsCount: mediaUrls.length,
          });

          const downloadTasks = await this.executeMediaDownload(mediaUrls);
          result.mediaDownloads = downloadTasks;
          result.crawlMetrics.mediaFilesDownloaded = downloadTasks.filter(
            (task) => task.status === 'completed',
          ).length;
        }
      }

      this.calculateFinalMetrics(result.crawlMetrics, startTimestamp);

      const totalDuration = Date.now() - startTimestamp;
      this.logger.log('🎉 多模式爬取任务完成', {
        traceId: traceContext.traceId,
        taskId: normalizedMessage.taskId,
        keyword: normalizedMessage.keyword,
        duration: totalDuration,
        durationFormatted: DurationFormatter.format(totalDuration),
        metrics: result.crawlMetrics,
        modesExecuted: message.crawlModes,
        finishedAt: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const totalDuration = Date.now() - startTimestamp;
      result.crawlMetrics.totalDuration = totalDuration;

      this.logger.error('💥 多模式爬取任务失败', {
        traceId: traceContext.traceId,
        taskId: normalizedMessage.taskId,
        keyword: normalizedMessage.keyword,
        duration: totalDuration,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyMultiModeError(error),
        finishedAt: new Date().toISOString(),
      });

      return result;
    }
  }

  private shouldExecuteMode(mode: WeiboCrawlMode, crawlModes?: WeiboCrawlMode[]): boolean {
    return !crawlModes || crawlModes.includes(mode);
  }

  private async executeDetailCrawl(
    noteIds: string[],
    traceContext: TraceContext,
    accountId?: number,
  ): Promise<WeiboNoteDetail[]> {
    let detailAccount: WeiboAccount | undefined;
    if (accountId) {
      detailAccount = await this.accountService.getAvailableAccount(accountId);
    }

    const detailResults = await this.detailCrawlerService.batchGetNoteDetails(noteIds, detailAccount);
    return detailResults.map((r) => r.detail).filter((detail): detail is WeiboNoteDetail => detail !== null);
  }

  private async executeCreatorCrawl(
    creatorIds: string[],
    traceContext: TraceContext,
    accountId?: number,
  ): Promise<WeiboCreatorDetail[]> {
    const creatorResults: WeiboCreatorDetail[] = [];

    for (const creatorId of creatorIds) {
      let creatorAccount: WeiboAccount | undefined;
      if (accountId) {
        creatorAccount = await this.accountService.getAvailableAccount(accountId);
      }

      const creatorDetail = await this.creatorCrawlerService.getCreatorInfoById(
        creatorId,
        creatorAccount,
        traceContext,
      );
      if (creatorDetail) {
        creatorResults.push(creatorDetail);
      }

      await this.multiModeRandomDelay(2000, 4000);
    }

    return creatorResults;
  }

  private async executeCommentCrawl(
    noteIds: string[],
    maxDepth: number,
    traceContext: TraceContext,
    accountId?: number,
  ): Promise<WeiboComment[]> {
    const allComments: WeiboComment[] = [];

    for (const noteId of noteIds) {
      let weiboAccount: WeiboAccount | undefined;
      if (accountId) {
        weiboAccount = await this.accountService.getAvailableAccount(accountId);
      }

      const comments = await this.commentCrawlerService.getAllCommentsByNoteId(noteId, maxDepth, 500, weiboAccount);
      allComments.push(...comments);

      await this.multiModeRandomDelay(3000, 5000);
    }

    return allComments;
  }

  private async executeMediaDownload(
    mediaUrls: Array<{
      url: string;
      type: 'image' | 'video';
      sourceType: 'note' | 'avatar' | 'background';
      sourceId: string;
    }>,
  ): Promise<MediaDownloadTask[]> {
    return this.mediaDownloaderService.batchDownloadMedia(mediaUrls, 3, true);
  }

  private async extractNoteIdsFromSearchResult(_taskId: number): Promise<string[]> {
    return [];
  }

  private async extractCreatorIdsFromResults(result: MultiModeCrawlResult): Promise<string[]> {
    const creatorIds = new Set<string>();

    if (result.noteDetails) {
      result.noteDetails.forEach((detail) => {
        if (detail.authorId) {
          creatorIds.add(detail.authorId);
        }
      });
    }

    return Array.from(creatorIds);
  }

  private async getNoteIdsForCommentCrawl(result: MultiModeCrawlResult): Promise<string[]> {
    const noteIds: string[] = [];

    if (result.noteDetails) {
      result.noteDetails.forEach((detail) => {
        if (detail.commentCount > 0) {
          noteIds.push(detail.id);
        }
      });
    }

    return noteIds;
  }

  private async extractMediaUrlsFromResults(result: MultiModeCrawlResult): Promise<
    Array<{
      url: string;
      type: 'image' | 'video';
      sourceType: 'note' | 'avatar' | 'background';
      sourceId: string;
    }>
  > {
    const mediaUrls: Array<{
      url: string;
      type: 'image' | 'video';
      sourceType: 'note' | 'avatar' | 'background';
      sourceId: string;
    }> = [];

    if (result.noteDetails) {
      result.noteDetails.forEach((detail) => {
        detail.images.forEach((imageUrl) => {
          mediaUrls.push({
            url: imageUrl,
            type: 'image',
            sourceType: 'note',
            sourceId: detail.id,
          });
        });

        detail.videos.forEach((video) => {
          mediaUrls.push({
            url: video.url,
            type: 'video',
            sourceType: 'note',
            sourceId: detail.id,
          });
        });
      });
    }

    if (result.creatorDetails) {
      result.creatorDetails.forEach((creator) => {
        if (creator.avatar) {
          mediaUrls.push({
            url: creator.avatar,
            type: 'image',
            sourceType: 'avatar',
            sourceId: creator.id,
          });
        }
      });
    }

    return mediaUrls;
  }

  private initializeEnhancedMetrics(startTime: number): EnhancedCrawlMetrics {
    return {
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      skippedPages: 0,
      totalRequests: 0,
      averagePageLoadTime: 0,
      totalDataSize: 0,
      notesCrawled: 0,
      detailsCrawled: 0,
      creatorsCrawled: 0,
      commentsCrawled: 0,
      mediaFilesDownloaded: 0,
      commentDepthReached: 0,
      totalDuration: 0,
      throughputMBps: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
    };
  }

  private calculateFinalMetrics(metrics: EnhancedCrawlMetrics, startTime: number): void {
    const totalDuration = Date.now() - startTime;
    metrics.totalDuration = totalDuration;

    if (totalDuration > 0) {
      metrics.throughputMBps = Math.round((metrics.totalDataSize / 1024 / 1024) / (totalDuration / 1000) * 100) / 100;
      metrics.requestsPerSecond = Math.round((metrics.totalRequests / totalDuration) * 1000 * 100) / 100;
    }

    const totalAttempts = metrics.successfulPages + metrics.failedPages;
    if (totalAttempts > 0) {
      metrics.errorRate = Math.round((metrics.failedPages / totalAttempts) * 100);
    }

    metrics.memoryUsage = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
  }

  private calculateMaxCommentDepth(comments: WeiboComment[]): number {
    let maxDepth = 0;

    const calculateDepth = (commentList: WeiboComment[], currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      commentList.forEach((comment) => {
        if (comment.subComments && comment.subComments.length > 0) {
          calculateDepth(comment.subComments, currentDepth + 1);
        }
      });
    };

    calculateDepth(comments, 1);
    return maxDepth;
  }

  private classifyMultiModeError(error: unknown): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('search') || errorMessage.includes('搜索')) {
      return 'SEARCH_MODE_ERROR';
    }

    if (errorMessage.includes('detail') || errorMessage.includes('详情')) {
      return 'DETAIL_MODE_ERROR';
    }

    if (errorMessage.includes('creator') || errorMessage.includes('创作者')) {
      return 'CREATOR_MODE_ERROR';
    }

    if (errorMessage.includes('comment') || errorMessage.includes('评论')) {
      return 'COMMENT_MODE_ERROR';
    }

    if (errorMessage.includes('media') || errorMessage.includes('媒体')) {
      return 'MEDIA_MODE_ERROR';
    }

    return 'MULTIMODE_UNKNOWN_ERROR';
  }

  private async multiModeRandomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
