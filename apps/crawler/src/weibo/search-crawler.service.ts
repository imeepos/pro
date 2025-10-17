import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { WeiboAccountService, WeiboAccount } from './account.service';
import { BrowserService } from '../browser/browser.service';
import { RawDataService } from '../raw-data/raw-data.service';
import { RabbitMQClient } from '@pro/rabbitmq';
import { RobotsService } from '../robots/robots.service';
import { RequestMonitorService } from '../monitoring/request-monitor.service';
import { CrawlerConfig, RabbitMQConfig, WeiboConfig } from '../config/crawler.interface';

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
    const { taskId, keyword, start, end, isInitialCrawl, weiboAccountId, enableAccountRotation } = message;
    const crawlStartTime = Date.now();

    this.logger.debug('开始执行爬取任务', {
      taskId,
      keyword,
      timeRange: { start: start.toISOString(), end: end.toISOString() },
      isInitialCrawl,
      enableAccountRotation,
      specifiedAccountId: weiboAccountId
    });

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

      this.logger.debug('账号获取成功', {
        taskId,
        accountId: account.id,
        accountNickname: account.nickname,
        usageCount: account.usageCount
      });

      // 创建页面实例
      page = await this.browserService.createPage(account.id, account.cookies);

      let firstPostTime: Date | null = null;
      let lastPostTime: Date | null = null;
      const pageLoadTimes: number[] = [];

      // 逐页处理
      for (let currentPage = 1; currentPage <= this.crawlerConfig.maxPages; currentPage++) {
        const url = this.buildSearchUrl(keyword, start, end, currentPage);
        const pageStartTime = Date.now();

        try {
          crawlMetrics.totalPages++;
          crawlMetrics.totalRequests++;

          // 检查URL是否已存在（去重）
          const existingRecord = await this.rawDataService.findBySourceUrl(url);
          if (existingRecord) {
            this.logger.debug('页面已存在，跳过抓取', {
              taskId,
              page: currentPage,
              url,
              existingCreatedAt: existingRecord.createdAt?.toISOString(),
              skipReason: 'already_exists'
            });
            crawlMetrics.skippedPages++;
            continue;
          }

          // 获取页面HTML
          const html = await this.getPageHtml(page, url);
          const pageLoadTime = Date.now() - pageStartTime;
          pageLoadTimes.push(pageLoadTime);

          // 计算数据大小
          const dataSize = new Blob([html]).size;
          crawlMetrics.totalDataSize += dataSize;

          this.logger.debug('页面抓取成功', {
            taskId,
            page: currentPage,
            url,
            loadTimeMs: pageLoadTime,
            dataSizeBytes: dataSize,
            htmlLength: html.length
          });

          // 保存原始数据
          await this.rawDataService.create({
            sourceType: 'weibo_keyword_search',
            sourceUrl: url,
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
              dataSizeBytes: dataSize
            }
          });

          crawlMetrics.successfulPages++;

          // 提取时间信息
          if (currentPage === 1) {
            firstPostTime = this.extractFirstPostTime(html);
            if (firstPostTime) {
              this.logger.debug('首条微博时间提取成功', {
                taskId,
                firstPostTime: firstPostTime.toISOString()
              });
            }
          }

          lastPostTime = this.extractLastPostTime(html);

          // 检查是否到最后一页
          if (this.isLastPage(html)) {
            this.logger.debug('检测到最后一页，停止抓取', {
              taskId,
              finalPage: currentPage
            });
            break;
          }

          // 应用延迟
          await this.randomDelay(this.crawlerConfig.requestDelay.min, this.crawlerConfig.requestDelay.max);

        } catch (error) {
          const pageLoadTime = Date.now() - pageStartTime;
          crawlMetrics.failedPages++;

          this.logger.warn('页面抓取失败', {
            taskId,
            page: currentPage,
            url,
            loadTimeMs: pageLoadTime,
            error: error instanceof Error ? error.message : '未知错误',
            errorType: this.classifyPageError(error)
          });

          // 第一页失败则整个任务失败
          if (currentPage === 1) {
            throw error;
          }

          // 其他页面失败则继续处理下一页
          continue;
        }
      }

      // 计算平均页面加载时间
      crawlMetrics.averagePageLoadTime = pageLoadTimes.length > 0
        ? Math.round(pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length)
        : 0;

      // 关闭浏览器上下文
      await this.browserService.closeContext(account.id);

      const totalDuration = Date.now() - crawlStartTime;

      this.logger.log('爬取任务完成', {
        taskId,
        keyword,
        duration: totalDuration,
        metrics: crawlMetrics,
        firstPostTime: firstPostTime?.toISOString(),
        lastPostTime: lastPostTime?.toISOString(),
        throughput: Math.round((crawlMetrics.totalDataSize / 1024 / 1024) / (totalDuration / 1000) * 100) / 100, // MB/s
        accountUsed: {
          id: account.id,
          nickname: account.nickname
        }
      });

      const result: CrawlResult = {
        success: true,
        pageCount: crawlMetrics.successfulPages,
        firstPostTime: firstPostTime || undefined,
        lastPostTime: lastPostTime || undefined
      };

      // 处理任务结果和状态更新
      await this.handleTaskResult(message, result);

      return result;

    } catch (error) {
      const totalDuration = Date.now() - crawlStartTime;

      this.logger.error('爬取任务失败', {
        taskId,
        keyword,
        duration: totalDuration,
        metrics: crawlMetrics,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyCrawlError(error),
        accountUsed: account ? { id: account.id, nickname: account.nickname } : null,
        stack: error instanceof Error ? error.stack : undefined
      });

      // 确保清理资源
      if (page && account) {
        try {
          await this.browserService.closeContext(account.id);
        } catch (cleanupError) {
          this.logger.warn('清理浏览器资源失败', {
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

  private buildSearchUrl(keyword: string, start: Date, end: Date, page: number): string {
    const encodedKeyword = encodeURIComponent(keyword);
    const startTime = this.formatDateForWeibo(start);
    const endTime = this.formatDateForWeibo(end);

    return `${this.weiboConfig.searchUrl}?q=${encodedKeyword}&timescope=custom:${startTime}:${endTime}&page=${page}`;
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

    const nextButton = $(this.weiboConfig.selectors.pagination.nextButton);
    if (nextButton.length === 0) {
      return true;
    }

    const pageInfo = $(this.weiboConfig.selectors.pagination.pageInfo);
    if (pageInfo.length > 0) {
      const pageText = pageInfo.text();
      if (pageText.includes('第1页') && !pageText.includes('共')) {
        return true;
      }
    }

    const noResult = $(this.weiboConfig.selectors.pagination.noResult);
    return noResult.length > 0;
  }

  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    // 结合监控系统的自适应延迟和传统的随机延迟
    const adaptiveDelay = this.requestMonitorService.getCurrentDelay();
    const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    const finalDelay = Math.max(adaptiveDelay, randomDelay);

    this.logger.debug(`应用延迟: ${finalDelay}ms (自适应: ${adaptiveDelay}ms, 随机: ${randomDelay}ms)`);
    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  private async handleTaskResult(message: SubTaskMessage, result: CrawlResult): Promise<void> {
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

  private async handleInitialCrawlResult(message: SubTaskMessage, result: CrawlResult): Promise<void> {
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

  private async handleIncrementalCrawlResult(message: SubTaskMessage, result: CrawlResult): Promise<void> {
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
    const nextTask: SubTaskMessage = {
      taskId,
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
}