import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { WeiboAccountService, WeiboAccount } from './account.service';
import { BrowserService } from '../browser/browser.service';
import { RawDataService } from '../raw-data/raw-data.service';
import { RabbitMQClient } from '@pro/rabbitmq';
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

    this.logger.log(`开始爬取任务: taskId=${taskId}, keyword=${keyword}, 时间范围=${this.formatDate(start)}~${this.formatDate(end)}`);

    try {
      const account = await this.accountService.getAvailableAccount(weiboAccountId);
      if (!account) {
        throw new Error('无可用微博账号');
      }

      const page = await this.browserService.createPage(account.id, account.cookies);

      let firstPostTime: Date | null = null;
      let lastPostTime: Date | null = null;
      let pageCount = 0;

      for (let currentPage = 1; currentPage <= this.crawlerConfig.maxPages; currentPage++) {
        const url = this.buildSearchUrl(keyword, start, end, currentPage);

        try {
          const html = await this.getPageHtml(page, url);

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
              crawledAt: new Date()
            }
          });

          pageCount = currentPage;

          if (currentPage === 1) {
            firstPostTime = this.extractFirstPostTime(html);
          }

          lastPostTime = this.extractLastPostTime(html);

          if (this.isLastPage(html)) {
            this.logger.log(`第${currentPage}页已到最后一页，停止抓取`);
            break;
          }

          await this.randomDelay(this.crawlerConfig.requestDelay.min, this.crawlerConfig.requestDelay.max);

        } catch (error) {
          this.logger.error(`抓取第${currentPage}页失败:`, error);
          if (currentPage === 1) {
            throw error;
          }
          break;
        }
      }

      await this.browserService.closeContext(account.id);

      this.logger.log(`任务完成: 抓取${pageCount}页, 首条时间=${firstPostTime}, 末条时间=${lastPostTime}`);

      const result: CrawlResult = {
        success: true,
        pageCount,
        firstPostTime: firstPostTime || undefined,
        lastPostTime: lastPostTime || undefined
      };

      // 处理任务结果和状态更新
      await this.handleTaskResult(message, result);

      return result;

    } catch (error) {
      this.logger.error('爬取任务失败:', error);
      return {
        success: false,
        pageCount: 0,
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

  private formatDateForWeibo(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    return `${year}-${month}-${day}-${hour}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private async getPageHtml(page: Page, url: string): Promise<string> {
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.crawlerConfig.pageTimeout
      });

      await page.waitForSelector(this.weiboConfig.selectors.feedCard, {
        timeout: 10000
      });

      const html = await page.content();
      return html;
    } catch (error) {
      this.logger.error(`获取页面HTML失败: ${url}`, error);
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
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
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
}