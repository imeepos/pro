import { Injectable, Logger } from '@nestjs/common';
import { RawDataSourceService } from '@pro/mongodb';
import {
  SourceType,
  SourcePlatform,
  QUEUE_NAMES,
  RawDataReadyEvent,
} from '@pro/types';
import { RabbitMQService } from '@pro/rabbitmq';
import { createHash } from 'crypto';
import { AccountHealthService } from '../services/account-health.service';
import { DistributedLockService } from '../services/distributed-lock.service';
import { WeiboHtmlParser } from '../parsers/weibo-html.parser';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RATE_LIMIT_CONFIGS } from '../constants/rate-limit.constants';
import {
  calculateNextTimeRange,
  shouldStopCrawling,
  TimeWindow,
} from '../utils/time-window.util';
import { Retry } from '../decorators/retry.decorator';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface MainSearchWorkflowInput {
  keyword: string;
  startDate: Date;
  endDate: Date;
  maxPages?: number;
}

export interface MainSearchWorkflowOutput {
  totalPostsFound: number;
  totalPagesProcessed: number;
  timeWindowsProcessed: number;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
}

export interface SearchPageResult {
  postIds: string[];
  hasNextPage: boolean;
  lastPostTime: Date | null;
}

@Injectable()
export class MainSearchWorkflow {
  private readonly defaultMaxPages = 50;
  private readonly lockTTL = 300;
  private readonly logger = new Logger(MainSearchWorkflow.name);

  constructor(
    private readonly accountHealth: AccountHealthService,
    private readonly distributedLock: DistributedLockService,
    private readonly htmlParser: WeiboHtmlParser,
    private readonly rawDataService: RawDataSourceService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async execute(
    input: MainSearchWorkflowInput
  ): Promise<MainSearchWorkflowOutput> {
    const lockKey = `search:${input.keyword}:${input.startDate.getTime()}`;

    const locked = await this.distributedLock.acquireLock(lockKey, {
      ttl: this.lockTTL,
    });

    if (!locked) {
      this.logger.warn('无法获取锁，该搜索任务可能正在执行', {
        keyword: input.keyword,
      });

      return {
        totalPostsFound: 0,
        totalPagesProcessed: 0,
        timeWindowsProcessed: 0,
        status: 'failed',
        errorMessage: '无法获取分布式锁',
      };
    }

    try {
      const result = await this.executeSearchWorkflow(input);
      return result;
    } finally {
      await this.distributedLock.releaseLock(lockKey);
    }
  }

  private async executeSearchWorkflow(
    input: MainSearchWorkflowInput
  ): Promise<MainSearchWorkflowOutput> {
    let totalPostsFound = 0;
    let totalPagesProcessed = 0;
    let timeWindowsProcessed = 0;

    let currentWindow: TimeWindow = {
      start: input.startDate,
      end: input.endDate,
    };

    while (!shouldStopCrawling(currentWindow.end, input.startDate)) {
      this.logger.log('处理时间窗口', {
        window: currentWindow,
        keyword: input.keyword,
      });

      const windowResult = await this.processTimeWindow(
        input.keyword,
        currentWindow,
        input.maxPages || this.defaultMaxPages
      );

      totalPostsFound += windowResult.totalPosts;
      totalPagesProcessed += windowResult.pagesProcessed;
      timeWindowsProcessed += 1;

      if (!windowResult.lastPostTime) {
        this.logger.log('时间窗口无更多数据', { window: currentWindow });
        break;
      }

      const nextWindowResult = calculateNextTimeRange(
        windowResult.lastPostTime,
        input.startDate
      );

      if (nextWindowResult.shouldStop || !nextWindowResult.nextWindow) {
        this.logger.log('已到达搜索起始时间，停止爬取', {
          lastPostTime: windowResult.lastPostTime,
          startDate: input.startDate,
        });
        break;
      }

      currentWindow = nextWindowResult.nextWindow;
    }

    this.logger.log('主搜索工作流完成', {
      keyword: input.keyword,
      totalPostsFound,
      totalPagesProcessed,
      timeWindowsProcessed,
    });

    return {
      totalPostsFound,
      totalPagesProcessed,
      timeWindowsProcessed,
      status: 'success',
    };
  }

  private async processTimeWindow(
    keyword: string,
    window: TimeWindow,
    maxPages: number
  ): Promise<{
    totalPosts: number;
    pagesProcessed: number;
    lastPostTime: Date | null;
  }> {
    let totalPosts = 0;
    let pagesProcessed = 0;
    let lastPostTime: Date | null = null;
    let currentPage = 1;

    while (currentPage <= maxPages) {
      this.logger.debug('处理页面', {
        keyword,
        page: currentPage,
        window,
      });

      const pageResult = await this.processSearchPage(
        keyword,
        window,
        currentPage
      );

      if (!pageResult) {
        this.logger.warn('页面处理失败，跳过', {
          keyword,
          page: currentPage,
        });
        break;
      }

      totalPosts += pageResult.postIds.length;
      pagesProcessed += 1;

      if (pageResult.lastPostTime) {
        lastPostTime = pageResult.lastPostTime;
      }

      if (!pageResult.hasNextPage) {
        this.logger.debug('无下一页，结束时间窗口处理', {
          keyword,
          page: currentPage,
        });
        break;
      }

      currentPage += 1;
    }

    return {
      totalPosts,
      pagesProcessed,
      lastPostTime,
    };
  }

  @Retry({
    maxAttempts: 3,
    backoff: 'exponential',
    delay: 2000,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt} due to error: ${error.message}`);
    },
  })
  private async processSearchPage(
    keyword: string,
    window: TimeWindow,
    page: number
  ): Promise<SearchPageResult | null> {
    const account = await this.accountHealth.getBestHealthAccount();

    if (!account) {
      this.logger.error('无可用账号');
      return null;
    }

    const rateLimitResult = await this.rateLimiter.checkRateLimit(
      `account:${account.id}`,
      RATE_LIMIT_CONFIGS.ACCOUNT
    );

    if (!rateLimitResult.allowed) {
      this.logger.warn('账号超过速率限制，等待重置', {
        accountId: account.id,
        resetAt: rateLimitResult.resetAt,
        current: rateLimitResult.current,
      });

      const waitMs = rateLimitResult.resetAt.getTime() - Date.now();
      if (waitMs > 0 && waitMs < 60000) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        throw new Error('速率限制未重置，跳过本次请求');
      }
    }

    const url = this.buildSearchUrl(keyword, window, page);

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let playwrightPage: Page | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      playwrightPage = await context.newPage();
      playwrightPage.setDefaultTimeout(30000);

      const cookies = this.parseCookies(account.cookies);
      await context.addCookies(cookies);

      await playwrightPage.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const html = await playwrightPage.content();
      const contentHash = createHash('md5').update(html).digest('hex');

      const doc = await this.rawDataService.create({
        sourceType: SourceType.WEIBO_KEYWORD_SEARCH,
        sourceUrl: url,
        rawContent: html,
        metadata: {
          keyword,
          page,
          timeWindow: window,
          accountId: account.id,
        },
      });

      const rawDataReadyEvent: RawDataReadyEvent = {
        rawDataId: String(doc._id),
        sourceType: SourceType.WEIBO_KEYWORD_SEARCH,
        sourcePlatform: SourcePlatform.WEIBO,
        sourceUrl: url,
        contentHash,
        metadata: {
          keyword,
          fileSize: Buffer.byteLength(html, 'utf-8'),
        },
        createdAt: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        QUEUE_NAMES.RAW_DATA_READY,
        rawDataReadyEvent
      );

      await this.accountHealth.deductHealth(account.id, 1);

      const parsed = this.htmlParser.parseSearchResultHtml(html);

      this.logger.debug('页面抓取成功', {
        keyword,
        page,
        postCount: parsed.postIds.length,
        hasNextPage: parsed.hasNextPage,
      });

      return {
        postIds: parsed.postIds,
        hasNextPage: parsed.hasNextPage,
        lastPostTime: parsed.lastPostTime,
      };
    } catch (error) {
      this.logger.error('页面抓取失败', {
        keyword,
        page,
        url,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      if (playwrightPage) await playwrightPage.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  private buildSearchUrl(
    keyword: string,
    window: TimeWindow,
    page: number
  ): string {
    const formatDate = (date: Date) =>
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
        String(date.getHours()).padStart(2, '0'),
      ].join('-');

    const base = 'https://s.weibo.com/weibo';
    const params = new URLSearchParams({
      q: keyword,
      typeall: '1',
      suball: '1',
      page: String(page),
      Refer: 'g',
    });

    params.set(
      'timescope',
      `custom:${formatDate(window.start)}:${formatDate(window.end)}`
    );

    return `${base}?${params.toString()}`;
  }

  private parseCookies(cookieString: string): Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }> {
    if (!cookieString?.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(cookieString);
      if (Array.isArray(parsed)) {
        return parsed.map((c) => ({
          name: c.name || '',
          value: c.value || '',
          domain: c.domain || '.weibo.com',
          path: c.path || '/',
        }));
      }
    } catch {
      return cookieString.split(';').map((cookie) => {
        const parts = cookie.trim().split('=');
        const name = parts[0];
        const valueParts = parts.slice(1);
        return {
          name: name?.trim() || '',
          value: valueParts.join('=').trim(),
          domain: '.weibo.com',
          path: '/',
        };
      });
    }

    return [];
  }
}
