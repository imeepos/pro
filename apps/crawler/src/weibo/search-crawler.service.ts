import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import {
  WeiboAccountService,
  WeiboAccount
} from './account.service';
import {
  BrowserService
} from '../browser/browser.service';
import {
  RawDataService
} from '../raw-data/raw-data.service';
import {
  RabbitMQClient
} from '@pro/rabbitmq';
import {
  RobotsService
} from '../robots/robots.service';
import {
  RequestMonitorService
} from '../monitoring/request-monitor.service';
import {
  CrawlerConfig,
  RabbitMQConfig,
  WeiboConfig
} from '../config/crawler.interface';
import {
  SourceType
} from '@pro/types';
import {
  WeiboSearchType,
  WeiboCrawlMode
} from '@pro/types';

// 导入本地定义的接口
import {
  WeiboNoteDetail
} from './detail-crawler.service';
import {
  WeiboCreatorDetail
} from './creator-crawler.service';
import {
  WeiboComment
} from './comment-crawler.service';
import {
  MediaDownloadTask
} from './media-downloader.service';

// 定义本地接口
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

export interface MultiModeCrawlResult {
  searchResult?: CrawlResult;
  noteDetails?: WeiboNoteDetail[];
  creatorDetails?: WeiboCreatorDetail[];
  comments?: WeiboComment[];
  mediaDownloads?: MediaDownloadTask[];
  crawlMetrics: EnhancedCrawlMetrics;
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
import {
  WeiboDetailCrawlerService
} from './detail-crawler.service';
import {
  WeiboCreatorCrawlerService
} from './creator-crawler.service';
import {
  WeiboCommentCrawlerService
} from './comment-crawler.service';
import {
  WeiboMediaDownloaderService
} from './media-downloader.service';

/**
 * 可以扩展为更多类型的task支持
 */
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

type NormalizedSubTask = SubTaskMessage & {
  keyword: string;
  start: Date;
  end: Date;
  isInitialCrawl: boolean;
  enableAccountRotation: boolean;
  metadata: NonNullable<SubTaskMessage['metadata']>;
};

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

export class TraceGenerator {
  static generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `trace_${timestamp}_${randomStr}`;
  }

  static createTraceContext(taskId: number, keyword: string): TraceContext {
    return {
      traceId: this.generateTraceId(),
      taskId,
      keyword,
      startTime: new Date()
    };
  }
}

/**
 * 增强版微博搜索爬取服务 - 数字时代的多模式爬取艺术品
 * 集成MediaCrawler的智慧，创造微博数据的完整数字档案
 */
@Injectable()
export class WeiboSearchCrawlerService {
  private readonly logger = new Logger(WeiboSearchCrawlerService.name);
  private rabbitMQClient: RabbitMQClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: WeiboAccountService,
    private readonly browserService: BrowserService,
    private readonly rawDataService: RawDataService,
    private readonly robotsService: RobotsService,
    private readonly requestMonitorService: RequestMonitorService,
    private readonly detailCrawlerService: WeiboDetailCrawlerService,
    private readonly creatorCrawlerService: WeiboCreatorCrawlerService,
    private readonly commentCrawlerService: WeiboCommentCrawlerService,
    private readonly mediaDownloaderService: WeiboMediaDownloaderService,
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: CrawlerConfig,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: RabbitMQConfig,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboConfig
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeRabbitMQ();
  }

  private async initializeRabbitMQ(): Promise<void> {
    try {
      this.rabbitMQClient = new RabbitMQClient({ url: this.rabbitmqConfig.url });
      await this.rabbitMQClient.connect();
      this.logger.log('RabbitMQ连接初始化成功');
    } catch (error) {
      this.logger.error('RabbitMQ连接初始化失败:', error);
      throw error;
    }
  }

  async crawl(message: SubTaskMessage): Promise<CrawlResult> {
    const normalizedMessage = this.normalizeSubTask(message);
    const {
      taskId,
      keyword,
      start,
      end,
      isInitialCrawl,
      weiboAccountId,
      enableAccountRotation,
    } = normalizedMessage;
    // 这里要能处理 不同类型的 任务
    const crawlStartTime = Date.now();

    // 创建链路追踪上下文
    const traceContext = TraceGenerator.createTraceContext(taskId, keyword);

    let account: WeiboAccount | null = null;
    let page: Page | null = null;
    const crawlMetrics = {
      totalPages: 0,
      skippedPages: 0,
      successfulPages: 0,
      failedPages: 0,
      totalRequests: 0,
      averagePageLoadTime: 0,
      totalDataSize: 0
    };

    try {
      // 获取可用账号
      account = await this.accountService.getAvailableAccount(weiboAccountId);
      if (!account) {
        throw new Error('无可用微博账号');
      }

      page = await this.browserService.createPage(account.id, account.cookies);

      let firstPostTime: Date | null = null;
      let lastPostTime: Date | null = null;
      const pageLoadTimes: number[] = [];

      // 初始化第一页URL
      let currentUrl: string | null = this.buildSearchUrl(keyword, start, end, 1);
      let currentPage = 1;

      // 改为while循环，基于DOM提取的下一页链接进行爬取
      while (currentUrl && currentPage <= this.crawlerConfig.maxPages) {
        const pageStartTime = Date.now();

        try {
          crawlMetrics.totalPages++;
          crawlMetrics.totalRequests++;

          // 检查URL是否已存在（去重）
          const existingRecord = await this.rawDataService.findBySourceUrl(currentUrl);
          if (existingRecord) {
            crawlMetrics.skippedPages++;

            // 即使跳过，也需要获取HTML来提取下一页链接
            const html = await this.getPageHtml(page, currentUrl);
            currentUrl = this.extractNextPageUrl(html);
            currentPage++;
            continue;
          }

          const html = await this.getPageHtml(page, currentUrl);
          const pageLoadTime = Date.now() - pageStartTime;
          pageLoadTimes.push(pageLoadTime);

          // 计算数据大小
          const dataSize = new Blob([html]).size;
          crawlMetrics.totalDataSize += dataSize;

          await this.rawDataService.create({
            sourceType: SourceType.WEIBO_KEYWORD_SEARCH,
            sourceUrl: currentUrl,
            rawContent: html,
            metadata: {
              keyword,
              taskId,
              page: currentPage,
              timeRangeStart: this.formatDateForWeibo(start),
              timeRangeEnd: this.formatDateForWeibo(end),
              accountId: account.id,
              crawledAt: new Date(),
              loadTimeMs: pageLoadTime,
              dataSizeBytes: dataSize,
              traceId: traceContext.traceId
            }
          });

          crawlMetrics.successfulPages++;

          lastPostTime = this.extractLastPostTime(html);

          // 检查是否到最后一页
          if (this.isLastPage(html)) {
            this.logger.log('🏁 检测到最后一页，停止抓取', {
              traceId: traceContext.traceId,
              finalPage: currentPage,
              totalPagesProcessed: crawlMetrics.successfulPages + crawlMetrics.failedPages
            });
            break;
          }

          // 提取下一页URL
          currentUrl = this.extractNextPageUrl(html);

          // 如果没有下一页链接，停止爬取
          if (!currentUrl) {
            this.logger.log('🏁 未找到下一页链接，停止抓取', {
              traceId: traceContext.traceId,
              finalPage: currentPage
            });
            break;
          }

          currentPage++;
          await this.randomDelay(this.crawlerConfig.requestDelay.min, this.crawlerConfig.requestDelay.max);

        } catch (error) {
          crawlMetrics.failedPages++;

          // 第一页失败则整个任务失败
          if (currentPage === 1) {
            throw error;
          }

          // 其他页面失败则停止爬取
          this.logger.error('页面爬取失败，停止任务', {
            traceId: traceContext.traceId,
            page: currentPage,
            url: currentUrl,
            error: error instanceof Error ? error.message : '未知错误'
          });
          break;
        }
      }

      // 计算平均页面加载时间
      crawlMetrics.averagePageLoadTime = pageLoadTimes.length > 0
        ? Math.round(pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length)
        : 0;

      // 关闭浏览器上下文
      this.logger.debug('🧹 开始清理浏览器资源', {
        traceId: traceContext.traceId,
        accountId: account.id
      });

      await this.browserService.closeContext(account.id);

      const totalDuration = Date.now() - crawlStartTime;

      this.logger.log('🎉 爬取任务完成', {
        traceId: traceContext.traceId,
        taskId,
        keyword,
        duration: totalDuration,
        durationFormatted: this.formatDuration(totalDuration),
        metrics: {
          ...crawlMetrics,
          averagePageLoadTimeFormatted: `${crawlMetrics.averagePageLoadTime}ms`,
          totalDataSizeMB: Math.round(crawlMetrics.totalDataSize / 1024 / 1024 * 100) / 100,
          successRate: crawlMetrics.totalPages > 0 ? Math.round((crawlMetrics.successfulPages / crawlMetrics.totalPages) * 100) : 0
        },
        firstPostTime: firstPostTime?.toISOString(),
        lastPostTime: lastPostTime?.toISOString(),
        throughput: Math.round((crawlMetrics.totalDataSize / 1024 / 1024) / (totalDuration / 1000) * 100) / 100, // MB/s
        accountUsed: {
          id: account.id,
          nickname: account.nickname
        },
        finishedAt: new Date().toISOString()
      });

      const result: CrawlResult = {
        success: true,
        pageCount: crawlMetrics.successfulPages,
        firstPostTime: firstPostTime || undefined,
        lastPostTime: lastPostTime || undefined
      };

      // 处理任务结果和状态更新
      await this.handleTaskResult(normalizedMessage, result);

      return result;

    } catch (error) {
      const totalDuration = Date.now() - crawlStartTime;

      this.logger.error('💥 爬取任务失败', {
        traceId: traceContext.traceId,
        taskId,
        keyword,
        duration: totalDuration,
        durationFormatted: this.formatDuration(totalDuration),
        metrics: {
          ...crawlMetrics,
          totalDataSizeMB: Math.round(crawlMetrics.totalDataSize / 1024 / 1024 * 100) / 100,
          successRate: crawlMetrics.totalPages > 0 ? Math.round((crawlMetrics.successfulPages / crawlMetrics.totalPages) * 100) : 0
        },
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyCrawlError(error),
        accountUsed: account ? { id: account.id, nickname: account.nickname } : null,
        stack: error instanceof Error ? error.stack : undefined,
        failedAt: new Date().toISOString()
      });

      // 确保清理资源
      if (page && account) {
        try {
          this.logger.debug('🧹 开始清理失败的浏览器资源', {
            traceId: traceContext.traceId,
            accountId: account.id
          });
          await this.browserService.closeContext(account.id);
        } catch (cleanupError) {
          this.logger.error('❌ 清理浏览器资源失败', {
            traceId: traceContext.traceId,
            taskId,
            accountId: account.id,
            error: cleanupError instanceof Error ? cleanupError.message : '未知错误'
          });
        }
      }

      return {
        success: false,
        pageCount: crawlMetrics.successfulPages,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  private normalizeSubTask(message: SubTaskMessage): NormalizedSubTask {
    const metadata = { ...(message.metadata || {}) };
    const keywordCandidate = message.keyword ?? metadata.keyword;
    const keyword = typeof keywordCandidate === 'string' && keywordCandidate.trim().length > 0
      ? keywordCandidate.trim()
      : null;

    if (!keyword) {
      throw new Error(`子任务缺少关键词: ${JSON.stringify(message)}`);
    }

    const start = this.ensureDate(message.start ?? metadata.startTime) ?? new Date();
    const end = this.ensureDate(message.end ?? metadata.endTime) ?? new Date();

    const normalized: NormalizedSubTask = {
      ...message,
      metadata: metadata as NormalizedSubTask['metadata'],
      keyword,
      start,
      end,
      isInitialCrawl: message.isInitialCrawl ?? !metadata.startTime,
      enableAccountRotation: message.enableAccountRotation ?? false,
    };

    return normalized;
  }

  private ensureDate(value?: string | Date | null): Date | undefined {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  /**
   * 构建搜索URL - 支持多种搜索类型的智能构建
   */
  private buildSearchUrl(
    keyword: string,
    start: Date,
    end: Date,
    page: number,
    searchType: WeiboSearchType = WeiboSearchType.DEFAULT
  ): string {
    const encodedKeyword = encodeURIComponent(keyword);
    const startTime = this.formatDateForWeibo(start);
    const endTime = this.formatDateForWeibo(end);

    // 根据搜索类型构建不同的URL
    const baseUrl = this.getSearchBaseUrl(searchType);
    const searchParams = this.buildSearchParams(searchType, encodedKeyword, startTime, endTime, page);

    return `${baseUrl}?${searchParams}`;
  }

  /**
   * 获取不同搜索类型的基础URL
   */
  private getSearchBaseUrl(searchType: WeiboSearchType): string {
    const urlMap = {
      [WeiboSearchType.DEFAULT]: this.weiboConfig.searchUrl,
      [WeiboSearchType.REAL_TIME]: `${this.weiboConfig.baseUrl}/search/realtime`,
      [WeiboSearchType.POPULAR]: `${this.weiboConfig.baseUrl}/search/hot`,
      [WeiboSearchType.VIDEO]: `${this.weiboConfig.baseUrl}/search/video`,
      [WeiboSearchType.USER]: `${this.weiboConfig.baseUrl}/search/user`,
      [WeiboSearchType.TOPIC]: `${this.weiboConfig.baseUrl}/search/topic`
    };

    return urlMap[searchType] || this.weiboConfig.searchUrl;
  }

  /**
   * 构建搜索参数 - 每种类型都有其独特的参数组合
   */
  private buildSearchParams(
    searchType: WeiboSearchType,
    encodedKeyword: string,
    startTime: string,
    endTime: string,
    page: number
  ): string {
    const baseParams = [`q=${encodedKeyword}`, `page=${page}`];

    switch (searchType) {
      case WeiboSearchType.REAL_TIME:
        baseParams.push('type=realtime', 'nodup=1');
        break;
      case WeiboSearchType.POPULAR:
        baseParams.push('sort=hot', 'xsort=hot');
        break;
      case WeiboSearchType.VIDEO:
        baseParams.push('type=video', 'scope=video');
        break;
      case WeiboSearchType.USER:
        baseParams.push('type=user', 'scope=user');
        break;
      case WeiboSearchType.TOPIC:
        baseParams.push('type=topic', 'scope=topic');
        break;
      default:
        // DEFAULT类型，添加时间范围
        baseParams.push(`timescope=custom:${startTime}:${endTime}`);
        break;
    }

    return baseParams.join('&');
  }

  private formatDateForWeibo(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');

    return `${year}-${month}-${day}-${hour}`;
  }

  private formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  }

  private async getPageHtml(page: Page, url: string): Promise<string> {
    const startTime = Date.now();
    let success = false;

    try {
      // 检查 robots.txt 规则
      const isAllowed = await this.robotsService.isUrlAllowed(url);
      if (!isAllowed) {
        throw new Error(`被 robots.txt 规则阻止访问: ${url}`);
      }

      // 等待适当的延迟时间
      await this.requestMonitorService.waitForNextRequest();

      // 获取推荐的爬取延迟
      const crawlDelay = await this.robotsService.getCrawlDelay(url);
      const actualDelay = Math.max(crawlDelay * 1000, this.requestMonitorService.getCurrentDelay());

      if (actualDelay > this.crawlerConfig.requestDelay.max) {
        this.logger.warn(`根据 robots.txt 或监控规则调整延迟为: ${actualDelay}ms`);
      }

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.crawlerConfig.pageTimeout
      });

      await page.waitForSelector(this.weiboConfig.selectors.feedCard, {
        timeout: 10000
      });

      const html = await page.content();
      success = true;

      const duration = Date.now() - startTime;
      this.requestMonitorService.recordRequest(url, success, duration);

      this.logger.debug(`成功获取页面: ${url} - 耗时: ${duration}ms`);
      return html;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.requestMonitorService.recordRequest(url, success, duration);

      this.logger.error(`获取页面HTML失败: ${url} - 耗时: ${duration}ms`, error);
      throw error;
    }
  }

  private extractFirstPostTime(html: string): Date | null {
    try {
      const $ = cheerio.load(html);
      const firstCard = $(this.weiboConfig.selectors.feedCard).first();

      let timeText = firstCard.find(this.weiboConfig.selectors.timeElement).attr('title') ||
                    firstCard.find(this.weiboConfig.selectors.timeElement).text().trim();

      if (!timeText) {
        const timeElement = firstCard.find('[date]');
        if (timeElement.length > 0) {
          const timestamp = timeElement.attr('date');
          if (timestamp) {
            return new Date(parseInt(timestamp) * 1000);
          }
        }
      }

      if (timeText) {
        const parsedTime = this.parseTimeText(timeText);
        if (parsedTime) {
          return parsedTime;
        }
      }

      const timePattern = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/;
      const match = html.match(timePattern);
      if (match) {
        return new Date(match[1]);
      }

      return null;
    } catch (error) {
      this.logger.error('提取首条微博时间失败:', error);
      return null;
    }
  }

  private extractLastPostTime(html: string): Date | null {
    try {
      const $ = cheerio.load(html);
      const lastCard = $(this.weiboConfig.selectors.feedCard).last();

      let timeText = lastCard.find(this.weiboConfig.selectors.timeElement).attr('title') ||
                    lastCard.find(this.weiboConfig.selectors.timeElement).text().trim();

      if (!timeText) {
        const timeElement = lastCard.find('[date]');
        if (timeElement.length > 0) {
          const timestamp = timeElement.attr('date');
          if (timestamp) {
            return new Date(parseInt(timestamp) * 1000);
          }
        }
      }

      if (timeText) {
        const parsedTime = this.parseTimeText(timeText);
        if (parsedTime) {
          return parsedTime;
        }
      }

      const timePattern = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/g;
      const matches = html.match(timePattern);
      if (matches && matches.length > 0) {
        return new Date(matches[matches.length - 1]);
      }

      return null;
    } catch (error) {
      this.logger.error('提取末条微博时间失败:', error);
      return null;
    }
  }

  private parseTimeText(timeText: string): Date | null {
    try {
      const now = new Date();

      if (timeText.includes('分钟前')) {
        const minutes = parseInt(timeText.replace(/[^0-9]/g, ''));
        return new Date(now.getTime() - minutes * 60 * 1000);
      }

      if (timeText.includes('小时前')) {
        const hours = parseInt(timeText.replace(/[^0-9]/g, ''));
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }

      if (timeText.includes('今天')) {
        const timePart = timeText.replace(/今天|^\s+|\s+$/g, '');
        const [hour, minute] = timePart.split(':');
        const today = new Date();
        today.setHours(parseInt(hour), parseInt(minute), 0, 0);
        return today;
      }

      if (/^\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}$/.test(timeText)) {
        const [datePart, timePart] = timeText.split(' ');
        const [month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        const currentYear = now.getFullYear();
        return new Date(currentYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      }

      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(timeText)) {
        return new Date(timeText);
      }

      return null;
    } catch (error) {
      this.logger.error('解析时间文本失败:', timeText, error);
      return null;
    }
  }

  private isLastPage(html: string): boolean {
    const $ = cheerio.load(html);

    // 检查分页列表中 class="cur" 是否是最后一个页码
    const curItem = $('.m-page .list ul li.cur');
    if (curItem.length > 0) {
      const hasNextPageInList = curItem.next('li').length > 0;

      // 如果 cur 是列表中最后一个 li，说明到达最后一页
      if (!hasNextPageInList) {
        return true;
      }
    }

    // 备用检查：是否有"下一页"按钮
    const nextButton = $(this.weiboConfig.selectors.pagination.nextButton);
    if (nextButton.length === 0) {
      return true;
    }

    // 检查是否有"无结果"提示
    const noResult = $(this.weiboConfig.selectors.pagination.noResult);
    return noResult.length > 0;
  }

  /**
   * 从页面HTML中提取下一页的URL
   */
  private extractNextPageUrl(html: string): string | null {
    const $ = cheerio.load(html);

    // 查找"下一页"按钮
    const nextButton = $('.m-page a.next');
    if (nextButton.length === 0) {
      return null;
    }

    const href = nextButton.attr('href');
    if (!href) {
      return null;
    }

    // 构建完整URL（href通常是相对路径，如 /weibo?q=xxx&page=2）
    if (href.startsWith('http')) {
      return href;
    }

    return `${this.weiboConfig.baseUrl}${href}`;
  }

  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    // 结合监控系统的自适应延迟和传统的随机延迟
    const adaptiveDelay = this.requestMonitorService.getCurrentDelay();
    const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    const finalDelay = Math.max(adaptiveDelay, randomDelay);

    this.logger.debug(`应用延迟: ${finalDelay}ms (自适应: ${adaptiveDelay}ms, 随机: ${randomDelay}ms)`);
    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  private async handleTaskResult(message: NormalizedSubTask, result: CrawlResult): Promise<void> {
    const { taskId, keyword, start, end, isInitialCrawl } = message;

    if (!result.success) {
      this.logger.error(`任务失败: taskId=${taskId}, 错误=${result.error}`);
      return;
    }

    this.logger.log(`处理任务结果: taskId=${taskId}, pageCount=${result.pageCount}, isInitialCrawl=${isInitialCrawl}`);

    if (isInitialCrawl) {
      await this.handleInitialCrawlResult(message, result);
    } else {
      await this.handleIncrementalCrawlResult(message, result);
    }
  }

  private async handleInitialCrawlResult(message: NormalizedSubTask, result: CrawlResult): Promise<void> {
    const { taskId, start } = message;

    if (result.pageCount === 50 && result.lastPostTime) {
      // 抓满50页，需要继续回溯历史数据
      this.logger.log(`抓满50页，触发下一个子任务: taskId=${taskId}, 新结束时间=${result.lastPostTime.toISOString()}`);

      await this.triggerNextSubTask(taskId, message.keyword, start, result.lastPostTime, true);

      // 发布任务状态更新消息
      await this.publishTaskStatusUpdate({
        taskId,
        status: 'running',
        currentCrawlTime: result.lastPostTime,
        latestCrawlTime: result.firstPostTime,
        progress: Math.min((Date.now() - start.getTime()) / (Date.now() - new Date('2020-01-01').getTime()) * 100, 95),
        updatedAt: new Date()
      });

    } else {
      // 不足50页，历史数据回溯完成
      this.logger.log(`历史数据回溯完成: taskId=${taskId}, 抓取${result.pageCount}页`);

      // 发布任务完成消息，进入增量模式
      await this.publishTaskStatusUpdate({
        taskId,
        status: 'running',
        currentCrawlTime: start, // 设置为 startDate，表示历史回溯完成
        latestCrawlTime: result.firstPostTime,
        nextRunAt: new Date(Date.now() + this.parseInterval('1h')), // 1小时后开始增量抓取
        progress: 100,
        updatedAt: new Date()
      });
    }
  }

  private async handleIncrementalCrawlResult(message: NormalizedSubTask, result: CrawlResult): Promise<void> {
    const { taskId } = message;

    // 增量抓取完成，更新 latestCrawlTime 和下次执行时间
    await this.publishTaskStatusUpdate({
      taskId,
      status: 'running',
      latestCrawlTime: result.firstPostTime,
      nextRunAt: new Date(Date.now() + this.parseInterval('1h')), // 1小时后再次增量抓取
      updatedAt: new Date()
    });

    this.logger.log(`增量抓取完成: taskId=${taskId}, 新的latestCrawlTime=${result.firstPostTime?.toISOString()}`);
  }

  private async triggerNextSubTask(
    taskId: number,
    keyword: string,
    start: Date,
    end: Date,
    isInitialCrawl: boolean
  ): Promise<void> {
    const metadata = {
      keyword,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    const nextTask: SubTaskMessage = {
      taskId,
      type: 'KEYWORD_SEARCH',
      metadata,
      keyword,
      start,
      end,
      isInitialCrawl,
      enableAccountRotation: true
    };

    try {
      await this.rabbitMQClient.publish(this.rabbitmqConfig.queues.crawlQueue, nextTask);
      this.logger.log(`已发布下一个子任务: taskId=${taskId}, keyword=${keyword}, 时间范围=${this.formatDate(start)}~${this.formatDate(end)}`);
    } catch (error) {
      this.logger.error(`发布下一个子任务失败: taskId=${taskId}`, error);
    }
  }

  private async publishTaskStatusUpdate(statusUpdate: any): Promise<void> {
    try {
      await this.rabbitMQClient.publish(this.rabbitmqConfig.queues.statusQueue, statusUpdate);
      this.logger.log(`已发布任务状态更新: taskId=${statusUpdate.taskId}, status=${statusUpdate.status}`);
    } catch (error) {
      this.logger.error(`发布任务状态更新失败: taskId=${statusUpdate.taskId}`, error);
    }
  }

  private parseInterval(interval: string): number {
    // 解析间隔字符串，返回毫秒数
    // 支持: '1h', '30m', '1d' 等
    const match = interval.match(/^(\d+)([hm])$/);
    if (!match) {
      return 60 * 60 * 1000; // 默认1小时
    }

    const [, value, unit] = match;
    const multiplier = unit === 'h' ? 60 * 60 * 1000 : 60 * 1000; // 小时或分钟
    return parseInt(value) * multiplier;
  }

  async validateAccount(accountId: number): Promise<boolean> {
    try {
      const account = await this.accountService.getAvailableAccount(accountId);
      if (!account) {
        return false;
      }

      const page = await this.browserService.createPage(account.id, account.cookies);

      await page.goto('https://weibo.com', { waitUntil: 'networkidle', timeout: 15000 });

      const currentUrl = page.url();
      const isValid = !currentUrl.includes('login.weibo.cn') && !currentUrl.includes('passport.weibo.com');

      await this.browserService.closeContext(account.id);

      if (!isValid) {
        await this.accountService.markAccountBanned(accountId);
      }

      return isValid;
    } catch (error) {
      this.logger.error(`验证账号${accountId}失败:`, error);
      await this.accountService.markAccountBanned(accountId);
      return false;
    }
  }

  // 新增方法：获取请求统计信息
  async getRequestStats(): Promise<any> {
    return {
      rateStats: this.requestMonitorService.getCurrentStats(),
      detailedStats: this.requestMonitorService.getDetailedStats(),
      robotsCache: this.robotsService.getCacheInfo(),
      currentDelay: this.requestMonitorService.getCurrentDelay(),
    };
  }

  // 新增方法：重置监控系统
  async resetMonitoring(): Promise<void> {
    this.requestMonitorService.reset();
    this.robotsService.clearCache();
    this.logger.log('请求监控和 robots.txt 缓存已重置');
  }

  private classifyPageError(error: any): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'PAGE_TIMEOUT';
    }

    if (errorMessage.includes('selector') || errorMessage.includes('element') ||
        errorMessage.includes('find') || errorMessage.includes('locate')) {
      return 'ELEMENT_NOT_FOUND';
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection') ||
        errorMessage.includes('net::')) {
      return 'NETWORK_ERROR';
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden') ||
        errorMessage.includes('blocked')) {
      return 'ACCESS_DENIED';
    }

    return 'UNKNOWN_PAGE_ERROR';
  }

  private classifyCrawlError(error: any): string {
    if (!error) return 'UNKNOWN';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('account') || errorMessage.includes('账号') ||
        errorMessage.includes('login') || errorMessage.includes('auth')) {
      return 'ACCOUNT_ERROR';
    }

    if (errorMessage.includes('browser') || errorMessage.includes('page') ||
        errorMessage.includes('context') || errorMessage.includes('crash')) {
      return 'BROWSER_ERROR';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return 'TIMEOUT_ERROR';
    }

    if (errorMessage.includes('robots') || errorMessage.includes('403')) {
      return 'ROBOTS_ERROR';
    }

    if (errorMessage.includes('rate') || errorMessage.includes('limit') ||
        errorMessage.includes('frequency')) {
      return 'RATE_LIMIT_ERROR';
    }

    return 'UNKNOWN_CRAWL_ERROR';
  }

  /**
   * 格式化持续时间显示
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 获取详细的任务执行摘要
   */
  private getTaskSummary(traceContext: TraceContext, crawlMetrics: any, totalDuration: number): {
    traceId: string;
    taskId: number;
    keyword: string;
    startTime: Date;
    duration: number;
    durationFormatted: string;
    performance: {
      totalPages: number;
      successfulPages: number;
      failedPages: number;
      skippedPages: number;
      successRate: number;
      averagePageLoadTime: number;
      totalDataSizeMB: number;
      throughputMBps: number;
    };
    efficiency: {
      requestsPerSecond: number;
      pagesPerMinute: number;
      errorRate: number;
    };
  } {
    const performance = {
      totalPages: crawlMetrics.totalPages,
      successfulPages: crawlMetrics.successfulPages,
      failedPages: crawlMetrics.failedPages,
      skippedPages: crawlMetrics.skippedPages,
      successRate: crawlMetrics.totalPages > 0 ? Math.round((crawlMetrics.successfulPages / crawlMetrics.totalPages) * 100) : 0,
      averagePageLoadTime: crawlMetrics.averagePageLoadTime,
      totalDataSizeMB: Math.round(crawlMetrics.totalDataSize / 1024 / 1024 * 100) / 100,
      throughputMBps: Math.round((crawlMetrics.totalDataSize / 1024 / 1024) / (totalDuration / 1000) * 100) / 100
    };

    const efficiency = {
      requestsPerSecond: Math.round((crawlMetrics.totalRequests / totalDuration) * 1000 * 100) / 100,
      pagesPerMinute: Math.round((crawlMetrics.totalPages / totalDuration) * 60000 * 100) / 100,
      errorRate: crawlMetrics.totalPages > 0 ? Math.round((crawlMetrics.failedPages / crawlMetrics.totalPages) * 100) : 0
    };

    return {
      traceId: traceContext.traceId,
      taskId: traceContext.taskId,
      keyword: traceContext.keyword,
      startTime: traceContext.startTime,
      duration: totalDuration,
      durationFormatted: this.formatDuration(totalDuration),
      performance,
      efficiency
    };
  }

  // ==================== 多模式爬取核心方法 ====================

  /**
   * 多模式爬取入口 - 数字时代的完整数据采集艺术
   * 集成所有爬取模式，创造微博数据的完整数字档案
   */
  async multiModeCrawl(message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> {
    const startTime = Date.now();
    const normalizedMessage = this.normalizeSubTask(message);
    const traceContext = TraceGenerator.createTraceContext(normalizedMessage.taskId, normalizedMessage.keyword);

    this.logger.log('🎭 开始多模式爬取任务', {
      traceId: traceContext.traceId,
      taskId: normalizedMessage.taskId,
      keyword: normalizedMessage.keyword,
      searchType: message.searchType || WeiboSearchType.DEFAULT,
      crawlModes: message.crawlModes || [WeiboCrawlMode.SEARCH],
      enableDetailCrawl: message.enableDetailCrawl,
      enableCreatorCrawl: message.enableCreatorCrawl,
      enableCommentCrawl: message.enableCommentCrawl,
      enableMediaDownload: message.enableMediaDownload,
      startTime: new Date().toISOString()
    });

    const result: MultiModeCrawlResult = {
      crawlMetrics: this.initializeEnhancedMetrics(startTime)
    };

    try {
      // 1. 执行基础搜索爬取
      if (this.shouldExecuteMode(WeiboCrawlMode.SEARCH, message.crawlModes)) {
        this.logger.debug('🔍 执行搜索模式爬取', {
          traceId: traceContext.traceId
        });

        const searchResult = await this.crawl(normalizedMessage);
        result.searchResult = searchResult;

        // 更新基础指标
        result.crawlMetrics.totalPages = searchResult.pageCount;
        result.crawlMetrics.successfulPages = searchResult.success ? searchResult.pageCount : 0;
        result.crawlMetrics.failedPages = searchResult.success ? 0 : 1;
      }

      // 2. 执行详情爬取
      if (this.shouldExecuteMode(WeiboCrawlMode.DETAIL, message.crawlModes) || message.enableDetailCrawl) {
        const noteIds = await this.extractNoteIdsFromSearchResult(normalizedMessage.taskId);

        if (noteIds.length > 0) {
          this.logger.debug('📄 执行详情模式爬取', {
            traceId: traceContext.traceId,
            noteIdsCount: noteIds.length
          });

          const detailResults = await this.executeDetailCrawl(noteIds, traceContext, normalizedMessage.weiboAccountId);
          result.noteDetails = detailResults;
          result.crawlMetrics.detailsCrawled = detailResults.filter(d => d !== null).length;
        }
      }

      // 3. 执行创作者爬取
      if (this.shouldExecuteMode(WeiboCrawlMode.CREATOR, message.crawlModes) || message.enableCreatorCrawl) {
        const creatorIds = await this.extractCreatorIdsFromResults(result);

        if (creatorIds.length > 0) {
          this.logger.debug('🎨 执行创作者模式爬取', {
            traceId: traceContext.traceId,
            creatorIdsCount: creatorIds.length
          });

          const creatorResults = await this.executeCreatorCrawl(creatorIds, traceContext, normalizedMessage.weiboAccountId);
          result.creatorDetails = creatorResults;
          result.crawlMetrics.creatorsCrawled = creatorResults.filter(c => c !== null).length;
        }
      }

      // 4. 执行评论爬取
      if (this.shouldExecuteMode(WeiboCrawlMode.COMMENT, message.crawlModes) || message.enableCommentCrawl) {
        const noteIdsForComments = await this.getNoteIdsForCommentCrawl(result);

        if (noteIdsForComments.length > 0) {
          this.logger.debug('💬 执行评论模式爬取', {
            traceId: traceContext.traceId,
            noteIdsCount: noteIdsForComments.length,
            maxDepth: message.maxCommentDepth || 3
          });

          const commentResults = await this.executeCommentCrawl(
            noteIdsForComments,
            message.maxCommentDepth || 3,
            traceContext,
            normalizedMessage.weiboAccountId
          );
          result.comments = commentResults;
          result.crawlMetrics.commentsCrawled = commentResults.length;
          result.crawlMetrics.commentDepthReached = this.calculateMaxCommentDepth(commentResults);
        }
      }

      // 5. 执行媒体下载
      if (this.shouldExecuteMode(WeiboCrawlMode.MEDIA, message.crawlModes) || message.enableMediaDownload) {
        const mediaUrls = await this.extractMediaUrlsFromResults(result);

        if (mediaUrls.length > 0) {
          this.logger.debug('🎨 执行媒体下载', {
            traceId: traceContext.traceId,
            mediaUrlsCount: mediaUrls.length
          });

          const downloadTasks = await this.executeMediaDownload(mediaUrls, traceContext);
          result.mediaDownloads = downloadTasks;
          result.crawlMetrics.mediaFilesDownloaded = downloadTasks.filter(t => t.status === 'completed').length;
        }
      }

      // 计算最终指标
      this.calculateFinalMetrics(result.crawlMetrics, startTime);

      const totalDuration = Date.now() - startTime;
      this.logger.log('🎉 多模式爬取任务完成', {
        traceId: traceContext.traceId,
        taskId: normalizedMessage.taskId,
        keyword: normalizedMessage.keyword,
        duration: totalDuration,
        durationFormatted: this.formatDuration(totalDuration),
        metrics: result.crawlMetrics,
        modesExecuted: message.crawlModes,
        finishedAt: new Date().toISOString()
      });

      return result;

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      result.crawlMetrics.totalDuration = totalDuration;

      this.logger.error('💥 多模式爬取任务失败', {
        traceId: traceContext.traceId,
        taskId: normalizedMessage.taskId,
        keyword: normalizedMessage.keyword,
        duration: totalDuration,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyMultiModeError(error),
        finishedAt: new Date().toISOString()
      });

      return result;
    }
  }

  /**
   * 检查是否应该执行指定的爬取模式
   */
  private shouldExecuteMode(mode: WeiboCrawlMode, crawlModes?: WeiboCrawlMode[]): boolean {
    return !crawlModes || crawlModes.includes(mode);
  }

  /**
   * 执行详情爬取
   */
  private async executeDetailCrawl(
    noteIds: string[],
    traceContext: TraceContext,
    accountId?: number
  ): Promise<WeiboNoteDetail[]> {
    let detailAccount: WeiboAccount | undefined;
    if (accountId) {
      detailAccount = await this.accountService.getAvailableAccount(accountId);
    }

    const detailResults = await this.detailCrawlerService.batchGetNoteDetails(noteIds, detailAccount);
    return detailResults.map(r => r.detail).filter((d): d is WeiboNoteDetail => d !== null);
  }

  /**
   * 执行创作者爬取
   */
  private async executeCreatorCrawl(
    creatorIds: string[],
    traceContext: TraceContext,
    accountId?: number
  ): Promise<WeiboCreatorDetail[]> {
    const creatorResults: WeiboCreatorDetail[] = [];

    for (const creatorId of creatorIds) {
      let creatorAccount: WeiboAccount | undefined;
      if (accountId) {
        creatorAccount = await this.accountService.getAvailableAccount(accountId);
      }

      const creatorDetail = await this.creatorCrawlerService.getCreatorInfoById(creatorId, creatorAccount, traceContext);
      if (creatorDetail) {
        creatorResults.push(creatorDetail);
      }

      // 适当延迟避免请求过频
      await this.multiModeRandomDelay(2000, 4000);
    }

    return creatorResults;
  }

  /**
   * 执行评论爬取
   */
  private async executeCommentCrawl(
    noteIds: string[],
    maxDepth: number,
    traceContext: TraceContext,
    accountId?: number
  ): Promise<WeiboComment[]> {
    const allComments: WeiboComment[] = [];

    for (const noteId of noteIds) {
      let weiboAccount: WeiboAccount | undefined;
      if (accountId) {
        weiboAccount = await this.accountService.getAvailableAccount(accountId);
      }

      const comments = await this.commentCrawlerService.getAllCommentsByNoteId(
        noteId,
        maxDepth,
        500, // 每个帖子最多500条评论
        weiboAccount
      );
      allComments.push(...comments);

      // 适当延迟
      await this.multiModeRandomDelay(3000, 5000);
    }

    return allComments;
  }

  /**
   * 执行媒体下载
   */
  private async executeMediaDownload(
    mediaUrls: Array<{
      url: string;
      type: 'image' | 'video';
      sourceType: 'note' | 'avatar' | 'background';
      sourceId: string;
    }>,
    traceContext: TraceContext
  ): Promise<MediaDownloadTask[]> {
    return await this.mediaDownloaderService.batchDownloadMedia(mediaUrls, 3, true);
  }

  /**
   * 从搜索结果中提取帖子ID
   */
  private async extractNoteIdsFromSearchResult(taskId: number): Promise<string[]> {
    // 这里需要从已保存的原始数据中提取帖子ID
    // 简化实现，返回空数组
    return [];
  }

  /**
   * 从结果中提取创作者ID
   */
  private async extractCreatorIdsFromResults(result: MultiModeCrawlResult): Promise<string[]> {
    const creatorIds = new Set<string>();

    // 从详情中提取作者ID
    if (result.noteDetails) {
      result.noteDetails.forEach(detail => {
        if (detail.authorId) {
          creatorIds.add(detail.authorId);
        }
      });
    }

    return Array.from(creatorIds);
  }

  /**
   * 获取需要爬取评论的帖子ID
   */
  private async getNoteIdsForCommentCrawl(result: MultiModeCrawlResult): Promise<string[]> {
    const noteIds: string[] = [];

    if (result.noteDetails) {
      result.noteDetails.forEach(detail => {
        if (detail.commentCount > 0) {
          noteIds.push(detail.id);
        }
      });
    }

    return noteIds;
  }

  /**
   * 从结果中提取媒体URL
   */
  private async extractMediaUrlsFromResults(result: MultiModeCrawlResult): Promise<Array<{
    url: string;
    type: 'image' | 'video';
    sourceType: 'note' | 'avatar' | 'background';
    sourceId: string;
  }>> {
    const mediaUrls: Array<{
      url: string;
      type: 'image' | 'video';
      sourceType: 'note' | 'avatar' | 'background';
      sourceId: string;
    }> = [];

    // 从帖子详情中提取图片
    if (result.noteDetails) {
      result.noteDetails.forEach(detail => {
        detail.images.forEach(imageUrl => {
          mediaUrls.push({
            url: imageUrl,
            type: 'image',
            sourceType: 'note',
            sourceId: detail.id
          });
        });

        detail.videos.forEach(video => {
          mediaUrls.push({
            url: video.url,
            type: 'video',
            sourceType: 'note',
            sourceId: detail.id
          });
        });
      });
    }

    // 从创作者信息中提取头像
    if (result.creatorDetails) {
      result.creatorDetails.forEach(creator => {
        if (creator.avatar) {
          mediaUrls.push({
            url: creator.avatar,
            type: 'image',
            sourceType: 'avatar',
            sourceId: creator.id
          });
        }
      });
    }

    return mediaUrls;
  }

  /**
   * 初始化增强的爬取指标
   */
  private initializeEnhancedMetrics(startTime: number): EnhancedCrawlMetrics {
    return {
      // 基础指标
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      skippedPages: 0,
      totalRequests: 0,
      averagePageLoadTime: 0,
      totalDataSize: 0,

      // 多模式指标
      notesCrawled: 0,
      detailsCrawled: 0,
      creatorsCrawled: 0,
      commentsCrawled: 0,
      mediaFilesDownloaded: 0,
      commentDepthReached: 0,

      // 性能指标
      totalDuration: 0,
      throughputMBps: 0,
      requestsPerSecond: 0,
      errorRate: 0,

      // 资源使用
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0
    };
  }

  /**
   * 计算最终指标
   */
  private calculateFinalMetrics(metrics: EnhancedCrawlMetrics, startTime: number): void {
    const totalDuration = Date.now() - startTime;
    metrics.totalDuration = totalDuration;

    // 计算吞吐量
    if (totalDuration > 0) {
      metrics.throughputMBps = Math.round((metrics.totalDataSize / 1024 / 1024) / (totalDuration / 1000) * 100) / 100;
      metrics.requestsPerSecond = Math.round((metrics.totalRequests / totalDuration) * 1000 * 100) / 100;
    }

    // 计算错误率
    const totalAttempts = metrics.successfulPages + metrics.failedPages;
    if (totalAttempts > 0) {
      metrics.errorRate = Math.round((metrics.failedPages / totalAttempts) * 100);
    }

    // 获取资源使用情况（简化实现）
    metrics.memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
  }

  /**
   * 计算最大评论深度
   */
  private calculateMaxCommentDepth(comments: WeiboComment[]): number {
    let maxDepth = 0;

    const calculateDepth = (commentList: WeiboComment[], currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      commentList.forEach(comment => {
        if (comment.subComments && comment.subComments.length > 0) {
          calculateDepth(comment.subComments, currentDepth + 1);
        }
      });
    };

    calculateDepth(comments, 1);
    return maxDepth;
  }

  /**
   * 分类多模式爬取错误
   */
  private classifyMultiModeError(error: any): string {
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

  /**
   * 专用随机延迟方法 - 多模式爬取专用
   */
  private async multiModeRandomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
