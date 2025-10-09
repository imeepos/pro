import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { WeiboAccountService, WeiboAccount } from './account.service';
import { BrowserService } from '../browser/browser.service';
import { RawDataService } from '../raw-data/raw-data.service';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: WeiboAccountService,
    private readonly browserService: BrowserService,
    private readonly rawDataService: RawDataService
  ) {}

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

      for (let currentPage = 1; currentPage <= 50; currentPage++) {
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

          await this.randomDelay(2000, 5000);

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

      return {
        success: true,
        pageCount,
        firstPostTime: firstPostTime || undefined,
        lastPostTime: lastPostTime || undefined
      };

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

    return `https://s.weibo.com/weibo?q=${encodedKeyword}&timescope=custom:${startTime}:${endTime}&page=${page}`;
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
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      await page.waitForSelector('.card-wrap', { timeout: 10000 });

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
      const firstCard = $('.card-wrap').first();

      let timeText = firstCard.find('.from time').attr('title') ||
                    firstCard.find('.from a').text().trim();

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
      const lastCard = $('.card-wrap').last();

      let timeText = lastCard.find('.from time').attr('title') ||
                    lastCard.find('.from a').text().trim();

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

    const nextButton = $('.next').not('.disable');
    if (nextButton.length === 0) {
      return true;
    }

    const pageInfo = $('.m-page .count');
    if (pageInfo.length > 0) {
      const pageText = pageInfo.text();
      if (pageText.includes('第1页') && !pageText.includes('共')) {
        return true;
      }
    }

    const noResult = $('.search_no_result');
    return noResult.length > 0;
  }

  private async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
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